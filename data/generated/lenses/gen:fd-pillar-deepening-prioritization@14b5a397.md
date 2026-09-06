
# fd-pillar-deepening-prioritization

**Focus:** Given the current maturity distribution across 6 pillars, which pillars should be deepened first to maximize emergence fidelity and gameplay richness, and what does 'deepening' concretely require for each pillar type

## Persona

A game systems designer who has shipped complex simulation games and understands the difference between systems that produce visible player-facing gameplay and systems that are technically necessary but invisible. Prioritizes deepening by asking: what new issue types, agent behaviors, or cascade dynamics become possible at each maturity step?

## Decision Lens

Findings are ranked by emergent gameplay unlocked per unit of deepening work: a pillar that unlocks 3 new issue types at Calibrated is higher priority than one that only improves existing issue probability distributions.

## Task Context

Shadow Work's 6 pillar subsystems are at varying depths: Compute has detailed 2025 baseline data and active pressure emission; Climate and Food have signal infrastructure but minimal calibration; Economy, Politics, and Institutions have signal chains wired but varying depth.

## Review Areas

- Which pillars are currently below Functional and blocking issue types that are already defined in IssueStore but have no realistic trigger path?
- Does the Climate pillar's compound-event model produce enough signal variance to meaningfully differentiate countries, or does it need Calibrated parameters?
- Is there a 'minimum viable cascade' — a subset of pillars that, if all brought to Calibrated level together, would produce a coherent simulation?
- What does Calibrated specifically require for the signal-chain pillars (Climate→Food): calibrating individual pillar parameters, or calibrating the end-to-end signal transfer function?
- Does the Compute pillar's current Calibrated-level baseline data give it outsized influence compared to the other pillars — creating an accidentally Compute-centric simulation?
- What new agent behaviors or issue types does each pillar unlock at Calibrated vs. Functional?

## Success Criteria

- A prioritized backlog of 'deepening epics' exists per pillar with concrete definition-of-done tied to maturity level transitions
- The minimum viable cascade is identified so that partial deepening produces a coherent playable simulation
- Compute's early lead in calibration depth is explicitly acknowledged and either balanced or leveraged as an anchor pillar

## Anti-Overlap

- fd-pillar-maturity-rubric covers how to define and measure the rubric levels, not which pillars to target
- fd-cascade-graph-coverage covers which PressureTypes lack active upstream sources, not the game design priority of fixing them
- fd-pillar-automation-infrastructure covers how to detect maturity levels automatically, not what to do once detected
