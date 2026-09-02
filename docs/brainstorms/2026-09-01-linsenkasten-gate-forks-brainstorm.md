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

## Open Questions (implementation calls, not gates)

- Registry storage home: default assumption is in-repo data
  (JSON/SQLite beside the 288-lens corpus, synced via git like the
  rest of linsenkasten) — a single canonical store, not per-machine
  divergence. Disclosed default; revisit at plan time if harvest size
  argues for something else.
- Post-rename MCP tool naming (keep existing tool names vs re-prefix).
- Hit-rate computation where heat ledgers are partial or missing
  (many older reviews predate melange's ledger).
- Harvest transport for zklw's pile (likely: run the harvester on each
  machine, merge by content hash — determinism makes merges safe).
