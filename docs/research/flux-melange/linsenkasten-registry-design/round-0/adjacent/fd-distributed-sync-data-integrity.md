# fd-distributed-sync-data-integrity — round 0

## Findings Index
- [P0] prune-before-harvest-catchup — Fork 4's "verified" precondition is narrative, not a machine-local checkable gate against the puller's own git state (§Fork 4 / §Fork 5)
- [P0] concurrent-harvest-hash-tiebreak-missing — merge-by-content-hash names no behavior for the case two machines' hashes for "the same" lens disagree (§Open Questions)
- [P1] silent-embedding-fallback-degrade — the three-tier query chain has no field telling the caller which tier answered (§Fork 5)
- [P1] cache-gitignore-swallows-harvest-output — the repo's only existing per-machine-state precedent is deliberately git-ignored, and nothing in the design guards against the harvester reusing that pattern (§Open Questions vs. `packages/mcp/api-client.js`)

## Findings

### prune-before-harvest-catchup
- **Severity:** P0
- **Where:** Fork 4 ("Prune," lines 80–90) crossed with Fork 5's ruling ("zklw ... commits the registry data; the Mac pulls through git," lines 104–107)
- **What:** Fork 4's precondition is "after the harvest is verified in the registry" — but "verified" is never defined as an operational check on the *machine about to prune*. Fork 5 makes zklw canonical for writes and has the Mac pull through git; nothing stops the prune sweep from running on the Mac in a session where the Mac's local `data/` checkout is behind zklw's latest harvest commit (an unrun `git pull`, or a git remote lagging for any reason independent of Tailscale). If that harvest run is the one that captured the very repo about to be pruned, the sweep deletes `.claude/agents/fd-*` while the registry copy the deletion is supposedly backed by doesn't exist locally yet — and per Fork 5's own rationale, "the registry is the only copy" once repo piles are gone. This is the single point of failure the fork names, triggered by an ordinary stale-pull, not an exotic failure.
- **Evidence:** `docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md:80-90` (Fork 4), `:104-107` (Fork 5 ruling), `:122-123` ("the registry is the only copy").
- **Suggestion:** Make "verified" a machine-local, scriptable gate: the sweep refuses to run for a repo unless `git log` on that machine's own `data/` path shows a harvest commit whose harvested-repo-set already includes the repo being pruned. One precondition check, not a new coordination protocol.

### concurrent-harvest-hash-tiebreak-missing
- **Severity:** P0
- **Where:** Open Questions → "Harvest transport" (lines 147–152)
- **What:** "A harvester run per machine writing `data/harvest/<machine>.jsonl`, merged by content hash; zklw runs the merge" describes the happy path only. It names no lock, turn-taking, or scheduling coordination between the two machines, and no tie-break for the case both machines harvest the same repo in the same window and produce jsonl entries for a lens both would call "the same" but whose content hashes disagree — plausible the moment normalization (frontmatter field order, trailing whitespace, line endings) isn't byte-identical across the Mac and zklw toolchains. "Merged by content hash" implicitly assumes hash agreement is the only case; hash *disagreement* on what a human would call one lens has no described resolution, which is exactly the split-brain this task was written to surface.
- **Evidence:** `docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md:147-149`.
- **Suggestion:** Have the zklw merge step log (not silently resolve) any lens id/name pair present in both machines' jsonl files with differing hashes as an unresolved conflict in the sweep report, and hold both hash variants as distinct pending entries rather than letting the merge implicitly pick one.

### silent-embedding-fallback-degrade
- **Severity:** P1
- **Where:** Fork 5 ("Query-time text embedding tries local Ollama, then zklw's Ollama over Tailscale, then a lexical fallback," lines 107–109)
- **What:** This three-tier degrade chain is the fix for the exact failure that forced Fork 5 (the Railway/Supabase 404 discovery, lines 96–102) — but it has no described signal to the caller (MCP tool response, CLI, web explorer) indicating which tier actually answered a given query. A Tailscale drop silently drops semantic search to lexical matching; a caller has no field to check to distinguish a low-relevance lexical result set from a full-embedding-similarity one, so a degraded query looks identical to a healthy one to flux-gen, melange, or a human at the explorer.
- **Evidence:** `docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md:96-102` (the outage that forced the fork), `:107-109` (the fallback chain).
- **Suggestion:** Tag each query response with the tier that answered (`embedding_local` / `embedding_remote` / `lexical`) — one field added to the existing response shape, surfaced by MCP tools and the explorer UI.

### cache-gitignore-swallows-harvest-output
- **Severity:** P1
- **Where:** `.gitignore:3` (`.cache/`) and `packages/mcp/api-client.js:9-15` against Open Questions "Harvest transport" (lines 147–149)
- **What:** The repo already has a per-machine local-state convention — `api-client.js`'s `getCachedData`/`setCachedData`, which write to `CACHE_DIR = path.join(__dirname, '.cache')` with a 1-hour TTL — and it is deliberately git-ignored (`.gitignore` line 3, `.cache/`), because that cache is disposable. It's also the *only* precedent in this codebase for "a machine writes local state to disk." The new design's per-machine `data/harvest/<machine>.jsonl` must do the opposite — be committed and pushed, or zklw's merge step never sees it — but nothing in Fork 5 or Open Questions states the harvest output's path is guaranteed outside any git-ignored directory, or warns against an implementer reaching for the existing, adjacent `.cache/` pattern by habit. If that happens, the failure is invisible: no error, no stale-data warning, just a `data/harvest/<machine>.jsonl` that silently never reaches git and a merge on zklw that silently never includes that machine's harvest.
- **Evidence:** `.gitignore:3`; `packages/mcp/api-client.js:9-15`; `docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md:147-149`.
- **Suggestion:** State the harvest output path explicitly in the design as one canonical location under `data/` (not `.cache/`-adjacent), and add a `.gitignore` allowlist line or a pre-commit check asserting `data/harvest/*.jsonl` is never excluded.

## Verdict
Fork 5 correctly names "the registry is the only copy" as the design's central risk but doesn't yet operationalize the check that risk requires: nothing machine-local gates the prune sweep against the puller's actual git state, and nothing resolves a genuine two-machine hash disagreement. Both are small, checkable additions — a precondition script and a conflict log — not a redesign of the hybrid engine.
