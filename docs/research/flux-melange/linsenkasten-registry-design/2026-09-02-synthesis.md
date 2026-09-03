---
artifact_type: melange-synthesis
method: flux-melange
target: docs/brainstorms/2026-09-01-linsenkasten-gate-forks-brainstorm.md
target_description: "Linsenkasten design record: five ruled forks (rename to linsenkasten, typed edges only, hash+variant dedupe, delete repo piles post-harvest, hybrid local-MCP engine with zklw harvest) for turning interlens into the generated fd-* lens registry (goal 8222288d)"
goal: "Find what breaks the Linsenkasten registry design before it is built: the hybrid engine, the typed-edge schema, hash-plus-variant dedupe with canonical cluster heads, post-harvest deletion of repo-local .claude/agents piles, and the reuse-before-regenerate seam in flux-gen and melange. Prioritize failure modes where a reused lens is worse than a fresh one, silent data loss across harvest, dedupe, merge and prune, and split-brain between the two machines."
weights: balanced
rounds_run: 5
halt_reason: CEILING
total_fusions: 0
emergent_findings: 0
runtime: claude
date: 2026-09-02
---

# Linsenkasten registry design — melange synthesis

44 findings across 5 rounds, 10 lenses, 19 dispatch slots. 29 upheld, 12 raw, 3 refuted. Zero fusions attempted.

**Re-scoring note.** Per-round scores were fast triage estimates and I re-scored the merged ledger before writing. The largest moves: risk products rose where a finding was verified against bytes already in the repo rather than predicted from the design (f-028, f-043 to product 9); novelty rose where a finding required a domain reframe rather than diligence (f-001, f-017, f-020, f-029, f-032, f-038 to 3); novelty fell where a finding is a standard review observation any competent reviewer produces (f-003 to 1). Every on-disk row carries `taste: 0` — the taste dimension was never exercised during the rounds, so every taste call below is a synthesis-time judgment, flagged as such in §3. Convergence is reconstructed from controller cluster state, because the workflow-mode ledger rows carry empty `convergence_refs`.

---

## 1. Novelty × Risk Frontier

The Pareto front on (novelty, risk.product) has two arms and twelve members. Nothing reaches (3, 9) after re-scoring, so no single finding dominates; the two leads below sit at opposite corners and neither can be read as a weaker version of the other.

### Lead A — max novelty, mid risk: reuse materialization re-inflates the evidence that authorizes deletion

**f-038** · novelty 3 · risk 6 (blast 2 × likelihood 3) · taste −2 · lens: `fd-polder-drainage-obligation` · severity P1 *(reference only)*

Reuse-before-regenerate writes a byte-identical copy of the registry body back into the exact `.claude/agents/` tree the harvester scans. Every `--registry=auto` hit therefore increments the `sightings`, `repos` and `machines` fields that Fork 3 cites to justify variant collapse and Fork 4 cites to justify pruning. The duplication evidence partly measures the registry's own circulation.

Risk decomposition: blast 2 — the corruption is statistical, not destructive, and the finding's own remediation is a single conditional in `scan.py` (skip or tag any `.claude/agents/fd-*.md` whose frontmatter carries `tier: registry`, a field Task 16 already writes). Likelihood 3 — it fires on every registry hit by construction, and Task 9's index-record pseudocode unions `sightings`/`machines`/`repos` with no qualifier while only `tier`/`use_count`/`last_used` get a max-across-sightings selection.

This is the one finding in the run that no other lens could have produced: the schema lenses look at edge types, the sync lenses look at partitions, the recsys lens looks at ranking. Only the polder lens is built to notice that draining a polder lowers the ground it drained — a control loop whose output feeds its own input measurement. It is also the argmax of heat with the |taste| tiebreaker, and therefore the "if you read one thing" pick below.

### Lead B — mid novelty, max risk: `severity_examples` is an uncovered sanitization sink that reuse ships forward

**f-043** · novelty 2 · risk 9 (blast 3 × likelihood 3) · taste 0 · lens: `fd-gamelan-ensemble-fit` · severity P1 *(reference only)*

`severity_examples` is the only LLM-authored, spec-specific field in the reuse pipeline that gets no cross-context treatment anywhere. It is not passed through `sanitize()`/`sanitize_list()` like every sibling field (`render_agent` calls sanitize at generate-agents.py:206, 208, 215 and sanitize_list at 231, 243, 247 — never for severity examples; `_render_severity_calibration` reads `ex.get('scenario')`/`ex.get('condition')` straight into an f-string). It is excluded from `thresholds.embedding_text`, so it cannot influence or be corrected by matching. And `materialize()` never regenerates it from the fresh spec it already holds as a parameter. A stored P0/P1/P2 worked example — real file paths, function names, task numbers asserted as fact — ships unbounded and unmatched into every future review that reuses the lens.

Risk decomposition: blast 3 — this escapes a trust boundary the codebase deliberately built, and `sanitize_untrusted.py`'s own docstring enumerates channel 2 as "persona, decision_lens, review_areas, task_context, anti_overlap" while naming the exact failure class in its warning ("finding C-6 — sanitization was advisory-only and bypassable via uncovered sinks"). The field was added in v5 and never added to the enumerated sink list. Likelihood 3 — the staleness path alone is certain on every reuse; the injection path needs hostile spec content but the sink is uncovered today, verified.

Novelty is 2 rather than 3 because half of it is a checklist diff (field list versus sink list). The gamelan half is the reframe: a worked example is set-bound, correct only against the neighbours it was calibrated among, and an instrument borrowed from another gamelan is unusable in this one however fine it is.

### Rest of the front

Ranked by heat, all at 18.

| id | claim | lens | nov | risk (b×l) | taste |
|---|---|---|---|---|---|
| f-028 | All six committed agent files carry literal `[truncated — N chars omitted]` markers mid-sentence, invisible in frontmatter, and no harvest step detects it before hashing and accessioning the corrupted body as canonical | `fd-living-heritage-transmission` | 2 | 9 (3×3) | 0 |
| f-001 | The `-fusion-N` spec files under `.claude/flux-gen-specs/` are one of only two named sources for reconstructing `fused-from` lineage, and are exactly what Fork 4's prune sweep deletes, with no gate verifying every spec has a committed edge first | `fd-knowledge-graph-edge-schema` | 3 | 6 (3×2) | 0 |
| f-033 | The clean full-text spec that would let the registry recast a lossless body already survives the prune at `data/generated/specs/<id>.json`, and the function that reads it correctly (`embedding_text`) is not the one that serves a reuse hit — `materialize()` copies the truncated body verbatim | `fd-hand-composition-foul-case` | 3 | 6 (2×3) | +2 |
| f-013 | Fork 3 hashes "normalized spec + body", but this repo's own generator shares one spec file verbatim across three unrelated lens bodies, so the spec half of the hash has no discriminating power and no version marker would catch a generator changing that granularity | `fd-stemmatics-witness-loss` | 3 | 6 (2×3) | 0 |
| f-017 | The committed 768-d `nomic-embed-text` matrix records a model name and a one-time date but no build digest, quantization or pooling convention, so an Ollama update on either machine silently desyncs harvest-time and query-time vectors under the exact dedupe that authorizes deletion | `fd-metrology-traceability` | 3 | 6 (3×2) | 0 |
| f-037 | Stage D's `resolve()`/`RESOLVE_MIN_COSINE=0.86` — credited by an earlier round as already mitigating the reuse-match gap — does not exist as code in either repo as of 2026-09-03, and the brainstorm mk ratified never references it, so a descoping pass has no signal that dropping it regresses reuse to the no-match state | `reuse-mechanism-adjudicator` | 3 | 6 (3×2) | 0 |
| f-042 | Even once Stage D lands, `resolve()` only sees lens generation through `generate-agents.py` — SEED, FUSE, STEER-WIDE. DEEPEN and PROBE-DISAGREEMENT (the controller's own priority #2 and #1) re-dispatch existing lenses with no spec and no generator call, so reuse-before-regenerate structurally cannot reach roughly half a typical round's lens traffic | `reuse-mechanism-adjudicator` | 3 | 6 (2×3) | 0 |
| f-039 | The plan's only systemd unit serves the read-only explorer; every harvest, merge, embed, edge and prune task is a single manual run, so Fork 4's context-tax fix decays from the day the goal closes while the deletion it paid for stays permanent | `fd-polder-drainage-obligation` | 3 | 6 (2×3) | 0 |
| f-032 | The ratified brainstorm names "the existing combine/contrast seam" as reuse's integration point; that phrase resolves to `combine_lenses`, which takes lens names and does no embedding. The sibling plan specifies a third, standalone mechanism entirely. Two independent review rounds were sent to debate the wrong two tools | `reuse-mechanism-adjudicator` | 3 | 6 (2×3) | −1 |
| f-029 | The six lenses in this cohort carry a mutual `anti_overlap` contract that only holds when the cohort is invoked together, and no edge type or harvest field models cohort membership — so reuse can serve any one of them alone with its declared blind spots silently intact | `fd-living-heritage-transmission` | 3 | 6 (2×3) | −1 |

Two near-front findings worth naming because they fell just off it on likelihood, not on substance: **f-030** (novelty 3, risk 4) — Fork 3's normalization transform exists nowhere in the codebase, and since zklw alone runs the harvester it will exist only as one operator's source with no spec, doc or fixture a successor could check a collapse decision against; and **f-020** (novelty 3, risk 4) — zklw is simultaneously the sole producer of the registry's numbers and the standard those numbers are measured against, with no scheduled comparison against its own past state or the Mac's pulled copy.

---

## 2. Top Fusions

**Zero fusions attempted, zero emergent findings.** All ten lens records are `kind: base` with `parents: []`. The FUSE directive was never selected in any of the four retarget rounds — the controller chose DEEPEN and STEER-WIDE in round 1, then PROBE-DISAGREEMENT plus STEER-WIDE in rounds 2, 3 and 4.

This is an untested region, not a negative result about the lenses. Three pairs had live tension in the ledger and would have been the natural fuse candidates:

- **`fd-knowledge-graph-edge-schema` × `fd-distributed-sync-data-integrity`: converged, never fused.** Both landed independently in `c-fork4-prune-precondition-git-lag` (f-022, f-005). A hybrid intersection-detector — schema integrity under partition — is the obvious missing lens, and the one finding that reaches into that intersection (f-023, dangling `fused-from` parents left by a prune race) was produced by one lens alone and scored only 8 heat. A fused detector would have been asking directly what a typed edge means when its target was deleted on a machine that had not yet pulled the merge commit.
- **`fd-recsys-reuse-relevance` × `fd-metrology-traceability`: converged, never fused.** Both reached the same sample-size gap (f-010, f-021) from opposite directions — ranking under sparsity versus stated uncertainty. A fused calibrated-ranking detector would have carried f-014's arithmetic (118 ledger findings against ~4,750 harvested agents) into f-019's uncalibrated similarity threshold, which no single lens connected.
- **`fd-living-heritage-transmission` × `fd-hand-composition-foul-case`: the highest-value fusion never run.** f-028 and f-033 are the same defect seen from two sides — the loss is observed, and the repair material is already in hand — but they were produced a round apart by lenses that never sat together. Fused, they state one finding: the registry's canonical artifact is a lossy cast of a durable matrix it already stores and declines to read.

---

## 3. Taste Calls

Every ledger row carries `taste: 0`; these are synthesis-time judgments assigned during re-scoring, not agent scores.

### Preserve

**+2 · f-021 · `taste_kind: null-discipline` · `fd-metrology-traceability`.** The hit-rate spec gets the hard part right: `upheld / (upheld + refuted)` is **null**, never 0, when nothing was adjudicated, and surfaced-count and use-count are stored beside it as separate signals rather than folded in. Refusing to fabricate a zero out of an absence is the discipline most registries lose first, and it is already written down. The finding's own criticism — that sample size may not travel with the ratio into head selection — is a request to extend that discipline, not to revise it.

**+2 · f-033 · `taste_kind: already-in-hand` · `fd-hand-composition-foul-case`.** The repair for the truncation defect needs no new pipeline stage, no new field, and no new pass: `materialize(match, agents_dir, spec)` already receives the clean spec as a parameter, and `embed.py` already prefers spec over body. The fix is a branch. A design where the recovery material is a loaded argument to the function doing the damage is a design worth keeping — the flaw is one call site, not the shape.

**+1 · f-019 · `taste_kind: reversible-by-default` · `fd-metrology-traceability`.** Fork 3 rejects semantic merge and keeps variants separate under a `variant-of` edge with a canonical head, so every dedupe decision is reversible and every collapse appears in the sweep report. That choice is why the uncalibrated similarity threshold this finding attacks is survivable rather than fatal — a wrong threshold produces a wrong head, not a destroyed variant.

### Fix

**−2 · f-038 · `taste_kind: circular-evidence` · `fd-polder-drainage-obligation`.** A measurement loop whose output re-enters its own input. Detailed in §1.

**−2 · f-022 · `taste_kind: self-contradiction` · `fd-knowledge-graph-edge-schema`.** The ratified record disagrees with itself about whether git history is a safety net: Fork 4 line 84 says "Git history + the registry are the archive", Fork 5 lines 122-123 say "the registry is the only copy" once the piles are deleted. Both sentences are load-bearing for the prune ruling and they cannot both be the operative one. Nothing marks either as superseded.

**−1 · f-032 · `taste_kind: record-drift` · `reuse-mechanism-adjudicator`.** The decision record misdescribes its own integration point. The cost is already measured: two independent review rounds spent their budget adjudicating `search_lenses` against `combine_lenses` when the plan specifies neither.

**−1 · f-029 · `taste_kind: cohort-coupling` · `fd-living-heritage-transmission`.** An artifact that carries obligations toward absent peers. `anti_overlap` is good generator discipline — each lens declines territory it names a sibling as owning — but the contract is unserializable in the current schema, so reuse turns a coordination device into a silent blind spot.

**−1 · f-015 · `taste_kind: null-conflation` · `fd-stemmatics-witness-loss`.** The mirror of the +2 above: `parents: []` is byte-identical whether the lineage was confirmed empty or lost, because the harvest carries `parents` forward and never `kind`. The design applies null-versus-zero discipline to hit-rate and drops it for lineage.

**−1 · f-011 · `taste_kind: objective-conflict` · `fd-recsys-reuse-relevance`.** Reuse-before-regenerate maximizes serving proven high-hit-rate lenses; STEER-WIDE exists to widen semantic distance toward novelty. Wiring them together with no explicit arbitration means one of them wins quietly over many runs, and the design does not say which.

**−1 · f-040 · `taste_kind: instrument-in-the-blast-radius` · `fd-polder-drainage-obligation`.** `record_reuse`'s fallback destination — used precisely when the registry root cannot be written — is `<project>/.claude/flux-gen-specs/reuse-log.jsonl`, inside the directory the prune sweep deletes. The plan's deletion wording is ambiguous between a directory-level delete and a per-spec predicate, and under either reading the log's fate is undefined. No task ever aggregates a reuse rate from it anyway.

---

## 4. Convergence Spine

Four clusters were reached by more than one lens. All are low-novelty and high-confidence: commodity findings you can act on without further verification.

**The prune precondition is not machine-checkable** — `c-fork4-prune-precondition-git-lag`, three findings from three lenses: f-005 (`fd-distributed-sync-data-integrity`), f-016 (`fd-stemmatics-witness-loss`), f-022 (`fd-knowledge-graph-edge-schema`). Fork 4's "after the harvest is verified in the registry" names no commit SHA, no manifest reconciliation, no local check. Under Fork 5's git transport (zklw merges and commits, the Mac pulls), a per-repo sweep can run on a machine whose registry clone is behind the merge commit that captured that repo. Novelty 1-2 and blast 3 — the highest blast radius in the run, reached three independent ways, and the document's own Facts-checked section confirms an unpushed sibling branch is a live condition right now.

**The embedding fallback tier is unlabeled and uncounted** — `c-embedding-fallback-tier-opacity`, f-007 (`fd-distributed-sync-data-integrity`) and f-018 (`fd-metrology-traceability`). No field on a query result says which of the three tiers answered (local Ollama, zklw over Tailscale, lexical), and nothing states that a tier-2-to-tier-3 fallthrough is logged, counted or alerted. Fork 5's own rejected-alternative reasoning names this network path as the cause of a months-long silent 404. The failure class was relocated one tier down, not removed.

**Hit-rate carries no sample size** — `c-hit-rate-lacks-sample-size-weighting`, f-010 (`fd-recsys-reuse-relevance`) and f-021 (`fd-metrology-traceability`). Nothing states whether `upheld + refuted` travels with the ratio into canonical-head selection or reuse ranking, so a 1/1 cluster and a 39/40 cluster look identical to a selector comparing bare ratios. Read alongside f-014 — 118 heat-ledger findings against roughly 4,750 harvested agents means hit-rate is null for nearly every cluster and Fork 3's "else recency" tie-break becomes the operative rule almost everywhere.

**Reuse has no match step, rather than a stale one** — `c-reuse-no-query-time-drift-check`, four findings across three lenses (f-009 refuted, f-025, f-031, f-036). This started as a disagreement and closed as convergence; see §5.

---

## 5. Live Disagreements

**None open at halt.** One contradiction was raised and adjudicated, and the adjudication then re-fired twice against itself.

The thread: `fd-recsys-reuse-relevance` (f-009) claimed reuse serves on a stale harvest-time embedding with no query-time re-validation. `fd-knowledge-graph-edge-schema` (f-025) refuted the literal mechanism — Fork 5 does specify a query-time embedding pipeline and `search_lenses` genuinely re-embeds free text per call — while confirming a worse underlying gap: the single integration point the brainstorm names resolves to `combine_lenses`, which takes an array of lens names, string-matches them, and performs no embedding or target comparison at all. The purpose-built `reuse-mechanism-adjudicator` lens upheld that reading in round 2 (f-031), and f-009 was marked refuted.

Rounds 3 and 4 then dispatched PROBE-DISAGREEMENT against the same closed contradiction. f-036 (novelty 0) restated the round-2 adjudication. f-041 (novelty 0) adjudicated again and named the loop explicitly: the opposing position was "a resurfacing of round-2's original claim that round-3 already refuted, not a fresh disagreement." The productive output of those two rounds came entirely from the other half of the dispatch — f-037, which re-verified live that Stage D's `resolve()`/`RESOLVE_MIN_COSINE` is unbuilt prose in both repos, overturning round 2's "already mitigated" credit; and f-042, which found the coverage gap that survives even after Stage D lands.

The residue worth carrying forward is not a disagreement but its cause: the brainstorm and the plan describe different reuse mechanisms (f-032, f-034), and neither document marks the other as superseded. Two review rounds and three probe slots were spent on that ambiguity.

---

## Appendix — Spice Trail

**Round 0 — assay.** 2 agents, 5 lenses, 21 findings. Yield 21, novel_cluster_rate 0.86. Seeded adjacent (`fd-knowledge-graph-edge-schema`, `fd-distributed-sync-data-integrity`, `fd-recsys-reuse-relevance`) and distant (`fd-metrology-traceability`, `fd-stemmatics-witness-loss`). The distant tier outperformed: `fd-stemmatics-witness-loss` produced f-013 and f-015 (both novelty 3 on re-score), `fd-metrology-traceability` produced f-017 and f-020.

**Round 1 — probe, 3 directives, 9 findings.** Two DEEPEN on `fd-knowledge-graph-edge-schema` ("risk 6, unconfirmed — confirm or refute") plus one STEER-WIDE to `fd-living-heritage-transmission` ("novel_cluster_rate 0.86 ≥ 0.6 — widening still pays"). Yield 9, rate 0.78. The DEEPENs did their job — f-022 confirmed the prune-precondition cluster and found the internal contradiction, f-023 extended it to dangling edges — but the STEER-WIDE produced the round's two highest-risk findings (f-028, f-029), both from reading the cohort's own committed files rather than the design.

**Round 2 — probe, 2 directives, 5 findings.** PROBE-DISAGREEMENT (unlensed, adjudicating f-009 versus f-025) plus STEER-WIDE to `fd-hand-composition-foul-case`. Yield 4, rate 0.80. The adjudicator settled the contradiction (f-031) and found the brainstorm-versus-plan divergence (f-032). The STEER-WIDE produced f-033, the constructive counterpart to round 1's f-028.

**Round 3 — probe, 2 directives, 5 findings.** PROBE-DISAGREEMENT again (the contradiction was already closed) plus STEER-WIDE to `fd-polder-drainage-obligation`. Yield 4, rate 0.80. The disagreement lane returned novelty 0 (f-036) but the same agent produced f-037 by re-verifying the previous round's mitigation claim against live code. The STEER-WIDE lane produced f-038, f-039, f-040 — the polder lens's three findings, including the run's heat maximum.

**Round 4 — probe, 2 directives, 4 findings.** PROBE-DISAGREEMENT a third time plus STEER-WIDE to `fd-gamelan-ensemble-fit`. Yield 2, rate 0.75. The disagreement lane returned novelty 0 (f-041) and its useful output was the byproduct f-042. The STEER-WIDE lane produced f-043 (max risk in the run) and f-044 (refuted).

**Halt: CEILING.** Yield fell 21 → 9 → 4 → 4 → 2 while novel_cluster_rate stayed high (0.86 → 0.75). High novelty at collapsing yield is the CEILING signature: new lenses were still finding new territory, but each round returned fewer findings per slot.

**What actually steered.** Every novelty-3 finding in rounds 1-4 came from a STEER-WIDE dispatch to a fresh distant lens. The PROBE-DISAGREEMENT lane consumed 3 of the 6 probe slots in rounds 2-4 and returned novelty 1, 0, 0 on the contradiction itself. The gain history is the average of those two lanes; read separately, the widening lane never decayed and the disagreement lane was exhausted after round 2. The halt is better read as "the disagreement lane hit bottom and dragged the average down" than as "the target is exhausted."

---

## If you read one thing

**f-038** — heat 18, |taste| 2, `fd-polder-drainage-obligation`. Reuse writes registry bodies back into the tree the harvester scans, so the sightings, repos and machines counts that justify collapsing variants and deleting repo piles partly count the registry talking to itself. The fix is one conditional in `scan.py` against a frontmatter field Task 16 already writes. Ship that conditional before the first `--registry=auto` hit, because after that the duplication evidence can no longer be cleanly separated from the registry's own circulation without re-deriving it from mtimes.

---

## Caveats

- **Zero fusions attempted.** The FUSE directive never fired across four retarget rounds despite three high-tension pairs (§2). Emergent findings are 0 because the region was never entered, not because the pairs are independent.
- **Fork 1 is uncovered.** Not one of 44 findings addresses rename migration: the npm package `linsenkasten-mcp` already published at 2.2.1 under this account, the GitHub redirect, the MCP server key rename cascading to `mcp__linsenkasten__*`, the marketplace row, or interflux's melange references that name the old server. The brainstorm's own Facts-checked section flags a published-package collision and no lens went near it.
- **Fork 5's runtime surfaces are thin.** The zklw-hosted Node explorer drew one finding (f-039, on the systemd unit shape) and no exposure or auth review. The port of `graph.py` — 457 lines of networkx to JS — drew one finding (f-003, scaling) and no behavioral-equivalence review.
- **Verification was repo-local.** All live checks ran against the Mac worktree and the interflux sibling repo. No finding was verified against zklw's actual state, so every split-brain claim rests on the design document plus one machine's view — including the convergence spine's highest-blast cluster.
- **Taste was never scored during the rounds.** All 44 rows carry `taste: 0`. §3 is synthesis-time judgment.
- **Refuted and excluded from the surfaced set:** f-006 (concurrent-harvest hash tie-break), f-009 (stale harvest-time match — refuted on mechanism, its risk survives as f-025/f-031/f-036), f-044 (review_areas census-snapshot drift).
- **No probe failed.** All four probe rounds report `failed: 0`; the round-count limit, not agent failure, ended the run alongside the CEILING signal.
