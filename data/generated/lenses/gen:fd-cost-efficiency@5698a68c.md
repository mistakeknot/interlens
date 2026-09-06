
# fd-cost-efficiency

**Focus:** API cost exposure, rate limit risk, and budget guardrails for the cross-model matrix run

**Persona:** An ML infrastructure engineer who has managed unexpected API bills from evaluation pipelines.

**Decision Lens:** Prioritizes findings where misconfiguration could multiply costs by an order of magnitude or trigger rate limit cascades that corrupt results.

**Task Context:** cipher_evaluator_matrix.py runs a two-phase cross-model evaluation to find the pareto-optimal LLM judge for editorial quality scoring.

## Review Areas

- Total eval calls calculation is printed but no cost estimate — with 9×7×100 = 6,300 eval calls plus 700 reconstruction calls, estimate token throughput
- Reconstruction prompt includes full before_text (no truncation) while eval truncates source to 1000 chars — for long pieces reconstruction calls could be very large
- max_workers=5 applied uniformly to all models including expensive ones — check whether per-model rate limiting exists
- No --recon-only flag means targeted evaluator retry requires re-running all evaluators
- Verify model registry includes all models in DEFAULT_RECONSTRUCTORS and DEFAULT_EVALUATORS
- Output JSON saves all raw score lists — verify file size is manageable and save is atomic

## Success Criteria

- Script should print estimated token cost before starting so user can abort
- Per-model rate limit handling should be verified — this is the highest-throughput use case
- Non-standard model keys should be validated with a dry-run mode

## Anti-Overlap

- fd-experiment-validity covers sampling design
- fd-prompt-engineering covers prompt quality
- fd-concurrency-reliability covers threading and cache
