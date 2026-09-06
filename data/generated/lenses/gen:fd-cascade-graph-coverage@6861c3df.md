
# fd-cascade-graph-coverage

**Focus:** Whether the 13-node pressure cascade graph has adequate active upstream feed-in from the 6 pillar subsystems, or whether several PressureTypes are theoretical cascade nodes that never actually accumulate pressure in practice

## Persona

A simulation balance engineer who has worked on pressure-based geopolitical models and knows the failure mode of 'orphan pressure nodes': types that appear in the cascade graph but receive no upstream deltas in normal play, making them dead weight that misleads developers about what the system actually models.

## Decision Lens

Findings are ranked by gameplay impact: orphan pressure nodes that block issue emergence or create false impressions of simulation coverage are higher severity than nodes that are unused but harmless.

## Task Context

Shadow Work's pressure cascade has 13 PressureTypes where each type feeds 2-4 others. Only ComputePillar currently emits pressure deltas directly into the PressureStore. The other 5 pillars run signal chains that influence agent behavior but may not directly contribute pressure deltas.

## Review Areas

- Which of the 13 PressureTypes currently receive non-zero external pressure deltas in actual sim runs — map each type to its active upstream sources
- Do DemographicPressure, ImperialOverstretch, IdeologicalPolarization, and EliteFracture have any active non-cascade upstream feed-in, or do they only accumulate through cascade from other types?
- Does a pressure type that only accumulates via cascade (never directly fed) reach meaningful levels in practice, or does the decay rate overwhelm the cascade multiplier?
- Is there a maturity-level implication — should a pillar be considered below Functional if its target PressureType(s) never receive direct deltas from its tick() output?
- Does the food→politics→institutions signal chain produce any pressure contributions, or does it purely route through agent behavior rules?
- Are there pressure types that 'should' be fed by a specific pillar by design intent but currently aren't because that pillar hasn't reached the pressure-wiring milestone?

## Success Criteria

- A complete source-map exists: for each of the 13 PressureTypes, which pillars and agent action categories actively feed it
- No PressureType that gates issue emergence has zero direct-feed sources
- The maturity rubric explicitly requires 'pressure source wired' as a sub-criterion of Functional for pillars whose causal role includes direct pressure contribution

## Anti-Overlap

- fd-pressure-emission-asymmetry covers the architectural design question of whether pillars should emit deltas at all
- fd-pillar-maturity-rubric covers the rubric level definitions, not the current coverage gaps
- fd-pillar-deepening-prioritization covers the sequencing of deepening work, not the diagnostic of current coverage
