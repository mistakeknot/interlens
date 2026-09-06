from __future__ import annotations

import json
from pathlib import Path

from harvest.stats import update_stats


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(row, sort_keys=True) + "\n" for row in rows),
        encoding="utf-8",
    )


def _record(name: str, body_hash: str) -> dict:
    return {
        "id": f"gen:{name}@{body_hash[:8]}",
        "name": name,
        "body_hash": body_hash,
        "stats": {
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
        },
    }


def _attribution(
    run: str,
    finding_id: str,
    lens: str,
    status: str,
    body_hash: str | None,
    *,
    surfaced: bool = False,
    machine: str = "clavain",
) -> dict:
    return {
        "kind": "attribution",
        "machine": machine,
        "repo": "/projects/example",
        "path": "/projects/example/docs/research/flux-melange/run/heat-ledger.jsonl",
        "name": lens,
        "run": run,
        "finding_id": finding_id,
        "lens": lens,
        "status": status,
        "surfaced": surfaced,
        "body_hash": body_hash,
    }


def _sighting(name: str, body_hash: str, drive_uses: int, machine: str) -> dict:
    return {
        "kind": "sighting",
        "machine": machine,
        "repo": f"/projects/{machine}",
        "path": f"/projects/{machine}/.claude/agents/{name}.md",
        "name": name,
        "body_hash": body_hash,
        "drive_uses": drive_uses,
    }


def _seed_data(data_root: Path) -> list[dict]:
    hashes = {
        "fd-a": "a" * 64,
        "fd-b": "b" * 64,
        "fd-c-one": "c" * 64,
        "fd-c-two": "d" * 64,
    }
    records = [
        _record("fd-c", hashes["fd-c-two"]),
        _record("fd-b", hashes["fd-b"]),
        _record("fd-a", hashes["fd-a"]),
        _record("fd-c", hashes["fd-c-one"]),
    ]
    _write_jsonl(data_root / "generated/index.jsonl", records)

    attributions = [
        _attribution("run-1", "f-001", "fd-a", "upheld", hashes["fd-a"], surfaced=True),
        _attribution("run-1", "f-002", "fd-a", "upheld", hashes["fd-a"]),
        _attribution("run-2", "f-003", "fd-a", "refuted", hashes["fd-a"], surfaced=True),
        _attribution("run-2", "f-004", "fd-a", "raw", hashes["fd-a"]),
        _attribution("run-3", "f-005", "fd-b", "raw", hashes["fd-b"]),
        _attribution("run-4", "f-006", "fd-c", "upheld", hashes["fd-c-one"]),
        _attribution("run-4", "f-007", "fd-c", "upheld", hashes["fd-c-one"]),
        _attribution("run-4", "f-008", "fd-c", "refuted", hashes["fd-c-one"]),
        _attribution("run-4", "f-009", "fd-c", "upheld", None),
    ]
    sightings = [
        _sighting("fd-a", hashes["fd-a"], 3, "clavain"),
        _sighting("fd-a", hashes["fd-a"], 8, "zklw"),
        _sighting("fd-b", hashes["fd-b"], 1, "clavain"),
        _sighting("fd-c", hashes["fd-c-one"], 5, "clavain"),
        _sighting("fd-c", hashes["fd-c-two"], 2, "clavain"),
    ]
    _write_jsonl(data_root / "harvest/clavain.jsonl", [*attributions, *sightings])
    _write_jsonl(
        data_root / "harvest/zklw.jsonl",
        [
            {
                **attributions[5],
                "machine": "zklw",
                "repo": "/projects/example-copy",
                "path": "/projects/example-copy/docs/research/flux-melange/run/heat-ledger.jsonl",
            }
        ],
    )
    return records


def test_stats_are_scoped_by_name_and_body_hash(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    _seed_data(data_root)

    records = update_stats(data_root=data_root)
    by_id = {record["id"]: record for record in records}

    alpha = by_id[f"gen:fd-a@{'a' * 8}"]["stats"]
    assert alpha == {
        "findings": 4,
        "upheld": 2,
        "refuted": 1,
        "raw": 1,
        "adjudicated": 3,
        "surfaced": 2,
        "runs": 2,
        "hit_rate": 0.667,
        "smoothed_hit_rate": 0.6,
        "drive_uses": 8,
        "name_only": {"findings": 0, "upheld": 0, "refuted": 0},
    }

    beta = by_id[f"gen:fd-b@{'b' * 8}"]["stats"]
    assert beta["findings"] == 1
    assert beta["raw"] == 1
    assert beta["adjudicated"] == 0
    assert beta["hit_rate"] is None
    assert beta["smoothed_hit_rate"] is None

    first_variant = by_id[f"gen:fd-c@{'c' * 8}"]["stats"]
    second_variant = by_id[f"gen:fd-c@{'d' * 8}"]["stats"]
    assert first_variant["adjudicated"] == 3
    assert first_variant["drive_uses"] == 5
    assert second_variant["findings"] == 0
    assert second_variant["adjudicated"] == 0
    assert second_variant["drive_uses"] == 2


def test_drive_uses_follow_body_hash_when_a_lens_is_renamed(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    body_hash = "e" * 64
    _write_jsonl(
        data_root / "generated/index.jsonl",
        [_record("fd-old", body_hash)],
    )
    _write_jsonl(
        data_root / "harvest/clavain.jsonl",
        [_sighting("fd-new", body_hash, 7, "clavain")],
    )

    [record] = update_stats(data_root=data_root)

    assert record["stats"]["drive_uses"] == 7


def test_stats_write_global_unique_attributions_and_name_only_evidence(
    tmp_path: Path,
) -> None:
    data_root = tmp_path / "data"
    _seed_data(data_root)

    records = update_stats(data_root=data_root)
    attributions_path = data_root / "generated/attributions.jsonl"
    attributions = [
        json.loads(line)
        for line in attributions_path.read_text(encoding="utf-8").splitlines()
    ]

    keys = [
        (row["run"], row["finding_id"], row["lens"])
        for row in attributions
    ]
    assert len(attributions) == 9
    assert len(keys) == len(set(keys))
    assert keys == sorted(keys)

    hashed = next(row for row in attributions if row["finding_id"] == "f-006")
    assert hashed["body_hash"] == "c" * 64
    assert hashed["attributed_to"] == f"gen:fd-c@{'c' * 8}"
    name_only = next(row for row in attributions if row["finding_id"] == "f-009")
    assert name_only["body_hash"] is None
    assert name_only["attributed_to"] is None

    variants = [record for record in records if record["name"] == "fd-c"]
    assert [record["stats"]["name_only"] for record in variants] == [
        {"findings": 1, "upheld": 1, "refuted": 0},
        {"findings": 1, "upheld": 1, "refuted": 0},
    ]

    first_index_bytes = (data_root / "generated/index.jsonl").read_bytes()
    first_attribution_bytes = attributions_path.read_bytes()
    update_stats(data_root=data_root)
    assert (data_root / "generated/index.jsonl").read_bytes() == first_index_bytes
    assert attributions_path.read_bytes() == first_attribution_bytes
