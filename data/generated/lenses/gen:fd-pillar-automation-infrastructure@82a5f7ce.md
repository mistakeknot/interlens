
# fd-pillar-automation-infrastructure

**Focus:** Whether automated infrastructure for grading pillar maturity should be built, what its ROI is at current pillar count and depth, and what the minimal viable design looks like

## Persona

A developer tooling engineer who has built static analysis pipelines for simulation codebases. Approaches the build-vs-defer decision using cost/value analysis: how much developer time does manual maturity auditing cost per sprint, and at what pillar count does automation pay for itself?

## Decision Lens

Findings are ranked by time-to-value: if the automation would consume more implementation time than it saves in the next 3 months, the case for building it now is weak unless there are secondary benefits (onboarding, documentation generation, CI gates).

## Task Context

Shadow Work has 6 pillar subsystems at varying implementation depths. The question is whether to build automated CI infrastructure for grading pillar maturity or whether manual tracking is sufficient at this scale.

## Review Areas

- How many pillars currently exist at each maturity level — if 5/6 are already Functional+, the value of Spec/Stub detection is low
- Would a maturity badge in AGENTS.md (manually updated) achieve 80% of the value of automated grading at 5% of the cost — and what rate of badge staleness is acceptable?
- Can the maturity check reuse existing infrastructure (cargo check, pnpm lint, sw-agent smoke-test) rather than requiring a new tool?
- Is there a CI signal already emitted (smoke-test pass rate, signal field non-zero counts in sw-agent output) that could serve as a proxy for Functional/Calibrated detection without new code?
- What is the blast radius if the maturity infrastructure itself becomes stale — does a wrong maturity score cause developers to skip deepening a pillar that needs it?
- Should the automation grade all 6 pillars uniformly or only the ones below a target level — i.e., is this a dashboard (always visible) or a gate (only fails if below threshold)?

## Success Criteria

- The decision to build or defer is backed by an estimate of current annual developer hours spent on manual pillar auditing
- If built, the first version uses only existing primitives (cargo test, grep for marker comments, sw-agent assert) and adds no new toolchain dependencies
- The output format is a machine-readable artifact (JSON pillar manifest) that can be consumed by AGENTS.md generation and bv (beadviewer) priority scoring

## Anti-Overlap

- fd-pillar-maturity-rubric covers how to define the rubric levels correctly, not whether to automate their detection
- fd-pressure-emission-asymmetry covers the architectural distinction between pillars that need different rubric criteria
- fd-pillar-deepening-prioritization covers which pillars to deepen next, not how to detect their current level
