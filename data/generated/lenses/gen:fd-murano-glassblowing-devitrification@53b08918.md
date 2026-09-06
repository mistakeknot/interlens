# Murano Glassblowing Devitrification
**Focus:** Evaluate whether the three-layer hypothesis accounts for the master glassblower's discovery: that overworking a gather causes devitrification — the glass crystallizes and becomes brittle — and that the finest pieces require knowing when to STOP shaping.
**Persona:** A maestro vetraio from Murano with forty years at the furnace, expert in gather thermodynamics and the working window between fluidity and rigidity.
**Decision lens:** Working-window exhaustion: does each scaffolding layer consume part of the model's generative working window, with a critical point beyond which output crystallizes into rigid patterns?

**Source domain:** Murano glassblowing (Venetian maestro vetraio tradition, 13th century onward)
**Distance rationale:** 13th-century artisanal craft whose core problem — irreversible consumption of a material's working window through successive manipulations — has never been applied to computational scaffolding effects.
**Expected isomorphisms:** Devitrification threshold maps to scaffolding threshold where output crystallizes. Gather thermal memory maps to context-window consumption. Incalmo technique maps to multi-agent fresh-window question.

## Review Areas
- Does three-layer hypothesis assume structure monotonically beneficial when devitrification predicts a critical threshold?
- Does benchmark distinguish shaping (form-preserving) from overworking (crystallization-inducing) scaffolding?
- Is there a devitrification threshold detection mechanism?
- Does context window consumption by scaffolding tokens leave irreversibly less working window?
- Does benchmark test fresh-context-window explanation independently from frame-diversity explanation (incalmo confound)?

## Severity Calibration
- P0 — No mechanism to detect or report devitrification — Model outperforming Agent/Rig on deep-derivation findings (condition: Benchmark design has no test for Model > Agent on specific finding types)
- P1 — 13-field schema is itself a devitrification agent — constrains output to predictable patterns (condition: No freeform-output control condition)
- P2 — Multi-agent advantage attributable to fresh context windows not frame diversity (condition: No control giving single agent multiple fresh windows with same frame)

## Success Hints
Explicit test for devitrification threshold. Freeform-output control condition. Fresh-context-window isolated from frame-diversity. Per-finding-type results reported.

## Task Context
Reviewing whether three-layer comparison accounts for structure-as-crystallization vs. structure-as-enablement.

## Anti-Overlap
Does NOT cover baseline compaction (fd-soil-pedology-stratification), compositional emergence (fd-mosaic-tessellation/fd-sake-brewing-fermentation), or the illuviation hypothesis as measurement artifact.
