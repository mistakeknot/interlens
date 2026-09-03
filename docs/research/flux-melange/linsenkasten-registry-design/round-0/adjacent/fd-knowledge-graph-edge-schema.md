# fd-knowledge-graph-edge-schema — round 0

## Findings Index
- [P0] fusion-lineage-source-deleted-by-fork-4 — the only two sources for `fused-from` provenance include `-fusion-N` spec files that Fork 4's own sweep deletes (§Fork 4 / §Open Questions)
- [P1] multi-parent-embodies-collapsed-to-one-edge — `embodies` has no cardinality story, so a lens synthesized from two curated patterns loses one relationship permanently (§Fork 2)
- [P2] traversal-tooling-tuned-for-288-nodes — `graph.py`'s centrality/cluster queries are being ported wholesale into a ~7x larger, denser graph with no re-tuning called out (§Fork 5)
- [P2] cluster-head-reassignment-orphans-edges — existing `fused-from`/`embodies` edges keep naming a demoted canonical head after reassignment (§Fork 3)

## Findings

### fusion-lineage-source-deleted-by-fork-4
- **Severity:** P0
- **Where:** Fork 4 ("Prune: delete from live repos post-harvest," lines 80–90) intersecting Open Questions → "Harvest transport" (lines 147–152)
- **What:** Open Questions states plainly that "frontmatter carries **no** fusion lineage anywhere in the pile, so `fused-from` edges come from melange lens records (`lenses/*.json`, `parents`) and `-fusion-N` spec files, **not from agent files**." Those `-fusion-N` spec files live under `.claude/flux-gen-specs/` — which is exactly the second directory Fork 4's sweep commit removes ("removes `.claude/agents/fd-*` and `.claude/flux-gen-specs/`"). Fork 4's stated precondition is "after the harvest is verified in the registry," but nothing defines "verified" as a per-file check that every `-fusion-N` spec in a repo has a matching `fused-from` edge already committed. A spec the harvester's fusion-detection pass fails to parse or match (no filename format, regex, or match rule is specified anywhere in the design) is silently deleted with no independent record — `lenses/*.json parents` is a second, independently-lifecycled artifact that won't exist for a fusion whose melange run never wrote a lens record, or whose record predates this scheme.
- **Evidence:** `docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md:80-90` (Fork 4), `:147-152` (Open Questions, harvest transport). Confirmed in-repo: `docs/research/flux-melange/linsenkasten-registry-design/lenses/fd-knowledge-graph-edge-schema.json` shows the actual `lenses/*.json` shape this scheme depends on (`"kind": "base", "parents": []` — a fusion record would carry populated `parents`, but round-0 has none to verify the extraction against).
- **Suggestion:** Add an explicit, checkable gate to Fork 4: a repo's prune sweep may run only after a count-reconciliation — every `-fusion-N` file under that repo's `.claude/flux-gen-specs/` has a corresponding `fused-from` edge in the committed registry — passes; fail the sweep (don't skip the file) on any unmatched spec.

### multi-parent-embodies-collapsed-to-one-edge
- **Severity:** P1
- **Where:** Fork 2 ("Schema: typed edges only," lines 56–66)
- **What:** `embodies` edges are "auto-suggested at harvest (embedding match against curated definitions)" — phrased and rejected-alternatives-justified as if one generated lens maps to one curated pattern. But the brainstorm's own "Why This Approach" section describes flux-gen and melange's "combine/contrast seam" as a generation mechanism, and the census (line 20) notes heavy duplication consistent with lenses synthesized from multiple curated frames at once. Fork 2 gives no cardinality rule for `embodies` — is it top-1, top-N, or all-above-threshold? As written, a lens that genuinely embodies two curated patterns in roughly equal measure gets forced onto whichever embeds marginally closer, and the second real relationship becomes permanently untraversable and un-gap-detectable — Fork 2 explicitly rejects a parallel tag array as "two representations of one fact — guaranteed drift," so there's no fallback representation for the discarded edge either.
- **Evidence:** `docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md:56-66` (Fork 2 schema and rejected alternatives), `:33-36` (combine/contrast seam).
- **Suggestion:** Allow `embodies` to be multi-valued — multiple typed edges from one generated-lens node to multiple curated nodes above a similarity threshold — rather than a single best match. This is additive to the existing typed-edge model (no new edge type, no tag array), so it doesn't reopen Fork 2's rejected "tags + edges" option.

### traversal-tooling-tuned-for-288-nodes
- **Severity:** P2
- **Where:** Fork 5 Consequences ("`graph.py` is ported to JS inside the MCP," line 124) against `apps/api/src/lens/graph.py:304-322` (`get_central_lenses`) and `:279-301` (`get_lens_clusters`)
- **What:** This is a query/traversal-tooling-assumption gap, not a missing edge type. `get_central_lenses` computes `nx.betweenness_centrality` — O(V·E) — and `get_lens_clusters` runs Louvain community detection with a connected-components fallback; both are currently exercised against 258–288 curated nodes. The harvest alone adds up to 1,685 deduped generated bodies from the Mac's census (brainstorm line 157–158), before zklw's count — a 6–7x node-count jump with a materially denser edge set once `embodies`/`fused-from`/`variant-of` are added on top of the curated graph's existing AI-connection and frame edges. Fork 5 says `graph.py` is "ported to JS" as a stated consequence, with no mention of re-benchmarking these two functions (JS has no `networkx` equivalent to lean on, so this is a from-scratch reimplementation, not a straight port) or of what a "central lens" / "cluster" result even means once the population is dominated by generated nodes rather than the 288 curated ones these algorithms were tuned against.
- **Evidence:** `apps/api/src/lens/graph.py:304-322`, `:279-301`; `docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md:124`, `:157-158`.
- **Suggestion:** Before porting, benchmark `get_central_lenses`/`get_lens_clusters` against a synthetic ~2,000-node two-layer graph and either cap/sample these queries for the combined graph or scope them to the curated subgraph by default, with an opt-in flag for the full graph.

### cluster-head-reassignment-orphans-edges
- **Severity:** P2
- **Where:** Fork 3 ("Dedupe: hash + variant clusters," lines 68–79)
- **What:** Fork 3 picks a canonical cluster head "by ledger hit-rate, else recency" and states every dedupe collapse is visible in the sweep report — but says nothing about what happens to edges that already exist when the head changes later. If ledger data accumulates and a non-head cluster member overtakes the current head's hit-rate, any `fused-from` or `embodies` edge minted before that point still names the old head's lens id. A lineage or gap query on that edge silently resolves to a node the schema no longer treats as canonical, with no signal that the pointer moved.
- **Evidence:** `docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md:68-79`.
- **Suggestion:** Store `fused-from`/`embodies` edges against a stable cluster id, and resolve "current head" at query time via one indirection lookup — not a rewrite of the edge model, just one extra hop.

## Verdict
The most consequential gap is structural, not semantic: the design names `-fusion-N` spec files as an irreplaceable provenance source in the same document where Fork 4 schedules their deletion, with no reconciliation check between the two. The remaining findings are real but recoverable with small, additive changes (multi-valued edges, an indirection layer, a re-benchmark) rather than a schema rework.
