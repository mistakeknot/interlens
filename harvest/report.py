from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter
from collections.abc import Sequence
from datetime import date
from pathlib import Path
from typing import Any

from .merge import HarvestParseError, _atomic_write, _read_jsonl
from .scan import DEFAULT_DATA_ROOT
from .thresholds import EMBED_DIM, HASH_RECIPE, VARIANT_MIN_COSINE


def _cell(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def _pair_rows(
    pairs: Sequence[dict[str, Any]],
) -> list[str]:
    rows = ["| left | right | score |", "|---|---|---:|"]
    rows.extend(
        f"| {_cell(pair['left_name'])} (`{_cell(pair['left'])}`) | "
        f"{_cell(pair['right_name'])} (`{_cell(pair['right'])}`) | "
        f"{pair['score']:.6f} |"
        for pair in pairs
    )
    if not pairs:
        rows.append("| (none) | (none) | — |")
    return rows


def _bullet_rows(values: Sequence[str]) -> list[str]:
    return [f"- {_cell(value)}" for value in values] or ["- (none)"]


def write_edges_report(
    *,
    data_root: Path,
    report_date: date,
    records: Sequence[dict[str, Any]],
    edges: Sequence[dict[str, Any]],
    components: Sequence[Sequence[str]],
    pair_scores: dict[tuple[str, str], float],
    unresolved_parents: Sequence[dict[str, str]],
    corrupt_clusters: Sequence[str],
) -> Path:
    by_id = {str(record["id"]): record for record in records}
    component_by_id = {
        lens_id: component_index
        for component_index, member_ids in enumerate(components)
        for lens_id in member_ids
    }
    non_merged = []
    merged = []
    for (left_id, right_id), score in pair_scores.items():
        row = {
            "left": left_id,
            "left_name": by_id[left_id].get("name", left_id),
            "right": right_id,
            "right_name": by_id[right_id].get("name", right_id),
            "score": score,
        }
        same_component = component_by_id[left_id] == component_by_id[right_id]
        if same_component and len(components[component_by_id[left_id]]) >= 2:
            merged.append(row)
        elif score < VARIANT_MIN_COSINE:
            non_merged.append(row)
    non_merged.sort(key=lambda row: (-row["score"], row["left"], row["right"]))
    merged.sort(key=lambda row: (row["score"], row["left"], row["right"]))

    nearest = []
    for lens_id in sorted(by_id):
        scores = [
            score
            for pair, score in pair_scores.items()
            if lens_id in pair
        ]
        if scores:
            nearest.append(max(scores))
    histogram = [0] * 15
    for score in nearest:
        if 0.70 <= score <= 1.0:
            index = min(14, int((score - 0.70) / 0.02))
            histogram[index] += 1

    edge_counts = Counter(str(edge.get("type")) for edge in edges)
    cluster_sizes = Counter(
        len(member_ids) for member_ids in components if len(member_ids) >= 2
    )
    head_selection = Counter()
    for member_ids in components:
        if len(member_ids) < 2:
            continue
        head = next(
            by_id[lens_id]
            for lens_id in member_ids
            if (by_id[lens_id].get("cluster") or {}).get("head")
        )
        head_selection[str(head["cluster"]["head_selected_by"])] += 1

    weak = [edge for edge in edges if edge.get("type") == "embodies" and edge.get("weak")]
    corrupt = [record for record in records if record.get("corrupt")]
    null_hit_rates = sum((record.get("stats") or {}).get("hit_rate") is None for record in records)
    try:
        attributions = _read_jsonl(data_root / "generated/attributions.jsonl")
    except HarvestParseError:
        attributions = []
    name_only = sum(row.get("attributed_to") is None for row in attributions)

    lines = [
        f"# Generated edge calibration — {report_date.isoformat()}",
        "",
        f"Variant threshold: `{VARIANT_MIN_COSINE:.2f}`",
        "",
        "## Edge counts",
        "",
        "| type | count |",
        "|---|---:|",
    ]
    for edge_type in ("embodies", "fused-from", "variant-of"):
        lines.append(f"| {edge_type} | {edge_counts.get(edge_type, 0)} |")
    lines.extend(["", "## Cluster size histogram", "", "| size | clusters |", "|---:|---:|"])
    if cluster_sizes:
        lines.extend(f"| {size} | {cluster_sizes[size]} |" for size in sorted(cluster_sizes))
    else:
        lines.append("| — | 0 |")
    lines.extend(["", "## Closest non-merged pairs", "", *_pair_rows(non_merged[:10])])
    lines.extend(["", "## Farthest merged pairs", "", *_pair_rows(merged[:10])])
    lines.extend(
        [
            "",
            "## Nearest-neighbor cosine histogram",
            "",
            "| cosine bin | records |",
            "|---|---:|",
        ]
    )
    for index, count in enumerate(histogram):
        lower = 0.70 + index * 0.02
        upper = lower + 0.02
        closing = "]" if index == len(histogram) - 1 else ")"
        lines.append(f"| [{lower:.2f}, {upper:.2f}{closing} | {count} |")
    lines.extend(
        [
            "",
            "## Cluster head selection",
            "",
            "| selected by | clusters |",
            "|---|---:|",
        ]
    )
    for tier in ("hit_rate", "usage", "recency", "id"):
        lines.append(f"| {tier} | {head_selection.get(tier, 0)} |")
    lines.extend(
        [
            "",
            f"Records with null hit rate: {null_hit_rates}",
            "",
            f"Name-only attribution rows: {name_only}",
            "",
            "## Weak embodies",
            "",
            *_bullet_rows(
                [
                    f"{edge['source']} -> {edge['target']} ({float(edge['score']):.6f})"
                    for edge in weak
                ]
            ),
            "",
            "## Corrupt records",
            "",
            *_bullet_rows([str(record["id"]) for record in corrupt]),
            "",
            "## Corrupt clusters",
            "",
            *_bullet_rows(list(corrupt_clusters)),
            "",
            "## Unresolved parents",
            "",
            *_bullet_rows(
                [f"{row['source']} -> {row['parent']}" for row in unresolved_parents]
            ),
            "",
        ]
    )
    path = data_root / "reports" / f"{report_date.isoformat()}-edges.md"
    _atomic_write(path, "\n".join(lines))
    return path


def _load_json(path: Path, errors: list[str], label: str) -> Any | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        errors.append(f"cannot read {label}: {error}")
        return None


def _load_jsonl(path: Path, errors: list[str], label: str) -> list[dict[str, Any]]:
    if not path.is_file():
        errors.append(f"cannot read {label}: file does not exist: {path}")
        return []
    try:
        return _read_jsonl(path)
    except HarvestParseError as error:
        errors.append(f"cannot read {label}: {error}")
        return []


def _duplicates(values: Sequence[Any]) -> list[str]:
    counts = Counter(str(value) for value in values if value not in (None, ""))
    return sorted(value for value, count in counts.items() if count > 1)


def audit_registry(
    *, data_root: str | os.PathLike[str] = DEFAULT_DATA_ROOT
) -> list[str]:
    root = Path(data_root)
    errors: list[str] = []
    records = _load_jsonl(root / "generated/index.jsonl", errors, "generated index")
    edges = _load_jsonl(root / "generated/edges.jsonl", errors, "generated edges")
    attributions = _load_jsonl(
        root / "generated/attributions.jsonl", errors, "generated attributions"
    )
    curated = _load_json(root / "curated/lenses.json", errors, "curated lenses")
    curated = curated if isinstance(curated, list) else []

    ids = [record.get("id") for record in records]
    body_hashes = [record.get("body_hash") for record in records]
    for duplicate in _duplicates(ids):
        errors.append(f"duplicate id: {duplicate}")
    for duplicate in _duplicates(body_hashes):
        errors.append(f"duplicate body_hash: {duplicate}")
    for record_index, record in enumerate(records):
        if record.get("id") in (None, ""):
            errors.append(f"index row {record_index} has no id")
        if record.get("body_hash") in (None, ""):
            errors.append(f"index row {record_index} has no body_hash")

    id_set = {str(lens_id) for lens_id in ids if lens_id not in (None, "")}
    expected_bodies: set[Path] = set()
    for record in records:
        body_path = record.get("body_path")
        lens_id = record.get("id")
        if not isinstance(body_path, str) or not body_path:
            errors.append(f"generated record {lens_id} has no body_path")
            continue
        path = root / body_path
        expected_bodies.add(path.resolve())
        if not path.is_file():
            errors.append(f"generated record {lens_id} is missing body file: {body_path}")
    bodies_root = root / "generated/lenses"
    actual_bodies = (
        {path.resolve() for path in bodies_root.rglob("*.md") if path.is_file()}
        if bodies_root.exists()
        else set()
    )
    for orphan in sorted(actual_bodies - expected_bodies, key=str):
        errors.append(f"orphan body file: {orphan.relative_to(root.resolve())}")

    generated_ids_value = _load_json(
        root / "embeddings/generated.ids.json", errors, "generated embedding ids"
    )
    generated_ids = (
        generated_ids_value
        if isinstance(generated_ids_value, list)
        and all(isinstance(value, str) for value in generated_ids_value)
        else []
    )
    if generated_ids_value is not None and generated_ids == [] and generated_ids_value != []:
        errors.append("generated embedding ids must be a list of strings")
    for duplicate in _duplicates(generated_ids):
        errors.append(f"duplicate generated embedding id: {duplicate}")
    generated_id_set = set(generated_ids)
    for missing in sorted(id_set - generated_id_set):
        errors.append(f"generated record has no embedding row: {missing}")
    for orphan in sorted(generated_id_set - id_set):
        errors.append(f"orphan generated embedding row: {orphan}")
    try:
        matrix_size = (root / "embeddings/generated.f32").stat().st_size
        expected_size = len(generated_ids) * EMBED_DIM * 4
        if matrix_size != expected_size:
            errors.append(
                f"generated.f32 has {matrix_size} bytes; expected {expected_size}"
            )
    except OSError as error:
        errors.append(f"cannot read generated embedding matrix: {error}")

    curated_ids = {
        str(lens["id"])
        for lens in curated
        if isinstance(lens, dict) and lens.get("id") not in (None, "")
    }
    all_ids = id_set | curated_ids
    for edge_index, edge in enumerate(edges):
        for endpoint in ("source", "target"):
            value = edge.get(endpoint)
            if str(value) not in all_ids:
                errors.append(
                    f"missing edge endpoint at row {edge_index}: {endpoint}={value}"
                )

    clusters: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        cluster = record.get("cluster")
        if not isinstance(cluster, dict):
            errors.append(f"generated record {record.get('id')} has invalid cluster")
            continue
        cluster_id = cluster.get("id")
        if cluster_id is None:
            if cluster.get("head") is not True:
                errors.append(
                    f"singleton {record.get('id')} expected exactly one head"
                )
            continue
        clusters.setdefault(str(cluster_id), []).append(record)
    for cluster_id, members in sorted(clusters.items()):
        heads = sum(bool((member.get("cluster") or {}).get("head")) for member in members)
        if heads != 1:
            errors.append(
                f"cluster {cluster_id} expected exactly one head; found {heads}"
            )

    attribution_keys = [
        tuple(str(row.get(field, "")) for field in ("run", "finding_id", "lens"))
        for row in attributions
    ]
    for duplicate in _duplicates(attribution_keys):
        errors.append(f"duplicate attribution key: {duplicate}")

    meta = _load_json(root / "embeddings/meta.json", errors, "embedding metadata")
    if not isinstance(meta, dict) or meta.get("hash_recipe") != HASH_RECIPE:
        actual = meta.get("hash_recipe") if isinstance(meta, dict) else None
        errors.append(
            f"meta.hash_recipe mismatch: expected {HASH_RECIPE}, found {actual}"
        )
    return errors


def audit_main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python3 -m harvest audit")
    parser.add_argument("--data-root", default=str(DEFAULT_DATA_ROOT))
    args = parser.parse_args(argv)
    errors = audit_registry(data_root=args.data_root)
    if errors:
        for error in errors:
            print(f"audit: {error}", file=sys.stderr)
        return 1
    records = _read_jsonl(Path(args.data_root) / "generated/index.jsonl")
    print(f"audit ok records={len(records)}")
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python3 -m harvest report")
    parser.add_argument("--data-root", default=str(DEFAULT_DATA_ROOT))
    args = parser.parse_args(argv)
    reports = sorted((Path(args.data_root) / "reports").glob("*.md"), key=str)
    for path in reports:
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
