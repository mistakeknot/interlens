from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

from harvest.merge import HarvestParseError, main, merge_harvests


NOW = datetime(2026, 9, 4, 12, 0, tzinfo=timezone.utc)


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(row, sort_keys=True) + "\n" for row in rows),
        encoding="utf-8",
    )


def _sighting(
    *,
    machine: str,
    repo: str,
    name: str = "fd-alpha",
    body_hash: str = "a" * 64,
    generated_at: str = "2026-08-01T12:00:00+00:00",
    mtime: str = "2026-08-02T12:00:00+00:00",
    spec: dict | None = None,
    spec_path: str | None = None,
) -> dict:
    return {
        "kind": "sighting",
        "machine": machine,
        "repo": repo,
        "path": f"/{repo}/.claude/agents/{name}.md",
        "name": name,
        "body_hash": body_hash,
        "hash_recipe": "body-v1",
        "frontmatter": {
            "generated_at": generated_at,
            "generated_by": "flux-gen-prompt",
            "flux_gen_version": 6,
            "tier": "used",
            "use_count": 4,
            "last_used": "2026-08-12",
            "domains": ["uncategorized", "migration"],
        },
        "spec": spec,
        "spec_path": spec_path,
        "cohort": (
            {"spec_file": spec_path, "siblings": [name, "fd-beta"]}
            if spec is not None
            else None
        ),
        "drive_uses": 2,
        "mtime": mtime,
        "corrupt": False,
    }


def _prior_record(*, body_hash: str = "c" * 64) -> dict:
    lens_id = f"gen:fd-carry@{body_hash[:8]}"
    return {
        "id": lens_id,
        "name": "fd-carry",
        "body_hash": body_hash,
        "body_path": f"generated/lenses/{lens_id}.md",
        "accessioned_at": "2026-07-01T00:00:00+00:00",
        "last_sighted": "2026-08-01T00:00:00+00:00",
        "on_disk": True,
        "sightings": 3,
        "sightings_seen": 5,
        "reuse_sightings": 1,
        "machines": ["clavain", "zklw"],
        "repos": ["legacy-one", "legacy-two"],
        "hash_recipe": "body-v1",
        "corrupt": False,
        "first_seen": "2026-06-01T00:00:00+00:00",
        "last_seen": "2026-08-01T00:00:00+00:00",
        "generated_by": "flux-gen-prompt",
        "flux_gen_version": 5,
        "tier": "used",
        "use_count": 9,
        "last_used": "2026-07-20",
        "domains": ["migration", "reliability"],
        "source_spec": "/old/spec.json",
        "spec_path": "generated/specs/gen:fd-carry@cccccccc.json",
        "summary": "Carry this lens forward.",
        "lineage": {"kind": "fusion", "parents": ["fd-left", "fd-right"]},
        "cohort": {"spec_file": "/old/spec.json", "siblings": ["fd-carry"]},
        "stats": {
            "findings": 3,
            "upheld": 2,
            "refuted": 1,
            "raw": 0,
            "adjudicated": 3,
            "surfaced": 1,
            "runs": 2,
            "hit_rate": 0.667,
            "smoothed_hit_rate": 0.6,
            "drive_uses": 4,
            "name_only": {"findings": 0, "upheld": 0, "refuted": 0},
        },
        "cluster": {"id": "cluster-old", "head": True, "head_selected_by": "usage"},
        "embodies": [{"lens": "curated:1", "score": 0.8}],
    }


def test_merge_unions_machines_writes_spec_and_is_byte_stable(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    spec = {
        "name": "fd-alpha",
        "persona": "Trace migration evidence. Then challenge the claim.",
        "focus": "provenance",
    }
    _write_jsonl(
        data_root / "harvest/clavain.jsonl",
        [
            _sighting(
                machine="clavain",
                repo="repo-one",
                spec=spec,
                spec_path="/repo-one/spec.json",
            ),
            {
                "kind": "lineage",
                "machine": "clavain",
                "repo": "repo-one",
                "path": "/repo-one/lenses/fd-alpha.json",
                "name": "fd-alpha",
                "lens": "fd-alpha",
                "lineage_kind": "fusion",
                "parents": ["fd-left", "fd-right"],
            },
        ],
    )
    _write_jsonl(
        data_root / "harvest/zklw.jsonl",
        [
            _sighting(
                machine="zklw",
                repo="repo-two",
                generated_at="2026-08-03T12:00:00+00:00",
                mtime="2026-08-04T12:00:00+00:00",
            ),
            _sighting(
                machine="zklw",
                repo="repo-two",
                name="fd-zeta",
                body_hash="b" * 64,
            ),
        ],
    )

    records = merge_harvests(data_root=data_root, now=NOW)
    alpha = next(record for record in records if record["name"] == "fd-alpha")
    assert alpha["machines"] == ["clavain", "zklw"]
    assert alpha["repos"] == ["repo-one", "repo-two"]
    assert alpha["sightings"] == 2
    assert alpha["sightings_seen"] == 2
    assert alpha["last_sighted"] == "2026-08-04T12:00:00+00:00"
    assert alpha["first_seen"] == "2026-08-01T12:00:00+00:00"
    assert alpha["last_seen"] == "2026-08-03T12:00:00+00:00"
    assert alpha["domains"] == ["migration"]
    assert alpha["summary"] == "Trace migration evidence."
    assert alpha["lineage"] == {
        "kind": "fusion",
        "parents": ["fd-left", "fd-right"],
    }
    assert alpha["stats"]["hit_rate"] is None
    assert alpha["cluster"] == {"id": None, "head": False, "head_selected_by": None}
    assert alpha["embodies"] == []

    spec_path = data_root / "generated/specs" / f"{alpha['id']}.json"
    assert json.loads(spec_path.read_text(encoding="utf-8")) == spec
    index_path = data_root / "generated/index.jsonl"
    first_bytes = index_path.read_bytes()
    assert [record["id"] for record in records] == sorted(record["id"] for record in records)

    merge_harvests(data_root=data_root, now=datetime(2026, 9, 5, tzinfo=timezone.utc))
    assert index_path.read_bytes() == first_bytes


def test_merge_carries_forward_zero_sighting_record_and_reactivates_it(
    tmp_path: Path,
) -> None:
    data_root = tmp_path / "data"
    prior = _prior_record()
    _write_jsonl(data_root / "generated/index.jsonl", [prior])
    body_path = data_root / prior["body_path"]
    body_path.parent.mkdir(parents=True, exist_ok=True)
    body_path.write_text("existing body\n", encoding="utf-8")

    [carried] = merge_harvests(data_root=data_root, now=NOW)
    assert carried["on_disk"] is False
    assert carried["sightings"] == 0
    assert carried["sightings_seen"] == 5
    assert carried["last_sighted"] is None
    assert carried["reuse_sightings"] == 0
    assert carried["accessioned_at"] == prior["accessioned_at"]
    for field in (
        "machines",
        "repos",
        "domains",
        "tier",
        "use_count",
        "lineage",
        "last_used",
        "last_seen",
        "cohort",
        "source_spec",
        "spec_path",
        "summary",
        "generated_by",
        "flux_gen_version",
    ):
        assert carried[field] == prior[field]
    assert body_path.read_text(encoding="utf-8") == "existing body\n"

    reappeared = _sighting(
        machine="clavain",
        repo="repo-returned",
        name=prior["name"],
        body_hash=prior["body_hash"],
    )
    _write_jsonl(data_root / "harvest/clavain.jsonl", [reappeared])
    [active] = merge_harvests(
        data_root=data_root,
        now=datetime(2026, 9, 6, tzinfo=timezone.utc),
    )
    assert active["on_disk"] is True
    assert active["sightings"] == 1
    assert active["sightings_seen"] == 5
    assert active["accessioned_at"] == prior["accessioned_at"]
    assert body_path.read_text(encoding="utf-8") == "existing body\n"


@pytest.mark.parametrize("target", ["harvest", "index"])
def test_merge_rejects_torn_jsonl_without_changing_index(
    tmp_path: Path,
    target: str,
    capsys: pytest.CaptureFixture[str],
) -> None:
    data_root = tmp_path / "data"
    prior = _prior_record()
    index_path = data_root / "generated/index.jsonl"
    _write_jsonl(index_path, [prior])
    original = index_path.read_bytes()
    harvest_path = data_root / "harvest/clavain.jsonl"
    _write_jsonl(harvest_path, [_sighting(machine="clavain", repo="repo-one")])
    torn_path = harvest_path if target == "harvest" else index_path
    torn_path.write_bytes(torn_path.read_bytes() + b'{"kind":"sighting"')
    expected = torn_path.read_bytes() if target == "index" else original

    with pytest.raises(HarvestParseError) as error:
        merge_harvests(data_root=data_root, now=NOW)
    assert error.value.path == torn_path
    assert error.value.line_no == 2
    assert index_path.read_bytes() == expected

    assert main(["--data-root", str(data_root)]) == 1
    assert str(torn_path) in capsys.readouterr().err
    assert index_path.read_bytes() == expected
