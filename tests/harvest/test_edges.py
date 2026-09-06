from __future__ import annotations

import json
import struct
from datetime import date
from pathlib import Path

import pytest

from harvest.__main__ import main as harvest_main
from harvest.edges import update_edges
from harvest.report import audit_registry
from harvest.thresholds import EMBED_DIM, HASH_RECIPE


DAY = date(2026, 9, 6)


def _write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(row, sort_keys=True) + "\n" for row in rows),
        encoding="utf-8",
    )


def _vector(*values: float) -> list[float]:
    return [*values, *([0.0] * (EMBED_DIM - len(values)))]


def _write_matrix(data_root: Path, layer: str, rows: list[tuple[str, list[float]]]) -> None:
    embeddings = data_root / "embeddings"
    embeddings.mkdir(parents=True, exist_ok=True)
    _write_json(embeddings / f"{layer}.ids.json", [lens_id for lens_id, _ in rows])
    flattened = [value for _, vector in rows for value in vector]
    (embeddings / f"{layer}.f32").write_bytes(struct.pack(f"<{len(flattened)}f", *flattened))


def _record(
    lens_id: str,
    name: str,
    body_hash: str,
    *,
    smoothed_hit_rate: float | None = None,
    adjudicated: int = 0,
    use_count: int = 0,
    drive_uses: int = 0,
    last_seen: str = "2026-08-01T00:00:00+00:00",
    corrupt: bool = False,
    lineage: dict | None = None,
) -> dict:
    return {
        "id": lens_id,
        "name": name,
        "body_hash": body_hash,
        "body_path": f"generated/lenses/{lens_id}.md",
        "on_disk": True,
        "corrupt": corrupt,
        "last_seen": last_seen,
        "use_count": use_count,
        "lineage": lineage or {"kind": "unknown", "parents": []},
        "stats": {
            "adjudicated": adjudicated,
            "hit_rate": smoothed_hit_rate,
            "smoothed_hit_rate": smoothed_hit_rate,
            "drive_uses": drive_uses,
            "name_only": {"findings": 0, "upheld": 0, "refuted": 0},
        },
        "cluster": {"id": None, "head": False, "head_selected_by": None},
        "embodies": [],
    }


def _seed_data(data_root: Path) -> list[dict]:
    curated = [
        {"id": "curated-a", "name": "Curated A", "definition": "A"},
        {"id": "curated-b", "name": "Curated B", "definition": "B"},
        {"id": "curated-c", "name": "Curated C", "definition": "C"},
    ]
    _write_json(data_root / "curated/lenses.json", curated)
    records = [
        _record(
            "gen:fd-a@11111111",
            "fd-a",
            "1" * 64,
            smoothed_hit_rate=0.5,
            adjudicated=2,
            use_count=20,
        ),
        _record(
            "gen:fd-a@22222222",
            "fd-a",
            "2" * 64,
            smoothed_hit_rate=0.6,
            adjudicated=3,
        ),
        _record(
            "gen:fd-fusion@33333333",
            "fd-fusion",
            "3" * 64,
            lineage={"kind": "fusion", "parents": ["fd-a", "fd-other"]},
        ),
        _record("gen:fd-other@44444444", "fd-other", "4" * 64),
    ]
    _write_jsonl(data_root / "generated/index.jsonl", records)
    for record in records:
        body = data_root / record["body_path"]
        body.parent.mkdir(parents=True, exist_ok=True)
        body.write_text(f"Body for {record['name']}\n", encoding="utf-8")

    _write_matrix(
        data_root,
        "curated",
        [
            ("curated-a", _vector(1.0, 0.0, 0.0, 0.0)),
            ("curated-b", _vector(0.0, 1.0, 0.0, 0.0)),
            ("curated-c", _vector(0.0, 0.0, 1.0, 0.0)),
        ],
    )
    _write_matrix(
        data_root,
        "generated",
        [
            ("gen:fd-a@11111111", _vector(1.0, 0.0, 0.0, 0.0)),
            ("gen:fd-a@22222222", _vector(0.8, 0.0, 0.6, 0.0)),
            ("gen:fd-fusion@33333333", _vector(0.0, 1.0, 0.0, 0.0)),
            ("gen:fd-other@44444444", _vector(0.0, 0.0, 0.0, 1.0)),
        ],
    )
    _write_json(
        data_root / "embeddings/meta.json",
        {"hash_recipe": HASH_RECIPE, "dim": EMBED_DIM},
    )
    _write_jsonl(
        data_root / "generated/attributions.jsonl",
        [
            {
                "run": "run-1",
                "finding_id": "f-001",
                "lens": "fd-other",
                "body_hash": None,
                "attributed_to": None,
            }
        ],
    )
    return records


def _read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def test_edges_write_typed_edges_clusters_and_calibration_report(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    _seed_data(data_root)

    result = update_edges(data_root=data_root, report_date=DAY)

    records = _read_jsonl(data_root / "generated/index.jsonl")
    by_id = {record["id"]: record for record in records}
    head_id = "gen:fd-a@22222222"
    old_id = "gen:fd-a@11111111"
    assert by_id[head_id]["cluster"]["head"] is True
    assert by_id[head_id]["cluster"]["head_selected_by"] == "hit_rate"
    assert by_id[old_id]["cluster"]["head"] is False
    assert by_id["gen:fd-other@44444444"]["cluster"] == {
        "id": None,
        "head": True,
    }

    edges = _read_jsonl(data_root / "generated/edges.jsonl")
    variants = [edge for edge in edges if edge["type"] == "variant-of"]
    assert variants == [
        {
            "score": pytest.approx(0.8),
            "source": old_id,
            "target": head_id,
            "type": "variant-of",
        }
    ]
    fused = [edge for edge in edges if edge["type"] == "fused-from"]
    assert fused == [
        {
            "source": "gen:fd-fusion@33333333",
            "target": head_id,
            "type": "fused-from",
        },
        {
            "source": "gen:fd-fusion@33333333",
            "target": "gen:fd-other@44444444",
            "type": "fused-from",
        },
    ]
    weak = [edge for edge in edges if edge["type"] == "embodies" and edge["weak"]]
    assert weak == [
        {
            "score": pytest.approx(0.0),
            "source": "gen:fd-other@44444444",
            "target": "curated-a",
            "type": "embodies",
            "weak": True,
        }
    ]
    assert by_id["gen:fd-fusion@33333333"]["embodies"] == [
        {"id": "curated-b", "score": pytest.approx(1.0)}
    ]

    assert result["counts"] == {"embodies": 5, "fused-from": 2, "variant-of": 1}
    report = (data_root / "reports/2026-09-06-edges.md").read_text(encoding="utf-8")
    for heading in (
        "## Edge counts",
        "## Cluster size histogram",
        "## Closest non-merged pairs",
        "## Farthest merged pairs",
        "## Nearest-neighbor cosine histogram",
        "## Cluster head selection",
        "## Weak embodies",
        "## Corrupt records",
        "## Unresolved parents",
    ):
        assert heading in report
    assert "Name-only attribution rows: 1" in report


def test_head_selection_ties_fall_through_to_recency_then_id(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    _write_json(data_root / "curated/lenses.json", [])
    first = _record(
        "gen:fd-same@aaaaaaaa",
        "fd-same",
        "a" * 64,
        smoothed_hit_rate=0.6,
        adjudicated=3,
        use_count=4,
        drive_uses=2,
        last_seen="2026-08-02T00:30:00+00:00",
    )
    second = _record(
        "gen:fd-same@bbbbbbbb",
        "fd-same",
        "b" * 64,
        smoothed_hit_rate=0.6,
        adjudicated=3,
        use_count=5,
        drive_uses=1,
        last_seen="2026-08-01T18:00:00-07:00",
    )
    _write_jsonl(data_root / "generated/index.jsonl", [first, second])
    for record in (first, second):
        body = data_root / record["body_path"]
        body.parent.mkdir(parents=True, exist_ok=True)
        body.write_text("body\n", encoding="utf-8")
    _write_matrix(data_root, "curated", [])
    _write_matrix(
        data_root,
        "generated",
        [(first["id"], _vector(1.0)), (second["id"], _vector(0.0, 1.0))],
    )

    update_edges(data_root=data_root, report_date=DAY)
    records = _read_jsonl(data_root / "generated/index.jsonl")
    head = next(record for record in records if record["cluster"]["head"])
    assert head["id"] == second["id"]
    assert head["cluster"]["head_selected_by"] == "recency"

    for record in records:
        record["last_seen"] = "2026-08-02T00:00:00+00:00"
    _write_jsonl(data_root / "generated/index.jsonl", records)
    update_edges(data_root=data_root, report_date=DAY)
    records = _read_jsonl(data_root / "generated/index.jsonl")
    head = next(record for record in records if record["cluster"]["head"])
    assert head["id"] == first["id"]
    assert head["cluster"]["head_selected_by"] == "id"


def test_fusion_sighting_resolves_parents_through_cluster_head(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    records = _seed_data(data_root)
    fusion = next(record for record in records if record["name"] == "fd-fusion")
    fusion["lineage"] = {"kind": "unknown", "parents": []}
    _write_jsonl(data_root / "generated/index.jsonl", records)
    _write_jsonl(
        data_root / "harvest/clavain.jsonl",
        [
            {
                "kind": "sighting",
                "name": "fd-fusion",
                "body_hash": fusion["body_hash"],
                "spec_path": "/repo/specs/fd-fusion-fusion-2.json",
                "spec": {"name": "fd-fusion", "parents": ["fd-a", "fd-missing"]},
            }
        ],
    )

    result = update_edges(data_root=data_root, report_date=DAY)

    fused = [
        edge
        for edge in _read_jsonl(data_root / "generated/edges.jsonl")
        if edge["type"] == "fused-from"
    ]
    assert fused == [
        {
            "source": fusion["id"],
            "target": "gen:fd-a@22222222",
            "type": "fused-from",
        }
    ]
    assert result["unresolved_parents"] == [
        {"source": fusion["id"], "parent": "fd-missing"}
    ]


def test_audit_accepts_complete_registry_and_rejects_duplicate_body_hash(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    data_root = tmp_path / "data"
    _seed_data(data_root)
    update_edges(data_root=data_root, report_date=DAY)

    assert audit_registry(data_root=data_root) == []
    assert harvest_main(["audit", "--data-root", str(data_root)]) == 0

    records = _read_jsonl(data_root / "generated/index.jsonl")
    records[1]["body_hash"] = records[0]["body_hash"]
    _write_jsonl(data_root / "generated/index.jsonl", records)

    errors = audit_registry(data_root=data_root)
    assert any("duplicate body_hash" in error for error in errors)
    assert harvest_main(["audit", "--data-root", str(data_root)]) == 1
    assert "duplicate body_hash" in capsys.readouterr().err


@pytest.mark.parametrize(
    ("mutation", "expected"),
    [
        ("body-orphan", "orphan body file"),
        ("embedding-orphan", "orphan generated embedding row"),
        ("bad-edge", "missing edge endpoint"),
        ("two-heads", "expected exactly one head"),
        ("duplicate-attribution", "duplicate attribution key"),
        ("hash-recipe", "meta.hash_recipe"),
        ("missing-index", "cannot read generated index"),
    ],
)
def test_audit_reports_each_required_mismatch(
    tmp_path: Path,
    mutation: str,
    expected: str,
) -> None:
    data_root = tmp_path / "data"
    _seed_data(data_root)
    update_edges(data_root=data_root, report_date=DAY)

    if mutation == "body-orphan":
        (data_root / "generated/lenses/orphan.md").write_text("orphan\n", encoding="utf-8")
    elif mutation == "embedding-orphan":
        ids_path = data_root / "embeddings/generated.ids.json"
        ids = json.loads(ids_path.read_text(encoding="utf-8"))
        ids.append("gen:orphan@00000000")
        _write_json(ids_path, ids)
        matrix = data_root / "embeddings/generated.f32"
        matrix.write_bytes(matrix.read_bytes() + struct.pack(f"<{EMBED_DIM}f", *_vector(1.0)))
    elif mutation == "bad-edge":
        edges_path = data_root / "generated/edges.jsonl"
        edges = _read_jsonl(edges_path)
        edges.append(
            {"source": "gen:missing@00000000", "target": "curated-a", "type": "embodies"}
        )
        _write_jsonl(edges_path, edges)
    elif mutation == "two-heads":
        records = _read_jsonl(data_root / "generated/index.jsonl")
        cluster = next(record["cluster"]["id"] for record in records if record["cluster"]["id"])
        for record in records:
            if record["cluster"]["id"] == cluster:
                record["cluster"]["head"] = True
        _write_jsonl(data_root / "generated/index.jsonl", records)
    elif mutation == "duplicate-attribution":
        path = data_root / "generated/attributions.jsonl"
        path.write_bytes(path.read_bytes() * 2)
    elif mutation == "hash-recipe":
        _write_json(data_root / "embeddings/meta.json", {"hash_recipe": "wrong"})
    elif mutation == "missing-index":
        (data_root / "generated/index.jsonl").unlink()
    else:  # pragma: no cover - keeps the mutation table honest
        raise AssertionError(mutation)

    assert any(expected in error for error in audit_registry(data_root=data_root))
