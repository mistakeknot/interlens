from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from collections import defaultdict
from collections.abc import Iterable, Sequence
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import yaml

from .thresholds import (
    EXCLUDE_DIR_NAMES,
    HASH_RECIPE,
    MAX_DEPTH,
    REUSE_LOG_FALLBACK,
    TRUNCATION_MARKER,
    normalize_body,
)


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_ROOT = REPO_ROOT / "data"
LENS_NAME_RE = re.compile(r"\bfd-[a-z0-9-]+\b")


def _path_text(path: Path) -> str:
    return str(path.absolute())


def _jsonable(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(item) for item in value]
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def _read_text(path: Path, unreadable: list[str]) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        unreadable.append(_path_text(path))
        return None


def _read_json(path: Path, unreadable: list[str]) -> Any | None:
    text = _read_text(path, unreadable)
    if text is None:
        return None
    try:
        return json.loads(text)
    except (TypeError, ValueError):
        unreadable.append(_path_text(path))
        return None


def _read_jsonl(path: Path, unreadable: list[str]) -> list[dict[str, Any]]:
    text = _read_text(path, unreadable)
    if text is None:
        return []
    rows: list[dict[str, Any]] = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except (TypeError, ValueError):
            unreadable.append(f"{_path_text(path)}:{line_number}")
            continue
        if isinstance(row, dict):
            rows.append(row)
        else:
            unreadable.append(f"{_path_text(path)}:{line_number}")
    return rows


def _parse_agent(text: str) -> tuple[dict[str, Any] | None, str]:
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].strip() != "---":
        return None, text

    closing = next(
        (index for index, line in enumerate(lines[1:], start=1) if line.strip() == "---"),
        None,
    )
    if closing is None:
        return None, text

    body = "".join(lines[closing + 1 :])
    try:
        loaded = yaml.safe_load("".join(lines[1:closing]))
    except yaml.YAMLError:
        return None, body
    if loaded is None:
        return {}, body
    if not isinstance(loaded, dict):
        return None, body
    return _jsonable(loaded), body


def _mtime(path: Path, unreadable: list[str]) -> str | None:
    try:
        timestamp = path.stat().st_mtime
    except OSError:
        unreadable.append(_path_text(path))
        return None
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat()


def _contains_claude_worktree(path: Path) -> bool:
    parts = path.parts
    return any(
        parts[index] == ".claude" and parts[index + 1] == "worktrees"
        for index in range(len(parts) - 1)
    )


def _agent_paths(roots: Iterable[Path], unreadable: list[str]) -> list[Path]:
    found: set[Path] = set()

    def onerror(error: OSError) -> None:
        unreadable.append(str(error.filename or error))

    for raw_root in roots:
        root = raw_root.expanduser().absolute()
        for current, dirnames, filenames in os.walk(root, topdown=True, onerror=onerror):
            current_path = Path(current)
            try:
                depth = len(current_path.relative_to(root).parts)
            except ValueError:
                continue
            if depth >= MAX_DEPTH:
                dirnames[:] = []
            else:
                dirnames[:] = sorted(
                    dirname
                    for dirname in dirnames
                    if dirname not in EXCLUDE_DIR_NAMES
                    and not _contains_claude_worktree(current_path / dirname)
                )
            if (
                current_path.name == "agents"
                and current_path.parent.name == ".claude"
                and not _contains_claude_worktree(current_path)
            ):
                for filename in sorted(filenames):
                    if filename.startswith("fd-") and filename.endswith(".md"):
                        found.add((current_path / filename).absolute())
    return sorted(found, key=str)


def _repo_for_agent(path: Path) -> Path:
    if path.parent.name != "agents" or path.parent.parent.name != ".claude":
        raise ValueError(f"not a generated agent path: {path}")
    return path.parent.parent.parent


def _unwrap_specs(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        candidates = payload
    elif isinstance(payload, dict):
        candidates = payload.get("agents") or payload.get("specs") or []
        if not candidates and payload.get("name"):
            candidates = [payload]
    else:
        candidates = []
    return [_jsonable(item) for item in candidates if isinstance(item, dict)]


def _specs_for_repo(
    repo: Path,
    unreadable: list[str],
) -> dict[str, tuple[str, dict[str, Any], dict[str, Any]]]:
    spec_dir = repo / ".claude/flux-gen-specs"
    try:
        paths = sorted(spec_dir.glob("*.json"), key=str)
    except OSError:
        unreadable.append(_path_text(spec_dir))
        return {}

    result: dict[str, tuple[str, dict[str, Any], dict[str, Any]]] = {}
    for path in paths:
        payload = _read_json(path, unreadable)
        specs = _unwrap_specs(payload)
        siblings = [str(spec["name"]) for spec in specs if spec.get("name")]
        cohort = {"spec_file": _path_text(path), "siblings": siblings}
        for spec in specs:
            name = spec.get("name")
            if name and str(name) not in result:
                result[str(name)] = (_path_text(path), spec, cohort)
    return result


def _drive_uses(repo: Path, unreadable: list[str]) -> dict[str, int]:
    base = repo / "docs/research/flux-drive"
    if not base.is_dir():
        return {}
    runs_by_lens: dict[str, set[str]] = defaultdict(set)

    def onerror(error: OSError) -> None:
        unreadable.append(str(error.filename or error))

    for current, dirnames, filenames in os.walk(base, topdown=True, onerror=onerror):
        current_path = Path(current)
        dirnames[:] = sorted(name for name in dirnames if name not in EXCLUDE_DIR_NAMES)
        for filename in sorted(filenames):
            if not filename.endswith(".md"):
                continue
            path = current_path / filename
            text = _read_text(path, unreadable)
            if text is None:
                continue
            relative = path.relative_to(base)
            run = relative.parts[0] if len(relative.parts) > 1 else "."
            for name in set(LENS_NAME_RE.findall(text)):
                runs_by_lens[name].add(run)
    return {name: len(runs) for name, runs in runs_by_lens.items()}


def _run_name(repo: Path, run_dir: Path) -> str:
    return str(run_dir.relative_to(repo))


def _surfaced_ids(run_dir: Path, unreadable: list[str]) -> set[str]:
    path = run_dir / "surfaced.jsonl"
    if not path.exists():
        return set()
    return {
        str(identifier)
        for row in _read_jsonl(path, unreadable)
        if (identifier := row.get("finding_id") or row.get("id")) is not None
    }


def _melange_rows(
    repo: Path,
    machine: str,
    hashes_by_name: dict[str, str],
    unreadable: list[str],
) -> list[dict[str, Any]]:
    base = repo / "docs/research/flux-melange"
    if not base.is_dir():
        return []
    try:
        run_dirs = sorted((path for path in base.iterdir() if path.is_dir()), key=str)
    except OSError:
        unreadable.append(_path_text(base))
        return []

    rows: list[dict[str, Any]] = []
    for run_dir in run_dirs:
        run = _run_name(repo, run_dir)
        ledger_path = run_dir / "heat-ledger.jsonl"
        surfaced = _surfaced_ids(run_dir, unreadable)
        if ledger_path.exists():
            for ledger_row in _read_jsonl(ledger_path, unreadable):
                finding_id = ledger_row.get("finding_id") or ledger_row.get("id")
                # flux-melange's ledger names the lens inside `source: {kind, agents: [...]}` (checked across all
                # 58 Mac ledgers 2026-09-06); `lens` / `agent` are accepted as legacy spellings.
                source = ledger_row.get("source")
                agents = [a for a in (source.get("agents") or []) if a] if isinstance(source, dict) else []
                legacy = ledger_row.get("lens") or ledger_row.get("agent")
                names = agents or ([legacy] if legacy else [None])
                risk = ledger_row.get("risk")
                risk_product = ledger_row.get("risk_product")
                if risk_product is None and isinstance(risk, dict):
                    risk_product = risk.get("product")
                for lens in names:
                    rows.append(
                        {
                            "kind": "attribution",
                            "machine": machine,
                            "repo": _path_text(repo),
                            "path": _path_text(ledger_path),
                            "name": str(lens or ""),
                            "run": run,
                            "finding_id": finding_id,
                            "lens": lens,
                            "status": ledger_row.get("status"),
                            "novelty": ledger_row.get("novelty"),
                            "risk_product": risk_product,
                            "surfaced": str(finding_id) in surfaced if finding_id is not None else False,
                            "body_hash": hashes_by_name.get(str(lens)) if lens is not None else None,
                        }
                    )

        lenses_dir = run_dir / "lenses"
        if not lenses_dir.is_dir():
            continue
        try:
            lens_paths = sorted(lenses_dir.glob("*.json"), key=str)
        except OSError:
            unreadable.append(_path_text(lenses_dir))
            continue
        for path in lens_paths:
            payload = _read_json(path, unreadable)
            records = payload if isinstance(payload, list) else [payload]
            for record in records:
                if not isinstance(record, dict):
                    continue
                lens = record.get("lens") or record.get("name") or path.stem
                parents = record.get("parents") or []
                rows.append(
                    {
                        "kind": "lineage",
                        "machine": machine,
                        "repo": _path_text(repo),
                        "path": _path_text(path),
                        "name": str(lens),
                        "run": run,
                        "lens": str(lens),
                        "lineage_kind": record.get("kind"),
                        "parents": [str(parent) for parent in parents],
                    }
                )
    return rows


def _reuse_rows(machine: str, unreadable: list[str]) -> list[dict[str, Any]]:
    path = Path(os.path.expanduser(REUSE_LOG_FALLBACK))
    if not path.exists():
        return []
    rows = []
    for entry in _read_jsonl(path, unreadable):
        row = dict(entry)
        row.update(
            {
                "kind": "reuse",
                "machine": machine,
                "repo": str(entry.get("repo", "")),
                "path": _path_text(path),
                "name": str(entry.get("name", entry.get("lens", ""))),
            }
        )
        rows.append(row)
    return rows


def _row_sort_key(row: dict[str, Any]) -> tuple[str, str, str, str]:
    return tuple(str(row.get(key, "")) for key in ("kind", "repo", "name", "path"))


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


def _write_outputs(
    rows: list[dict[str, Any]],
    bodies: dict[tuple[str, str], str],
    unreadable: list[str],
    machine: str,
    data_root: Path,
) -> None:
    for (name, body_hash), body in sorted(bodies.items()):
        lens_id = f"gen:{name}@{body_hash[:8]}"
        _atomic_write(data_root / "generated/lenses" / f"{lens_id}.md", body)

    harvest_text = "".join(
        json.dumps(row, sort_keys=True, ensure_ascii=False) + "\n" for row in rows
    )
    _atomic_write(data_root / "harvest" / f"{machine}.jsonl", harvest_text)

    sightings = [row for row in rows if row["kind"] == "sighting"]
    by_repo: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in sightings:
        by_repo[row["repo"]].append(row)
    report_lines = [
        f"# Harvest {machine} — {date.today().isoformat()}",
        "",
        "| repo | sightings | unique bodies |",
        "|---|---:|---:|",
    ]
    for repo, repo_rows in sorted(by_repo.items()):
        unique = len({row["body_hash"] for row in repo_rows})
        report_lines.append(f"| {repo} | {len(repo_rows)} | {unique} |")
    report_lines.extend(["", "## Unreadable paths", ""])
    report_lines.extend(f"- `{path}`" for path in unreadable)
    if not unreadable:
        report_lines.append("None.")
    report_lines.append("")
    report_path = data_root / "reports" / f"{date.today().isoformat()}-harvest-{machine}.md"
    _atomic_write(report_path, "\n".join(report_lines))


def scan_roots(
    roots: Iterable[str | os.PathLike[str]],
    *,
    machine: str,
    data_root: str | os.PathLike[str] = DEFAULT_DATA_ROOT,
    dry_run: bool = False,
) -> tuple[list[dict[str, Any]], list[str]]:
    unreadable: list[str] = []
    root_paths = [Path(root) for root in roots]
    agent_paths = _agent_paths(root_paths, unreadable)
    repos = sorted({_repo_for_agent(path) for path in agent_paths}, key=str)
    specs = {repo: _specs_for_repo(repo, unreadable) for repo in repos}
    drive_uses = {repo: _drive_uses(repo, unreadable) for repo in repos}

    rows: list[dict[str, Any]] = []
    bodies: dict[tuple[str, str], str] = {}
    hashes_by_repo: dict[Path, dict[str, str]] = defaultdict(dict)
    for path in agent_paths:
        text = _read_text(path, unreadable)
        if text is None:
            continue
        frontmatter, body = _parse_agent(text)
        normalized = normalize_body(body)
        body_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        repo = _repo_for_agent(path)
        name = path.stem
        hashes_by_repo[repo][name] = body_hash
        spec_path = None
        spec = None
        cohort = None
        if name in specs[repo]:
            spec_path, spec, cohort = specs[repo][name]

        kind = "reuse-sighting" if frontmatter and frontmatter.get("tier") == "registry" else "sighting"
        row = {
            "kind": kind,
            "machine": machine,
            "repo": _path_text(repo),
            "path": _path_text(path),
            "name": name,
            "body_hash": body_hash,
            "hash_recipe": HASH_RECIPE,
            "frontmatter": frontmatter,
            "spec_path": spec_path,
            "spec": spec,
            "cohort": cohort,
            "drive_uses": drive_uses[repo].get(name, 0),
            "mtime": _mtime(path, unreadable),
            "corrupt": bool(TRUNCATION_MARKER.search(body)),
        }
        if kind == "reuse-sighting":
            row["registry_id"] = frontmatter.get("registry_id")
        else:
            bodies[(name, body_hash)] = body
        rows.append(row)

    for repo in repos:
        rows.extend(_melange_rows(repo, machine, hashes_by_repo[repo], unreadable))
    rows.extend(_reuse_rows(machine, unreadable))
    rows.sort(key=_row_sort_key)
    unreadable[:] = sorted(set(unreadable))

    if not dry_run:
        _write_outputs(rows, bodies, unreadable, machine, Path(data_root))
    return rows, unreadable


def _counts(rows: Iterable[dict[str, Any]], unreadable: Sequence[str]) -> tuple[int, int, int]:
    sightings = [row for row in rows if row.get("kind") == "sighting"]
    return len(sightings), len({row["body_hash"] for row in sightings}), len(unreadable)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python3 -m harvest scan")
    parser.add_argument("--machine", required=True)
    parser.add_argument("--roots", nargs="+", default=[str(Path.home() / "projects"), str(Path.home() / ".claude")])
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    rows, unreadable = scan_roots(
        args.roots,
        machine=args.machine,
        dry_run=args.dry_run,
    )
    scanned, unique_bodies, unreadable_count = _counts(rows, unreadable)
    print(
        f"scanned={scanned} unique_bodies={unique_bodies} unreadable={unreadable_count}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
