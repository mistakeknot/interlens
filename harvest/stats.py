from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from collections.abc import Sequence
from copy import deepcopy
from pathlib import Path
from typing import Any

from .merge import (
    ZERO_STATS,
    HarvestParseError,
    _atomic_write,
    _jsonl_text,
    _read_jsonl,
)
from .scan import DEFAULT_DATA_ROOT


def _identity(row: dict[str, Any]) -> tuple[str, str] | None:
    name = row.get("name") or row.get("lens")
    body_hash = row.get("body_hash")
    if name in (None, "") or body_hash in (None, ""):
        return None
    return str(name), str(body_hash)


def _attribution_key(row: dict[str, Any]) -> tuple[str, str, str]:
    return tuple(
        str(row.get(field, "")) for field in ("run", "finding_id", "lens")
    )


def _attribution_quality(row: dict[str, Any]) -> tuple[int, int]:
    return (
        int(row.get("attributed_to") is not None),
        int(row.get("body_hash") is not None),
    )


def _prefer_attribution(
    candidate: dict[str, Any],
    current: dict[str, Any],
) -> bool:
    candidate_quality = _attribution_quality(candidate)
    current_quality = _attribution_quality(current)
    if candidate_quality != current_quality:
        return candidate_quality > current_quality
    return json.dumps(candidate, sort_keys=True, ensure_ascii=False) < json.dumps(
        current,
        sort_keys=True,
        ensure_ascii=False,
    )


def _global_attributions(
    harvest_rows: Sequence[dict[str, Any]],
    index_by_identity: dict[tuple[str, str], str],
) -> list[dict[str, Any]]:
    unique: dict[tuple[str, str, str], dict[str, Any]] = {}
    for source in harvest_rows:
        if source.get("kind") != "attribution":
            continue
        row = deepcopy(source)
        lens = row.get("lens") or row.get("name") or ""
        body_hash = row.get("body_hash")
        row["lens"] = str(lens)
        row["body_hash"] = None if body_hash in (None, "") else str(body_hash)
        identity = _identity(row)
        row["attributed_to"] = (
            index_by_identity.get(identity) if identity is not None else None
        )
        key = _attribution_key(row)
        current = unique.get(key)
        if current is None or _prefer_attribution(row, current):
            unique[key] = row
    return [unique[key] for key in sorted(unique)]


def _status_count(rows: Sequence[dict[str, Any]], status: str) -> int:
    return sum(row.get("status") == status for row in rows)


def _drive_uses(rows: Sequence[dict[str, Any]]) -> int:
    values = []
    for row in rows:
        try:
            values.append(int(row.get("drive_uses") or 0))
        except (TypeError, ValueError):
            values.append(0)
    return max(values, default=0)


def _record_stats(
    attributed: Sequence[dict[str, Any]],
    name_only: Sequence[dict[str, Any]],
    sightings: Sequence[dict[str, Any]],
) -> dict[str, Any]:
    stats = deepcopy(ZERO_STATS)
    upheld = _status_count(attributed, "upheld")
    refuted = _status_count(attributed, "refuted")
    adjudicated = upheld + refuted
    stats.update(
        {
            "findings": len(attributed),
            "upheld": upheld,
            "refuted": refuted,
            "raw": _status_count(attributed, "raw"),
            "adjudicated": adjudicated,
            "surfaced": sum(bool(row.get("surfaced")) for row in attributed),
            "runs": len(
                {
                    str(row["run"])
                    for row in attributed
                    if row.get("run") not in (None, "")
                }
            ),
            "hit_rate": round(upheld / adjudicated, 3)
            if adjudicated
            else None,
            "smoothed_hit_rate": (upheld + 1) / (adjudicated + 2)
            if adjudicated
            else None,
            "drive_uses": _drive_uses(sightings),
            "name_only": {
                "findings": len(name_only),
                "upheld": _status_count(name_only, "upheld"),
                "refuted": _status_count(name_only, "refuted"),
            },
        }
    )
    return stats


def update_stats(
    *,
    data_root: str | os.PathLike[str] = DEFAULT_DATA_ROOT,
) -> list[dict[str, Any]]:
    root = Path(data_root)
    index_path = root / "generated/index.jsonl"
    records = _read_jsonl(index_path)
    records.sort(key=lambda record: str(record.get("id", "")))

    harvest_rows: list[dict[str, Any]] = []
    for path in sorted((root / "harvest").glob("*.jsonl"), key=str):
        harvest_rows.extend(_read_jsonl(path))

    index_by_identity = {
        identity: str(record["id"])
        for record in records
        if (identity := _identity(record)) is not None and record.get("id") is not None
    }
    attributions = _global_attributions(harvest_rows, index_by_identity)

    # Attribution is a global ledger projection, not a per-record side effect.
    attributions_path = root / "generated/attributions.jsonl"
    _atomic_write(attributions_path, _jsonl_text(attributions))
    attributions = _read_jsonl(attributions_path)

    attributed_by_id: dict[str, list[dict[str, Any]]] = defaultdict(list)
    name_only_by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in attributions:
        attributed_to = row.get("attributed_to")
        if attributed_to is not None:
            attributed_by_id[str(attributed_to)].append(row)
        else:
            name_only_by_name[str(row.get("lens", ""))].append(row)

    sightings_by_hash: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in harvest_rows:
        if row.get("kind") != "sighting":
            continue
        body_hash = row.get("body_hash")
        if body_hash not in (None, ""):
            sightings_by_hash[str(body_hash)].append(row)

    for record in records:
        lens_id = str(record.get("id", ""))
        name = str(record.get("name", ""))
        body_hash = record.get("body_hash")
        record["stats"] = _record_stats(
            attributed_by_id.get(lens_id, []),
            name_only_by_name.get(name, []),
            sightings_by_hash.get(str(body_hash), [])
            if body_hash not in (None, "")
            else [],
        )

    _atomic_write(index_path, _jsonl_text(records))
    return records


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python3 -m harvest stats")
    parser.add_argument("--data-root", default=str(DEFAULT_DATA_ROOT))
    args = parser.parse_args(argv)
    try:
        records = update_stats(data_root=args.data_root)
    except HarvestParseError as error:
        print(error, file=sys.stderr)
        return 1
    print(f"updated={len(records)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
