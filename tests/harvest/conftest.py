from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest


def _write(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def _agent(frontmatter: str, body: str) -> str:
    return f"---\n{frontmatter}\n---\n{body}"


@pytest.fixture
def harvest_tree(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> SimpleNamespace:
    projects = tmp_path / "projects"
    repo_one = projects / "repo-one"
    repo_two = projects / "repo-two"
    data_root = tmp_path / "registry-data"

    alpha_body = (
        "Apply the perspective of evidence before confidence.\n\n"
        "### 1. Trace the claim\n"
        "Follow the evidence to its source.\n"
    )
    beta_body = (
        "Apply the perspective of boundary testing.\n\n"
        "### 1. Find the edge\n"
        "Test the least comfortable boundary.\n"
    )

    alpha_one = _write(
        repo_one / ".claude/agents/fd-alpha.md",
        _agent(
            "\n".join(
                [
                    "description: Evidence lens",
                    "tier: used",
                    "generated_at: '2026-08-01T12:00:00+00:00'",
                    "domains: [verification]",
                ]
            ),
            alpha_body,
        ),
    )
    alpha_two = _write(
        repo_two / ".claude/agents/fd-alpha.md",
        _agent(
            "\n".join(
                [
                    "description: Evidence lens",
                    "tier: used",
                    "generated_at: '2026-08-02T12:00:00+00:00'",
                    "domains: [verification]",
                ]
            ),
            alpha_body,
        ),
    )
    beta = _write(
        repo_one / ".claude/agents/fd-beta.md",
        _agent("description: [unterminated", beta_body),
    )
    registry = _write(
        repo_two / ".claude/agents/fd-registry.md",
        _agent(
            "\n".join(
                [
                    "description: Materialized registry lens",
                    "tier: registry",
                    "registry_id: gen:fd-source@01234567",
                ]
            ),
            "Apply a body already accessioned elsewhere.\n",
        ),
    )
    corrupt = _write(
        repo_two / ".claude/agents/fd-corrupt.md",
        _agent(
            "description: Truncated lens",
            "Apply an incomplete perspective.\n[truncated — 64 chars omitted]\n",
        ),
    )

    _write(
        projects / ".worktrees/repo-copy/.claude/agents/fd-skipped.md",
        _agent("description: Worktree duplicate", "This must not be scanned.\n"),
    )
    _write(
        repo_one / ".claude/worktrees/session/.claude/agents/fd-skipped-too.md",
        _agent("description: Nested worktree duplicate", "This must not be scanned either.\n"),
    )

    spec_path = repo_one / ".claude/flux-gen-specs/seed-adjacent.json"
    _write(
        spec_path,
        json.dumps(
            {
                "agents": [
                    {
                        "name": "fd-alpha",
                        "persona": "Evidence tracker",
                        "focus": "claim provenance",
                        "decision_lens": "verify",
                        "review_areas": ["sources"],
                    },
                    {"name": "fd-companion", "persona": "Boundary scout"},
                ]
            }
        ),
    )

    melange = repo_one / "docs/research/flux-melange/run-001"
    ledger_rows = [
        {
            "id": "f-001",
            "source": {"kind": "lens", "agents": ["fd-alpha"]},
            "status": "upheld",
            "novelty": 8,
            "risk": {"blast_radius": 3, "likelihood": 7, "product": 21},
        },
        {
            "id": "f-002",
            "source": {"kind": "lens", "agents": ["fd-beta"]},
            "status": "refuted",
            "novelty": 4,
            "risk_product": 8,
        },
        {
            "finding_id": "f-003",
            "lens": "fd-alpha",
            "status": "raw",
            "novelty": 6,
            "risk_product": 13,
        },
    ]
    _write(
        melange / "heat-ledger.jsonl",
        "".join(json.dumps(row) + "\n" for row in ledger_rows),
    )
    _write(
        melange / "surfaced.jsonl",
        json.dumps({"finding_id": "f-001"}) + "\n" + json.dumps({"id": "f-003"}) + "\n",
    )
    _write(
        melange / "lenses/fd-fusion.json",
        json.dumps(
            {
                "name": "fd-fusion",
                "kind": "fusion",
                "parents": ["fd-alpha", "fd-beta"],
            }
        ),
    )

    _write(
        repo_one / "docs/research/flux-drive/drive-001/synthesis.md",
        "The useful result came from fd-alpha and not from an untracked lens.\n",
    )

    home = tmp_path / "home"
    monkeypatch.setenv("HOME", str(home))
    reuse_log = home / ".local/share/linsenkasten/reuse-log.jsonl"
    _write(
        reuse_log,
        json.dumps({"registry_id": "gen:fd-source@01234567", "name": "fd-source"}) + "\n",
    )

    return SimpleNamespace(
        projects=projects,
        repo_one=repo_one,
        repo_two=repo_two,
        data_root=data_root,
        alpha_one=alpha_one,
        alpha_two=alpha_two,
        beta=beta,
        registry=registry,
        corrupt=corrupt,
        spec_path=spec_path,
        reuse_log=reuse_log,
    )
