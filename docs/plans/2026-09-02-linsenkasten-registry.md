---
artifact_type: plan
bead: none
goal: 8222288d
stage: design
distills: docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md
---
# Linsenkasten — Generated-Lens Registry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use clavain:executing-plans to implement this plan task-by-task. Written for a sonnet-grade executor: every step names its file, its code, and a machine-checkable expectation. No step says "use your judgment".

> **Executor rules (orchestrated runs, added 2026-09-06 after runs 9ff672eb/444d40a5):** (1) work only inside this worktree — never edit, commit or push any other repository; (2) never `git push` — the controller lands every stage with the landing rule in Task 1; (3) commit with the idiom in Task 1 (`--no-verify -F /tmp/msg -- <paths>`), pathspec only; (4) never touch the sweep-gated files listed in Task 1 Step 1 while `git log --oneline main..sweep/2026-09-02 | wc -l` is nonzero; (5) steps marked **controller-owned** are done by the controller — skip them, and a reviewer must not count them against the task; (6) `node --test` takes a quoted glob (`"packages/mcp/test/**/*.test.mjs"`), never a directory; (7) do not edit this plan — report a defect in the plan as `VERDICT: NEEDS_ATTENTION` and let the controller fold it. **Controller-owned steps:** Task 1 Step 4 (CI, sweep-gated); Task 2 Step 3 (done); Task 4 Step 0 (done); Task 14 (real harvest + landing); Task 15; Task 18; Task 20; Task 22's zklw unit, timer and `ts-ip` steps; Task 23's `--plan`/`--apply` sweeps and the Sylveste PR; Task 24; Task 25's publish and goal close.

**Goal (ic 8222288d):** every generated `fd-*` review lens across both machines becomes a queryable, ranked, reusable graph inside this plugin; flux-gen and melange check it before generating; the repo piles go away.

**Ruled design (all five forks, see the brainstorm):** rename to `linsenkasten` · typed edges only (`embodies`, `fused-from`, `variant-of`) · hash + variant-cluster dedupe with one canonical head per cluster · delete repo piles post-harvest with a sweep report · **hybrid engine**: the MCP queries an in-repo store locally on both machines, zklw runs the harvest and embedding passes and commits the data.

**Architecture:** `packages/mcp` (Node 22, ESM) stops calling the dead Railway API; a `lib/store.js` + `lib/graph.js` pair serves every tool from `data/` (curated JSON moved from `apps/api`, plus the generated layer). A Python package `harvest/` (stdlib + pyyaml, no third-party ML) walks a machine's repos, dedupes by content hash, attaches provenance, ledger hit-rates and lineage, computes 768-d `nomic-embed-text` vectors through Ollama, derives the three edge types, and writes sweep reports. interflux's `generate-agents.py` gains a registry lookup so a matching canonical lens is materialized instead of regenerated, and the reuse is logged. The Flask app, Supabase store, Railway and Vercel configs retire. The explorer is served from zklw by a small Node HTTP server over the same store.

**Tech Stack:** Node 22 (`node:test`, `node:http`, no new npm deps), Python 3.12+ (stdlib, `pyyaml`; tests via pytest already in CI), Ollama `nomic-embed-text` (768-d; serving on Clavain and zklw, checked 2026-09-02), git for sync, systemd user units on zklw.

**Repo path note:** the repo is `~/projects/Sylveste/interverse/interlens` until Task 20 renames it to `.../interverse/linsenkasten` on both machines. Paths below are repo-relative. The main checkout currently sits on a sibling session's unpushed `sweep/2026-09-02` branch; do the work in the `feat/linsenkasten` worktree (`~/projects/.worktrees/interlens-linsenkasten`) and see Task 1 for landing order.

**Prior Learnings:**
- `docs/solutions/best-practices/agent-description-example-blocks-required-clavain-20260210.md` (Sylveste): agent frontmatter `description` is load-bearing for Clavain's agent lint. Materialized reused lenses (Task 16) copy the registry body verbatim so the description survives.
- An empty result is not a zero: `hit_rate` is `null` when nothing was adjudicated (Task 10). "Could not look" is not "nothing there": every scan step reports unreadable paths separately from empty ones (Tasks 8, 23).
- Prove the target before optimizing: thresholds (Task 12) ship with a calibration table in the report so a human can see the ten closest non-merged and ten farthest merged pairs before any deletion.
- Commit discipline in this workspace: `git commit -F <file> -- <paths>`; never prose in a shell-quoted `-m`. Commits from a worktree need `--no-verify` until interlock's pre-commit lock handles worktree `.git` files (papercut logged 2026-09-02); the reservation check it skips is irrelevant here because no other session edits this repo's new files.
- Scan every review artifact for secret patterns before committing — `grep -rnoE 'npm_[A-Za-z0-9]{30,}|ghp_[A-Za-z0-9]{30,}|github_pat_|_authToken|sk-[A-Za-z0-9]{20,}|xox[bp]-|AKIA[A-Z0-9]{16}|tskey-' docs/research` — a melange agent pasted the npm token from `~/.npmrc` into a run-2 finding and GitHub push protection caught it (2026-09-03); a copied token is burned and must be rotated.

---

## Must-Haves

**Truths** (observable behaviors):
- From a fresh Claude session on either machine with the plugin enabled, `search_lenses`, `find_lens_journey`, `find_contrasting_lenses`, `detect_thinking_gaps` and `get_central_lenses` answer with no network access.
- `search_lenses` returns lenses from both layers; each result says which layer it came from; `get_lens` resolves a generated lens by its `fd-*` name to the cluster head.
- `resolve_lens` given a flux-gen spec returns the best canonical generated lens with its score, embodied curated lenses and hit-rate, or an explicit no-match.
- `generate-agents.py` with `--registry=auto` materializes a registry hit instead of rendering the spec, marks the file `tier: registry` with `registry_id`, and appends a line to the reuse log. At least one real flux-gen or melange run did this and the log shows it.
- Both machines' harvests are merged: every unique body has exactly one record; every collapsed copy is listed in a sweep report with its registry id; nothing was deleted from a repo whose files were not all present in the registry.
- The plugin, repo, MCP server key, marketplace row and settings key are all `linsenkasten`; `grep -ri interlens` in the repo hits only the CHANGELOG history and the brainstorm/research/plan docs.
- The explorer served from zklw lists both layers and works from a Mac browser over Tailscale.

**Artifacts** (files with specific exports):
- `packages/mcp/lib/store.js` exports `loadStore`, `getAllLenses`, `getLens`, `searchLenses`, `getLensesByEpisode`, `getFrames`, `getRelatedLenses`, `getStats`, `resolveLens`, `recordReuse`.
- `packages/mcp/lib/graph.js` exports `buildGraph`, `findPaths`, `findBridges`, `findContrasts`, `neighborhood`, `centralLenses`, `frameCoverage`, `triads`, `progression`.
- `packages/mcp/lib/embed.js` exports `embedTexts`, `loadMatrix`, `cosineTopK`, `EMBED_MODEL`, `EMBED_DIM`.
- `packages/mcp/lib/api-local.js` exports the 18 names `index.js` imports today from `api-client.js` plus the new `getGraph` — 19 exports, listed in Task 6 (melange-3 f-011) — same result shapes.
- `packages/mcp/server.js` (explorer HTTP server) and `packages/mcp/scripts/smoke.mjs` (stdio MCP smoke client).
- `harvest/__init__.py`, `harvest/scan.py`, `harvest/merge.py`, `harvest/stats.py`, `harvest/embed.py`, `harvest/edges.py`, `harvest/prune.py`, `harvest/report.py`, `harvest/thresholds.py`, `harvest/__main__.py`.
- `data/curated/{lenses,connections,frames}.json`, `data/generated/index.jsonl`, `data/generated/lenses/<id>.md`, `data/generated/specs/<id>.json`, `data/generated/edges.jsonl`, `data/generated/attributions.jsonl`, `data/generated/reuse-log.jsonl`, `data/embeddings/{curated,generated}.f32` + `.ids.json` + `meta.json`, `data/reports/*.md`, `data/prune-targets.txt`.
- interflux: `scripts/lib_lens_registry.py`, `--registry` flag in `scripts/generate-agents.py`, `tests/test_lens_registry.py`.

**Key Links** (connections where breakage cascades):
- `index.js` → `lib/api-local.js` → `lib/store.js`/`lib/graph.js` → `data/`. If `data/` moves, `lib/store.js:DATA_ROOT` is the single place that knows.
- `harvest/embed.py` and `packages/mcp/lib/embed.js` must agree on model, dimension, byte layout (`float32` little-endian, row-major, ids file order) and the embedding-text recipe (`harvest/thresholds.py:embedding_text` is the single definition; `embed.js` only reads vectors and embeds *queries*).
- `harvest/edges.py` cluster-head rule ↔ `store.js:getLens` name resolution ↔ `lib_lens_registry.py:resolve` all read `index.jsonl:cluster.head`. One field, three readers.
- `generate-agents.py --registry` must run before `check_existing_agents` decides `skip-existing`, otherwise a stale local copy shadows the registry.
- Prune (Task 23) reads `data/generated/index.jsonl` sightings; it must never run against a registry older than the harvest of the same machine (the report records both timestamps and the script skips any target whose newest agent file mtime is newer than the harvest — per target, Task 23 precondition (4)).

---

## Stage A — Baseline and landing order

### Task 1: Baseline, test scaffolding, CI node step

**Files:**
- Create: `packages/mcp/test/smoke.test.mjs`
- Modify: `.github/workflows/ci.yml` (add node step after the pytest step)
- Modify: `packages/mcp/package.json` (add `"test": "node --test \"test/**/*.test.mjs\""` — a quoted glob, not a directory: on Node v22.22.3 a directory argument is run as if it were a test file and dies with `MODULE_NOT_FOUND` (checked 2026-09-06 from a shell and in the executor sandbox, commit be278e5 — an earlier note here claiming the directory form worked misread that failure), and the glob never executes non-test helpers placed under `test/`; bump `"version"` later in Task 19)

**Step 1: Confirm branch and landing order**
Run from the worktree: `git status -sb && git log --oneline -3 && git log --oneline main..sweep/2026-09-02 | wc -l`
Expected: branch `feat/linsenkasten`. Print the sweep count; **the only value that matters is `0`** (the sibling's `sweep/2026-09-02` has landed) — any nonzero count means keep waiting, whatever the number (a snapshot, not an invariant: it read 4, then 5, on successive live checks; melange-3 f-007). Rule: **do not touch `README.md`, `CHANGELOG.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `kimi.plugin.json` or `.github/workflows/ci.yml` until `git log --oneline main..sweep/2026-09-02 | wc -l` prints `0`** (the sweep edits exactly those). When it prints 0, run `git rebase main` in the worktree once and continue. Task 1's CI edit and every Stage D/E task wait behind this rule; Stages B and C do not.

**Step 2: Baseline test run**
Run: `PYTHONPATH=$HOME/projects/Sylveste/interverse python3 -m pytest tests -q`
Expected: exit 0 (structural tests need `_shared` from the interverse dir; the worktree's `parents[3]` is not it, hence `PYTHONPATH`).

**Step 3: Write the first node test**
```js
// packages/mcp/test/smoke.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

test('curated lens corpus is present and well-formed', async () => {
  const p = path.join(here, '..', '..', '..', 'data', 'curated', 'lenses.json');
  const lenses = JSON.parse(await readFile(p, 'utf8'));
  assert.equal(Array.isArray(lenses), true);
  assert.equal(lenses.length, 258);
  for (const l of lenses) assert.ok(l.id && l.name && l.definition, `bad lens ${JSON.stringify(l).slice(0, 80)}`);
});
```
Run: `node --test "packages/mcp/test/**/*.test.mjs"`
Expected: FAIL with `ENOENT … data/curated/lenses.json` (the file does not exist yet — Task 2 creates it); `# tests 1` must appear, proving discovery reached the file.

**Step 4: CI step (controller-owned; only after the landing rule in Step 1 clears)**
Append to `.github/workflows/ci.yml` under `steps:`:
```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: node --test "packages/mcp/test/**/*.test.mjs"
      - run: python3 -m pytest tests -q || [ $? -eq 5 ]
```
(remove the earlier pytest line so pytest runs once, after node; the `|| [ $? -eq 5 ]` guard: on a GitHub checkout the structural tests skip for lack of `_shared`, and pytest exits 5 for "no tests collected" until Stage C's `tests/harvest/` exists — measured 2026-09-06). **CI must actually go green (melange-2 f-034):** the structural tests import `interverse/_shared` from `parents[3]` of the test file, which on a GitHub checkout is empty. `_shared` is the repo `mistakeknot/interverse-shared` (visibility: PRIVATE — a CI clone would need a token, so do not add one). The `tests/structural/conftest.py` guard — `import pytest; pytest.importorskip("_shared", reason="interverse-shared not checked out beside this repo")` before the `_shared` import — **is already landed (be278e5, 2026-09-06; that file is not in the sweep's list)**; the harvest and node tests carry CI. After the first landing, `gh run list -R mistakeknot/interlens -L 1 --json conclusion -q '.[0].conclusion'` must print `success`; a red run blocks the next stage.

**Step 5: Commit**
```bash
git add packages/mcp/test/smoke.test.mjs packages/mcp/package.json
git commit --no-verify -F /tmp/msg -- packages/mcp/test/smoke.test.mjs packages/mcp/package.json
```
(commit message file: `test: node test scaffold for the local engine`)

**Commit idiom for every later task (the plan writes only the message text and the pathspec from here on):**
```bash
printf '%s\n' "<message text>" > /tmp/msg && git commit --no-verify -F /tmp/msg -- <paths>
```
**Landing rule (every stage):** when a stage's tasks verify, fast-forward main from the worktree with `git push origin feat/linsenkasten:main` (interlens `main` has `enforce_admins` on but no required reviews or status checks, checked 2026-09-03, so a fast-forward push lands), then on zklw `git -C ~/projects/Sylveste/interverse/interlens pull --ff-only origin main`. zklw has no `feat/linsenkasten` checkout and never needs one; **Task 15 must not start until Task 14's data commit is visible in `git log -1 origin/main` from zklw.**

<verify>
- run: `PYTHONPATH=$HOME/projects/Sylveste/interverse python3 -m pytest tests -q`
  expect: exit 0
- run: `test -f packages/mcp/test/smoke.test.mjs && echo ok`
  expect: contains "ok"
- run: `gh run list -R mistakeknot/interlens -L 1 --json conclusion -q '.[0].conclusion'` (after the first landing)
  expect: contains "success"
</verify>

---

## Stage B — Local engine (curated layer first)

### Task 2: Move curated data to `data/curated/`

**Files:**
- Move: `apps/api/all_lenses_for_analysis.json` → `data/curated/lenses.json`
- Move: `apps/api/claude_lens_connections_analysis.json` → `data/curated/connections.json`
- Move: `apps/api/lens_frames_thematic.json` → `data/curated/frames.json`
- Create: `data/README.md`

**Step 1:** `mkdir -p data/curated && git mv apps/api/all_lenses_for_analysis.json data/curated/lenses.json && git mv apps/api/claude_lens_connections_analysis.json data/curated/connections.json && git mv apps/api/lens_frames_thematic.json data/curated/frames.json`

**Step 2:** Write `data/README.md`:
```markdown
# data/ — the Linsenkasten store

Single git-synced store read by `packages/mcp` on every machine. Nothing here is served from a host.

- `curated/` — the 258 FLUX lenses (`lenses.json`), 280 typed connections (`connections.json`: principle | contrast | synthesis | emergence | application), 28 thematic frames (`frames.json`). Hand-curated; edited rarely.
- `generated/` — the harvested `fd-*` layer. `index.jsonl` one record per unique lens body; `lenses/<id>.md` the body; `specs/<id>.json` the flux-gen spec when one was found; `edges.jsonl` typed edges; `attributions.jsonl` ledger finding ↔ lens rows; `reuse-log.jsonl` append-only reuse records.
- `harvest/<machine>.jsonl` — per-machine sightings (one row per file seen). Inputs to merge; never edited by hand.
- `embeddings/` — `nomic-embed-text` 768-d float32 little-endian row-major matrices with `.ids.json` giving row order; `meta.json` records model, dim, counts and the harvest commit. Regenerated only by `python3 -m harvest embed` (canonical run: zklw).
- `reports/` — dated harvest / merge / prune sweep reports. Every collapse and every deletion is listed here.
- `prune-targets.txt` — the explicit list of repos prune may touch. Reviewed by a human before `--apply`.
```

**Step 3 (controller-owned — DONE 2026-09-06: the connector points at `data/curated/lenses.json` on `mistakeknot/interweave` main `d394afe`, both checkouts synced to it; external consumer of the moved file — melange-2 f-002):** two sibling checkouts hardcode the old path: `~/projects/Sylveste/interverse/lattice/src/lattice/connectors/interlens.py:27` (`DEFAULT_LENSES_REL = Path("interverse/interlens/apps/api/all_lenses_for_analysis.json")`) and its copy `~/projects/Sylveste/core/interweave/src/lattice/connectors/interlens.py`. Both checkouts use `https://github.com/mistakeknot/interweave.git`; `lattice` is the canonical checkout and `core/interweave` is a legacy checkout of the same standalone repository. Change both working copies to `Path("interverse/interlens/data/curated/lenses.json")` in the same session as the move (Task 20 changes the directory segment again), run `PYTHONPATH=src python3 -m pytest tests/test_connector_interlens.py -q` in each checkout, then commit and push the change once from lattice. Confirm `origin/main` contains the connector change and sync the legacy checkout; do not open a redundant PR for the same repository. Class and `SUBSYSTEM` identifiers stay `interlens` for now — a lattice-side key with stored observations behind it; renaming it is a lattice decision, listed under follow-ups in Task 25.

**Step 4:** Run: `node --test "packages/mcp/test/**/*.test.mjs"`  Expected: PASS (Task 1's test now finds the file).

**Step 5: Commit** (`git add -A data apps/api` then the commit idiom with pathspec `data apps/api`; message `data: move curated lens corpus to data/curated`)

<verify>
- run: `node --test "packages/mcp/test/**/*.test.mjs"`
  expect: exit 0
- run: `python3 -c "import json;print(len(json.load(open('data/curated/lenses.json'))), len(json.load(open('data/curated/connections.json'))['connections']), len(json.load(open('data/curated/frames.json'))['frames']))"`
  expect: contains "258 280 28"
- run: `cd ~/projects/Sylveste/interverse/lattice && PYTHONPATH=src python3 -m pytest tests/test_connector_interlens.py -q`
  expect: exit 0
- run: `cd ~/projects/Sylveste/core/interweave && PYTHONPATH=src python3 -m pytest tests/test_connector_interlens.py -q`
  expect: exit 0
</verify>

### Task 3: `lib/store.js` — load both layers, lexical search, lookups

**DONE 2026-09-06 (run c55aee55, commits 05f6ed9..1f09eb0 + controller fix): the code block below mirrors the shipped file; `getLens` returns a shallow copy and token-less queries return nothing except an exact name match.**

**Files:**
- Create: `packages/mcp/lib/store.js`
- Create: `packages/mcp/lib/constants.js`
- Test: `packages/mcp/test/store.test.mjs`

**Step 1: constants**
```js
// packages/mcp/lib/constants.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, '..', '..', '..');
export const DATA_ROOT = process.env.LINSENKASTEN_DATA_ROOT || path.join(REPO_ROOT, 'data');
export const EMBED_MODEL = 'nomic-embed-text';
export const EMBED_DIM = 768;
export const OLLAMA_URL = process.env.LINSENKASTEN_OLLAMA_URL || 'http://127.0.0.1:11434';
export const OLLAMA_FALLBACK_URL = process.env.LINSENKASTEN_OLLAMA_FALLBACK_URL || 'http://zklw:11434';
export const OLLAMA_TIMEOUT_MS = 4000;
export const RESOLVE_MIN_COSINE = 0.86;   // registry hit threshold (mirrors harvest/thresholds.py)
```

**Step 2: failing test**
```js
// packages/mcp/test/store.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStore, searchLenses, getLens, getLensesByEpisode, getFrames, getRelatedLenses, getStats } from '../lib/store.js';

test('store loads curated layer', async () => {
  const s = await loadStore();
  assert.equal(s.curated.length, 258);
  assert.equal(s.frames.length, 28);
  assert.equal(s.connections.length, 280);
});
test('lexical search ranks exact name first', async () => {
  const r = await searchLenses('Situation-Behavior-Impact', 5);
  assert.equal(r.lenses[0].name, 'Situation-Behavior-Impact');
  assert.equal(r.lenses[0].layer, 'curated');
});
test('lexical search finds exact names made only of short words', async () => {
  const r = await searchLenses('To Be or to Do', 5);
  assert.equal(r.lenses[0].name, 'To Be or to Do');
});
test('getLens by name and by id', async () => {
  assert.equal((await getLens('Founder Mode')).id, 'lens_161_headline_founder_mode');
  assert.equal((await getLens('lens_161_headline_founder_mode')).name, 'Founder Mode');
  assert.equal(await getLens('no-such-lens-xyz'), null);
});
test('episode, frames, related, stats', async () => {
  assert.ok((await getLensesByEpisode(11)).lenses.length >= 1);
  assert.equal((await getFrames()).frames.length, 28);
  const rel = await getRelatedLenses('Eye of Sauron', 5);
  assert.ok(rel.connections.some(c => c.target_name === 'Founder Mode' || c.source_name === 'Founder Mode'));
  const st = await getStats();
  assert.equal(st.total_lenses, 258);
});
```
Run: `node --test "packages/mcp/test/**/*.test.mjs"`  Expected: FAIL (module missing).

**Step 3: implementation** — `packages/mcp/lib/store.js`:
```js
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DATA_ROOT } from './constants.js';

let _store = null;

function tokens(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

async function readJsonl(p) {
  try { return (await readFile(p, 'utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l)); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}

function normalizeGeneratedLens(record, index) {
  const name = record.name || record.lens_name;
  if (typeof name !== 'string' || name.trim() === '') {
    throw new TypeError(`Generated lens ${record.id || `at index ${index}`} is missing a name`);
  }
  return {
    ...record,
    name: name.trim(),
    layer: 'generated',
    definition: record.summary,
    examples: [],
    related_concepts: (record.domains || []).filter(domain => domain !== 'uncategorized'),
    episode: null,
  };
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function readOnlyMap(map) {
  let proxy;
  proxy = new Proxy(map, {
    get(target, property, receiver) {
      if (property === 'set' || property === 'delete' || property === 'clear') {
        return () => { throw new TypeError('Cannot modify read-only Map'); };
      }
      if (property === 'size') return target.size;
      if (property === 'get' || property === 'has' || property === 'keys'
          || property === 'values' || property === 'entries' || property === Symbol.iterator) {
        return target[property].bind(target);
      }
      if (property === 'forEach') {
        return (callback, thisArg) => target.forEach(
          (value, key) => callback.call(thisArg, value, key, proxy),
        );
      }
      return Reflect.get(target, property, receiver);
    },
  });
  return Object.freeze(proxy);
}

export async function loadStore(force = false) {
  if (_store && !force) return _store;
  const curated = JSON.parse(await readFile(path.join(DATA_ROOT, 'curated', 'lenses.json'), 'utf8'))
    .map(l => ({ ...l, name: l.name || l.lens_name, layer: 'curated' }));
  const connections = JSON.parse(await readFile(path.join(DATA_ROOT, 'curated', 'connections.json'), 'utf8')).connections;
  const frames = JSON.parse(await readFile(path.join(DATA_ROOT, 'curated', 'frames.json'), 'utf8')).frames;
  const generated = (await readJsonl(path.join(DATA_ROOT, 'generated', 'index.jsonl')))
    .map(normalizeGeneratedLens);
  const edges = await readJsonl(path.join(DATA_ROOT, 'generated', 'edges.jsonl'));
  const mutableById = new Map(); const mutableByName = new Map();
  for (const l of curated) { mutableById.set(l.id, l); mutableByName.set(l.name.toLowerCase(), l); }
  for (const g of generated) {
    mutableById.set(g.id, g);
    const key = g.name.toLowerCase();
    // cluster head wins name resolution; first-seen otherwise
    if (!mutableByName.has(key) || (g.cluster && g.cluster.head)) mutableByName.set(key, g);
  }
  const mutableFrameOfLens = new Map();
  for (const f of frames) for (const id of f.lens_ids || []) { if (!mutableFrameOfLens.has(id)) mutableFrameOfLens.set(id, []); mutableFrameOfLens.get(id).push(f.id); }
  for (const collection of [curated, generated, connections, frames, edges]) deepFreeze(collection);
  for (const frameIds of mutableFrameOfLens.values()) deepFreeze(frameIds);
  const byId = readOnlyMap(mutableById);
  const byName = readOnlyMap(mutableByName);
  const frameOfLens = readOnlyMap(mutableFrameOfLens);
  _store = Object.freeze({ curated, generated, connections, frames, edges, byId, byName, frameOfLens });
  return _store;
}

export async function getAllLenses(layer = 'all') {
  const s = await loadStore();
  return layer === 'curated' ? [...s.curated] : layer === 'generated' ? [...s.generated] : [...s.curated, ...s.generated];
}

export async function getLens(nameOrId) {
  const s = await loadStore();
  if (!nameOrId) return null;
  const hit = s.byId.get(nameOrId) || s.byName.get(String(nameOrId).toLowerCase());
  return hit ? { ...hit } : null;   // shallow copy: the cache is frozen, callers decorate
}

function lexicalScore(q, lens) {
  const query = String(q ?? '').toLowerCase();
  const name = lens.name.toLowerCase();
  if (name === query) return 100;
  const qt = tokens(query); if (qt.length === 0) return 0;   // no tokens → no result; the exact-name check above is the one exception
  let score = name.includes(query) ? 20 : 0;
  const nt = new Set(tokens(lens.name));
  const dt = new Set(tokens([lens.definition, ...(lens.examples || []), ...(lens.related_concepts || [])].join(' ')));
  for (const t of qt) { if (nt.has(t)) score += 10; else if (dt.has(t)) score += 2; }
  return score;
}

export async function searchLenses(query, limit = 10, { layer = 'all' } = {}) {
  const all = await getAllLenses(layer);
  const scored = all.map(l => ({ l, s: lexicalScore(query, l) })).filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.l.name.localeCompare(b.l.name)).slice(0, limit);
  const items = scored.map(({ l, s }) => ({ ...l, score: s }));
  return { success: true, query, count: scored.length,
    lenses: items, results: items.map(item => ({ ...item })) };
}

export async function getLensesByEpisode(episode) {
  const s = await loadStore();
  const lenses = s.curated.filter(l => String(l.episode) === String(episode));
  return { success: true, episode, count: lenses.length, lenses };
}

export async function getFrames() {
  const s = await loadStore();
  return { success: true, frames: [...s.frames], count: s.frames.length };
}

export async function getRelatedLenses(nameOrId, limit = 5) {
  const s = await loadStore(); const lens = await getLens(nameOrId);
  if (!lens) return null;
  const conns = s.connections.filter(c => c.source_id === lens.id || c.target_id === lens.id)
    .sort((a, b) => b.weight - a.weight).slice(0, limit)
    .map(c => ({
      ...c,
      source_name: c.source_name ?? s.byId.get(c.source_id)?.name,
      target_name: c.target_name ?? s.byId.get(c.target_id)?.name,
    }));
  return { success: true, lens: { id: lens.id, name: lens.name }, count: conns.length, connections: conns };
}

export async function getStats() {
  const s = await loadStore();
  const byType = {}; for (const l of s.curated) byType[l.type] = (byType[l.type] || 0) + 1;
  return { success: true, total_lenses: s.curated.length, generated_lenses: s.generated.length,
    connections: s.connections.length, frames: s.frames.length, by_type: byType };
}

export async function recordReuse(entry) {
  const line = JSON.stringify({ ...entry, recorded_at: new Date().toISOString() }) + '\n';
  const p = path.join(DATA_ROOT, 'generated', 'reuse-log.jsonl');
  await mkdir(path.dirname(p), { recursive: true });
  await appendFile(p, line);
  return { success: true };
}
// resolveLens is added in Task 13 (needs embed.js)
```
Note: `searchLenses` returns both `lenses` and `results` because `index.js` reads `results.lenses` in `search_lenses` and `results.results[0]` in `getLens` today (Task 6 keeps both readers working).

**Step 4:** Run: `node --test "packages/mcp/test/**/*.test.mjs"`  Expected: PASS.

**Step 5: Commit** — `feat(store): local store over data/ with lexical search`

<verify>
- run: `node --test "packages/mcp/test/**/*.test.mjs"`
  expect: exit 0
</verify>

### Task 4: `lib/graph.js` — port of `apps/api/src/lens/graph.py` plus the creative routes

**Files:**
- Create: `packages/mcp/lib/graph.js`
- Test: `packages/mcp/test/graph.test.mjs`
- Reference (read, do not modify): `apps/api/src/lens/graph.py:18-335`, `apps/api/lens_search_api.py:134-200` (`calculate_frame_coverage`), `:1298-1353` (journey), `:1355-1409` (bridges), `:1411-1459` (contrasts), `:1461-1521` (central), `:1523-1573` (neighborhood), `:1575-1632` (random), `:1634-1715` (gaps), `:1813-1954` (triads), `:1956-2074` (progressions)

**Directedness — a deliberate, documented divergence (melange-2 f-005/f-014):** `graph.py` builds a `networkx.DiGraph` and its own methods disagree about direction (`find_contrasts` reads successors and predecessors, `get_lens_neighborhood` reads successors only, `find_path` follows edge direction, so half of all journeys were impossible). The port is **undirected**: every edge is stored in both adjacency maps. The old service is dead, so no output comparison is possible; the test below asserts the intended divergence instead (a neighborhood is reachable from either endpoint of a `contrast` edge).

**Edge construction (edge set exactly as `graph.py:48-142`, stored undirected):** weighted graph over curated lens ids. Edges in this order, never overwriting an existing edge: (1) `connections.json` rows with `weight`, `type`, `insight`; (2) every pair inside one frame's `lens_ids`, weight `0.3`, type `frame`; (3) every pair across adjacent episodes (`ep`, `ep+1`), weight `0.1`, type `temporal`; (4) every pair sharing a `related_concepts` entry (lower-cased) that between 2 and 5 lenses share, weight `0.4`, type `concept`. Then (5) generated-layer typed edges from `edges.jsonl` (`embodies` generated→curated with `score` as weight; `fused-from` and `variant-of` generated↔generated, weight `score` or `0.5` when absent).

**Functions and exact semantics:**
- `buildGraph(store)` → `{ adj: Map<id, Map<id, {weight,type,insight?}>> , ids: string[] }`.
- `findPaths(g, srcId, dstId, maxLen = 4, limit = 3)`: all simple paths of length ≤ `maxLen` by DFS; rank by sum of edge weights descending, tie by shorter length, then by the joined id string (deterministic tie-break is a JS-side choice; `graph.py:143-170` sorts by weight only and caps at 3 — melange-2 f-008); return `limit`.
- `findBridges(g, ids)`: candidate nodes not in `ids` adjacent to **at least two** ids in `ids` (the undirected reading of `graph.py:172-198`'s "middle node of a length-3 path between any pair" — melange-2 f-007); score = summed edge weight between the candidate and every group member it touches; return top **5** descending, tie by id.
- `findContrasts(g, id)`: neighbors joined by an edge of `type === 'contrast'`, sorted by weight descending.
- `neighborhood(g, id, radius = 2)`: BFS out to `radius`; returns `{ <edge_type>: [...ids] }` grouped by the type of the edge that first discovered each node (exactly `graph.py:219-241`; the MCP handler iterates `Object.entries(results.neighborhood)` as `[edge_type, lenses]`), each list in discovery order.
- `centralLenses(g, measure = 'betweenness', limit = 10, { layer = 'curated' } = {})`: computed over the **curated subgraph by default** (`layer: 'all'` opts into the full two-layer graph; melange f-003). Measures — all four that the live tool schema and `graph.py:304-335` between them name (melange-2 f-006): `betweenness` = Brandes on the unweighted graph, normalized by `(n-1)(n-2)/2`; `pagerank` = power iteration, damping 0.85, 100 iterations, uniform start, undirected (each edge counts both ways); `eigenvector` = power iteration on the adjacency matrix, 100 iterations, L2-normalized each step; `degree` = neighbor count / (n-1). Unknown measure → `degree` (as Python does). Return `[{id, name, centrality_score}]` sorted descending, tie by id. Task 6 adds `degree` to the `get_central_lenses` schema enum (`index.js:216-231`) as a documented addition and drops nothing.
- `frameCoverage(store, exploredNames)` → `{explored: {<frame name>: <explored lens count>}, underexplored: [frame names with exactly 1 explored lens], unexplored: [the rest], unknown: [names getLens could not resolve], total_frames: 28, coverage_percentage: Math.round(Object.keys(explored).length / total_frames * 100)}`. **`explored` is an object map, not a name array** — `index.js:1035-1039` does `Object.entries(cov.explored_frames)` as `[frame, count]` — while `underexplored`/`unexplored` are string arrays (`index.js:1043-1049` does `.length`/`.slice`); the per-frame count is computed once here and never re-tallied downstream (melange-3 f-016/f-026/f-027). Explored names resolve through `getLens`.
- `triads(g, store, id, limit = 3)`: thesis = lens; for each contrast neighbor (antithesis) find a synthesis node adjacent to both with the highest summed weight; emit `{thesis, antithesis, synthesis, contrast_insight, synthesis_insight}` where `synthesis_insight` = the `insight` of the synthesis↔antithesis edge, else of the synthesis↔thesis edge, else `''` (`index.js:1176` prints it when non-empty; melange-3 f-010/f-018); `limit` triads.
- `progression(g, store, startId, targetId, maxSteps = 5)`: best path from `findPaths(..., maxSteps, 1)`; each step `{step, lens, insight}` where `insight` is the edge `insight` from the previous step or `''`; also return `overall_insight` = the last non-empty step `insight`, else `''` (`index.js:1216` prints it when non-empty; melange-3 f-010/f-018).

**Step 0: capture the Python reference before it is deleted (melange-2 f-030).** Create `scripts/capture-graph-reference.py` (runs `apps/api/src/lens/graph.py`'s `LensGraph` against `data/curated/` with `DATA_DIR` pointed there and dumps JSON) and run it once with `uv run --with networkx python3 scripts/capture-graph-reference.py` (uv is on both machines; networkx resolves in seconds) to write `tests/fixtures/graph-py/{central_betweenness,central_pagerank,central_eigenvector,paths_eye_founder,contrasts_eye,neighborhood_eye_r2,bridges_eye_founder}.json` plus `meta.json`. **Done by the controller 2026-09-06 (fixtures committed; executors do not re-run it).** Checked live: the Python graph holds 292 nodes, not 258 — `add_edge` auto-creates 34 phantom nodes for connection endpoints with no lens record; the capture drops them from every fixture and lists them in `meta.json:phantom_nodes`, and the JS `buildGraph` (curated ids only) never creates them — the second documented divergence. `graph.test.mjs` asserts the documented relations against these: contrasts equal as sets (both directions were read in Python too); the JS neighborhood is a superset of the Python one; **and for each of the four centrality measures the JS top-10 shares at least 8 ids with `central_<measure>_undirected.json`** — the Python reference recomputed on the phantom-free, symmetrised graph, which is the graph the port actually builds (ruled 2026-09-06 on the executor's question in run 1963e685: measured overlaps betweenness 10/10, pagerank 9/10, eigenvector 10/10, degree 10/10 at identical edge counts, 6,496; against the *directed* `central_betweenness.json` the overlap is only 3/10 because 248 of the 280 curated connections are one-directional — that fixture stays as documentation and is never asserted on). Commit the fixtures; Task 21 notes `git log -1 -- apps/api/src/lens/graph.py` as the pointer to the deleted reference.

**Step 1: failing test**
```js
// packages/mcp/test/graph.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStore } from '../lib/store.js';
import { buildGraph, findPaths, findBridges, findContrasts, neighborhood, centralLenses, frameCoverage, triads } from '../lib/graph.js';

const EYE = 'lens_161_weekly_eye_of_sauron', FOUNDER = 'lens_161_headline_founder_mode';

test('graph has the curated connection edges', async () => {
  const g = buildGraph(await loadStore());
  assert.equal(g.ids.length, 258);
  assert.equal(g.adj.get(EYE).get(FOUNDER).type, 'contrast');
});
test('paths, contrasts, neighborhood, bridges', async () => {
  const s = await loadStore(); const g = buildGraph(s);
  assert.ok(findPaths(g, EYE, FOUNDER).length >= 1);
  assert.ok(findContrasts(g, EYE).map(c => c.id).includes(FOUNDER));
  const n = neighborhood(g, EYE, 1); assert.ok((n.contrast || []).includes(FOUNDER));
  assert.ok((neighborhood(g, FOUNDER, 1).contrast || []).includes(EYE)); // undirected by design
  assert.ok(Array.isArray(findBridges(g, [EYE, FOUNDER])));
});
test('centrality and coverage are deterministic', async () => {
  const s = await loadStore(); const g = buildGraph(s);
  const a = centralLenses(g, 'betweenness', 3), b = centralLenses(g, 'betweenness', 3);
  assert.deepEqual(a, b); assert.equal(a.length, 3);
  for (const m of ['betweenness', 'pagerank', 'eigenvector', 'degree']) {
    assert.equal(centralLenses(g, m, 3).length, 3);
    const ref = new Set(JSON.parse(await readFile(new URL(`../../../tests/fixtures/graph-py/central_${m}_undirected.json`, import.meta.url), 'utf8')).map(([id]) => id));
    const shared = centralLenses(g, m, 10).filter(({ id }) => ref.has(id)).length;
    assert.ok(shared >= 8, `${m}: only ${shared}/10 ids shared with the undirected Python reference`);
  }
  const cov = frameCoverage(s, ['Eye of Sauron']);
  assert.equal(cov.total_frames, 28); assert.ok(!Array.isArray(cov.explored) && Object.keys(cov.explored).length >= 1);
  assert.ok(Array.isArray(cov.unexplored) && typeof cov.coverage_percentage === 'number');
  assert.ok(triads(g, s, EYE, 2).length >= 1);
});
test('betweenness on a synthetic 2,000-node graph stays under 3 s', () => {
  const ids = Array.from({ length: 2000 }, (_, i) => `n${i}`);
  const adj = new Map(ids.map(id => [id, new Map()]));
  for (let i = 0; i < 2000; i++) for (const j of [i + 1, i + 7, i * 3 % 2000]) if (j < 2000 && j !== i) { adj.get(ids[i]).set(ids[j], { weight: 0.5, type: 'synthetic' }); adj.get(ids[j]).set(ids[i], { weight: 0.5, type: 'synthetic' }); }
  const t0 = Date.now(); centralLenses({ adj, ids }, 'betweenness', 5, { layer: 'all' });
  assert.ok(Date.now() - t0 < 3000);
});
```
Run: `node --test "packages/mcp/test/**/*.test.mjs"` → FAIL (module missing).

**Step 2:** implement `packages/mcp/lib/graph.js` per the semantics above (pure functions; no I/O; Brandes betweenness written out, not imported).

**Step 3:** Run the test → PASS.

**Step 4: Commit** — `feat(graph): port lens graph and creative queries to JS`

<verify>
- run: `node --test "packages/mcp/test/**/*.test.mjs"`
  expect: exit 0
</verify>

### Task 5: `lib/embed.js` — Ollama client, matrix loader, cosine top-k

**Files:**
- Create: `packages/mcp/lib/embed.js`
- Test: `packages/mcp/test/embed.test.mjs` (uses a fake Ollama on `node:http`; no network)

**Semantics:**
- `getModelDigest(url)`: GET `${url}/api/tags`, return the `digest` of the entry whose `name` is `nomic-embed-text:latest`, else `null`.
- `embedTexts(texts, {urls = [OLLAMA_URL, OLLAMA_FALLBACK_URL], timeoutMs = OLLAMA_TIMEOUT_MS})`: POST `{model: EMBED_MODEL, input: texts}` to `${url}/api/embed`; on success return `{ vectors: Float32Array[] (length texts.length, each EMBED_DIM), tier: 'local' | 'fallback', model_digest }`; on any failure try the next url; when all fail return `null` (never throw). Log each failure to stderr once per process and count it in `embedCounters` (`{local, fallback, lexical, mismatch}`, exported). **Every tool result that used an embedding carries `embed_tier` and `model_match` (`model_digest === meta.model_digest` from `data/embeddings/meta.json`); a lexical fallback carries `embed_tier: 'lexical'`** (melange convergence cluster: the fallback tier must be labeled and counted, never silent).
- `loadMatrix(layer)`: read `data/embeddings/<layer>.f32` into a `Float32Array`, `<layer>.ids.json` (array of ids) and `meta.json`; assert `buf.length === ids.length * EMBED_DIM` else return `null`; expose `meta`.
- `cosineTopK(vec, matrix, ids, k)`: vectors are L2-normalized on load; returns `[{id, score}]` top-k descending, tie by id.

**Step 1: failing test** — start a fake server that answers `/api/tags` with `{models:[{name:'nomic-embed-text:latest',digest:'sha256:fake'}]}` and `/api/embed` with deterministic vectors (`Array.from({length:768}, (_, i) => (i === texts.indexOf(t)) ? 1 : 0)`), point `urls` at it, assert `embedTexts(['a','b'])` returns two `Float32Array(768)`; assert `embedTexts(['a'], {urls:['http://127.0.0.1:1']})` returns `null`; write a temp `.f32` of 3 unit vectors and assert `cosineTopK(e0, m, ids, 1)[0].id === ids[0]`.

**Step 2:** implement; **Step 3:** test PASS; **Step 4: Commit** — `feat(embed): ollama embedding client with fallback and cosine top-k`

<verify>
- run: `node --test "packages/mcp/test/**/*.test.mjs"`
  expect: exit 0
</verify>

### Task 6: Rewire `index.js` onto the local engine; delete the API client

**Files:**
- Create: `packages/mcp/lib/api-local.js`
- Modify: `packages/mcp/index.js:12` (`import * as api from './api-client.js'` → `'./lib/api-local.js'`)
- Delete: `packages/mcp/api-client.js`, `packages/mcp/.cache/` (if present), `packages/mcp/.env.example`
- Modify: `packages/mcp/package.json` (remove `node-fetch`; keep `express`/`cors` until Task 21)
- Create: `packages/mcp/scripts/smoke.mjs`
- Test: `packages/mcp/test/api-local.test.mjs`

**`api-local.js` must export these 19 names — 18 carried over from `api-client.js` (`grep -c '^export ' packages/mcp/api-client.js` → `18`, checked 2026-09-03) plus the new `getGraph` (melange-3 f-011) — with these result shapes (what `index.js` reads). Two MCP *resource* handlers also call the client — `lens://episodes` (`index.js:451-473`, `api.fetchFromAPI('/lenses?limit=500')`) and `lens://graph` (`index.js:475-490`, `api.fetchFromAPI('/connections')`) — and both must be rewritten in this task to `api.getAllLenses()` grouped by episode and `api.getGraph()`, with the `getCachedData`/`setCachedData` calls removed (melange-2 f-013: otherwise both resources throw for every reader the moment `api-client.js` is deleted).**

| export | returns |
|---|---|
| `getCachedData(key)` / `setCachedData(key, data)` | no-ops returning `null` / `undefined` (kept so nothing else breaks) |
| `fetchFromAPI(endpoint)` | throws `Error('linsenkasten: remote API retired; use the local store')` |
| `searchLenses(q, limit)` | `store.searchLenses` result (`{lenses, results, count}`) |
| `getLens(name)` | the lens object or `null` |
| `getLensesByEpisode(ep)` | `{success, episode, count, lenses}` |
| `getRelatedLenses(name, limit)` | `{success, lens, count, connections}` or `null` |
| `findLensJourney(src, dst)` | `{success, source_lens, target_lens, paths: [[lensObj...], ...], path_weights: [number, ...], error?}` — **each path is a bare array of lens objects**: the unmodified handler at `index.js:770-781` does `path.length` and `path.forEach(lens => …)` on every entry of `paths` and would throw on a `{lenses, total_weight}` wrapper (melange-3 f-015); the weight lives in the parallel `path_weights` |
| `findBridgeLenses(names)` | `{success, count, bridges: [lensObj + {connection_strength}] (top 5), insight}` |
| `findContrastingLenses(name)` | `{success, source_lens, count, contrasts: [lensObj + {weight, insight}]}` |
| `getCentralLenses(measure, limit)` | `{success, measure, central_lenses: [lensObj + {centrality_score}], insight}` |
| `getLensNeighborhood(name, radius)` | `{success, source_lens, radius, neighborhood: {<edge_type>: [lensObj]}}` |
| `getGraph()` | `{success, connections: [...curated connections], edges: [...generated typed edges]}` — used by the `lens://graph` resource |
| `getRandomProvocation(context)` | `{success, provocation: lensObj, related: [lensObj], gap_analysis?: {coverage: {explored: <count of explored frames>, total: 28}, was_gap_biased: bool, suggested_from_frame: string or null}, suggestion}` — `gap_analysis` is **its own hand-built shape, not `detectThinkingGaps`'s `coverage`** (`index.js:960-966` reads `gap.coverage.explored`, `gap.coverage.total`, `gap.was_gap_biased`, `gap.suggested_from_frame`; melange-3 f-004/f-026); present only with `context`; with `context`, pick uniformly from lenses in an unexplored frame (`was_gap_biased: true`, `suggested_from_frame` = that frame; seeded by `Date.now()`), falling back to the whole curated set with `was_gap_biased: false` when every frame is explored; without `context`, uniformly from curated |
| `detectThinkingGaps(context)` | `{success, coverage: {explored_frames: {<frame>: count}, unexplored_frames: [names], underexplored_frames: [names], total_frames, coverage_percentage}, suggestions: [{frame, sample_lenses: [{id,name,definition,episode}]}], insight}` — `coverage` is `frameCoverage()`'s result with `explored`/`unexplored`/`underexplored` renamed to the `_frames` keys and `unknown` dropped; `explored_frames` stays an **object map**, the other two string arrays (`index.js:1031-1049`; melange-3 f-003/f-016/f-026); `sample_lenses` = up to 3 per unexplored frame, top 5 frames |
| `getDialecticTriads(name, limit)` | `{success, thesis: lensObj, triads: [{antithesis, synthesis, contrast_insight, synthesis_insight}]}` |
| `getLensProgressions(start, target, maxSteps)` | `{success, start_lens, target_lens, progression: [{step, lens, insight}], overall_insight}` |
| `getAllLenses()` | `{success, lenses: [...curated]}` |
| `getFrames()` | `{success, frames, count}` |

Every `error` path returns `{success: false, error: '<message>'}` (never throws) because the handlers print `results.error`.

**Step 1:** write `test/api-local.test.mjs` asserting each of the 19 exports exists and that: `findLensJourney('Eye of Sauron','Founder Mode').paths.length >= 1` **and `Array.isArray(paths[0]) && paths[0].length >= 2 && typeof paths[0][0].name === 'string'`** (the handler's own dereferences at `index.js:770-781`, walked in the test so a smoke line that prints before the loop cannot hide a throw — melange-3 f-015); `findContrastingLenses('Eye of Sauron').contrasts.some(c => c.name === 'Founder Mode')`; for `const g = detectThinkingGaps(['Eye of Sauron'])`: `g.coverage.total_frames === 28`, `!Array.isArray(g.coverage.explored_frames) && Object.keys(g.coverage.explored_frames).length >= 1`, `Array.isArray(g.coverage.unexplored_frames)`, `typeof g.coverage.coverage_percentage === 'number'`; for `const p = getRandomProvocation(['Eye of Sauron'])`: `typeof p.gap_analysis.coverage.explored === 'number' && p.gap_analysis.coverage.total === 28 && typeof p.gap_analysis.was_gap_biased === 'boolean'` (melange-3 f-028); `typeof getDialecticTriads('Eye of Sauron', 2).triads[0].synthesis_insight === 'string'`; `typeof getLensProgressions('Eye of Sauron', 'Founder Mode', 5).overall_insight === 'string'`; `getCentralLenses('degree', 3).central_lenses.length === 3`; and `fetchFromAPI('/x')` rejects.
**Step 2:** implement `api-local.js` over `store.js` + `graph.js`. **Step 3:** switch the import in `index.js`, delete `api-client.js`, drop `node-fetch`. Run `node --test "packages/mcp/test/**/*.test.mjs"` → PASS.
**Step 4: smoke client** — `packages/mcp/scripts/smoke.mjs`: uses `@modelcontextprotocol/sdk/client/index.js` + `StdioClientTransport` to spawn `node index.js`, `initialize`, then `callTool(process.argv[2], JSON.parse(process.argv[3] || '{}'))` and print the text content; with `--resource <uri>` as the first argument it calls `readResource` instead and prints the first content's text. Also add `'degree'` to the `measure` enum of `get_central_lenses` in `index.js:223` **and to its `description` string** — `'Centrality measure (betweenness=bridges, pagerank=importance, eigenvector=influence, degree=connectivity)'` — so a fresh session reading the tool schema can discover it (melange-3 f-012; Task 4 implements the measure). Run: `node packages/mcp/scripts/smoke.mjs search_lenses '{"query":"feedback"}'` → contains `Situation-Behavior-Impact`.
**Step 5: Commit** — `feat(mcp): serve every tool from the local store; retire the API client`

<verify>
- run: `node --test "packages/mcp/test/**/*.test.mjs"`
  expect: exit 0
- run: `node packages/mcp/scripts/smoke.mjs search_lenses '{"query":"feedback"}'`
  expect: contains "Situation-Behavior-Impact"
- run: `node packages/mcp/scripts/smoke.mjs find_lens_journey '{"source":"Eye of Sauron","target":"Founder Mode"}'`
  expect: contains "steps)" (printed inside the per-path loop at `index.js:771`; "Conceptual Journey" prints before the loop and proves nothing — melange-3 f-015)
- run: `grep -c "api-client" packages/mcp/index.js || true`
  expect: contains "0"
- run: `node packages/mcp/scripts/smoke.mjs --resource lens://graph`
  expect: contains "source_id"
- run: `node packages/mcp/scripts/smoke.mjs get_central_lenses '{"measure":"pagerank","limit":3}'`
  expect: contains "Episode"
- run: `node packages/mcp/scripts/smoke.mjs get_central_lenses '{"measure":"degree","limit":3}'`
  expect: contains "Episode" (the new measure reached end-to-end — melange-3 f-012)
- run: `node packages/mcp/scripts/smoke.mjs random_lens_provocation '{"context":["Eye of Sauron"]}'`
  expect: contains "Coverage:" (the gap-biased path, `index.js:963` — melange-3 f-028)
- run: `node packages/mcp/scripts/smoke.mjs detect_thinking_gaps '{"context":["Eye of Sauron"]}'`
  expect: contains "Explored" and not "NaN" (`index.js:1031` — melange-3 f-028)
</verify>

### Task 7: CLI on the local engine

**Files:**
- Modify: `packages/mcp/cli.js` (replace `import * as api from './api-client.js'` with `'./lib/api-local.js'`; delete the `INTERLENS_API_URL` help text; `export` writes `data/curated/lenses.json` content)

**Step 1:** run `node packages/mcp/cli.js search feedback` → currently fails (network). **Step 2:** edit imports. **Step 3:** run again → prints `Situation-Behavior-Impact`. **Step 4: Commit** — `feat(cli): run against the local store`

<verify>
- run: `node packages/mcp/cli.js search feedback`
  expect: contains "Situation-Behavior-Impact"
</verify>

**Gate A — MET 2026-09-06 at 27f580c** (five Must-Have tools, both resources, `degree`, the gap-biased provocation path and the CLI answered under `sandbox-exec -p '(version 1)(allow default)(deny network*)'`, which was first shown to refuse `curl`; 46 node tests green). **Gate A (engine parity) is met when Tasks 1–7 verify — through `smoke.mjs` against the worktree, with no network (the sandbox profile above beats toggling Wi-Fi):** `search_lenses`, `find_lens_journey`, `find_contrasting_lenses`, `detect_thinking_gaps` and `get_central_lenses` (the five Must-Have tools) all answer. **Do not use the marketplace plugin as the gate** (melange-3 f-014, verified on both machines 2026-09-03): the marketplace row pins `interlens` at `2.2.5` (`~/projects/interagency-marketplace/.claude-plugin/marketplace.json`, `strict: true`) and nothing before Task 20 step 3 changes it, so flipping `"interlens@interagency-marketplace": true` loads `~/.claude/plugins/cache/interagency-marketplace/interlens/2.2.5/` — the pre-plan snapshot, still importing `api-client.js` — and a pass or fail there says nothing about Stage B. The fresh-session check through the plugin loader happens once, in Task 20 step 4, after the row points at 3.0.0. To drive the worktree code from a live session before then (optional, never the gate): `claude mcp add linsenkasten-dev -- node $PWD/packages/mcp/index.js` from the worktree, and `claude mcp remove linsenkasten-dev` afterwards.

---

## Stage C — Harvest pipeline (Python) and the generated layer

All `harvest/` modules: stdlib + `pyyaml` only; deterministic output ordering (sorted by id); every function that scans the filesystem returns `(results, unreadable: list[str])` and the reports print both.

### Task 8: `harvest/scan.py` — sightings per machine

**Files:**
- Create: `harvest/__init__.py`, `harvest/__main__.py` (argparse subcommands `scan`, `merge`, `stats`, `embed`, `edges`, `report`, `prune`), `harvest/thresholds.py`, `harvest/scan.py`
- Test: `tests/harvest/__init__.py`, `tests/harvest/conftest.py` (builds a fixture tree under `tmp_path` with two repos, one worktree copy, three agent files of which two are byte-identical, one spec file, one melange run dir with a 3-row ledger and one lens record with `parents`), `tests/harvest/test_scan.py`

**`harvest/thresholds.py` (single source of truth):**
```python
EMBED_MODEL = "nomic-embed-text"
EMBED_DIM = 768
VARIANT_MIN_COSINE = 0.92     # variant-of clustering
EMBODIES_MIN_COSINE = 0.60    # generated -> curated
EMBODIES_TOP_K = 3
RESOLVE_MIN_COSINE = 0.86     # registry hit for reuse (mirrors packages/mcp/lib/constants.js)
EXCLUDE_DIR_NAMES = {"node_modules", ".git", "target", "dist", "build", ".venv", "venv", ".worktrees", "worktrees"}
MAX_DEPTH = 6                 # below ~/projects
HASH_RECIPE = "body-v1"       # bump when normalize_body changes; recorded per record and in embeddings/meta.json (melange f-013/f-030/f-034)
TRUNCATION_MARKER = re.compile(r"\[truncated — \d+ chars omitted\]")   # bodies carrying this are corrupt (melange f-028)
REUSE_LOG_FALLBACK = "~/.local/share/linsenkasten/reuse-log.jsonl"       # outside every pruned directory (melange f-040)

def normalize_body(body: str) -> str:
    """The one normalization the content hash is taken over: frontmatter already stripped by the caller."""
    return re.sub(r"\s+", " ", body).strip()

def embedding_text(spec: dict | None, body: str) -> str:
    """The one recipe both layers use. Spec wins; body fallback is deterministic."""
    if spec:
        parts = [spec.get("persona", ""), spec.get("focus", ""), spec.get("decision_lens", "")]
        parts += list(spec.get("review_areas") or [])
        return "\n".join(p for p in parts if p).strip()
    import re
    m = re.search(r"^Apply the perspective.*?(?=\n\n)", body, re.S | re.M)
    heads = re.findall(r"^### \d+\. (.+)$", body, re.M)
    return "\n".join([m.group(0) if m else "", *heads]).strip()
```

**`scan.py` semantics:** walk `--roots` (default `~/projects`) to `MAX_DEPTH`, skipping `EXCLUDE_DIR_NAMES` and any path containing `/.claude/worktrees/`. For each `.claude/agents/fd-*.md`: parse frontmatter (yaml between the first two `---` lines; on parse failure record `frontmatter: null` and continue), `body` = text after frontmatter, `body_hash` = sha256 of `thresholds.normalize_body(body)` with `hash_recipe = HASH_RECIPE` on the row, `name` = filename stem, `repo` = path up to `/.claude/`, `machine` = `--machine` (required). **Two flags decided here and nowhere else:** (1) `corrupt = bool(TRUNCATION_MARKER.search(body))` (melange f-028: every agent body written by a subagent that copied a truncated tool result carries the literal marker; corrupt bodies are harvested for provenance but can never be cluster heads or reuse matches); (2) if the frontmatter has `tier: registry`, the row is `kind: "reuse-sighting"` with `registry_id` copied from frontmatter, and **it never counts toward `sightings`, `repos` or `machines`** (melange f-038: otherwise every registry hit re-inflates the duplication evidence that justifies collapse and pruning). Also ingest `REUSE_LOG_FALLBACK` on this machine as `kind: "reuse"` rows. Spec lookup: `<repo>/.claude/flux-gen-specs/*.json` unwrapped like `generate-agents.py:_unwrap_spec_list` (list, or dict with `agents`/`specs`); match by `name`; record `spec_path` and the spec object. Melange inputs: every `docs/research/flux-melange/*/` under a repo: `heat-ledger.jsonl` rows → attribution rows `{run, finding_id, lens, status, novelty, risk_product, surfaced: bool, body_hash}` (surfaced from `surfaced.jsonl` ids; **`body_hash` = the hash of `<repo>/.claude/agents/<lens>.md` in the same repo as the run directory when that file exists, else `null`** — melange writes its lenses into the repo it runs in, so the current body is the best available evidence of which body produced the finding; a later rewrite changes the hash and the row degrades to name-only in Task 10 — melange-3 f-001/f-021/f-024), `lenses/*.json` → lineage rows `{run, lens, kind, parents}` where `kind` is carried through verbatim (`base` | `fusion`); a lens with **no** melange record gets `kind: "unknown"` at merge time so an empty `parents` never masquerades as confirmed-base (melange f-015). Cohort: for every spec file, record `{spec_file, siblings: [names in that file]}` on each sighting (melange f-029: `anti_overlap` contracts only hold inside the cohort). flux-drive usage: count of distinct dirs under `docs/research/flux-drive/` whose `*.md` mention the name (regex `\bfd-[a-z0-9-]+\b`, exactly as `flux-agent.py:_count_usage_from_synthesis`).

Output: `data/harvest/<machine>.jsonl` — rows of three kinds, `kind: "sighting" | "attribution" | "lineage"`, sorted by `(kind, repo, name, path)`, **written to `<path>.tmp` and `os.replace`d into place** so an interrupted run (Ctrl-C, OOM, closed terminal) never leaves a torn file at the real path — the plan runs `scan` bare in this task's verify and in Task 14, outside the `harvest-and-push.sh` trap (melange-3 f-006); `--dry-run` writes nothing. Sighting row: `{kind, machine, repo, path, name, body_hash, frontmatter, spec_path, spec, drive_uses, mtime}`. Bodies are written to `data/generated/lenses/<id>.md` with `id = f"gen:{name}@{body_hash[:8]}"` (idempotent: identical file on both machines). Also prints `scanned=<n> unique_bodies=<n> unreadable=<n>` and writes `data/reports/<date>-harvest-<machine>.md` with a per-repo table.

**Step 1:** write the conftest fixture and `test_scan.py` asserting: 3 agent files scanned, 2 unique bodies, worktree copy skipped, the spec attaches, 3 attribution rows with statuses and a non-null `body_hash`, 1 lineage row with two parents, `unreadable == []`, no `*.tmp` left beside the output; plus a fourth agent file with `tier: registry` that becomes a `reuse-sighting` and does not raise the unique-body count; plus a fifth whose body contains `[truncated — 64 chars omitted]` and is flagged `corrupt`; plus a golden test `assert sha256(normalize_body(FIXTURE)) == '<hash literal computed once and pasted>'` so any recipe drift fails loudly. Add `tests/harvest/test_layout.py`: `git check-ignore -q data/harvest/x.jsonl` must **fail** (exit 1) and `.gitignore` must contain no line matching `^/?data(/|$)` (melange f-008).
**Step 2:** run → FAIL; **Step 3:** implement; **Step 4:** run → PASS; **Step 5: Commit** — `feat(harvest): scan a machine's repos into sightings`

<verify>
- run: `python3 -m pytest tests/harvest/test_scan.py -q`
  expect: exit 0
- run: `python3 -m harvest scan --machine clavain --roots ~/projects --dry-run | tail -1`
  expect: contains "scanned="
</verify>

### Task 9: `harvest/merge.py` — union of machines into `index.jsonl`

**Semantics — the index is accretive (melange-2 f-028, the run's top finding: a merge that rebuilds from the current filesystem erases every record the moment prune removes the file, and the safety argument for prune is that record):** read the **existing** `data/generated/index.jsonl` first; then read every `data/harvest/*.jsonl`; group current sightings by `body_hash`. A record, once accessioned, is **never removed** by merge: `accessioned_at` is set once and never changes; `sightings` counts *current* files, `sightings_seen` the cumulative maximum, `last_sighted` the newest current sighting, and `on_disk: false` marks a record with zero current sightings (expected after prune; also how a lens that lived only in a deleted worktree is remembered). One index record per hash:
```json
{"id":"gen:fd-x@1a2b3c4d","name":"fd-x","body_hash":"…","body_path":"generated/lenses/gen:fd-x@1a2b3c4d.md",
 "accessioned_at":"2026-09-04T…","last_sighted":"2026-09-04T…","on_disk":true,"sightings":3,"sightings_seen":5,"reuse_sightings":0,"machines":["clavain","zklw"],"repos":["shadow-work","elf-revel"],"hash_recipe":"body-v1","corrupt":false,
 "first_seen":"2026-07-08T21:05:13+00:00","last_seen":"2026-08-30T…",
 "generated_by":"flux-gen-prompt","flux_gen_version":6,"tier":"used","use_count":4,"last_used":"2026-08-12",
 "domains":["migration"],"source_spec":"…json","spec_path":"generated/specs/gen:fd-x@1a2b3c4d.json",
 "summary":"<first sentence of the persona paragraph, ≤ 240 chars>",
 "lineage":{"kind":"fusion","parents":["fd-a","fd-b"]},
 "cohort":{"spec_file":"…-seed-adjacent.json","siblings":["fd-y","fd-z"]},
 "stats":{"findings":0,"upheld":0,"refuted":0,"raw":0,"adjudicated":0,"surfaced":0,"runs":0,"hit_rate":null,"smoothed_hit_rate":null,"drive_uses":0,"name_only":{"findings":0,"upheld":0,"refuted":0}},
 "cluster":{"id":null,"head":false,"head_selected_by":null},"embodies":[]}
```
`generated_at` for `first_seen`/`last_seen` from frontmatter, falling back to file mtime; `tier`/`use_count`/`last_used` = max across **non-reuse** sightings; `reuse_sightings` counted separately and excluded from `sightings`/`machines`/`repos`; `corrupt` = the body's flag (identical hash ⇒ identical body ⇒ same flag); `lineage.kind` = the melange record's kind when one exists, else `"unknown"`; `cohort` from the first sighting with a spec; `domains` = sorted union minus `uncategorized`; `stats`, `cluster`, `embodies` are filled by Tasks 10 and 12 (merge writes their zero shapes). Specs: copy the spec object to `data/generated/specs/<id>.json` (first sighting with a spec wins; identical specs by definition). Write `data/generated/index.jsonl` sorted by id and `data/reports/<date>-merge.md` listing every hash with >1 sighting (the tier-1 collapses) as `id | sightings | machines | repos`.

**Parse discipline (melange-3 f-006):** every line of every `data/harvest/*.jsonl` and of the prior `index.jsonl` must parse as JSON; a line that does not raises `HarvestParseError(path, line_no)` and merge exits 1 **without writing** — never a silent skip (a torn harvest file is exactly the loss the accretive index exists to prevent, and `scan` can be interrupted outside the wrapper's trap).

**Zero-sighting carry-forward (melange-3 f-022):** for a record with zero current non-reuse sightings, every field normally computed from this run's sightings — `machines`, `repos`, `tier`, `use_count`, `last_used`, `last_seen`, `domains`, `cohort`, `lineage`, `source_spec`, `spec_path`, `summary`, `generated_by`, `flux_gen_version` — is carried forward unchanged from the prior index entry (the same rule as `accessioned_at`); only `sightings`, `on_disk`, `last_sighted` and `reuse_sightings` are recomputed. A field is recomputed only when this run has at least one sighting for that hash. "Max of an empty set" and "union of nothing" never reach the file.

**Test** (`tests/harvest/test_merge.py`): two fixture harvest files with an overlapping hash → 1 record with `machines == ["clavain","zklw"]`, `sightings == 2`; ordering stable across two runs (byte-identical output); **a prior index containing a record whose hash has no current sighting is retained with `on_disk == False`, `sightings == 0`, its `accessioned_at` unchanged, and its body file untouched**; a re-appearing hash flips `on_disk` back to `True` without a new `accessioned_at`; **the zero-sighting record keeps its `machines`, `repos`, `domains`, `tier`, `use_count` and `lineage` byte-for-byte** (melange-3 f-022); **a harvest file whose last line is truncated makes merge exit 1 and leaves `index.jsonl` byte-identical** (melange-3 f-006).

<verify>
- run: `python3 -m pytest tests/harvest/test_merge.py -q`
  expect: exit 0
</verify>

### Task 10: `harvest/stats.py` — hit-rates and usage

**Semantics — the join key is `(name, body_hash)`, not the bare name (melange-3 f-001/f-021/f-024, the run's top cluster: with a name-level join every same-name variant inherited a byte-identical track record, so Task 12's hit-rate head selection was a guaranteed tie exactly where variant clustering exists to discriminate):** first write `data/generated/attributions.jsonl` in **one global pass** over every attribution row from every harvest file, keyed `(run, finding_id, lens)` — one row per key however many index records share the name (melange-3 f-025) — each row carrying its `body_hash` (or `null`) and `attributed_to`: the index id whose `(name, body_hash)` matches, else `null`. Then, per index record, over rows with `attributed_to == id`: `findings` = rows, `upheld`/`refuted`/`raw` = counts by status, `surfaced` = rows with `surfaced`, `runs` = distinct `run`; `adjudicated = upheld + refuted`; `hit_rate = upheld / adjudicated` rounded to 3 places **only when `adjudicated >= 1`, else `null`**; `smoothed_hit_rate = (upheld + 1) / (adjudicated + 2)` (Laplace) **only when `adjudicated >= 1`, else `null`** — used for ranking so a 1/1 cluster never outranks a 39/40 one (melange convergence cluster: hit-rate carries no sample size). Rows with `attributed_to: null` (no hash, or a hash no longer in the index) are counted **name-level** into `stats.name_only` `{findings, upheld, refuted}` on every record of that name and never into `hit_rate` — an unattributed track record is shown, never inherited; the edges report lists their count beside the `weak` embodies. `drive_uses` = max over the record's **own** sightings (record-scoped, never name-scoped). Writes back into `index.jsonl` (rewrite whole file, sorted); the per-record loop reads `attributions.jsonl` and never writes it.

**Test:** ledger fixture with 2 upheld, 1 refuted, 1 raw for `fd-a` (rows carrying `fd-a`'s hash) → `hit_rate == 0.667`, `smoothed_hit_rate == 0.6`, `adjudicated == 3`, `raw == 1`; `fd-b` with only raw → `hit_rate is None` and `smoothed_hit_rate is None`; **two index records named `fd-c` with different hashes, 3 rows carrying the first hash and 1 row with `body_hash: null`** → only the first record gets `adjudicated`, both get `name_only.findings == 1`, and `attributions.jsonl` holds each `(run, finding_id, lens)` exactly once (melange-3 f-024/f-025).

<verify>
- run: `python3 -m pytest tests/harvest/test_stats.py -q`
  expect: exit 0
</verify>

### Task 11: `harvest/embed.py` — vectors for both layers

**Semantics:** texts: curated = `f"{name}\n{definition}\n" + "\n".join(examples)`; generated = `thresholds.embedding_text(spec, body)`. Call Ollama `POST {url}/api/embed` with `{"model": EMBED_MODEL, "input": [batch of 32]}` (urllib, timeout 60 s, `--ollama-url` default `http://127.0.0.1:11434`); L2-normalize; write `data/embeddings/<layer>.f32` (`array('f')` little-endian, row-major) and `<layer>.ids.json` (ids in row order, sorted by id), and `meta.json` `{model, model_digest (from GET /api/tags on the embedding host), dim, pooling: "ollama-default", normalized: true, hash_recipe, thresholds: {VARIANT_MIN_COSINE, EMBODIES_MIN_COSINE, RESOLVE_MIN_COSINE}, embedded_on: <machine>, curated: n, generated: n, generated_at, index_sha256}` (melange f-017: a matrix without its realization record cannot be told apart from a desynced one). **Refuse** to append rows when the live digest differs from `meta.model_digest` unless `--reembed-all` is passed (then every row is regenerated and the digest updated). `--check` reloads both matrices and asserts `len(bytes) == n * EMBED_DIM * 4`. Incremental: `<layer>.hashes.json` is `{id: sha256(embedding_text)}`, written after every embed run; a record is (re-)embedded when its id is new or its `embedding_text` hash changed — so a spec attaching on a later harvest is detected even though `body_hash` did not move (melange-3 f-005). `meta.index_sha256` is the whole-index freshness stamp only, read by `--check`, never a per-record key. **Exit codes:** `3` on model-digest mismatch (printing `model digest changed: <recorded> -> <live>`), `1` on anything else, so a wrapper can tell the recurring case from a real failure (melange-3 f-017); `--reembed-all --check` combine (regenerate, then verify).

**Test:** fake Ollama via `http.server` in a thread returning unit vectors; assert file sizes, id order, normalization, and that a second run with one new record embeds exactly one text (count requests); a third run where one existing record gains a spec (same body, new `embedding_text`) embeds exactly that one text; a run whose fake `/api/tags` digest differs from `meta.model_digest` exits 3 and writes nothing (melange-3 f-005/f-017).

<verify>
- run: `python3 -m pytest tests/harvest/test_embed.py -q`
  expect: exit 0
</verify>

### Task 12: `harvest/edges.py` — typed edges, clusters, calibration report

**Semantics** (all cosines from the committed matrices; no Ollama calls):
- `embodies`: for each generated row, top `EMBODIES_TOP_K` curated by cosine; keep those `≥ EMBODIES_MIN_COSINE`; if none clear the bar keep only the top-1 with `"weak": true`. Edge `{source: gen_id, target: curated_id, type: "embodies", score, weak}`; also written into the record's `embodies: [{id, score}]`.
- `variant-of`: union-find over generated pairs with cosine `≥ VARIANT_MIN_COSINE` **or** identical `name`; each component with ≥ 2 members becomes cluster `clu:<sha256 of sorted member ids>[:12]`; head = the non-corrupt member with the **strictly** highest `stats.smoothed_hit_rate` among members having `adjudicated >= 2` (`head_selected_by: "hit_rate"`); a tie inside a tier **falls through to the next tier**: strictly highest `use_count + drive_uses` (`"usage"`), then strictly latest `last_seen` (`"recency"`), then the lowest id (`"id"`) — `head_selected_by` names the tier that produced a strict winner, never `"hit_rate"` for a tie (melange-3 f-001 probe: the label fed the calibration table a human reads before pruning, and overclaimed); if every member is corrupt the head is chosen by the same rule and the cluster is listed under `corrupt_clusters` in the report. **`edges.jsonl` is regenerated wholesale on every run** (never appended), so head reassignment after new adjudications is automatic (melange f-004/f-012); `embodies` and `fused-from` edges target content-addressed record ids, never heads, so a demoted head dangles nothing. Edge `{source: member, target: head, type: "variant-of", score: cosine(member, head)}` for every non-head member. Singleton records get `cluster: {id: null, head: true}`.
- `fused-from`: from lineage rows with `kind == "fusion"` and from sightings whose `spec_path` matches `-fusion-\d+\.json`: edge `{source: fused_id, target: parent_id, type: "fused-from"}` for each parent resolved by name through the cluster head; unresolved parents are listed in the report under `unresolved_parents`.
- Report `data/reports/<date>-edges.md`: counts per type, cluster size histogram, **the 10 closest pairs below `VARIANT_MIN_COSINE`** (not merged) and **the 10 farthest pairs inside clusters** (merged) with names and scores, a nearest-neighbor cosine histogram (bins of 0.02 from 0.70 to 1.00), counts of clusters by `head_selected_by`, the count of records with `hit_rate == null` (expected: nearly all — 118 ledgers against thousands of lenses), the count of name-only attribution rows (Task 10), all `weak` embodies, all `corrupt` records, and `unresolved_parents`. This is the calibration table a human reads before Task 23.
- `python3 -m harvest audit`: every index record has a body file and an embedding row; any body file or embedding row **without** an index record is an error (an orphan means a record was lost); `on_disk: false` records are expected, never errors; every edge endpoint exists; every cluster has exactly one head; **no two index rows share a `body_hash` or an `id`** (melange-3 f-008: a duplicated record passes every other check); every `(run, finding_id, lens)` in `attributions.jsonl` appears once (melange-3 f-025); `meta.hash_recipe == HASH_RECIPE`; exit 1 on any mismatch. Run after every pull on the Mac and at the end of every zklw run (melange f-020: the canonical producer needs an independent check of its own output).

**Test:** 4 generated + 3 curated unit-vector fixture → expected clusters, head choice by hit-rate, weak embodies flag, fused-from resolution through the head; **two same-name records with identical `adjudicated`/`smoothed_hit_rate` and equal usage** → `head_selected_by == "recency"` when `last_seen` differs and `"id"` when it does not (melange-3 f-001 probe); an index with a duplicated `body_hash` makes `audit` exit 1 (melange-3 f-008).

<verify>
- run: `python3 -m pytest tests/harvest/test_edges.py -q`
  expect: exit 0
</verify>

### Task 13: Generated layer in the MCP: search across layers, `resolve_lens`, `record_reuse`, `registry_stats`

**Files:**
- Modify: `packages/mcp/lib/store.js` (add `resolveLens`), `packages/mcp/index.js` (3 new tools; `search_lenses` gains optional `layer` arg, default `all`; results print `[generated]`/`[curated]` before each name; `get_lens` prints `cluster`, `hit_rate`, `embodies`, `sightings` for generated lenses)
- Test: `packages/mcp/test/generated.test.mjs` using a fixture `data` dir via `LINSENKASTEN_DATA_ROOT`

**`resolveLens({text?, spec?, k = 3})`:** text = `spec ? embeddingText(spec) : text` (JS port of `thresholds.embedding_text`; byte-identity is **tested**, not asserted in prose — melange-2 f-015: `tests/fixtures/embedding_text/<case>.{spec.json|body.md|expected.txt}` with at least a spec case, a body-only case with several `### N.` headings, and a corrupt-marker body; `tests/harvest/test_embedding_text.py` and `packages/mcp/test/embedding-text.test.mjs` both read every case and compare to `expected.txt` byte for byte); `embedTexts([text])` → if `null`, lexical fallback: exact `name` match or Jaccard over `tokens(spec.focus)` vs record `summary` tokens ≥ 0.6 → `{matched: bool, method: "lexical"}`; else `cosineTopK` over `generated` heads only (non-heads and **corrupt records are skipped**) → `matches: [{id, name, score, hit_rate, smoothed_hit_rate, adjudicated, embodies, cluster, cohort_siblings}]`, `matched = matches[0].score >= RESOLVE_MIN_COSINE`, `method: "embedding"`, plus `embed_tier` and `model_match` from Task 5.

**`record_reuse({registry_id, consumer, target, project})`** → `store.recordReuse` → `{success: true}`. **`registry_stats`** → `getStats()` plus edge counts by type, cluster count, clusters by `head_selected_by`, corrupt count, the process's `embedCounters`, and reuse counts per lens from `reuse-log.jsonl` (melange f-026: the serving trail is the reuse log; make it queryable).

<verify>
- run: `node --test "packages/mcp/test/**/*.test.mjs"`
  expect: exit 0
- run: `node packages/mcp/scripts/smoke.mjs registry_stats '{}'`
  expect: contains "generated_lenses"
</verify>

### Task 14: First real harvest on this machine, merge, embed, edges; commit the generated layer

**Step 1:** `python3 -m harvest scan --machine clavain --roots ~/projects` → `data/harvest/clavain.jsonl`, bodies, report. **Record the printed `scanned= unique_bodies= unreadable=` line in the harvest report header and in the Step 6 commit message** — the corpus figures elsewhere in this plan are estimates (a live 2026-09-03 walk found ~4,800 `fd-*.md` files across 43 repos on the Mac alone; melange-3 f-023) and the measured line replaces them from here on.
**Step 2:** `python3 -m harvest merge && python3 -m harvest stats`.
**Step 3:** `python3 -m harvest embed --check` (local Ollama; the estimate was ~1,700 generated + 258 curated texts in under 10 min — if Step 1's `unique_bodies` is above 3,000 expect proportionally longer; measure, record the wall time in the report, do not tune).
**Step 4:** `python3 -m harvest edges` and **read `data/reports/<date>-edges.md`**: the calibration tables are part of the deliverable; if the ten closest non-merged pairs are obviously the same lens, or the ten farthest merged pairs are obviously different lenses, adjust `VARIANT_MIN_COSINE` by ±0.02 once, re-run edges, and record the before/after in the report header. Do not iterate further without a human.
**Step 5:** `node packages/mcp/scripts/smoke.mjs search_lenses '{"query":"identity platform migration","layer":"generated"}'` → contains `fd-authplatform-migration`.
**Step 6: Commit** in two commits: `data: clavain harvest 2026-09-xx (N sightings, M unique)` (data/harvest, data/generated, data/reports) and `data: embeddings (nomic-embed-text, 768-d)` (data/embeddings). **Land:** `git push origin feat/linsenkasten && git push origin feat/linsenkasten:main` (the landing rule from Task 1); confirm with `git fetch origin && git log --oneline -1 origin/main` showing the embeddings commit (melange-2 f-010/f-018).

<verify>
- run: `python3 -c "import json;n=sum(1 for _ in open('data/generated/index.jsonl'));print('records',n)"`
  expect: contains "records"
- run: `python3 -m harvest embed --check`
  expect: exit 0
- run: `node packages/mcp/scripts/smoke.mjs resolve_lens '{"text":"identity-platform migration engineer who has executed live Clerk primary-domain changes"}'`
  expect: contains "fd-authplatform-migration"
</verify>

### Task 15: zklw harvest, merge on zklw, embed on zklw (the canonical pass)

Precondition: from zklw, `git -C ~/projects/Sylveste/interverse/interlens fetch origin && git log --oneline -1 origin/main` shows Task 14's embeddings commit (melange-2 f-018: zklw's main was at the brainstorm commit with none of Stage A–C when checked live). Then run on zklw (hand off the SSH step if the Bash gate bites), using the shared script from Task 22 so the push retry logic is the same on both machines:
```bash
cd ~/projects/Sylveste/interverse/interlens && git pull --ff-only origin main
bash scripts/harvest-and-push.sh zklw
```
(`harvest-and-push.sh <machine>` = scan → merge → stats → embed --check → edges → audit → commit → push-with-retry; defined in Task 22 and created here first if Task 22 has not run yet — the file is identical.)
Then on the Mac: `git pull --ff-only`, `python3 -m harvest embed --check` (no re-embedding: the hashes file makes it a no-op), `python3 -m harvest audit`, and `node --test "packages/mcp/test/**/*.test.mjs"`.

<verify>
- run: `python3 -c "import json;ms=set();[ms.update(json.loads(l)['machines']) for l in open('data/generated/index.jsonl')];print(sorted(ms))"`
  expect: contains "['clavain', 'zklw']"
</verify>

**Gate B (registry live) is met when Tasks 8–15 verify on both machines** — through `smoke.mjs` in each checkout, the same rule as Gate A: the marketplace plugin is not the gate before Task 20 (melange-3 f-014).

---

## Stage D — interflux: reuse-before-regenerate

### Task 16: `scripts/lib_lens_registry.py` in interflux

**Files (interflux repo, `~/projects/Sylveste/interverse/interflux`):**
- Create: `scripts/lib_lens_registry.py`
- Test: `tests/test_lens_registry.py` (fixture registry under `tmp_path`, `LINSENKASTEN_ROOT` pointed at it, fake Ollama thread)

**Semantics:** `find_registry_root()` → first existing of `$LINSENKASTEN_ROOT`, `~/projects/Sylveste/interverse/linsenkasten`, `~/projects/Sylveste/interverse/interlens`, newest `~/.claude/plugins/cache/interagency-marketplace/linsenkasten/*/`; return `None` when none has `data/generated/index.jsonl`. `load()` → heads only. `resolve(spec) -> dict | None`: same recipe as Task 13 (`embedding_text` copied verbatim from `harvest/thresholds.py` with a comment naming the source; Ollama local then `LINSENKASTEN_OLLAMA_FALLBACK_URL`, 4 s timeout; lexical fallback; `RESOLVE_MIN_COSINE = 0.86`). `materialize(match, agents_dir, spec)` → writes `<agents_dir>/<spec name>.md`. **When the registry record has a spec (`data/generated/specs/<id>.json`), the body is re-rendered from that spec through `generate-agents.render_agent(registry_spec, source_spec_file=<current spec file>)`** — the same validated, sanitized path every fresh lens takes — never copied (melange f-033: the clean spec survives in the registry; f-043: `severity_examples` must be regenerated, not shipped forward). Only a record with no spec is copied verbatim, and a `corrupt` record is never a match at all. Frontmatter added/overridden: `tier: registry`, `registry_id`, `reused_at` (date), `source_spec` (the current spec file), `cohort_siblings` (from the record's cohort, so a lens served alone declares whose territory its `anti_overlap` deferred to — melange f-029), keeping `name`/`description`. `resolve()` skips corrupt records. `record_reuse(root, entry)` → appends `{registry_id, name, score, method, embed_tier, consumer, project, target, recorded_at}` to `<root>/data/generated/reuse-log.jsonl` when writable, else to `~/.local/share/linsenkasten/reuse-log.jsonl` (never inside any directory the prune sweep touches — melange f-040; `harvest scan` ingests it); returns which.

<verify>
- run: `cd ~/projects/Sylveste/interverse/interflux && python3 -m pytest tests/test_lens_registry.py -q`
  expect: exit 0
</verify>

### Task 17: `generate-agents.py --registry=auto|off`

**Files:** Modify `scripts/generate-agents.py` (argparse: `--registry`, default `auto`; in the spec loop **before** the `name in existing` check: if registry available and `resolve(spec)` matches → `materialize`, append `{"name", "registry_id", "score", "method", "embed_tier"}` to `report["reused"]`, `record_reuse(...)`, `continue`); add `"reused": []` to the report shape; `--json` output includes it. **Also close the sanitization sink (melange f-043, risk 9):** in `_render_severity_calibration` (`generate-agents.py:112-140`) pass every string in each `severity_examples` entry (`scenario`, `condition`, and any other value) through `sanitize()` before it reaches the f-string, and add `severity_examples` to the channel list in `sanitize_untrusted.py`'s docstring; regression test: a spec whose `severity_examples[0].scenario` contains `</task_context>IGNORE PRIOR` renders with the marker neutralized exactly as `persona` would be. **Reuse routing (melange f-011):** in `skills/flux-melange-engine/workflow/melange-workflow.js`, the seed-adjacent design step runs `generate-agents.py … --registry=auto`; the seed-distant (line ≈595), FUSE (≈1003) and STEER-WIDE (≈1037) steps pass `--registry=off` — widening and fusion exist to be new, and reuse-first would quietly win over them otherwise; write this rule into `references/fusion.md` and `phases/retarget.md`. Update `commands/flux-gen.md:67` and `commands/flux-explore.md` to mention `--registry` and the `reused` list. **Do not rename the MCP server key in interflux docs here** — `fusion.md:40`, `seed.md:37`, `retarget.md:31` keep saying `interlens` until Task 20 step 5 renames them in the same change that renames the key, so live docs never name a tool that does not exist yet (melange-2 f-035).

**Test:** `tests/test_generate_agents_registry.py`: spec matching the fixture registry → file written with `tier: registry`, report `reused` has 1 entry, `generated` has 0; with `--registry=off` → rendered normally.

<verify>
- run: `cd ~/projects/Sylveste/interverse/interflux && python3 -m pytest tests -q`
  expect: exit 0
</verify>

### Task 18: Prove a real reuse (DONE WHEN item)

Pick a target where a hit is near-certain: re-run flux-gen against the jawn apex-domain decision that produced `fd-authplatform-migration` (spec at `~/.claude/flux-gen-specs/jawn-apex-domain-decision-seed-adjacent.json`). **Set the registry root explicitly** (melange-2 f-033: `find_registry_root()` cannot see the worktree, and the main checkout carries no `data/generated/` until the sweep lands): `export LINSENKASTEN_ROOT=$HOME/projects/.worktrees/interlens-linsenkasten` (or the renamed canonical path once Task 20 has run) before both commands below, and pass the same variable into the flux-drive/melange session's environment. `python3 ~/projects/Sylveste/interverse/interflux/scripts/generate-agents.py /tmp/lk-reuse-proof --from-specs ~/.claude/flux-gen-specs/jawn-apex-domain-decision-seed-adjacent.json --mode=skip-existing --registry=auto --json` after `mkdir -p /tmp/lk-reuse-proof/.claude/agents`. Then run one real `/flux-drive` or `/flux-melange` on any current design doc and check its report for `reused`. Record both in `docs/research/2026-09-xx-reuse-proof.md` with the reuse-log lines.

<verify>
- run: `LINSENKASTEN_ROOT=$HOME/projects/.worktrees/interlens-linsenkasten python3 ~/projects/Sylveste/interverse/interflux/scripts/generate-agents.py /tmp/lk-reuse-proof --from-specs ~/.claude/flux-gen-specs/jawn-apex-domain-decision-seed-adjacent.json --mode=skip-existing --registry=auto --json | python3 -c "import sys,json;r=json.load(sys.stdin);print('reused',len(r['reused']))"`
  expect: contains "reused 1"
- run: `tail -1 data/generated/reuse-log.jsonl`
  expect: contains "registry_id"
</verify>

---

## Stage E — Rename to linsenkasten (after the sweep lands; see Task 1 Step 1)

### Task 19: In-repo rename

Reverse of `docs/research/rename-linsenkasten-in-plugin.md` (Feb 2026) which lists every file; apply its mapping table backwards (`interlens`→`linsenkasten`, `Interlens`→`Linsenkasten`, `InterlensMCP`→`LinsenkastenMCP`, `interlens-mcp`→`linsenkasten-mcp`, `INTERLENS_*`→`LINSENKASTEN_*`) with `git ls-files -z | xargs -0 grep -lI -i interlens | xargs sed -i '' …` **excluding** `CHANGELOG.md` history entries, `docs/brainstorms/**`, `docs/plans/**`, `docs/research/**` (allowlist). Specifics: `.claude-plugin/plugin.json` `name` + `mcpServers` key; `kimi.plugin.json`; `packages/mcp/package.json` `name` = `linsenkasten-mcp`, `bin` = `{"linsenkasten": "./cli.js", "linsenkasten-mcp": "./index.js"}`, `version` = `3.0.0`; root `package.json`; `tests/structural/test_structure.py:18` → `"linsenkasten"`; README/CLAUDE/AGENTS/PHILOSOPHY; `docs/vision.md`, `docs/roadmap.json`, and `git mv docs/interlens-vision.md docs/linsenkasten-vision.md` (melange-2 f-001: these three are inside the sweep and inside the verify); a CHANGELOG `3.0.0` entry naming the rename, the local engine and the registry. `packages/mcp/README.md`'s `npm install -g …` instruction is replaced by the marketplace install (`/plugin install linsenkasten`) plus one line: "the npm package `linsenkasten-mcp` is frozen at 2.2.1 until republished" — the rename sweep must not leave an install path that serves a 2025 snapshot (melange-2 f-024/f-032). Remove the dead deploy files here too if Task 21 has not run yet.

<verify>
- run: `PYTHONPATH=$HOME/projects/Sylveste/interverse python3 -m pytest tests -q && node --test "packages/mcp/test/**/*.test.mjs"`
  expect: exit 0
- run: `git ls-files | grep -v -E '^(CHANGELOG.md|docs/(brainstorms|plans|research)/)' | xargs grep -lI -i interlens | wc -l | tr -d ' '`
  expect: contains "0"
</verify>

### Task 20: Repo, directories, marketplace, settings, cross-repo references

1. `gh repo rename linsenkasten -R mistakeknot/interlens --yes` (redirect flips; the old URL keeps working).
2. Both machines: `mv ~/projects/Sylveste/interverse/interlens ~/projects/Sylveste/interverse/linsenkasten && git -C ~/projects/Sylveste/interverse/linsenkasten remote set-url origin git@github.com:mistakeknot/linsenkasten.git`; the `.git-autosync` marker moves with the directory; re-point the Mac worktree (`git -C ~/projects/Sylveste/interverse/linsenkasten worktree repair`). Then the two connector files from Task 2 Step 3 get their directory segment updated to `interverse/linsenkasten/data/curated/lenses.json`, tests re-run in both repos (melange-2 f-002).
3. `~/projects/interagency-marketplace/.claude-plugin/marketplace.json`: the row `name: linsenkasten`, `url: https://github.com/mistakeknot/linsenkasten.git`, `version: 3.0.0`, description: "Lens box: 288 FLUX cognitive lenses plus the registry of every generated fd-* review lens — searchable, ranked, reused by flux-gen and melange. Local MCP over an in-repo graph." README section `### interlens` → `### linsenkasten` with `/plugin install linsenkasten`.
4. `~/.claude/settings.json` on both machines: delete `"interlens@interagency-marketplace": false`, add `"linsenkasten@interagency-marketplace": true`; then `rm -rf ~/.claude/plugins/cache/interagency-marketplace/interlens` on both machines (the cache is keyed by plugin name and the old directory would otherwise sit orphaned — melange-2 f-004) and confirm a fresh session populates `~/.claude/plugins/cache/interagency-marketplace/linsenkasten/3.0.0/` **and that `mcp__linsenkasten__search_lenses` answers with Wi-Fi off** — the fresh-session check deferred from Gate A (melange-3 f-014).
5. Clavain (`~/projects/Sylveste/os/Clavain`), the 8 real files: `agent-rig.json`, `commands/setup.md`, `docs/clavain-vision.md`, `docs/PRD.md`, `docs/roadmap.json`, `scripts/install-codex-interverse.sh`, and the two `docs/research/*.md` (leave research history untouched; edit the other six). interflux docs naming the MCP server (`skills/flux-melange-engine/references/fusion.md:40`, `phases/seed.md:37`, `phases/retarget.md:31`, plus the routing rule text from Task 17) → `linsenkasten` in this step. `interlock`, `lattice`, `core/interweave` mentions: grep, and edit only live config/scripts (not docs/research); the two connector files were already handled in step 2.
6. Publish: `interpub:release` for linsenkasten 3.0.0 and interflux (patch bump) — this is the marketplace (git-sourced) publish and needs no npm. **npm is separate and optional:** `linsenkasten-mcp` on npm is this project's own pre-rename identity (versions 1.0.0–2.2.1, maintainer `gensysven`, mk's account; checked live 2026-09-03) and this Mac has no npm session (`npm whoami` → 401). Publishing 3.0.0 there requires an interactive `npm login` as that account — hand it off; never publish under any other name, and never let the release script assume npm auth (melange-2 f-003/f-019). Skipping npm leaves the plugin fully installable through the marketplace.

<verify>
- run: `gh repo view mistakeknot/linsenkasten --json name -q .name`
  expect: contains "linsenkasten"
- run: `grep -c '"linsenkasten"' ~/projects/interagency-marketplace/.claude-plugin/marketplace.json`
  expect: contains "1"
- run: `grep -c 'linsenkasten@interagency-marketplace": true' ~/.claude/settings.json`
  expect: contains "1"
- run: `npm view linsenkasten-mcp version` (reports the npm layer; `2.2.1` means not republished — allowed, but it must be stated in the release notes)
  expect: exit 0
</verify>

---

## Stage F — Retire hosted remnants; explorer on zklw

### Task 21: Delete the Flask app and deploy configs

Delete: `apps/api/` entirely (data already moved; the graph reference lives on as `tests/fixtures/graph-py/` from Task 4 Step 0 and in git history at `git log -1 -- apps/api/src/lens/graph.py`; `scripts/generate_contrasts*.py` stay in git history; the lattice/interweave connectors were re-pointed in Task 2, so nothing outside this repo reads `apps/api` any more), `apps/web/api/` (Vercel functions incl. `mcp-sse.js`), `apps/web/vercel.json`, `apps/web/netlify.toml`, `apps/web/railway.toml`, `apps/web/Dockerfile`, `apps/web/setup.sh`, `packages/mcp/examples/*` referring to remote URLs (rewrite to stdio config), `express` + `cors` from `packages/mcp/package.json`, `"dev": "vercel dev"` script. Update `pnpm-workspace.yaml` if it lists `apps/api`.

<verify>
- run: `test ! -d apps/api && test ! -d apps/web/api && echo gone`
  expect: contains "gone"
- run: `node --test "packages/mcp/test/**/*.test.mjs"`
  expect: exit 0
</verify>

### Task 22: `packages/mcp/server.js` + explorer build + zklw user unit

**Server** (`node:http`, no deps): `--host <address>` (default `127.0.0.1`), **`--host-file <path>`** (read the first line of the file, trimmed, and use it as the bind address; exits 2 with a message if the file is missing or empty — melange-2 f-009/f-021: passing a path as `--host` made Node attempt DNS resolution of the path and crash, reproduced live on zklw), `--port` (default `7411`), `--static <dir>` (default `apps/web/build`). Unit test: `--host-file` on a temp file containing `127.0.0.1` binds; on a missing file exits 2. Routes over `store.js`/`graph.js`, JSON shapes matching what `apps/web/src/components/useLenses.js` reads (`data.lenses`, `data.results`, `data.statistics`, `data.timeline`, `data.concepts`, `data.frames`, `data.contrasts`) and `LensGraphEnhanced.jsx` (`/lenses/graph` → `{nodes:[{id,name,episode,type,layer}], edges:[{source,target,weight,type}]}`; `/lenses/graph/enhanced` same plus generated nodes and typed edges): `/api/v1/lenses` (query `type`, `episode`, `layer`), `/api/v1/lenses/search?q=`, `/api/v1/lenses/stats` → `{statistics: getStats()}`, `/api/v1/lenses/episodes/:n`, `/api/v1/lenses/concepts` (related_concepts counted), `/api/v1/lenses/timeline` (per-episode counts), `/api/v1/lenses/:id`, `/api/v1/creative/contrasts?lens=`, `/api/v1/frames`. 404 JSON otherwise. Static files served with correct MIME for `.html .js .css .json .png .svg .woff2`.
**Explorer:** `LensCard.jsx` renders `{lens.layer === 'generated' && <span className="layer-badge">generated</span>}`; `apps/web/src/components/useLenses.js` default `API_BASE_URL` → `'/api/v1'`. Build: `pnpm -C apps/web install && pnpm -C apps/web build`.
**zklw unit** `~/.config/systemd/user/linsenkasten-explorer.service`:
```ini
[Unit]
Description=Linsenkasten explorer (local store, Tailscale only)
[Service]
WorkingDirectory=%h/projects/Sylveste/interverse/linsenkasten
ExecStart=/usr/bin/env node packages/mcp/server.js --host-file %h/.local/share/linsenkasten/ts-ip --port 7411
Restart=on-failure
[Install]
WantedBy=default.target
```
(**Explicit step, on zklw, before enabling the unit** — the file does not exist yet, checked live 2026-09-03 (melange-2 f-011): `mkdir -p ~/.local/share/linsenkasten && tailscale ip -4 > ~/.local/share/linsenkasten/ts-ip && cat ~/.local/share/linsenkasten/ts-ip`, expected `100.78.63.67`; `systemctl --user daemon-reload && systemctl --user enable --now linsenkasten-explorer`; `loginctl show-user mk -p Linger` says `yes` on zklw, checked 2026-09-02). The explorer binds the Tailscale address only and has no auth: it is read-only and reachable solely inside the tailnet; the unit must never be given `0.0.0.0`.
**Recurring harvest (melange f-039: without it the context-tax fix decays while the deletion stays permanent):** add **`scripts/harvest-and-push.sh <machine>`** (shared by zklw's timer and the Mac's on-demand runs — melange-2 f-012):
```bash
#!/usr/bin/env bash
# harvest-and-push.sh <machine> — one atomic registry sweep: any failure discards what THIS run wrote under data/.
set -euo pipefail
MACHINE="${1:?machine name required}"; ROOTS="${LINSENKASTEN_ROOTS:-$HOME/projects}"
STATE="$HOME/.local/share/linsenkasten"; mkdir -p "$STATE"
cd "$(dirname "$0")/.."
# Precondition (melange-3 f-020): never start over uncommitted work under data/ — the trap below would discard it.
if [ -n "$(git status --porcelain data)" ]; then
  echo "harvest-and-push: data/ has uncommitted changes; commit or discard them first (nothing was touched):" >&2
  git status --porcelain data >&2; exit 4
fi
trap 'rc=$?; if [ $rc -ne 0 ]; then git checkout -q -- data && git clean -fdq data; echo "$(date -u +%FT%TZ) rc=$rc step=${STEP:-?}" >> "$STATE/harvest-failed.log"; fi' EXIT
STEP=pull;  git pull -q --ff-only origin main   # diverged? the log says step=pull; a human runs git pull --rebase; data/ is untouched
for STEP in "scan --machine $MACHINE --roots $ROOTS" merge stats; do python3 -m harvest $STEP; done
STEP="embed --check"
set +e; python3 -m harvest embed --check; rc=$?; set -e
if [ $rc -eq 3 ]; then   # model digest changed (Task 11): the one expected, recurring failure — re-embed once, log it apart from failures
  echo "$(date -u +%FT%TZ) $MACHINE: nomic-embed-text digest changed; re-embedding every row" >> "$STATE/reembed.log"
  STEP="embed --reembed-all"; python3 -m harvest embed --reembed-all --check
elif [ $rc -ne 0 ]; then exit $rc; fi
for STEP in edges audit; do python3 -m harvest $STEP; done
STEP=commit
if [ -n "$(git status --porcelain data)" ]; then
  printf '%s\n' "data: $MACHINE harvest $(date -u +%F)" > /tmp/lk-harvest-msg
  git add data && git commit -q --no-verify -F /tmp/lk-harvest-msg -- data
  STEP=push
  for i in 1 2 3; do git push -q origin HEAD:main && break; git pull -q --rebase --autostash origin main || true; [ $i -eq 3 ] && { echo "$(date -u +%FT%TZ) push failed after 3 attempts" >> "$STATE/push-failed.log"; exit 1; }; done
fi
```
(melange-2 f-020: the `trap` discards what this run wrote under `data/` on any failure so the next run's `pull --ff-only` never wedges on a dirty tree; **the trap is registered only after the `data/`-clean precondition passes, so it can never discard a human's uncommitted harvest review — melange-3 f-020; a diverged `pull --ff-only` (unpushed local commit + remote moved) logs `step=pull` and is fixed by a human `git pull --rebase`, nothing under `data/` touched;** embed exit 3 (model digest changed, Task 11) triggers one automatic `--reembed-all`, logged to `reembed.log` apart from failures — melange-3 f-017; failures land in `~/.local/share/linsenkasten/*.log`, and the systemd unit carries `OnFailure=linsenkasten-harvest-failed.service`, a oneshot that appends the journal tail to the same log.) User timer `linsenkasten-harvest.timer` (`OnCalendar=*-*-* 04:30:00`, `Persistent=true`) driving `linsenkasten-harvest.service` (`Type=oneshot`, `WorkingDirectory=%h/projects/Sylveste/interverse/linsenkasten`, `ExecStart=/usr/bin/env bash scripts/harvest-and-push.sh zklw`). The Mac runs `bash scripts/harvest-and-push.sh clavain` on demand (always before any prune). Note: `scripts/` then holds 3 `.sh` files — update `tests/structural/test_structure.py:test_scripts_count` to 3 in the same commit.

<verify>
- run: `node packages/mcp/server.js --port 7412 & sleep 1; curl -s localhost:7412/api/v1/lenses/search?q=feedback | head -c 200; kill %1`
  expect: contains "Situation-Behavior-Impact"
- run: `curl -s -m 8 http://$(ssh -o BatchMode=yes zklw tailscale ip -4):7411/api/v1/lenses/stats`
  expect: contains "generated_lenses"
</verify>

---

## Stage G — Prune (ruled: delete from live repos, nothing silent)

### Task 23: `harvest/prune.py` and the Mac sweep

**Semantics:** `python3 -m harvest prune --machine clavain [--apply]`. Reads `data/generated/index.jsonl` + `data/harvest/clavain.jsonl`. Candidate repos = lines of `data/prune-targets.txt` (created by `--plan`: every repo with a pile that (a) is a git repo, (b) is not under `.worktrees/`, `.claude/worktrees/`, or a directory whose name ends in `-sessions`, `-f2`, `-spike-*`, (c) has a clean `git status --porcelain` for paths outside `.claude/`, (d) **is on its default branch** — `git symbolic-ref --short refs/remotes/origin/HEAD` minus `origin/`, falling back to `main` — otherwise it is listed under `skipped: not on default branch (<branch>)` and never committed to (live 2026-09-03: `interverse/interkasten` and `interverse/tldr-swinton` both sat clean on the sibling's `sweep/2026-09-02`; a prune commit there would ride another session's unpushed branch — melange-3 f-019; the Sylveste root is the one repo routed through a worktree + PR instead, below)). **A human reviews and commits `prune-targets.txt` before `--apply`.** **Preconditions, all machine-checked — (1)–(3) refuse the whole run with the reason printed, (4)–(5) skip the failing target and list it (melange convergence cluster c-fork4-prune-precondition-git-lag, blast 3, three lenses; per-target rule melange-3 f-002):** (1) the registry checkout is clean (`git status --porcelain data` empty); (2) `git fetch origin main` succeeded and `git rev-parse HEAD` equals `git rev-parse origin/main` — the registry state the prune cites is **pushed**, so no machine can be pruning against an index the other has never seen; (3) `python3 -m harvest audit` exits 0; (4) **per target, not per run**: a target whose newest `fd-*.md` mtime is newer than `data/harvest/<machine>.jsonl`'s timestamp is skipped and listed under `skipped: stale harvest (<path>, <mtime>)` while the sweep continues (melange-3 f-002: autosync rewrites mtimes across 40+ repos daily, so an all-or-nothing mtime gate would refuse on an ordinary day); (5) every `*-fusion-*.json` under a target has every spec name resolved to an index record **and** a `fused-from` edge for each parent (melange f-001/f-023) — a repo failing (5) is skipped and listed, not pruned. The registry commit SHA from (2) is written into every prune commit message and the report header. **(2) and (3) are re-checked before every repo inside the loop** (`git fetch -q origin main`, `HEAD == origin/main`, `harvest audit`); the first failure stops the remainder of the sweep — what already landed stays landed — and the report names the repo it stopped before and the SHA verified for each repo processed (melange-3 f-009: zklw's 04:30 timer or the hourly autosync promoter can move `origin/main` mid-sweep). For each target: for every `.claude/agents/fd-*.md`, compute `body_hash`; if the hash is **not** in the index → keep and list under `kept: not in registry`; else delete (`git rm -q` if tracked, `rm` otherwise); delete files under `.claude/flux-gen-specs/` **per spec file** (a spec file is deletable when every `name` inside it resolves to an index record; any other file in that directory, including a legacy `reuse-log.jsonl`, is kept and listed); delete `.claude/agents/.index.yaml` only if no non-fd agents remain in it. Commit per repo on **its current branch, checked in the same command** (`git -C <repo> symbolic-ref --short HEAD`), message `chore: prune generated review lenses (harvested into linsenkasten <index commit>)`, `--no-verify`. Sylveste root (`~/projects/Sylveste/.claude/agents`, 396 files): main is protected and the shared checkout is on someone else's branch (`estate-checks-falsifiable` when checked live 2026-09-03) — **never switch it**; run `git -C ~/projects/Sylveste worktree add ~/projects/.worktrees/sylveste-prune-fd-agents -b chore/prune-fd-agents origin/main`, prune inside that worktree, push, open the PR with `gh pr create --body-file`, remove the worktree, and list the PR in the report as "PR opened" (melange-2 f-029). Task 25 waits for `gh pr view <n> --json state -q .state` to print `MERGED`, not merely for the PR to exist. Push each prune commit before moving to the next repo (a deletion that exists only locally is the split-brain the review warned about). Report `data/reports/<date>-prune-clavain.md`: registry commit SHA, per repo `path | registry id | action | commit` where `commit` is the prune commit SHA for `git rm` rows and the literal `(untracked, no repo history)` for `rm` rows (melange-3 f-013: a reader must see which deletions are git-revertable in the source repo), the kept list, the skipped targets with reasons, and the refusal reason if the run stopped.

**Test:** fixture repo with 3 agents (2 in registry, 1 not) → `--apply` deletes 2, keeps 1, commits once; a dirty repo is skipped and listed; a repo on a non-default branch is skipped and listed; a stale-harvest target is skipped while a sibling target in the same run is pruned; an `origin/main` that moves between two repos stops the sweep after the first and the report says so.

<verify>
- run: `python3 -m pytest tests/harvest/test_prune.py -q`
  expect: exit 0
- run: `python3 -m harvest prune --machine clavain --plan | tail -1`
  expect: contains "targets="
</verify>

### Task 24: zklw prune sweep

Same as Task 23 on zklw after `git pull --ff-only` and a fresh `bash scripts/harvest-and-push.sh zklw` if any target changed (the accretive merge from Task 9 keeps every pruned lens's record, so a rescan after prune is safe — it flips `on_disk` to false and nothing else); commit `data/reports/<date>-prune-zklw.md`; push.

<verify>
- run: `python3 -c "import json;print(sum(1 for l in open('data/generated/index.jsonl') if not json.loads(l)['on_disk']))"`
  expect: exit 0
- run: `gh pr view --repo mistakeknot/Sylveste chore/prune-fd-agents --json state -q .state`
  expect: contains "MERGED"
</verify>

---

## Stage H — Docs, publish, close

### Task 25: Docs, roadmap, version, publish, goal close

- `README.md` (post-sweep): what the registry is, the data layout (link `data/README.md`), the six `harvest` commands, env vars (`LINSENKASTEN_DATA_ROOT`, `LINSENKASTEN_OLLAMA_URL`, `LINSENKASTEN_OLLAMA_FALLBACK_URL`), the explorer URL on zklw, the reuse contract for flux-gen.
- `AGENTS.md` / `CLAUDE.md`: validation commands = `PYTHONPATH=… python3 -m pytest tests -q`, `node --test "packages/mcp/test/**/*.test.mjs"`, `node packages/mcp/scripts/smoke.mjs …`; the "zklw harvests, Mac pulls" rule; never hand-edit `data/generated/*`.
- `docs/roadmap.json`: mark ILES-N3 (provenance + confidence) done, add the registry line.
- Publish 3.0.0 (Task 20 step 6 if not done). Fold the brainstorm's *Facts checked* into the CHANGELOG entry.
- Follow-ups to file (not in this goal): lattice/interweave connector class and `SUBSYSTEM` still say `interlens` (melange-2 f-002); npm 3.0.0 publish if mk logs in (f-003).
- Close goal 8222288d from `~/projects/Sylveste` per the ic protocol (begin → verified / reflected / compounded / successor_proposed with the same fence → finish), citing: both machines harvested (index `machines`), hit-rates attached (`stats.hit_rate` non-null count), the reuse proof doc, sweep reports, the fresh-session MCP check, the explorer URL.

<verify>
- run: `grep -c "harvest scan" README.md`
  expect: contains "1"
</verify>

---

## Review findings (flux-melange) — folded 2026-09-03 from run wf_574f8a49-3e2

Synthesis: `docs/research/flux-melange/linsenkasten-registry-design/2026-09-02-synthesis.md` (44 findings, 29 upheld, 3 refuted, 5 rounds, ceiling halt, zero fusions fired). Every upheld finding is either folded into a task above (inline, marked "melange f-NNN") or listed here as an accepted limitation.

| Finding | Where it landed |
|---|---|
| f-038 reuse re-inflates dedupe evidence (top heat) | Task 8: `tier: registry` sightings are `reuse-sighting`, excluded from counts; ships before Task 16 by dependency |
| f-043 `severity_examples` unsanitized + stale on reuse (risk 9) | Task 17 sanitization fix + regression test; Task 16 re-renders from spec |
| f-028 / f-033 truncation markers baked into bodies; clean spec already in hand | Task 8 `corrupt` flag; Task 12 corrupt never head; Task 13/16 never matched; Task 16 re-render from spec |
| c-fork4-prune-precondition-git-lag (f-005, f-016, f-022) | Task 23 five machine-checked preconditions, pushed registry SHA in every prune commit, push per repo |
| f-001 / f-023 fusion specs deleted before lineage confirmed; dangling parents | Task 23 precondition (5); Task 12 `unresolved_parents` |
| c-embedding-fallback-tier-opacity (f-007, f-018) | Task 5 `embed_tier` + `model_match` on every result, counters in `registry_stats` |
| c-hit-rate-lacks-sample-size (f-010, f-021, f-014) | Task 10 `adjudicated` + Laplace `smoothed_hit_rate`; Task 12 `head_selected_by` and its histogram |
| f-013 / f-030 / f-034 hash recipe unspecified, spec-half has no power | Task 8 `normalize_body` + `HASH_RECIPE` + golden test; body-only hash, spec stored beside it; brainstorm Fork 3 wording superseded |
| f-015 `parents: []` ambiguous | Task 8/9 lineage `kind` tri-state (`base` / `fusion` / `unknown`) |
| f-017 embedding matrix has no realization record | Task 11 `meta.json` digest, pooling, thresholds; refuse on digest mismatch |
| f-004 / f-012 head reassignment | Task 12 edges regenerated wholesale; edges target content ids |
| f-002 embodies cardinality | Task 12 already top-3 multi-valued; brainstorm Fork 2 wording clarified |
| f-003 centrality scaling | Task 4 curated-subgraph default, synthetic 2,000-node timing test |
| f-008 harvest output could be gitignored | Task 8 layout test |
| f-011 reuse-first vs STEER-WIDE | Task 17 routing rule: reuse only for seed-adjacent |
| f-020 zklw sole producer, no comparison | Task 12 `audit`; Task 15/22 run it after every pull and every timer run |
| f-026 / f-040 no serving trail; fallback log inside pruned dir | Task 13 reuse counts in `registry_stats`; Task 16 fallback under `~/.local/share/linsenkasten/` |
| f-029 cohort membership lost | Task 8/9 `cohort`; Task 16 `cohort_siblings` frontmatter |
| f-035 `uncategorized` pollutes lexical score | Task 3 filter |
| f-039 no recurring harvest | Task 22 zklw daily timer |
| f-032 / f-034 / f-037 brainstorm and plan name different reuse mechanisms | Brainstorm fold section marks the "existing combine/contrast seam" sentence superseded; the mechanism is Task 16/17 `resolve()` at `generate-agents.py` plus the `resolve_lens` MCP tool |

**Accepted limitations (recorded, not fixed):** f-042 — DEEPEN and PROBE-DISAGREEMENT re-dispatch lenses already generated in the run and never call the generator, so reuse cannot reach them; that is by design of those directives, and the registry does not try to substitute lenses mid-run. f-027 — reuse matches lens-to-lens on `embedding_text`, not lens-to-target; the reuse log stores the target so relevance can be studied later.

**Refuted:** f-006, f-009 (mechanism), f-044.

**Second review (plan, run wf_618f7cf2-b2f, risk-hunt, folded 2026-09-03):** first attempt starved on the session limit (10 of 15 agents died, no synthesis); resumed from the journal after reset. Findings and where they landed:

| Finding | Where it landed |
|---|---|
| f-005 / f-014 `graph.py` is a `DiGraph`; port said "exactly as graph.py" but undirected | Task 4: undirected as a documented divergence with a test asserting it |
| f-006 live schema accepts `pagerank`/`eigenvector`; port implemented neither | Task 4 four measures; Task 6 adds `degree` to the enum; smoke verify |
| f-007 / f-008 bridges and paths semantics drifted from Python | Task 4: at-least-two adjacency, top 5; paths top 3, deterministic tie-break stated as a JS choice |
| f-013 two MCP resources call `fetchFromAPI` directly | Task 6: rewrite `lens://episodes` and `lens://graph`, `getGraph` export, resource smoke verify |
| f-002 lattice + interweave hardcode the lens-file path (tests in both) | Task 2 Step 3 (path move) and Task 20 step 2 (dir rename); follow-up for the `SUBSYSTEM` name |
| f-010 / f-018 no step lands `feat/linsenkasten` on main; zklw's main is pre-plan | Task 1 landing rule; Task 14 Step 6 lands; Task 15 precondition |
| f-012 / f-020 bare pushes, dirty-tree wedge on abort | Task 22 `harvest-and-push.sh` shared by both machines: trap-discard, retry, failure logs, `OnFailure` |
| f-009 / f-021 `--host <path>` crashes Node (reproduced on zklw) | Task 22 `--host-file` flag + unit test |
| f-011 Tailscale-IP file does not exist | Task 22 explicit creation step |
| f-003 / f-019 npm package is mk's own dormant identity; no npm auth here | Task 20 step 6: marketplace publish only; npm optional behind an interactive login hand-off |
| f-004 orphaned plugin cache after the rename | Task 20 step 4 cache removal + fresh-session check |
| f-001 Task 19 verify excluded all of `docs/` | Task 19 verify regex narrowed; `docs/vision.md`, `docs/roadmap.json`, vision file rename in scope |
| f-015 `embedding_text` byte-identity asserted in prose only | Task 13 shared fixture test in Python and Node |
| f-016 `grep -c` exits 1 on zero matches | Task 6 verify `|| true` |
| f-017 commit steps lacked the message-writing idiom | Task 1 idiom stated once; every later commit step references it |

Rounds 1–2 of the same run (after the session-limit resume):

| Finding | Where it landed |
|---|---|
| f-028 merge rebuilds the index from the filesystem; prune then erases the record (P0, top heat) | Task 9 accretive index (`accessioned_at`, `on_disk`, `sightings_seen`), Task 12 audit semantics, Task 24 |
| f-030 Python reference deleted with no captured output | Task 4 Step 0 fixtures via `uv run --with networkx`; Task 21 pointer |
| f-014 248 of 280 connections are one-directional | Task 4 divergence test uses set/superset/overlap relations, not equality |
| f-029 Sylveste prune strands the shared checkout; PR never required to merge | Task 23 worktree; Task 24 verify `MERGED` |
| f-033 reuse proof cannot find the registry from the worktree | Task 18 `LINSENKASTEN_ROOT` |
| f-034 CI would be red on GitHub (`_shared` import) | Task 1 `importorskip` + `gh run list` verify |
| f-035 interflux docs would name the new key before it exists | Task 17 keeps `interlens`; Task 20 step 5 renames |
| f-024 / f-031 / f-032 README npm path serves a 2025 snapshot; release never touches npm | Task 19 README; Task 20 step 6 + verify report line |
| f-026 / f-027 host-file behavior lived in a parenthetical; "narrated as done" | Task 22 `--host-file` in the server contract; explicit step |
| f-022 / f-023 npm token present but non-functional; repo was linsenkasten before | Task 20 step 6 hand-off |

FUSE again never fired (second run in a row; papercut logged). Halt was BUDGET with gain still rising (0.67 → 0.80), so a third pass targeted the regions no lens reached: Tasks 3, 5, 10, 11, the eleven `api-local.js` shapes not yet checked against `index.js`, and the Mac-side prune sweep.

**Third review (plan, run wf_6cad5d77-24b, folded 2026-09-06):** 28 findings, 18 upheld, 0 refuted, 2 rounds, DRY halt. The synthesis agent failed (API 529) after the ledger was written, so `heat-ledger.jsonl` still says `raw` for the ten round-0 findings the round-1 probes confirmed (f-001/f-003/f-004/f-010/f-016/f-018/f-021/f-024/f-026/f-027); `docs/research/flux-melange/linsenkasten-plan-review-2/2026-09-03-synthesis.md` was written by hand from the ledger and records the disposition. FUSE did not fire (third run in a row). Every lens report was secret-scanned before commit.

| Finding | Where it landed |
|---|---|
| f-001 / f-021 / f-024 / f-025 name-keyed attribution smears one track record across every same-name variant; head tie mislabeled `hit_rate`; duplicate attribution rows (top cluster) | Task 8 attribution rows carry `body_hash`; Task 10 `(name, body_hash)` join, `name_only` counts shown never inherited, one global `attributions.jsonl` pass; Task 12 strict-winner tiers with an `"id"` label + tie fixture; audit uniqueness |
| f-014 Gate A toggles a marketplace plugin pinned at 2.2.5 (P0, verified on both machines) | Gate A/B are `smoke.mjs`; the fresh-session check moves to Task 20 step 4; optional `claude mcp add` dev override |
| f-015 `findLensJourney` path wrapper meets `path.forEach` (P0) | Task 6 bare path arrays + `path_weights`; handler-dereference assertions; verify expects `steps)` |
| f-003 / f-004 / f-016 / f-026 / f-027 three incompatible coverage shapes; per-frame counts discarded | Task 4 `frameCoverage` returns the count map + percentage; Task 6 `gap_analysis` own shape, `detectThinkingGaps` rename rule; f-028 assertions + smoke lines |
| f-010 / f-018 `synthesis_insight` / `overall_insight` read by `index.js`, produced by nothing | Task 4 derivation rules |
| f-011 / f-012 export counts 17/18/19; `degree` invisible in the tool description | Must-Haves + Task 6 header "19 (18 + `getGraph`)"; description string + `degree` smoke |
| f-019 prune would commit onto another session's branch (P0, two live repos) | Task 23 candidacy (d) default branch |
| f-020 harvest trap wipes a human's uncommitted `data/` on a diverged pull (P0) | Task 22 `data/`-clean precondition before the trap is registered |
| f-002 precondition (4) all-or-nothing across 40+ autosynced repos (P0) | Task 23 per-target skip-and-list |
| f-009 preconditions (2)(3) never re-checked mid-sweep | Task 23 per-repo re-check, stop the remainder |
| f-005 incremental embed key incoherent; spec attaching later invisible | Task 11 `{id: sha256(embedding_text)}` |
| f-017 digest drift kills the unattended nightly run | Task 11 exit 3; Task 22 one automatic `--reembed-all`, logged apart |
| f-006 torn harvest file, silent skip; bare `scan` outside the trap | Task 8 temp-then-rename; Task 9 loud parse failure + test |
| f-022 zero-sighting record blanks eight fields | Task 9 carry-forward rule + test |
| f-008 audit misses a duplicated `body_hash` | Task 12 audit uniqueness |
| f-007 Task 1 "count is 4" already stale on re-check | Task 1: only `0` matters |
| f-013 untracked deletions have no `commit` value in the report | Task 23 `(untracked, no repo history)` |
| f-023 corpus undercounted (~4,800 files / 43 repos live vs ~2,900 / 48) | Task 14 records the measured counts; embed estimate softened |

---

## Out of scope (from the goal's OUT line)

Re-running or re-scoring old reviews; auto-generating gap-filling lenses; curating new FLUX lenses; non-`fd-*` agents; a hosted API of any kind; changing flux-drive's roster mechanism (it keeps reading `.claude/agents/`; reuse materializes into it).
