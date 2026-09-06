from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from collections.abc import Sequence
from copy import deepcopy
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from .scan import DEFAULT_DATA_ROOT
from .thresholds import HASH_RECIPE


ZERO_STATS = {
    "findings": 0,
    "upheld": 0,
    "refuted": 0,
    "raw": 0,
    "adjudicated": 0,
    "surfaced": 0,
    "runs": 0,
    "hit_rate": None,
    "smoothed_hit_rate": None,
    "drive_uses": 0,
    "name_only": {"findings": 0, "upheld": 0, "refuted": 0},
}
ZERO_CLUSTER = {"id": None, "head": False, "head_selected_by": None}


class HarvestParseError(ValueError):
    def __init__(self, path: Path, line_no: int) -> None:
        self.path = path
        self.line_no = line_no
        super().__init__(f"invalid JSONL at {path}:{line_no}")


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        raise HarvestParseError(path, 1) from error

    rows: list[dict[str, Any]] = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        try:
            row = json.loads(line)
        except (TypeError, ValueError) as error:
            raise HarvestParseError(path, line_no) from error
        if not isinstance(row, dict):
            raise HarvestParseError(path, line_no)
        rows.append(row)
    return rows


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(f"{path}.tmp")
    try:
        temporary.write_text(text, encoding="utf-8")
        os.replace(temporary, path)
    except BaseException:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass
        raise


def _jsonl_text(rows: Sequence[dict[str, Any]]) -> str:
    return "".join(
        json.dumps(row, sort_keys=True, ensure_ascii=False) + "\n" for row in rows
    )


def _row_key(row: dict[str, Any]) -> tuple[str, ...]:
    return tuple(
        str(row.get(field, ""))
        for field in ("machine", "repo", "name", "path", "kind")
    )


def _frontmatter(row: dict[str, Any]) -> dict[str, Any]:
    value = row.get("frontmatter")
    return value if isinstance(value, dict) else {}


def _time_key(value: Any) -> tuple[int, str]:
    if value in (None, ""):
        return (0, "")
    text = str(value)
    try:
        normalized = text[:-1] + "+00:00" if text.endswith("Z") else text
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return (1, parsed.astimezone(timezone.utc).isoformat())
    except ValueError:
        return (1, text)


def _min_time(values: Sequence[Any]) -> Any:
    present = [value for value in values if value not in (None, "")]
    return min(present, key=_time_key) if present else None


def _max_time(values: Sequence[Any]) -> Any:
    present = [value for value in values if value not in (None, "")]
    return max(present, key=_time_key) if present else None


def _max_value(values: Sequence[Any], default: Any = None) -> Any:
    present = [value for value in values if value is not None]
    return max(present) if present else default


def _domains(rows: Sequence[dict[str, Any]]) -> list[str]:
    values: set[str] = set()
    for row in rows:
        raw = _frontmatter(row).get("domains") or []
        domains = [raw] if isinstance(raw, str) else raw
        if not isinstance(domains, (list, tuple, set)):
            continue
        values.update(str(domain) for domain in domains if domain is not None)
    values.discard("uncategorized")
    return sorted(values)


def _summary(rows: Sequence[dict[str, Any]], body_path: Path) -> str:
    text = ""
    for row in rows:
        spec = row.get("spec")
        if isinstance(spec, dict) and spec.get("persona"):
            text = str(spec["persona"])
            break
    if not text:
        for row in rows:
            description = _frontmatter(row).get("description")
            if description:
                text = str(description)
                break
    if not text and body_path.exists():
        try:
            text = body_path.read_text(encoding="utf-8").split("\n\n", 1)[0]
        except (OSError, UnicodeError):
            text = ""

    paragraph = next((part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()), "")
    sentence = re.split(r"(?<=[.!?])\s+", paragraph, maxsplit=1)[0]
    return re.sub(r"\s+", " ", sentence).strip()[:240]


def _lineage(name: str, lineage_rows: Sequence[dict[str, Any]]) -> dict[str, Any]:
    for row in lineage_rows:
        if str(row.get("lens") or row.get("name") or "") != name:
            continue
        parents = row.get("parents")
        return {
            "kind": row.get("lineage_kind") or "unknown",
            "parents": [str(parent) for parent in parents]
            if isinstance(parents, list)
            else [],
        }
    return {"kind": "unknown", "parents": []}


def _first_with_spec(
    rows: Sequence[dict[str, Any]],
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    for row in rows:
        if isinstance(row.get("spec"), dict):
            return row, row["spec"]
    return None, None


def _generated_record(
    body_hash: str,
    sightings: Sequence[dict[str, Any]],
    reuse_rows: Sequence[dict[str, Any]],
    lineage_rows: Sequence[dict[str, Any]],
    prior: dict[str, Any] | None,
    data_root: Path,
    accessioned_at: str,
) -> tuple[dict[str, Any], tuple[Path, dict[str, Any]] | None]:
    ordered = sorted(sightings, key=_row_key)
    first = ordered[0]
    name = str(prior.get("name")) if prior and prior.get("name") else str(first["name"])
    lens_id = (
        str(prior.get("id"))
        if prior and prior.get("id")
        else f"gen:{name}@{body_hash[:8]}"
    )
    body_path_text = (
        str(prior.get("body_path"))
        if prior and prior.get("body_path")
        else f"generated/lenses/{lens_id}.md"
    )
    body_path = data_root / body_path_text
    spec_row, spec = _first_with_spec(ordered)
    registry_spec_path = f"generated/specs/{lens_id}.json" if spec is not None else None
    frontmatters = [_frontmatter(row) for row in ordered]
    seen_times = [
        frontmatter.get("generated_at") or row.get("mtime")
        for row, frontmatter in zip(ordered, frontmatters, strict=True)
    ]
    sightings_seen = max(int((prior or {}).get("sightings_seen", 0)), len(ordered))
    matching_reuse = {
        index
        for index, row in enumerate(reuse_rows)
        if row.get("body_hash") == body_hash or row.get("registry_id") == lens_id
    }

    record = {
        "id": lens_id,
        "name": name,
        "body_hash": body_hash,
        "body_path": body_path_text,
        "accessioned_at": (
            str(prior["accessioned_at"])
            if prior and prior.get("accessioned_at")
            else accessioned_at
        ),
        "last_sighted": _max_time([row.get("mtime") for row in ordered]),
        "on_disk": True,
        "sightings": len(ordered),
        "sightings_seen": sightings_seen,
        "reuse_sightings": len(matching_reuse),
        "machines": sorted({str(row["machine"]) for row in ordered}),
        "repos": sorted({Path(str(row["repo"])).name for row in ordered}),
        "hash_recipe": str(first.get("hash_recipe") or HASH_RECIPE),
        "corrupt": any(bool(row.get("corrupt")) for row in ordered),
        "first_seen": _min_time(seen_times),
        "last_seen": _max_time(seen_times),
        "generated_by": next(
            (fm.get("generated_by") for fm in frontmatters if fm.get("generated_by") is not None),
            None,
        ),
        "flux_gen_version": _max_value(
            [fm.get("flux_gen_version") for fm in frontmatters],
        ),
        "tier": _max_value([fm.get("tier") for fm in frontmatters]),
        "use_count": _max_value([fm.get("use_count") for fm in frontmatters], 0),
        "last_used": _max_time([fm.get("last_used") for fm in frontmatters]),
        "domains": _domains(ordered),
        "source_spec": spec_row.get("spec_path") if spec_row else None,
        "spec_path": registry_spec_path,
        "summary": _summary(ordered, body_path),
        "lineage": _lineage(name, lineage_rows),
        "cohort": spec_row.get("cohort") if spec_row else None,
        "stats": deepcopy(ZERO_STATS),
        "cluster": deepcopy(ZERO_CLUSTER),
        "embodies": [],
    }
    spec_write = (
        (data_root / registry_spec_path, spec)
        if registry_spec_path and spec is not None
        else None
    )
    return record, spec_write


def _carried_record(
    prior: dict[str, Any], reuse_rows: Sequence[dict[str, Any]]
) -> dict[str, Any]:
    record = deepcopy(prior)
    matching_reuse = {
        index
        for index, row in enumerate(reuse_rows)
        if row.get("body_hash") == prior.get("body_hash")
        or row.get("registry_id") == prior.get("id")
    }
    record.update(
        {
            "last_sighted": None,
            "on_disk": False,
            "sightings": 0,
            "reuse_sightings": len(matching_reuse),
        }
    )
    return record


def _write_report(data_root: Path, records: Sequence[dict[str, Any]], day: date) -> None:
    collapsed = [record for record in records if record["sightings"] > 1]
    lines = [
        f"# Merge — {day.isoformat()}",
        "",
        "| id | sightings | machines | repos |",
        "|---|---:|---|---|",
    ]
    for record in collapsed:
        lines.append(
            f"| {record['id']} | {record['sightings']} | "
            f"{', '.join(record['machines'])} | {', '.join(record['repos'])} |"
        )
    lines.append("")
    _atomic_write(
        data_root / "reports" / f"{day.isoformat()}-merge.md",
        "\n".join(lines),
    )


def merge_harvests(
    *,
    data_root: str | os.PathLike[str] = DEFAULT_DATA_ROOT,
    now: datetime | None = None,
) -> list[dict[str, Any]]:
    root = Path(data_root)
    index_path = root / "generated/index.jsonl"

    prior_rows = _read_jsonl(index_path)
    harvest_rows: list[dict[str, Any]] = []
    for path in sorted((root / "harvest").glob("*.jsonl"), key=str):
        harvest_rows.extend(_read_jsonl(path))

    prior_by_hash = {
        str(record["body_hash"]): record
        for record in prior_rows
        if record.get("body_hash") is not None
    }
    sightings_by_hash: dict[str, list[dict[str, Any]]] = defaultdict(list)
    reuse_rows: list[dict[str, Any]] = []
    lineage_rows: list[dict[str, Any]] = []
    for row in harvest_rows:
        if row.get("kind") == "sighting" and row.get("body_hash") is not None:
            sightings_by_hash[str(row["body_hash"])].append(row)
        elif row.get("kind") == "reuse-sighting":
            reuse_rows.append(row)
        elif row.get("kind") == "lineage":
            lineage_rows.append(row)
    lineage_rows.sort(key=_row_key)

    observed_at = now or datetime.now(timezone.utc)
    if observed_at.tzinfo is None:
        observed_at = observed_at.replace(tzinfo=timezone.utc)
    observed_at = observed_at.astimezone(timezone.utc)
    accessioned_at = observed_at.isoformat()
    records: list[dict[str, Any]] = []
    specs: list[tuple[Path, dict[str, Any]]] = []
    for body_hash in sorted(set(prior_by_hash) | set(sightings_by_hash)):
        sightings = sightings_by_hash.get(body_hash, [])
        prior = prior_by_hash.get(body_hash)
        if not sightings:
            if prior is not None:
                records.append(_carried_record(prior, reuse_rows))
            continue
        record, spec_write = _generated_record(
            body_hash,
            sightings,
            reuse_rows,
            lineage_rows,
            prior,
            root,
            accessioned_at,
        )
        records.append(record)
        if spec_write is not None:
            specs.append(spec_write)

    records.sort(key=lambda record: str(record["id"]))
    for path, spec in sorted(specs, key=lambda item: str(item[0])):
        _atomic_write(
            path,
            json.dumps(spec, sort_keys=True, ensure_ascii=False, indent=2) + "\n",
        )
    _atomic_write(index_path, _jsonl_text(records))
    _write_report(root, records, observed_at.date())
    return records


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python3 -m harvest merge")
    parser.add_argument("--data-root", default=str(DEFAULT_DATA_ROOT))
    args = parser.parse_args(argv)
    try:
        records = merge_harvests(data_root=args.data_root)
    except HarvestParseError as error:
        print(error, file=sys.stderr)
        return 1
    print(
        f"merged={len(records)} "
        f"current_sightings={sum(record['sightings'] for record in records)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
