from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import sys
from array import array
from collections import Counter, defaultdict
from collections.abc import Sequence
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from .merge import HarvestParseError, _atomic_write, _jsonl_text, _read_jsonl
from .report import write_edges_report
from .scan import DEFAULT_DATA_ROOT
from .thresholds import (
    EMBED_DIM,
    EMBODIES_MIN_COSINE,
    EMBODIES_TOP_K,
    VARIANT_MIN_COSINE,
)


FUSION_SPEC = re.compile(r"-fusion-\d+\.json$")


class EdgeBuildError(RuntimeError):
    """The committed registry inputs cannot produce a sound edge set."""


class _UnionFind:
    def __init__(self, values: Sequence[str]) -> None:
        self.parent = {value: value for value in values}

    def find(self, value: str) -> str:
        parent = self.parent[value]
        if parent != value:
            self.parent[value] = self.find(parent)
        return self.parent[value]

    def union(self, left: str, right: str) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root == right_root:
            return
        if left_root < right_root:
            self.parent[right_root] = left_root
        else:
            self.parent[left_root] = right_root


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _read_vectors(data_root: Path, layer: str) -> tuple[list[str], dict[str, array]]:
    embeddings = data_root / "embeddings"
    ids = _read_json(embeddings / f"{layer}.ids.json")
    if not isinstance(ids, list) or not all(isinstance(lens_id, str) for lens_id in ids):
        raise EdgeBuildError(f"invalid {layer}.ids.json")
    if len(ids) != len(set(ids)):
        raise EdgeBuildError(f"duplicate id in {layer}.ids.json")

    content = (embeddings / f"{layer}.f32").read_bytes()
    expected = len(ids) * EMBED_DIM * 4
    if len(content) != expected:
        raise EdgeBuildError(
            f"{layer}.f32 has {len(content)} bytes; expected {expected}"
        )
    values = array("f")
    values.frombytes(content)
    if sys.byteorder != "little":
        values.byteswap()

    vectors: dict[str, array] = {}
    for row, lens_id in enumerate(ids):
        start = row * EMBED_DIM
        vector = array("f", values[start : start + EMBED_DIM])
        if not all(math.isfinite(value) for value in vector):
            raise EdgeBuildError(f"{layer} embedding {lens_id} is not finite")
        vectors[lens_id] = vector
    return ids, vectors


def _cosine(left: Sequence[float], right: Sequence[float]) -> float:
    if len(left) != len(right):
        raise EdgeBuildError("cannot compare embeddings with different dimensions")
    dot = math.sumprod(left, right)
    left_norm = math.sumprod(left, left)
    right_norm = math.sumprod(right, right)
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    score = dot / math.sqrt(left_norm * right_norm)
    return max(-1.0, min(1.0, score))


def _numeric(value: Any, default: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return default
    return result if math.isfinite(result) else default


def _time_value(value: Any) -> tuple[int, float, str]:
    if value in (None, ""):
        return (0, 0.0, "")
    text = str(value)
    try:
        normalized = text[:-1] + "+00:00" if text.endswith("Z") else text
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return (2, parsed.astimezone(timezone.utc).timestamp(), "")
    except ValueError:
        return (1, 0.0, text)


def _strict_winner(
    records: Sequence[dict[str, Any]],
    value,
) -> dict[str, Any] | None:
    if not records:
        return None
    values = [(record, value(record)) for record in records]
    maximum = max(score for _, score in values)
    winners = [record for record, score in values if score == maximum]
    return winners[0] if len(winners) == 1 else None


def _choose_head(records: Sequence[dict[str, Any]]) -> tuple[dict[str, Any], str]:
    eligible = [record for record in records if not record.get("corrupt")]
    if not eligible:
        eligible = list(records)

    rated = [
        record
        for record in eligible
        if _numeric((record.get("stats") or {}).get("adjudicated")) >= 2
        and isinstance((record.get("stats") or {}).get("smoothed_hit_rate"), (int, float))
    ]
    winner = _strict_winner(
        rated,
        lambda record: _numeric((record.get("stats") or {}).get("smoothed_hit_rate")),
    )
    if winner is not None:
        return winner, "hit_rate"

    winner = _strict_winner(
        eligible,
        lambda record: _numeric(record.get("use_count"))
        + _numeric((record.get("stats") or {}).get("drive_uses")),
    )
    if winner is not None:
        return winner, "usage"

    winner = _strict_winner(
        eligible,
        lambda record: _time_value(record.get("last_seen")),
    )
    if winner is not None:
        return winner, "recency"

    return min(eligible, key=lambda record: str(record["id"])), "id"


def _cluster_id(member_ids: Sequence[str]) -> str:
    payload = "\n".join(sorted(member_ids)).encode("utf-8")
    return f"clu:{hashlib.sha256(payload).hexdigest()[:12]}"


def _generated_pairs(
    records: Sequence[dict[str, Any]],
    vectors: dict[str, array],
) -> dict[tuple[str, str], float]:
    pairs: dict[tuple[str, str], float] = {}
    ids = [str(record["id"]) for record in records]
    for left_index, left_id in enumerate(ids):
        if left_id not in vectors:
            raise EdgeBuildError(f"generated record {left_id} has no embedding row")
        for right_id in ids[left_index + 1 :]:
            if right_id not in vectors:
                raise EdgeBuildError(f"generated record {right_id} has no embedding row")
            pairs[(left_id, right_id)] = _cosine(vectors[left_id], vectors[right_id])
    return pairs


def _assign_clusters(
    records: Sequence[dict[str, Any]],
    pair_scores: dict[tuple[str, str], float],
) -> tuple[list[list[str]], list[dict[str, Any]], list[str]]:
    by_id = {str(record["id"]): record for record in records}
    union = _UnionFind(list(by_id))
    for (left_id, right_id), score in pair_scores.items():
        if score >= VARIANT_MIN_COSINE or by_id[left_id].get("name") == by_id[right_id].get("name"):
            union.union(left_id, right_id)

    grouped: dict[str, list[str]] = defaultdict(list)
    for lens_id in by_id:
        grouped[union.find(lens_id)].append(lens_id)
    components = sorted(
        (sorted(member_ids) for member_ids in grouped.values()),
        key=lambda member_ids: member_ids[0],
    )

    variant_edges: list[dict[str, Any]] = []
    corrupt_clusters: list[str] = []
    for member_ids in components:
        members = [by_id[lens_id] for lens_id in member_ids]
        if len(members) == 1:
            members[0]["cluster"] = {"id": None, "head": True}
            continue

        cluster_id = _cluster_id(member_ids)
        head, selected_by = _choose_head(members)
        if all(record.get("corrupt") for record in members):
            corrupt_clusters.append(cluster_id)
        for record in members:
            record["cluster"] = {
                "id": cluster_id,
                "head": record["id"] == head["id"],
                "head_selected_by": selected_by,
            }
            if record["id"] == head["id"]:
                continue
            key = tuple(sorted((str(record["id"]), str(head["id"]))))
            variant_edges.append(
                {
                    "source": record["id"],
                    "target": head["id"],
                    "type": "variant-of",
                    "score": pair_scores[key],
                }
            )
    return components, variant_edges, corrupt_clusters


def _embodies_edges(
    records: Sequence[dict[str, Any]],
    generated_vectors: dict[str, array],
    curated_ids: Sequence[str],
    curated_vectors: dict[str, array],
) -> list[dict[str, Any]]:
    edges: list[dict[str, Any]] = []
    for record in records:
        lens_id = str(record["id"])
        vector = generated_vectors.get(lens_id)
        if vector is None:
            raise EdgeBuildError(f"generated record {lens_id} has no embedding row")
        ranked = sorted(
            (
                (_cosine(vector, curated_vectors[curated_id]), curated_id)
                for curated_id in curated_ids
            ),
            key=lambda item: (-item[0], item[1]),
        )[:EMBODIES_TOP_K]
        retained = [item for item in ranked if item[0] >= EMBODIES_MIN_COSINE]
        weak = not retained and bool(ranked)
        if weak:
            retained = ranked[:1]
        record["embodies"] = [
            {"id": curated_id, "score": score} for score, curated_id in retained
        ]
        edges.extend(
            {
                "source": lens_id,
                "target": curated_id,
                "type": "embodies",
                "score": score,
                "weak": weak,
            }
            for score, curated_id in retained
        )
    return edges


def _harvest_rows(data_root: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted((data_root / "harvest").glob("*.jsonl"), key=str):
        rows.extend(_read_jsonl(path))
    return rows


def _fusion_sources(
    data_root: Path,
    records: Sequence[dict[str, Any]],
) -> list[tuple[str, list[str]]]:
    by_hash = {
        str(record["body_hash"]): str(record["id"])
        for record in records
        if record.get("body_hash") not in (None, "")
    }
    by_name = defaultdict(list)
    for record in records:
        by_name[str(record.get("name") or "")].append(record)

    def source_for(row: dict[str, Any]) -> str | None:
        body_hash = row.get("body_hash")
        if body_hash not in (None, "") and str(body_hash) in by_hash:
            return by_hash[str(body_hash)]
        name = str(row.get("lens") or row.get("name") or "")
        candidates = by_name.get(name, [])
        head = next(
            (record for record in candidates if (record.get("cluster") or {}).get("head")),
            None,
        )
        return str(head["id"]) if head else None

    sources: list[tuple[str, list[str]]] = []
    for record in records:
        lineage = record.get("lineage") or {}
        parents = lineage.get("parents")
        if lineage.get("kind") == "fusion" and isinstance(parents, list):
            sources.append((str(record["id"]), [str(parent) for parent in parents]))

    for row in _harvest_rows(data_root):
        parents: Any = None
        if row.get("kind") == "lineage" and row.get("lineage_kind") == "fusion":
            parents = row.get("parents")
        elif row.get("kind") == "sighting" and FUSION_SPEC.search(str(row.get("spec_path") or "")):
            spec = row.get("spec")
            parents = spec.get("parents") if isinstance(spec, dict) else row.get("parents")
        if not isinstance(parents, list):
            continue
        source = source_for(row)
        if source is not None:
            sources.append((source, [str(parent) for parent in parents]))
    return sources


def _fused_from_edges(
    data_root: Path,
    records: Sequence[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    by_id = {str(record["id"]): record for record in records}
    by_name: dict[str, str] = {}
    for record in records:
        if (record.get("cluster") or {}).get("head"):
            by_name[str(record.get("name") or "")] = str(record["id"])

    edges: dict[tuple[str, str], dict[str, str]] = {}
    unresolved: dict[tuple[str, str], dict[str, str]] = {}
    for source, parents in _fusion_sources(data_root, records):
        for parent in parents:
            target = by_name.get(parent)
            if target is None and parent in by_id:
                parent_record = by_id[parent]
                if (parent_record.get("cluster") or {}).get("head"):
                    target = parent
                else:
                    target = by_name.get(str(parent_record.get("name") or ""))
            if target is None:
                unresolved[(source, parent)] = {"source": source, "parent": parent}
            elif source != target:
                edges[(source, target)] = {
                    "source": source,
                    "target": target,
                    "type": "fused-from",
                }
    return (
        [edges[key] for key in sorted(edges)],
        [unresolved[key] for key in sorted(unresolved)],
    )


def update_edges(
    *,
    data_root: str | os.PathLike[str] = DEFAULT_DATA_ROOT,
    report_date: date | None = None,
) -> dict[str, Any]:
    root = Path(data_root)
    records = _read_jsonl(root / "generated/index.jsonl")
    records.sort(key=lambda record: str(record.get("id", "")))
    if any(not isinstance(record.get("id"), str) or not record["id"] for record in records):
        raise EdgeBuildError("every generated record must have an id")

    curated = _read_json(root / "curated/lenses.json")
    if not isinstance(curated, list):
        raise EdgeBuildError("curated/lenses.json must contain a list")
    curated_ids = [str(lens["id"]) for lens in curated]
    matrix_curated_ids, curated_vectors = _read_vectors(root, "curated")
    generated_ids, generated_vectors = _read_vectors(root, "generated")
    if set(matrix_curated_ids) != set(curated_ids):
        raise EdgeBuildError("curated embedding ids do not match curated lenses")
    record_ids = [str(record["id"]) for record in records]
    if set(generated_ids) != set(record_ids):
        raise EdgeBuildError("generated embedding ids do not match the index")

    pair_scores = _generated_pairs(records, generated_vectors)
    components, variant_edges, corrupt_clusters = _assign_clusters(records, pair_scores)
    embodies_edges = _embodies_edges(
        records,
        generated_vectors,
        curated_ids,
        curated_vectors,
    )
    fused_edges, unresolved = _fused_from_edges(root, records)
    edges = sorted(
        [*embodies_edges, *variant_edges, *fused_edges],
        key=lambda edge: (str(edge["type"]), str(edge["source"]), str(edge["target"])),
    )

    _atomic_write(root / "generated/index.jsonl", _jsonl_text(records))
    _atomic_write(root / "generated/edges.jsonl", _jsonl_text(edges))
    day = report_date or date.today()
    report_path = write_edges_report(
        data_root=root,
        report_date=day,
        records=records,
        edges=edges,
        components=components,
        pair_scores=pair_scores,
        unresolved_parents=unresolved,
        corrupt_clusters=corrupt_clusters,
    )
    counts = Counter(str(edge["type"]) for edge in edges)
    return {
        "counts": {
            edge_type: counts.get(edge_type, 0)
            for edge_type in ("embodies", "fused-from", "variant-of")
        },
        "clusters": sum(len(component) >= 2 for component in components),
        "unresolved_parents": unresolved,
        "corrupt_clusters": corrupt_clusters,
        "report_path": str(report_path),
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python3 -m harvest edges")
    parser.add_argument("--data-root", default=str(DEFAULT_DATA_ROOT))
    args = parser.parse_args(argv)
    try:
        result = update_edges(data_root=args.data_root)
    except (EdgeBuildError, HarvestParseError, OSError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1
    counts = result["counts"]
    print(
        f"embodies={counts['embodies']} fused-from={counts['fused-from']} "
        f"variant-of={counts['variant-of']} clusters={result['clusters']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
