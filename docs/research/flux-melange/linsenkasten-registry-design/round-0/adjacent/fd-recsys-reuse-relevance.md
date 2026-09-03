# fd-recsys-reuse-relevance — round 0

## Findings Index
- [P0] reuse-has-no-target-drift-check — nothing re-scores a harvested lens's fit against today's review target before offering it in place of a fresh one (§Why This Approach / §Fork 2)
- [P1] sparse-hit-rate-ranking-noise — the null-vs-0 rule is specified but small-N shrinkage isn't, so a 1/1 lens outranks a 34/40 lens (§Open Questions)
- [P1] reuse-first-narrows-melange-heat-seeking — reuse-before-regenerate optimizes for "proven," which pulls against melange's own STEER-WIDE novelty-seeking design (§Why This Approach)
- [P2] recency-head-never-re-elected — a recency-picked cluster head has no trigger to be reconsidered once hit-rate data later favors a sibling (§Fork 3)

## Findings

### reuse-has-no-target-drift-check
- **Severity:** P0
- **Where:** "Why This Approach" (lines 30–36) crossed with Fork 2's harvest-time embedding match (lines 61–62)
- **What:** The registry's `embodies` edge and hit-rate are both computed once, at harvest time, against whatever the lens was originally generated to review. "flux-gen and flux-melange consult the registry reuse-before-regenerate through the existing combine/contrast seam" describes *when* the registry is consulted, but nothing describes *what re-validates fit* against the review target sitting in front of the caller right now. A lens with a strong historical hit-rate, harvested from an unrelated review months ago, can be embedding-matched and served as a reuse candidate purely because its stored embedding is close enough to the new target's — with no check that its stored signals are still representative of what it will actually find in *this* content. This is the task's named worst outcome, stated structurally: reuse is offered with confidence and nothing gates it on current relevance.
- **Evidence:** `docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md:30-36` (reuse-before-regenerate description), `:61-62` (embedding computed at harvest, not at query time).
- **Suggestion:** Gate reuse offers on a query-time re-score — compare the lens's stored embedding to the *current* target's embedding, not only the harvest-time match — with a minimum similarity floor below which the registry declines to offer that lens and falls back to fresh generation. This reuses the embedding infrastructure Fork 5 already specifies; it adds one comparison, not a new subsystem.

### sparse-hit-rate-ranking-noise
- **Severity:** P1
- **Where:** Open Questions → "Hit-rate with partial or missing ledgers" (lines 143–146)
- **What:** The formula — "`upheld / (upheld + refuted)` over ledger findings attributed to it, `raw` excluded, **null** (never 0) when nothing was adjudicated" — correctly solves the zero-data case (a lens with no adjudications doesn't read as a 0% failure). But it specifies no confidence weighting or minimum-sample floor for the sparse-but-*nonzero* case in between. A lens with exactly one upheld, zero refuted finding reads as hit-rate 1.0 and would outrank a lens with 34 upheld / 40 refuted (0.85) under any reuse rule that sorts on the raw ratio — the canonical small-sample ranking-noise failure this specialty exists to catch, sitting directly next to a design decision (the null-vs-0 rule) that shows the sparsity problem was already on the table for one edge case but not this one.
- **Evidence:** `docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md:143-146`.
- **Suggestion:** Apply shrinkage before hit-rate is used for reuse ranking or canonical-head selection — a Wilson lower bound, or even a flat "fewer than N adjudicated findings never outranks a lens with ≥ N" tiebreak. A formula change on read, not new data collection.

### reuse-first-narrows-melange-heat-seeking
- **Severity:** P1
- **Where:** "Why This Approach" (lines 30–36), read against flux-melange's own adaptive-round targeting (DEEPEN / FUSE / STEER-WIDE / PROBE-DISAGREEMENT, steered by novelty/risk/disagreement heat)
- **What:** Melange's whole design premise is that later rounds should widen semantic distance to find what earlier rounds missed — STEER-WIDE exists specifically to protect against a lens roster converging on the already-familiar. A reuse-before-regenerate seam that defaults to serving the highest-hit-rate registry lens for a given target shape pulls the opposite direction: every round that could have gone STEER-WIDE into an unexplored angle instead re-serves a proven, already-canonical lens, because "proven" (high hit-rate) is precisely what the registry optimizes reuse for. Across many melange runs on many targets, the reused set narrows toward whichever domains got harvested and hit-rate-validated earliest, and corpus diversity — the thing STEER-WIDE exists to protect — degrades quietly, run over run, with no single failed query to point at.
- **Evidence:** `docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md:30-36` (reuse-before-regenerate via the combine/contrast seam); flux-melange's documented targeting modes (adaptive rounds steered by heat found so far; DEEPEN/FUSE/STEER-WIDE/PROBE-DISAGREEMENT; lenses fused into hybrid intersection-detectors).
- **Suggestion:** Exempt STEER-WIDE-targeted rounds from reuse-before-regenerate by policy — that round's purpose is novelty, so it should always regenerate fresh — while DEEPEN/FUSE rounds, which want a proven on-target lens, keep reuse-first. A routing rule at the seam, not a change to the registry itself.

### recency-head-never-re-elected
- **Severity:** P2
- **Where:** Fork 3 ("picked by ledger hit-rate, else recency," lines 73–74)
- **What:** "Else recency" is described only as an initial tie-break for clusters with no hit-rate data yet, but neither Fork 3 nor Open Questions describes a re-evaluation trigger once ledger data later accumulates. A head chosen by recency purely because no hit-rate existed at cluster-formation time can stay canonical indefinitely even after a sibling variant in the same cluster earns a materially better hit-rate — the design's preferred signal never gets the chance to override the fallback it was meant to outrank once real data exists.
- **Evidence:** `docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md:73-74`.
- **Suggestion:** Re-apply the existing head-selection rule (hit-rate, else recency) on every harvest sweep for any cluster whose members have accumulated new adjudicated findings, not only at first-cluster-formation — reusing the rule already specified, applied on a schedule rather than once.

## Verdict
The design specifies careful signal-hygiene rules (null-vs-0, canonical-head tie-break) but never closes the loop back to *today's* review target — reuse is offered on stored, aging signals with no re-validation step, and that gap sits in direct tension with the novelty-seeking design goal of melange, the system this registry is built to serve first.
