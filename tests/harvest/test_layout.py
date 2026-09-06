from __future__ import annotations

import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_harvest_data_is_not_gitignored() -> None:
    ignored = subprocess.run(
        ["git", "check-ignore", "-q", "data/harvest/x.jsonl"],
        cwd=ROOT,
        check=False,
    )
    assert ignored.returncode == 1

    lines = (ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()
    assert not any(re.match(r"^/?data(/|$)", line) for line in lines)
