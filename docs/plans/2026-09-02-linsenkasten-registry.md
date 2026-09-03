---
artifact_type: plan
bead: none
goal: 8222288d
stage: design
distills: docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md
---
# Linsenkasten — Generated-Lens Registry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use clavain:executing-plans to implement this plan task-by-task. Written for a sonnet-grade executor: every step names its file, its code, and a machine-checkable expectation. No step says "use your judgment".

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
- `packages/mcp/lib/api-local.js` exports the 17 names `index.js` imports today from `api-client.js` (listed in Task 6), same result shapes.
- `packages/mcp/server.js` (explorer HTTP server) and `packages/mcp/scripts/smoke.mjs` (stdio MCP smoke client).
- `harvest/__init__.py`, `harvest/scan.py`, `harvest/merge.py`, `harvest/stats.py`, `harvest/embed.py`, `harvest/edges.py`, `harvest/prune.py`, `harvest/report.py`, `harvest/thresholds.py`, `harvest/__main__.py`.
- `data/curated/{lenses,connections,frames}.json`, `data/generated/index.jsonl`, `data/generated/lenses/<id>.md`, `data/generated/specs/<id>.json`, `data/generated/edges.jsonl`, `data/generated/attributions.jsonl`, `data/generated/reuse-log.jsonl`, `data/embeddings/{curated,generated}.f32` + `.ids.json` + `meta.json`, `data/reports/*.md`, `data/prune-targets.txt`.
- interflux: `scripts/lib_lens_registry.py`, `--registry` flag in `scripts/generate-agents.py`, `tests/test_lens_registry.py`.

**Key Links** (connections where breakage cascades):
- `index.js` → `lib/api-local.js` → `lib/store.js`/`lib/graph.js` → `data/`. If `data/` moves, `lib/store.js:DATA_ROOT` is the single place that knows.
- `harvest/embed.py` and `packages/mcp/lib/embed.js` must agree on model, dimension, byte layout (`float32` little-endian, row-major, ids file order) and the embedding-text recipe (`harvest/thresholds.py:embedding_text` is the single definition; `embed.js` only reads vectors and embeds *queries*).
- `harvest/edges.py` cluster-head rule ↔ `store.js:getLens` name resolution ↔ `lib_lens_registry.py:resolve` all read `index.jsonl:cluster.head`. One field, three readers.
- `generate-agents.py --registry` must run before `check_existing_agents` decides `skip-existing`, otherwise a stale local copy shadows the registry.
- Prune (Task 23) reads `data/generated/index.jsonl` sightings; it must never run against a registry older than the harvest of the same machine (the report records both timestamps and the script refuses if harvest is older than the newest agent file mtime).

---

## Stage A — Baseline and landing order

### Task 1: Baseline, test scaffolding, CI node step

**Files:**
- Create: `packages/mcp/test/smoke.test.mjs`
- Modify: `.github/workflows/ci.yml` (add node step after the pytest step)
- Modify: `packages/mcp/package.json` (add `"test": "node --test test/"`, bump `"version"` later in Task 19)

**Step 1: Confirm branch and landing order**
Run from the worktree: `git status -sb && git log --oneline -3 && git log --oneline main..sweep/2026-09-02 | wc -l`
Expected: branch `feat/linsenkasten`; the sweep count is `4` until the sibling session lands it. Rule: **do not touch `README.md`, `CHANGELOG.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `kimi.plugin.json` or `.github/workflows/ci.yml` until `git log --oneline main..sweep/2026-09-02 | wc -l` prints `0`** (the sweep edits exactly those). When it prints 0, run `git rebase main` in the worktree once and continue. Task 1's CI edit and every Stage D/E task wait behind this rule; Stages B and C do not.

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
Run: `node --test packages/mcp/test/`
Expected: FAIL (`data/curated/lenses.json` does not exist yet — Task 2 creates it).

**Step 4: CI step (only after the landing rule in Step 1 clears)**
Append to `.github/workflows/ci.yml` under `steps:`:
```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: node --test packages/mcp/test/
      - run: python3 -m pytest tests -q
```
(the second pytest run is intentional: it re-runs after node so a node-side failure cannot hide a python one — remove the earlier duplicate line so pytest runs once, after node).

**Step 5: Commit**
```bash
git add packages/mcp/test/smoke.test.mjs packages/mcp/package.json
git commit --no-verify -F /tmp/msg -- packages/mcp/test/smoke.test.mjs packages/mcp/package.json
```
(commit message file: `test: node test scaffold for the local engine`)

<verify>
- run: `PYTHONPATH=$HOME/projects/Sylveste/interverse python3 -m pytest tests -q`
  expect: exit 0
- run: `test -f packages/mcp/test/smoke.test.mjs && echo ok`
  expect: contains "ok"
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

**Step 3:** Run: `node --test packages/mcp/test/`  Expected: PASS (Task 1's test now finds the file).

**Step 4: Commit** (`git add -A data apps/api` then `git commit --no-verify -F /tmp/msg -- data apps/api`; message `data: move curated lens corpus to data/curated`)

<verify>
- run: `node --test packages/mcp/test/`
  expect: exit 0
- run: `python3 -c "import json;print(len(json.load(open('data/curated/lenses.json'))), len(json.load(open('data/curated/connections.json'))['connections']), len(json.load(open('data/curated/frames.json'))['frames']))"`
  expect: contains "258 280 28"
</verify>

### Task 3: `lib/store.js` — load both layers, lexical search, lookups

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
Run: `node --test packages/mcp/test/store.test.mjs`  Expected: FAIL (module missing).

**Step 3: implementation** — `packages/mcp/lib/store.js`:
```js
import { readFile, readdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { DATA_ROOT } from './constants.js';

let _store = null;

function tokens(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

async function readJsonl(p) {
  try { return (await readFile(p, 'utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l)); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}

export async function loadStore(force = false) {
  if (_store && !force) return _store;
  const curated = JSON.parse(await readFile(path.join(DATA_ROOT, 'curated', 'lenses.json'), 'utf8'))
    .map(l => ({ ...l, name: l.name || l.lens_name, layer: 'curated' }));
  const connections = JSON.parse(await readFile(path.join(DATA_ROOT, 'curated', 'connections.json'), 'utf8')).connections;
  const frames = JSON.parse(await readFile(path.join(DATA_ROOT, 'curated', 'frames.json'), 'utf8')).frames;
  const generated = (await readJsonl(path.join(DATA_ROOT, 'generated', 'index.jsonl')))
    .map(r => ({ ...r, layer: 'generated', definition: r.summary, examples: [], related_concepts: r.domains || [], episode: null }));
  const edges = await readJsonl(path.join(DATA_ROOT, 'generated', 'edges.jsonl'));
  const byId = new Map(); const byName = new Map();
  for (const l of curated) { byId.set(l.id, l); byName.set(l.name.toLowerCase(), l); }
  for (const g of generated) {
    byId.set(g.id, g);
    const key = g.name.toLowerCase();
    // cluster head wins name resolution; first-seen otherwise
    if (!byName.has(key) || (g.cluster && g.cluster.head)) byName.set(key, g);
  }
  const frameOfLens = new Map();
  for (const f of frames) for (const id of f.lens_ids || []) { if (!frameOfLens.has(id)) frameOfLens.set(id, []); frameOfLens.get(id).push(f.id); }
  _store = { curated, generated, connections, frames, edges, byId, byName, frameOfLens };
  return _store;
}

export async function getAllLenses(layer = 'all') {
  const s = await loadStore();
  return layer === 'curated' ? s.curated : layer === 'generated' ? s.generated : [...s.curated, ...s.generated];
}

export async function getLens(nameOrId) {
  const s = await loadStore();
  if (!nameOrId) return null;
  return s.byId.get(nameOrId) || s.byName.get(String(nameOrId).toLowerCase()) || null;
}

function lexicalScore(q, lens) {
  const qt = tokens(q); if (qt.length === 0) return 0;
  const name = lens.name.toLowerCase();
  if (name === q.toLowerCase()) return 100;
  let score = 0;
  const nt = new Set(tokens(lens.name));
  const dt = new Set(tokens([lens.definition, ...(lens.examples || []), ...(lens.related_concepts || [])].join(' ')));
  for (const t of qt) { if (nt.has(t)) score += 10; else if (dt.has(t)) score += 2; }
  if (name.includes(q.toLowerCase())) score += 20;
  return score;
}

export async function searchLenses(query, limit = 10, { layer = 'all' } = {}) {
  const all = await getAllLenses(layer);
  const scored = all.map(l => ({ l, s: lexicalScore(query, l) })).filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.l.name.localeCompare(b.l.name)).slice(0, limit);
  return { success: true, query, count: scored.length,
    lenses: scored.map(({ l, s }) => ({ ...l, score: s })), results: scored.map(({ l, s }) => ({ ...l, score: s })) };
}

export async function getLensesByEpisode(episode) {
  const s = await loadStore();
  const lenses = s.curated.filter(l => String(l.episode) === String(episode));
  return { success: true, episode, count: lenses.length, lenses };
}

export async function getFrames() {
  const s = await loadStore();
  return { success: true, frames: s.frames, count: s.frames.length };
}

export async function getRelatedLenses(nameOrId, limit = 5) {
  const s = await loadStore(); const lens = await getLens(nameOrId);
  if (!lens) return null;
  const conns = s.connections.filter(c => c.source_id === lens.id || c.target_id === lens.id)
    .sort((a, b) => b.weight - a.weight).slice(0, limit);
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
  await appendFile(path.join(DATA_ROOT, 'generated', 'reuse-log.jsonl'), line);
  return { success: true };
}
// resolveLens is added in Task 13 (needs embed.js)
```
Note: `searchLenses` returns both `lenses` and `results` because `index.js` reads `results.lenses` in `search_lenses` and `results.results[0]` in `getLens` today (Task 6 keeps both readers working).

**Step 4:** Run: `node --test packages/mcp/test/store.test.mjs`  Expected: PASS (4 tests).

**Step 5: Commit** — `feat(store): local store over data/ with lexical search`

<verify>
- run: `node --test packages/mcp/test/store.test.mjs`
  expect: exit 0
</verify>

### Task 4: `lib/graph.js` — port of `apps/api/src/lens/graph.py` plus the creative routes

**Files:**
- Create: `packages/mcp/lib/graph.js`
- Test: `packages/mcp/test/graph.test.mjs`
- Reference (read, do not modify): `apps/api/src/lens/graph.py:18-335`, `apps/api/lens_search_api.py:134-200` (`calculate_frame_coverage`), `:1298-1353` (journey), `:1355-1409` (bridges), `:1411-1459` (contrasts), `:1461-1521` (central), `:1523-1573` (neighborhood), `:1575-1632` (random), `:1634-1715` (gaps), `:1813-1954` (triads), `:1956-2074` (progressions)

**Edge construction (exactly as `graph.py:48-142`):** undirected weighted graph over curated lens ids. Edges in this order, never overwriting an existing edge: (1) `connections.json` rows with `weight`, `type`, `insight`; (2) every pair inside one frame's `lens_ids`, weight `0.3`, type `frame`; (3) every pair across adjacent episodes (`ep`, `ep+1`), weight `0.1`, type `temporal`; (4) every pair sharing a `related_concepts` entry (lower-cased) that between 2 and 5 lenses share, weight `0.4`, type `concept`. Then (5) generated-layer typed edges from `edges.jsonl` (`embodies` generated→curated with `score` as weight; `fused-from` and `variant-of` generated↔generated, weight `score` or `0.5` when absent).

**Functions and exact semantics:**
- `buildGraph(store)` → `{ adj: Map<id, Map<id, {weight,type,insight?}>> , ids: string[] }`.
- `findPaths(g, srcId, dstId, maxLen = 4, limit = 5)`: all simple paths of length ≤ `maxLen` by DFS in ascending neighbor-id order; rank by sum of edge weights descending, tie by shorter length; return `limit`.
- `findBridges(g, ids)`: candidate nodes not in `ids` adjacent to **every** id in `ids`; sort by summed weight to the group descending; return top 10.
- `findContrasts(g, id)`: neighbors joined by an edge of `type === 'contrast'`, sorted by weight descending.
- `neighborhood(g, id, radius = 2)`: BFS; returns `{ 1: [...ids], 2: [...ids] }` for each hop distance ≤ radius, each list in ascending id order.
- `centralLenses(g, measure = 'betweenness', limit = 10)`: `degree` = neighbor count; `closeness` = (n-1)/Σ BFS distances (0 for isolated); `betweenness` = Brandes' algorithm on the unweighted graph, normalized by `(n-1)(n-2)/2`. Return `[{id, centrality_score}]` sorted descending, tie by id. Unknown measure → treat as `betweenness`.
- `frameCoverage(store, exploredNames)`: `explored` = frame names that contain ≥1 explored lens; `underexplored` = frames where exactly 1 explored lens sits; `unexplored` = the rest; `total_frames` = 28. Explored names resolve through `getLens` (unknown names are ignored and returned in `unknown`).
- `triads(g, store, id, limit = 3)`: thesis = lens; for each contrast neighbor (antithesis) find a synthesis node adjacent to both with the highest summed weight; emit `{thesis, antithesis, synthesis, contrast_insight}`; `limit` triads.
- `progression(g, store, startId, targetId, maxSteps = 5)`: best path from `findPaths(..., maxSteps, 1)`; each step `{step, lens, insight}` where `insight` is the edge `insight` from the previous step or `''`.

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
  const n = neighborhood(g, EYE, 1); assert.ok(n[1].includes(FOUNDER));
  assert.ok(Array.isArray(findBridges(g, [EYE, FOUNDER])));
});
test('centrality and coverage are deterministic', async () => {
  const s = await loadStore(); const g = buildGraph(s);
  const a = centralLenses(g, 'betweenness', 3), b = centralLenses(g, 'betweenness', 3);
  assert.deepEqual(a, b); assert.equal(a.length, 3);
  const cov = frameCoverage(s, ['Eye of Sauron']);
  assert.equal(cov.total_frames, 28); assert.ok(cov.explored.length >= 1);
  assert.ok(triads(g, s, EYE, 2).length >= 1);
});
```
Run: `node --test packages/mcp/test/graph.test.mjs` → FAIL (module missing).

**Step 2:** implement `packages/mcp/lib/graph.js` per the semantics above (pure functions; no I/O; Brandes betweenness written out, not imported).

**Step 3:** Run the test → PASS.

**Step 4: Commit** — `feat(graph): port lens graph and creative queries to JS`

<verify>
- run: `node --test packages/mcp/test/graph.test.mjs`
  expect: exit 0
</verify>

### Task 5: `lib/embed.js` — Ollama client, matrix loader, cosine top-k

**Files:**
- Create: `packages/mcp/lib/embed.js`
- Test: `packages/mcp/test/embed.test.mjs` (uses a fake Ollama on `node:http`; no network)

**Semantics:**
- `embedTexts(texts, {urls = [OLLAMA_URL, OLLAMA_FALLBACK_URL], timeoutMs = OLLAMA_TIMEOUT_MS})`: POST `{model: EMBED_MODEL, input: texts}` to `${url}/api/embed`; on success return `Float32Array[]` of length `texts.length` each of `EMBED_DIM`; on any failure try the next url; when all fail return `null` (never throw). Log the failure to stderr once per process.
- `loadMatrix(layer)`: read `data/embeddings/<layer>.f32` into a `Float32Array` and `<layer>.ids.json` (array of ids); assert `buf.length === ids.length * EMBED_DIM` else return `null`.
- `cosineTopK(vec, matrix, ids, k)`: vectors are L2-normalized on load; returns `[{id, score}]` top-k descending, tie by id.

**Step 1: failing test** — start a fake server that answers `/api/embed` with deterministic vectors (`Array.from({length:768}, (_, i) => (i === texts.indexOf(t)) ? 1 : 0)`), point `urls` at it, assert `embedTexts(['a','b'])` returns two `Float32Array(768)`; assert `embedTexts(['a'], {urls:['http://127.0.0.1:1']})` returns `null`; write a temp `.f32` of 3 unit vectors and assert `cosineTopK(e0, m, ids, 1)[0].id === ids[0]`.

**Step 2:** implement; **Step 3:** test PASS; **Step 4: Commit** — `feat(embed): ollama embedding client with fallback and cosine top-k`

<verify>
- run: `node --test packages/mcp/test/embed.test.mjs`
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

**`api-local.js` must export exactly these 17 names with these result shapes (what `index.js` reads):**

| export | returns |
|---|---|
| `getCachedData(key)` / `setCachedData(key, data)` | no-ops returning `null` / `undefined` (kept so nothing else breaks) |
| `fetchFromAPI(endpoint)` | throws `Error('linsenkasten: remote API retired; use the local store')` |
| `searchLenses(q, limit)` | `store.searchLenses` result (`{lenses, results, count}`) |
| `getLens(name)` | the lens object or `null` |
| `getLensesByEpisode(ep)` | `{success, episode, count, lenses}` |
| `getRelatedLenses(name, limit)` | `{success, lens, count, connections}` or `null` |
| `findLensJourney(src, dst)` | `{success, source_lens, target_lens, paths: [{lenses: [lensObj...], total_weight}], error?}` |
| `findBridgeLenses(names)` | `{success, count, bridges: [lensObj + {connection_strength}], insight}` |
| `findContrastingLenses(name)` | `{success, source_lens, count, contrasts: [lensObj + {weight, insight}]}` |
| `getCentralLenses(measure, limit)` | `{success, measure, central_lenses: [lensObj + {centrality_score}], insight}` |
| `getLensNeighborhood(name, radius)` | `{success, source_lens, radius, neighborhood: {"1": [lensObj], "2": [lensObj]}}` |
| `getRandomProvocation(context)` | `{success, provocation: lensObj, related: [lensObj], gap_analysis?: coverage, suggestion}`; with `context`, pick uniformly from lenses in an unexplored frame (seeded by `Date.now()`); without, uniformly from curated |
| `detectThinkingGaps(context)` | `{success, coverage: {explored_frames, unexplored_frames, underexplored_frames, total_frames, coverage_percentage}, suggestions: [{frame, sample_lenses: [{id,name,definition,episode}]}], insight}` — `sample_lenses` = up to 3 per unexplored frame, top 5 frames |
| `getDialecticTriads(name, limit)` | `{success, thesis: lensObj, triads: [{antithesis, synthesis, contrast_insight, synthesis_insight}]}` |
| `getLensProgressions(start, target, maxSteps)` | `{success, start_lens, target_lens, progression: [{step, lens, insight}], overall_insight}` |
| `getAllLenses()` | `{success, lenses: [...curated]}` |
| `getFrames()` | `{success, frames, count}` |

Every `error` path returns `{success: false, error: '<message>'}` (never throws) because the handlers print `results.error`.

**Step 1:** write `test/api-local.test.mjs` asserting each export exists and that `findLensJourney('Eye of Sauron','Founder Mode').paths.length >= 1`, `findContrastingLenses('Eye of Sauron').contrasts.some(c => c.name === 'Founder Mode')`, `detectThinkingGaps(['Eye of Sauron']).coverage.total_frames === 28`, `getCentralLenses('degree', 3).central_lenses.length === 3`, and `fetchFromAPI('/x')` rejects.
**Step 2:** implement `api-local.js` over `store.js` + `graph.js`. **Step 3:** switch the import in `index.js`, delete `api-client.js`, drop `node-fetch`. Run `node --test packages/mcp/test/` → PASS.
**Step 4: smoke client** — `packages/mcp/scripts/smoke.mjs`: uses `@modelcontextprotocol/sdk/client/index.js` + `StdioClientTransport` to spawn `node index.js`, `initialize`, then `callTool(process.argv[2], JSON.parse(process.argv[3] || '{}'))` and print the text content. Run: `node packages/mcp/scripts/smoke.mjs search_lenses '{"query":"feedback"}'` → contains `Situation-Behavior-Impact`.
**Step 5: Commit** — `feat(mcp): serve every tool from the local store; retire the API client`

<verify>
- run: `node --test packages/mcp/test/`
  expect: exit 0
- run: `node packages/mcp/scripts/smoke.mjs search_lenses '{"query":"feedback"}'`
  expect: contains "Situation-Behavior-Impact"
- run: `node packages/mcp/scripts/smoke.mjs find_lens_journey '{"source":"Eye of Sauron","target":"Founder Mode"}'`
  expect: contains "Conceptual Journey"
- run: `grep -c "api-client" packages/mcp/index.js`
  expect: contains "0"
</verify>

### Task 7: CLI on the local engine

**Files:**
- Modify: `packages/mcp/cli.js` (replace `import * as api from './api-client.js'` with `'./lib/api-local.js'`; delete the `INTERLENS_API_URL` help text; `export` writes `data/curated/lenses.json` content)

**Step 1:** run `node packages/mcp/cli.js search feedback` → currently fails (network). **Step 2:** edit imports. **Step 3:** run again → prints `Situation-Behavior-Impact`. **Step 4: Commit** — `feat(cli): run against the local store`

<verify>
- run: `node packages/mcp/cli.js search feedback`
  expect: contains "Situation-Behavior-Impact"
</verify>

**Gate A (engine parity) is met when Tasks 1–7 verify.** Re-enable the plugin on this machine (`"interlens@interagency-marketplace": true` in `~/.claude/settings.json`, replaced by the linsenkasten key in Task 20) and confirm from a fresh session that `mcp__interlens__search_lenses` answers with Wi-Fi off.

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

**`scan.py` semantics:** walk `--roots` (default `~/projects`) to `MAX_DEPTH`, skipping `EXCLUDE_DIR_NAMES` and any path containing `/.claude/worktrees/`. For each `.claude/agents/fd-*.md`: parse frontmatter (yaml between the first two `---` lines; on parse failure record `frontmatter: null` and continue), `body` = text after frontmatter, `body_hash` = sha256 of `re.sub(r"\s+", " ", body).strip()`, `name` = filename stem, `repo` = path up to `/.claude/`, `machine` = `--machine` (required). Spec lookup: `<repo>/.claude/flux-gen-specs/*.json` unwrapped like `generate-agents.py:_unwrap_spec_list` (list, or dict with `agents`/`specs`); match by `name`; record `spec_path` and the spec object. Melange inputs: every `docs/research/flux-melange/*/` under a repo: `heat-ledger.jsonl` rows → attribution rows `{run, finding_id, lens, status, novelty, risk_product, surfaced: bool}` (surfaced from `surfaced.jsonl` ids), `lenses/*.json` → lineage rows `{run, lens, kind, parents}`. flux-drive usage: count of distinct dirs under `docs/research/flux-drive/` whose `*.md` mention the name (regex `\bfd-[a-z0-9-]+\b`, exactly as `flux-agent.py:_count_usage_from_synthesis`).

Output: `data/harvest/<machine>.jsonl` — rows of three kinds, `kind: "sighting" | "attribution" | "lineage"`, sorted by `(kind, repo, name, path)`. Sighting row: `{kind, machine, repo, path, name, body_hash, frontmatter, spec_path, spec, drive_uses, mtime}`. Bodies are written to `data/generated/lenses/<id>.md` with `id = f"gen:{name}@{body_hash[:8]}"` (idempotent: identical file on both machines). Also prints `scanned=<n> unique_bodies=<n> unreadable=<n>` and writes `data/reports/<date>-harvest-<machine>.md` with a per-repo table.

**Step 1:** write the conftest fixture and `test_scan.py` asserting: 3 agent files scanned, 2 unique bodies, worktree copy skipped, the spec attaches, 3 attribution rows with statuses, 1 lineage row with two parents, `unreadable == []`.
**Step 2:** run → FAIL; **Step 3:** implement; **Step 4:** run → PASS; **Step 5: Commit** — `feat(harvest): scan a machine's repos into sightings`

<verify>
- run: `python3 -m pytest tests/harvest/test_scan.py -q`
  expect: exit 0
- run: `python3 -m harvest scan --machine clavain --roots ~/projects --dry-run | tail -1`
  expect: contains "scanned="
</verify>

### Task 9: `harvest/merge.py` — union of machines into `index.jsonl`

**Semantics:** read every `data/harvest/*.jsonl`; group sightings by `body_hash`; one index record per hash:
```json
{"id":"gen:fd-x@1a2b3c4d","name":"fd-x","body_hash":"…","body_path":"generated/lenses/gen:fd-x@1a2b3c4d.md",
 "sightings":3,"machines":["clavain","zklw"],"repos":["shadow-work","elf-revel"],
 "first_seen":"2026-07-08T21:05:13+00:00","last_seen":"2026-08-30T…",
 "generated_by":"flux-gen-prompt","flux_gen_version":6,"tier":"used","use_count":4,"last_used":"2026-08-12",
 "domains":["migration"],"source_spec":"…json","spec_path":"generated/specs/gen:fd-x@1a2b3c4d.json",
 "summary":"<first sentence of the persona paragraph, ≤ 240 chars>",
 "lineage":{"parents":["fd-a","fd-b"]},
 "stats":{"findings":0,"upheld":0,"refuted":0,"raw":0,"surfaced":0,"runs":0,"hit_rate":null,"drive_uses":0},
 "cluster":{"id":null,"head":false},"embodies":[]}
```
`generated_at` for `first_seen`/`last_seen` from frontmatter, falling back to file mtime; `tier`/`use_count`/`last_used` = max across sightings; `domains` = sorted union; `stats`, `cluster`, `embodies` are filled by Tasks 10 and 12 (merge writes their zero shapes). Specs: copy the spec object to `data/generated/specs/<id>.json` (first sighting with a spec wins; identical specs by definition). Write `data/generated/index.jsonl` sorted by id and `data/reports/<date>-merge.md` listing every hash with >1 sighting (the tier-1 collapses) as `id | sightings | machines | repos`.

**Test** (`tests/harvest/test_merge.py`): two fixture harvest files with an overlapping hash → 1 record with `machines == ["clavain","zklw"]`, `sightings == 2`; ordering stable across two runs (byte-identical output).

<verify>
- run: `python3 -m pytest tests/harvest/test_merge.py -q`
  expect: exit 0
</verify>

### Task 10: `harvest/stats.py` — hit-rates and usage

**Semantics:** for each index record, over attribution rows whose `lens == name` (name-level: a lens's findings attribute to its name, which is what the ledger records): `findings` = rows, `upheld`/`refuted`/`raw` = counts by status, `surfaced` = rows with `surfaced`, `runs` = distinct `run`; `hit_rate = upheld / (upheld + refuted)` rounded to 3 places **only when `upheld + refuted >= 1`, else `null`**. `drive_uses` = max over sightings. Writes back into `index.jsonl` (rewrite whole file, sorted) and `data/generated/attributions.jsonl` (the raw rows, sorted by `(run, finding_id, lens)`).

**Test:** ledger fixture with 2 upheld, 1 refuted, 1 raw for `fd-a` → `hit_rate == 0.667`, `raw == 1`; `fd-b` with only raw → `hit_rate is None`.

<verify>
- run: `python3 -m pytest tests/harvest/test_stats.py -q`
  expect: exit 0
</verify>

### Task 11: `harvest/embed.py` — vectors for both layers

**Semantics:** texts: curated = `f"{name}\n{definition}\n" + "\n".join(examples)`; generated = `thresholds.embedding_text(spec, body)`. Call Ollama `POST {url}/api/embed` with `{"model": EMBED_MODEL, "input": [batch of 32]}` (urllib, timeout 60 s, `--ollama-url` default `http://127.0.0.1:11434`); L2-normalize; write `data/embeddings/<layer>.f32` (`array('f')` little-endian, row-major) and `<layer>.ids.json` (ids in row order, sorted by id), and `meta.json` `{model, dim, curated: n, generated: n, generated_at, index_sha256}`. `--check` reloads both matrices and asserts `len(bytes) == n * EMBED_DIM * 4`. Incremental: keep rows whose id is unchanged (`meta.index_sha256` per id map stored in `<layer>.hashes.json`) so re-runs only embed new records.

**Test:** fake Ollama via `http.server` in a thread returning unit vectors; assert file sizes, id order, normalization, and that a second run with one new record embeds exactly one text (count requests).

<verify>
- run: `python3 -m pytest tests/harvest/test_embed.py -q`
  expect: exit 0
</verify>

### Task 12: `harvest/edges.py` — typed edges, clusters, calibration report

**Semantics** (all cosines from the committed matrices; no Ollama calls):
- `embodies`: for each generated row, top `EMBODIES_TOP_K` curated by cosine; keep those `≥ EMBODIES_MIN_COSINE`; if none clear the bar keep only the top-1 with `"weak": true`. Edge `{source: gen_id, target: curated_id, type: "embodies", score, weak}`; also written into the record's `embodies: [{id, score}]`.
- `variant-of`: union-find over generated pairs with cosine `≥ VARIANT_MIN_COSINE` **or** identical `name`; each component with ≥ 2 members becomes cluster `clu:<sha256 of sorted member ids>[:12]`; head = the member with the highest `stats.hit_rate` among members having `upheld + refuted >= 2`; else highest `use_count + drive_uses`; else latest `last_seen`; ties by id. Edge `{source: member, target: head, type: "variant-of", score: cosine(member, head)}` for every non-head member. Singleton records get `cluster: {id: null, head: true}`.
- `fused-from`: from lineage rows with `kind == "fusion"` and from sightings whose `spec_path` matches `-fusion-\d+\.json`: edge `{source: fused_id, target: parent_id, type: "fused-from"}` for each parent resolved by name through the cluster head; unresolved parents are listed in the report under `unresolved_parents`.
- Report `data/reports/<date>-edges.md`: counts per type, cluster size histogram, **the 10 closest pairs below `VARIANT_MIN_COSINE`** (not merged) and **the 10 farthest pairs inside clusters** (merged) with names and scores, and all `weak` embodies. This is the calibration table a human reads before Task 23.

**Test:** 4 generated + 3 curated unit-vector fixture → expected clusters, head choice by hit-rate, weak embodies flag, fused-from resolution through the head.

<verify>
- run: `python3 -m pytest tests/harvest/test_edges.py -q`
  expect: exit 0
</verify>

### Task 13: Generated layer in the MCP: search across layers, `resolve_lens`, `record_reuse`, `registry_stats`

**Files:**
- Modify: `packages/mcp/lib/store.js` (add `resolveLens`), `packages/mcp/index.js` (3 new tools; `search_lenses` gains optional `layer` arg, default `all`; results print `[generated]`/`[curated]` before each name; `get_lens` prints `cluster`, `hit_rate`, `embodies`, `sightings` for generated lenses)
- Test: `packages/mcp/test/generated.test.mjs` using a fixture `data` dir via `LINSENKASTEN_DATA_ROOT`

**`resolveLens({text?, spec?, k = 3})`:** text = `spec ? embeddingText(spec) : text` (JS port of `thresholds.embedding_text`, kept byte-identical); `embedTexts([text])` → if `null`, lexical fallback: exact `name` match or Jaccard over `tokens(spec.focus)` vs record `summary` tokens ≥ 0.6 → `{matched: bool, method: "lexical"}`; else `cosineTopK` over `generated` heads only (non-heads are skipped) → `matches: [{id, name, score, hit_rate, embodies, cluster}]`, `matched = matches[0].score >= RESOLVE_MIN_COSINE`, `method: "embedding"`.

**`record_reuse({registry_id, consumer, target, project})`** → `store.recordReuse` → `{success: true}`. **`registry_stats`** → `getStats()` plus edge counts by type and cluster count.

<verify>
- run: `node --test packages/mcp/test/`
  expect: exit 0
- run: `node packages/mcp/scripts/smoke.mjs registry_stats '{}'`
  expect: contains "generated_lenses"
</verify>

### Task 14: First real harvest on this machine, merge, embed, edges; commit the generated layer

**Step 1:** `python3 -m harvest scan --machine clavain --roots ~/projects` → `data/harvest/clavain.jsonl`, bodies, report.
**Step 2:** `python3 -m harvest merge && python3 -m harvest stats`.
**Step 3:** `python3 -m harvest embed --check` (local Ollama; ~1,700 generated + 258 curated texts; expect < 10 min).
**Step 4:** `python3 -m harvest edges` and **read `data/reports/<date>-edges.md`**: the calibration tables are part of the deliverable; if the ten closest non-merged pairs are obviously the same lens, or the ten farthest merged pairs are obviously different lenses, adjust `VARIANT_MIN_COSINE` by ±0.02 once, re-run edges, and record the before/after in the report header. Do not iterate further without a human.
**Step 5:** `node packages/mcp/scripts/smoke.mjs search_lenses '{"query":"identity platform migration","layer":"generated"}'` → contains `fd-authplatform-migration`.
**Step 6: Commit** in two commits: `data: clavain harvest 2026-09-xx (N sightings, M unique)` (data/harvest, data/generated, data/reports) and `data: embeddings (nomic-embed-text, 768-d)` (data/embeddings). Push.

<verify>
- run: `python3 -c "import json;n=sum(1 for _ in open('data/generated/index.jsonl'));print('records',n)"`
  expect: contains "records"
- run: `python3 -m harvest embed --check`
  expect: exit 0
- run: `node packages/mcp/scripts/smoke.mjs resolve_lens '{"text":"identity-platform migration engineer who has executed live Clerk primary-domain changes"}'`
  expect: contains "fd-authplatform-migration"
</verify>

### Task 15: zklw harvest, merge on zklw, embed on zklw (the canonical pass)

Run on zklw (hand off the SSH step if the Bash gate bites; commands are the same):
```bash
cd ~/projects/Sylveste/interverse/interlens && git pull --ff-only origin main
python3 -m harvest scan --machine zklw --roots ~/projects
python3 -m harvest merge && python3 -m harvest stats && python3 -m harvest embed --check && python3 -m harvest edges
git add data && git commit --no-verify -F /tmp/msg -- data && git push origin HEAD:main
```
Then on the Mac: `git pull --ff-only` and `python3 -m harvest embed --check` (no re-embedding: the hashes file makes it a no-op) and `node --test packages/mcp/test/`.

<verify>
- run: `python3 -c "import json;ms=set();[ms.update(json.loads(l)['machines']) for l in open('data/generated/index.jsonl')];print(sorted(ms))"`
  expect: contains "['clavain', 'zklw']"
</verify>

**Gate B (registry live) is met when Tasks 8–15 verify on both machines.**

---

## Stage D — interflux: reuse-before-regenerate

### Task 16: `scripts/lib_lens_registry.py` in interflux

**Files (interflux repo, `~/projects/Sylveste/interverse/interflux`):**
- Create: `scripts/lib_lens_registry.py`
- Test: `tests/test_lens_registry.py` (fixture registry under `tmp_path`, `LINSENKASTEN_ROOT` pointed at it, fake Ollama thread)

**Semantics:** `find_registry_root()` → first existing of `$LINSENKASTEN_ROOT`, `~/projects/Sylveste/interverse/linsenkasten`, `~/projects/Sylveste/interverse/interlens`, newest `~/.claude/plugins/cache/interagency-marketplace/linsenkasten/*/`; return `None` when none has `data/generated/index.jsonl`. `load()` → heads only. `resolve(spec) -> dict | None`: same recipe as Task 13 (`embedding_text` copied verbatim from `harvest/thresholds.py` with a comment naming the source; Ollama local then `LINSENKASTEN_OLLAMA_FALLBACK_URL`, 4 s timeout; lexical fallback; `RESOLVE_MIN_COSINE = 0.86`). `materialize(match, agents_dir, spec)` → writes `<agents_dir>/<spec name>.md` = registry body with frontmatter fields added/overridden: `tier: registry`, `registry_id`, `reused_at` (date), `source_spec` (the current spec file), keeping `name`/`description`. `record_reuse(root, entry)` → appends to `<root>/data/generated/reuse-log.jsonl` when writable, else to `<project>/.claude/flux-gen-specs/reuse-log.jsonl`; returns which.

<verify>
- run: `cd ~/projects/Sylveste/interverse/interflux && python3 -m pytest tests/test_lens_registry.py -q`
  expect: exit 0
</verify>

### Task 17: `generate-agents.py --registry=auto|off`

**Files:** Modify `scripts/generate-agents.py` (argparse: `--registry`, default `auto`; in the spec loop **before** the `name in existing` check: if registry available and `resolve(spec)` matches → `materialize`, append `{"name", "registry_id", "score", "method"}` to `report["reused"]`, `record_reuse(...)`, `continue`); add `"reused": []` to the report shape; `--json` output includes it. Update `commands/flux-gen.md:67` and `commands/flux-explore.md` to mention `--registry` and the `reused` list; update `skills/flux-melange-engine/references/fusion.md:40`, `phases/seed.md:37`, `phases/retarget.md:31` to say `linsenkasten` MCP tools.

**Test:** `tests/test_generate_agents_registry.py`: spec matching the fixture registry → file written with `tier: registry`, report `reused` has 1 entry, `generated` has 0; with `--registry=off` → rendered normally.

<verify>
- run: `cd ~/projects/Sylveste/interverse/interflux && python3 -m pytest tests -q`
  expect: exit 0
</verify>

### Task 18: Prove a real reuse (DONE WHEN item)

Pick a target where a hit is near-certain: re-run flux-gen against the jawn apex-domain decision that produced `fd-authplatform-migration` (spec at `~/.claude/flux-gen-specs/jawn-apex-domain-decision-seed-adjacent.json`): `python3 ~/projects/Sylveste/interverse/interflux/scripts/generate-agents.py /tmp/lk-reuse-proof --from-specs ~/.claude/flux-gen-specs/jawn-apex-domain-decision-seed-adjacent.json --mode=skip-existing --registry=auto --json` after `mkdir -p /tmp/lk-reuse-proof/.claude/agents`. Then run one real `/flux-drive` or `/flux-melange` on any current design doc and check its report for `reused`. Record both in `docs/research/2026-09-xx-reuse-proof.md` with the reuse-log lines.

<verify>
- run: `python3 ~/projects/Sylveste/interverse/interflux/scripts/generate-agents.py /tmp/lk-reuse-proof --from-specs ~/.claude/flux-gen-specs/jawn-apex-domain-decision-seed-adjacent.json --mode=skip-existing --registry=auto --json | python3 -c "import sys,json;r=json.load(sys.stdin);print('reused',len(r['reused']))"`
  expect: contains "reused 1"
- run: `tail -1 data/generated/reuse-log.jsonl`
  expect: contains "registry_id"
</verify>

---

## Stage E — Rename to linsenkasten (after the sweep lands; see Task 1 Step 1)

### Task 19: In-repo rename

Reverse of `docs/research/rename-linsenkasten-in-plugin.md` (Feb 2026) which lists every file; apply its mapping table backwards (`interlens`→`linsenkasten`, `Interlens`→`Linsenkasten`, `InterlensMCP`→`LinsenkastenMCP`, `interlens-mcp`→`linsenkasten-mcp`, `INTERLENS_*`→`LINSENKASTEN_*`) with `git ls-files -z | xargs -0 grep -lI -i interlens | xargs sed -i '' …` **excluding** `CHANGELOG.md` history entries, `docs/brainstorms/**`, `docs/plans/**`, `docs/research/**` (allowlist). Specifics: `.claude-plugin/plugin.json` `name` + `mcpServers` key; `kimi.plugin.json`; `packages/mcp/package.json` `name` = `linsenkasten-mcp`, `bin` = `{"linsenkasten": "./cli.js", "linsenkasten-mcp": "./index.js"}`, `version` = `3.0.0`; root `package.json`; `tests/structural/test_structure.py:18` → `"linsenkasten"`; README/CLAUDE/AGENTS/PHILOSOPHY; a CHANGELOG `3.0.0` entry naming the rename, the local engine and the registry. Remove the dead deploy files here too if Task 21 has not run yet.

<verify>
- run: `PYTHONPATH=$HOME/projects/Sylveste/interverse python3 -m pytest tests -q && node --test packages/mcp/test/`
  expect: exit 0
- run: `git ls-files | grep -v -E '^(CHANGELOG.md|docs/)' | xargs grep -lI -i interlens | wc -l | tr -d ' '`
  expect: contains "0"
</verify>

### Task 20: Repo, directories, marketplace, settings, cross-repo references

1. `gh repo rename linsenkasten -R mistakeknot/interlens --yes` (redirect flips; the old URL keeps working).
2. Both machines: `mv ~/projects/Sylveste/interverse/interlens ~/projects/Sylveste/interverse/linsenkasten && git -C ~/projects/Sylveste/interverse/linsenkasten remote set-url origin git@github.com:mistakeknot/linsenkasten.git`; the `.git-autosync` marker moves with the directory; re-point the Mac worktree (`git worktree repair`).
3. `~/projects/interagency-marketplace/.claude-plugin/marketplace.json`: the row `name: linsenkasten`, `url: https://github.com/mistakeknot/linsenkasten.git`, `version: 3.0.0`, description: "Lens box: 288 FLUX cognitive lenses plus the registry of every generated fd-* review lens — searchable, ranked, reused by flux-gen and melange. Local MCP over an in-repo graph." README section `### interlens` → `### linsenkasten` with `/plugin install linsenkasten`.
4. `~/.claude/settings.json` on both machines: delete `"interlens@interagency-marketplace": false`, add `"linsenkasten@interagency-marketplace": true`.
5. Clavain (`~/projects/Sylveste/os/Clavain`), the 8 real files: `agent-rig.json`, `commands/setup.md`, `docs/clavain-vision.md`, `docs/PRD.md`, `docs/roadmap.json`, `scripts/install-codex-interverse.sh`, and the two `docs/research/*.md` (leave research history untouched; edit the other six). interflux docs from Task 17. `interlock`, `lattice`, `core/interweave` mentions: grep, and edit only live config/scripts (not docs/research).
6. Publish: `interpub:release` for linsenkasten 3.0.0 and interflux (patch bump).

<verify>
- run: `gh repo view mistakeknot/linsenkasten --json name -q .name`
  expect: contains "linsenkasten"
- run: `grep -c '"linsenkasten"' ~/projects/interagency-marketplace/.claude-plugin/marketplace.json`
  expect: contains "1"
- run: `grep -c 'linsenkasten@interagency-marketplace": true' ~/.claude/settings.json`
  expect: contains "1"
</verify>

---

## Stage F — Retire hosted remnants; explorer on zklw

### Task 21: Delete the Flask app and deploy configs

Delete: `apps/api/` entirely (data already moved; `scripts/generate_contrasts*.py` stay in git history), `apps/web/api/` (Vercel functions incl. `mcp-sse.js`), `apps/web/vercel.json`, `apps/web/netlify.toml`, `apps/web/railway.toml`, `apps/web/Dockerfile`, `apps/web/setup.sh`, `packages/mcp/examples/*` referring to remote URLs (rewrite to stdio config), `express` + `cors` from `packages/mcp/package.json`, `"dev": "vercel dev"` script. Update `pnpm-workspace.yaml` if it lists `apps/api`.

<verify>
- run: `test ! -d apps/api && test ! -d apps/web/api && echo gone`
  expect: contains "gone"
- run: `node --test packages/mcp/test/`
  expect: exit 0
</verify>

### Task 22: `packages/mcp/server.js` + explorer build + zklw user unit

**Server** (`node:http`, no deps): `--host` (default `127.0.0.1`), `--port` (default `7411`), `--static <dir>` (default `apps/web/build`). Routes over `store.js`/`graph.js`, JSON shapes matching what `apps/web/src/components/useLenses.js` reads (`data.lenses`, `data.results`, `data.statistics`, `data.timeline`, `data.concepts`, `data.frames`, `data.contrasts`) and `LensGraphEnhanced.jsx` (`/lenses/graph` → `{nodes:[{id,name,episode,type,layer}], edges:[{source,target,weight,type}]}`; `/lenses/graph/enhanced` same plus generated nodes and typed edges): `/api/v1/lenses` (query `type`, `episode`, `layer`), `/api/v1/lenses/search?q=`, `/api/v1/lenses/stats` → `{statistics: getStats()}`, `/api/v1/lenses/episodes/:n`, `/api/v1/lenses/concepts` (related_concepts counted), `/api/v1/lenses/timeline` (per-episode counts), `/api/v1/lenses/:id`, `/api/v1/creative/contrasts?lens=`, `/api/v1/frames`. 404 JSON otherwise. Static files served with correct MIME for `.html .js .css .json .png .svg .woff2`.
**Explorer:** `LensCard.jsx` renders `{lens.layer === 'generated' && <span className="layer-badge">generated</span>}`; `apps/web/src/components/useLenses.js` default `API_BASE_URL` → `'/api/v1'`. Build: `pnpm -C apps/web install && pnpm -C apps/web build`.
**zklw unit** `~/.config/systemd/user/linsenkasten-explorer.service`:
```ini
[Unit]
Description=Linsenkasten explorer (local store, Tailscale only)
[Service]
WorkingDirectory=%h/projects/Sylveste/interverse/linsenkasten
ExecStart=/usr/bin/env node packages/mcp/server.js --host %h/.local/share/linsenkasten/ts-ip --port 7411
Restart=on-failure
[Install]
WantedBy=default.target
```
(`--host` accepts a path: the server reads the file to get zklw's Tailscale IP, written once by `tailscale ip -4 > ~/.local/share/linsenkasten/ts-ip`; `systemctl --user daemon-reload && systemctl --user enable --now linsenkasten-explorer`; `loginctl show-user mk -p Linger` must say `yes`, else hand off).

<verify>
- run: `node packages/mcp/server.js --port 7412 & sleep 1; curl -s localhost:7412/api/v1/lenses/search?q=feedback | head -c 200; kill %1`
  expect: contains "Situation-Behavior-Impact"
- run: `curl -s -m 8 http://$(ssh -o BatchMode=yes zklw tailscale ip -4):7411/api/v1/lenses/stats`
  expect: contains "generated_lenses"
</verify>

---

## Stage G — Prune (ruled: delete from live repos, nothing silent)

### Task 23: `harvest/prune.py` and the Mac sweep

**Semantics:** `python3 -m harvest prune --machine clavain [--apply]`. Reads `data/generated/index.jsonl` + `data/harvest/clavain.jsonl`. Candidate repos = lines of `data/prune-targets.txt` (created by `--plan`: every repo with a pile that (a) is a git repo, (b) is not under `.worktrees/`, `.claude/worktrees/`, or a directory whose name ends in `-sessions`, `-f2`, `-spike-*`, (c) has a clean `git status --porcelain` for paths outside `.claude/`). **A human reviews and commits `prune-targets.txt` before `--apply`.** Refuses to run when the newest `fd-*.md` mtime in any target is newer than the harvest file's timestamp ("re-harvest first"). For each target: for every `.claude/agents/fd-*.md`, compute `body_hash`; if the hash is **not** in the index → keep and list under `kept: not in registry`; else delete (`git rm -q` if tracked, `rm` otherwise); delete `.claude/flux-gen-specs/` the same way (a spec is deletable when every `name` inside it resolves to an index record); delete `.claude/agents/.index.yaml` only if no non-fd agents remain in it. Commit per repo on **its current branch, checked in the same command** (`git -C <repo> symbolic-ref --short HEAD`), message `chore: prune generated review lenses (harvested into linsenkasten <index commit>)`, `--no-verify`. Sylveste root (`~/projects/Sylveste/.claude/agents`, 396 files): main is protected → commit on a branch `chore/prune-fd-agents` and open a PR; list it in the report as "PR opened". Report `data/reports/<date>-prune-clavain.md`: per repo `path | registry id | action` for every file, the kept list, the refused repos with reasons.

**Test:** fixture repo with 3 agents (2 in registry, 1 not) → `--apply` deletes 2, keeps 1, commits once; a dirty repo is refused; a stale harvest is refused.

<verify>
- run: `python3 -m pytest tests/harvest/test_prune.py -q`
  expect: exit 0
- run: `python3 -m harvest prune --machine clavain --plan | tail -1`
  expect: contains "targets="
</verify>

### Task 24: zklw prune sweep

Same as Task 23 on zklw after `git pull --ff-only` and a fresh `scan --machine zklw` if any target changed; commit `data/reports/<date>-prune-zklw.md`; push.

---

## Stage H — Docs, publish, close

### Task 25: Docs, roadmap, version, publish, goal close

- `README.md` (post-sweep): what the registry is, the data layout (link `data/README.md`), the six `harvest` commands, env vars (`LINSENKASTEN_DATA_ROOT`, `LINSENKASTEN_OLLAMA_URL`, `LINSENKASTEN_OLLAMA_FALLBACK_URL`), the explorer URL on zklw, the reuse contract for flux-gen.
- `AGENTS.md` / `CLAUDE.md`: validation commands = `PYTHONPATH=… python3 -m pytest tests -q`, `node --test packages/mcp/test/`, `node packages/mcp/scripts/smoke.mjs …`; the "zklw harvests, Mac pulls" rule; never hand-edit `data/generated/*`.
- `docs/roadmap.json`: mark ILES-N3 (provenance + confidence) done, add the registry line.
- Publish 3.0.0 (Task 20 step 6 if not done). Fold the brainstorm's *Facts checked* into the CHANGELOG entry.
- Close goal 8222288d from `~/projects/Sylveste` per the ic protocol (begin → verified / reflected / compounded / successor_proposed with the same fence → finish), citing: both machines harvested (index `machines`), hit-rates attached (`stats.hit_rate` non-null count), the reuse proof doc, sweep reports, the fresh-session MCP check, the explorer URL.

<verify>
- run: `grep -c "harvest scan" README.md`
  expect: contains "1"
</verify>

---

## Review findings (flux-melange) — folded after run wf_574f8a49-3e2

_Pending: the melange over the brainstorm (`docs/research/flux-melange/linsenkasten-registry-design/`) is running; its upheld findings are folded here as task amendments before this plan is sealed._

---

## Out of scope (from the goal's OUT line)

Re-running or re-scoring old reviews; auto-generating gap-filling lenses; curating new FLUX lenses; non-`fd-*` agents; a hosted API of any kind; changing flux-drive's roster mechanism (it keeps reading `.claude/agents/`; reuse materializes into it).
