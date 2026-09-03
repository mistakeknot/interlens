---
artifact_type: brainstorm
bead: none
stage: discover
---

# Linsenkasten — GATE fork rulings (goal 8222288d)

Goal: repurpose interlens into the generated-lens registry — every
generated `fd-*` review lens across both machines becomes a queryable,
ranked, reusable graph. Registered `ic goal 8222288d` (project
Sylveste, 2026-08-26), successor to palettice goal `1b94781d`. All
four GATE forks ruled by mk in session, 2026-08-26 → 2026-09-01.
Census evidence (2026-08-26): ~2,500 fd-* agent files + ~730 specs on
Clavain, 2,246 + 549 on zklw — ~4,750 agents / ~1,280 specs total,
heavily duplicated by worktree and session copies.

## What We're Building

interlens' graph engine grows a second layer. The 288 curated FLUX
lenses stay as the taxonomy layer; beneath them, a deduplicated
harvest of every generated review lens (spec + agent body + provenance:
source review, target, fusion lineage, ledger-derived hit-rates),
cross-linked by typed edges. flux-gen and flux-melange consult the
registry reuse-before-regenerate through the existing
combine/contrast seam, and the repo-local `.claude/agents` piles are
deleted post-harvest. The module is renamed **linsenkasten**.

## Why This Approach

The query machinery (search, traversal, paths, gap detection, MCP +
CLI + web explorer) already exists in interlens and is the hard part
of a registry. The two lens species compose: curated lenses are
thinking patterns; generated lenses are applied embodiments of them.
The melange fusion seam already calls interlens tools when available,
so reuse-before-regenerate plugs into an existing integration point.
The module is disabled with zero usage on both machines — the cheapest
possible moment to rename and restructure.

## Key Decisions

### Fork 1 — Name: rename the whole module to `linsenkasten`

Repo (GitHub redirects old URLs), plugin id, MCP server key, and
marketplace row all rename. mk's coinage ("lens box").
**Rejected:** keep `interlens` id with Linsenkasten as an internal
surface name (two names in one module — the mental-model muddle mk is
purging); mint linsenkasten as a new module and retire interlens
(cleanest end-state but maximum churn for the same result).
**Rationale:** the registry becomes the module's center of gravity;
the zero-use trough makes the rename churn as cheap as it will ever
be. Noted caveats, accepted by mk: 4 syllables (off the 2-syllable
naming palette), German compound less discoverable than "interlens",
leaves the inter* family.

### Fork 2 — Schema: typed edges only

Generated lenses attach to the graph exclusively via typed edges:
`embodies` (generated → curated pattern), `fused-from` (generated →
generated parents), `variant-of` (near-duplicate clusters). Edges are
auto-suggested at harvest (embedding match against curated
definitions) and stored as ordinary graph edges so existing
traversal/path/gap tooling works across both layers unchanged.
**Rejected:** flat `flux_lenses` tag arrays (invisible to traversal;
second query path); tags + edges together (two representations of one
fact — guaranteed drift).

### Fork 3 — Dedupe: hash + variant clusters

Tier 1: content-hash on normalized spec + body collapses byte-identical
copies mechanically (worktree/session duplication is the bulk).
Tier 2: high embedding similarity keeps lenses separate but adds
`variant-of` edges into a cluster with one canonical head, picked by
ledger hit-rate, else recency. Nothing distinct is silently merged;
every collapse appears in the sweep report.
**Rejected:** hash-only (re-generations pile up as apparent distinct
entries); semantic merge (irreversibly destroys model-authored
variants whose nuance a future review may need).

### Fork 4 — Prune: delete from live repos post-harvest

After the harvest is verified in the registry, a sweep commit per live
repo removes `.claude/agents/fd-*` and `.claude/flux-gen-specs/`,
citing the registry — ending the per-session agent-list context tax.
Git history + the registry are the archive. The sweep report lists
every file with its registry id. Worktree clones and dead session
dirs are left untouched.
**Rejected:** archive to a non-loading in-repo dir (pile survives,
relocated, ~30 repos keep duplicate copies); leave everything (the
context tax and stale-local-lens muddle continue).

### Fork 5 — Engine runtime: local engine in the MCP, zklw harvests (added 2026-09-02)

Finding that forced the fork: the interlens MCP is a thin fetch client
(`packages/mcp/api-client.js`, 17 of 19 tools) over a Flask API that
was hosted on Railway with embeddings in Supabase. On 2026-09-02 every
`/api/v1/*` route answered 404 "Application not found", the web
explorer targets a `localhost:5003` Flask that nobody runs, and
`apps/api/src/lens/graph.py` (457 lines over networkx) has no runtime.
The "query machinery already exists" premise in *Why This Approach*
holds for the code and the data (258 lenses, 280 typed connections,
thematic frames, all in-repo) but not for anything running.

Ruling (mk, session 74e5950e): **hybrid.** The MCP queries an in-repo
store locally on both machines, so no lens query crosses the network.
zklw, as canonical, runs the harvester and the embedding pass and
commits the registry data; the Mac pulls through git. Query-time text
embedding tries local Ollama, then zklw's Ollama over Tailscale, then a
lexical fallback. The explorer is served from zklw by a small Node
server over the same store.
**Rejected:** zklw-hosted API with the MCP kept as a thin client (fails
closed whenever Tailscale drops — the exact failure just found, and it
was silent for months; a service to keep alive without sudo; store
durability needs its own export step); both a local engine and a zklw
API (two query surfaces to keep in agreement); Flask as a local sidecar
(a Python runtime and process management inside an MCP plugin, and
sentence-transformers is absent on the Mac's Python 3.14); redeploying
Railway + Supabase (a paid hosted dependency for a personal registry
that contradicts the in-repo store).
**Rationale:** the query path never depends on a host; zklw does the
heavy, batchable work it is suited for; the store is git-backed, which
matters once the repo piles are deleted and the registry is the only
copy.
**Consequences:** `graph.py` is ported to JS inside the MCP; a store
module replaces `api-client.js` with the same function signatures;
embeddings are 768-d `nomic-embed-text` via Ollama (serving on both
machines, checked 2026-09-02), precomputed at harvest and committed;
the Flask app and its deploy configs retire.

## Open Questions (implementation calls, not gates)

Resolved 2026-09-02 by Fork 5 or by inspection; defaults carried into
the plan, each reversible there:

- Registry storage home: in-repo `data/` (curated JSON moved beside
  the generated layer; one record file per canonical generated lens
  plus an index and a committed embedding matrix). Resolved by Fork 5.
- Post-rename MCP tool naming: tool names stay (`search_lenses` …);
  only the server key renames, so tools surface as
  `mcp__linsenkasten__*`. Callers that named the server (interflux
  melange references) update in the same change.
- Hit-rate with partial or missing ledgers: per lens,
  `upheld / (upheld + refuted)` over ledger findings attributed to it,
  `raw` excluded, **null** (never 0) when nothing was adjudicated;
  surfaced-count and flux-drive use-count stored beside it as
  separate signals, not folded in.
- Harvest transport: a harvester run per machine writing
  `data/harvest/<machine>.jsonl`, merged by content hash; zklw runs
  the merge and the embedding pass. Frontmatter carries **no** fusion
  lineage anywhere in the pile, so `fused-from` edges come from
  melange lens records (`lenses/*.json`, `parents`) and `-fusion-N`
  spec files, not from agent files.

## Facts checked 2026-09-02

- Census (depth ≤ 4 under `~/projects`, excluding node_modules,
  worktree copies): Mac 2,881 agent files / 1,666 names / 1,685 unique
  bodies (hash dedupe alone removes 41%); zklw 1,628 agent files.
  Specs 671 (Mac) + 402 (zklw). Heat ledgers 86 + 32. flux-drive
  synthesis dirs 365 + 257.
- Ledger findings carry `status ∈ {upheld, refuted, raw}` and
  `source.agents`; melange lens records carry `findings` ids and
  `parents`.
- Rename: the npm package `linsenkasten-mcp` is already published
  under this account at 2.2.1 (the pre-February name; `interlens-mcp`
  was never published). `mistakeknot/linsenkasten` on GitHub is a
  redirect to `interlens`, so the rename back is unblocked.
- interlens is on a sibling session's unpushed `sweep/2026-09-02`
  branch (release, scaffold, jargon, CI lanes). Rename work lands
  after that sweep, on top of it.
