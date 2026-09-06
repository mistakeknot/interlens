from __future__ import annotations

import json
from pathlib import Path

import pytest

from harvest.thresholds import embedding_text


FIXTURES = Path(__file__).parents[1] / "fixtures" / "embedding_text"


@pytest.mark.parametrize("expected_path", sorted(FIXTURES.glob("*.expected.txt")))
def test_embedding_text_fixture_is_byte_identical(expected_path: Path) -> None:
    case = expected_path.name.removesuffix(".expected.txt")
    spec_path = FIXTURES / f"{case}.spec.json"
    body_path = FIXTURES / f"{case}.body.md"
    spec = json.loads(spec_path.read_text(encoding="utf-8")) if spec_path.exists() else None
    body = body_path.read_text(encoding="utf-8") if body_path.exists() else ""
    expected = expected_path.read_text(encoding="utf-8").removesuffix("\n")

    assert embedding_text(spec, body).encode() == expected.encode()
