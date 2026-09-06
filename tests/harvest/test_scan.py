from __future__ import annotations

import hashlib
import json
from pathlib import Path

from harvest.scan import scan_roots
from harvest.thresholds import HASH_RECIPE, embedding_text, normalize_body


def _sort_key(row: dict) -> tuple[str, str, str, str]:
    return tuple(str(row.get(key, "")) for key in ("kind", "repo", "name", "path"))


def test_normalize_body_hash_recipe_is_stable() -> None:
    fixture = "  Alpha\n\nBeta\tGamma  "
    digest = hashlib.sha256(normalize_body(fixture).encode("utf-8")).hexdigest()
    assert HASH_RECIPE == "body-v1"
    assert digest == "7f455d8af06cf3355481ad7e509539775faad2176398ecbed9f6a913033f6284"


def test_embedding_text_prefers_spec_and_has_deterministic_body_fallback() -> None:
    spec = {
        "persona": "Evidence tracker",
        "focus": "claim provenance",
        "decision_lens": "verify",
        "review_areas": ["sources", "counterexamples"],
    }
    assert embedding_text(spec, "ignored") == (
        "Evidence tracker\nclaim provenance\nverify\nsources\ncounterexamples"
    )
    body = (
        "Apply the perspective of evidence before confidence.\n\n"
        "Details.\n\n"
        "### 1. Trace the claim\n"
        "### 2. Test the boundary\n"
    )
    assert embedding_text(None, body) == (
        "Apply the perspective of evidence before confidence.\n"
        "Trace the claim\n"
        "Test the boundary"
    )


def test_scan_harvests_sightings_provenance_and_lineage(harvest_tree) -> None:
    rows, unreadable = scan_roots(
        [harvest_tree.projects],
        machine="clavain",
        data_root=harvest_tree.data_root,
    )

    assert unreadable == []
    assert rows == sorted(rows, key=_sort_key)

    sightings = [row for row in rows if row["kind"] == "sighting"]
    reuse_sightings = [row for row in rows if row["kind"] == "reuse-sighting"]
    attributions = [row for row in rows if row["kind"] == "attribution"]
    lineages = [row for row in rows if row["kind"] == "lineage"]
    reuse_rows = [row for row in rows if row["kind"] == "reuse"]

    assert len(sightings) == 4
    assert len({row["body_hash"] for row in sightings}) == 3
    assert len(reuse_sightings) == 1
    assert reuse_sightings[0]["registry_id"] == "gen:fd-source@01234567"
    assert reuse_sightings[0]["body_hash"] not in {row["body_hash"] for row in sightings}
    assert len(reuse_rows) == 1
    assert reuse_rows[0]["machine"] == "clavain"

    assert not any("fd-skipped" in row.get("name", "") for row in rows)
    alpha = [row for row in sightings if row["name"] == "fd-alpha"]
    assert len(alpha) == 2
    assert alpha[0]["body_hash"] == alpha[1]["body_hash"]
    assert all(row["hash_recipe"] == "body-v1" for row in sightings)
    assert sum(row["drive_uses"] for row in alpha) == 1

    attached = next(row for row in alpha if row["spec"] is not None)
    assert attached["spec"]["persona"] == "Evidence tracker"
    assert attached["spec_path"] == str(harvest_tree.spec_path)
    assert attached["cohort"] == {
        "spec_file": str(harvest_tree.spec_path),
        "siblings": ["fd-alpha", "fd-companion"],
    }
    beta = next(row for row in sightings if row["name"] == "fd-beta")
    assert beta["frontmatter"] is None
    corrupt = next(row for row in sightings if row["name"] == "fd-corrupt")
    assert corrupt["corrupt"] is True
    assert all(row["corrupt"] is False for row in sightings if row is not corrupt)

    assert len(attributions) == 3
    assert {row["status"] for row in attributions} == {"upheld", "refuted", "raw"}
    assert all(row["body_hash"] for row in attributions)
    assert {row["finding_id"] for row in attributions if row["surfaced"]} == {
        "f-001",
        "f-003",
    }

    assert len(lineages) == 1
    assert lineages[0]["lens"] == "fd-fusion"
    assert lineages[0]["lineage_kind"] == "fusion"
    assert lineages[0]["parents"] == ["fd-alpha", "fd-beta"]

    harvest_path = harvest_tree.data_root / "harvest/clavain.jsonl"
    written_rows = [json.loads(line) for line in harvest_path.read_text().splitlines()]
    assert written_rows == rows
    assert not list(harvest_tree.data_root.rglob("*.tmp"))

    bodies = sorted((harvest_tree.data_root / "generated/lenses").glob("*.md"))
    assert len(bodies) == 3
    report = harvest_tree.data_root / "reports"
    assert len(list(report.glob("*-harvest-clavain.md"))) == 1


def test_dry_run_writes_nothing(harvest_tree, tmp_path: Path) -> None:
    data_root = tmp_path / "dry-run-data"
    rows, unreadable = scan_roots(
        [harvest_tree.projects],
        machine="clavain",
        data_root=data_root,
        dry_run=True,
    )

    assert rows
    assert unreadable == []
    assert not data_root.exists()
