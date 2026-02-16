# Flux-Drive Systems Review: Sprint Workflow Resilience & Autonomy PRD

**Document:** `/root/projects/Interverse/docs/prds/2026-02-15-sprint-resilience.md`
**Reviewer:** Flux-Drive Systems Thinking Lens
**Date:** 2026-02-16
**Version:** 1.0

---

## Findings Index

- **P1 | FD-001** | "F2: Auto-Advance Engine" | Auto-advance creates a runaway loop with no feedback-driven braking
- **P2 | FD-002** | "Correctness Safeguards" | State desync auto-repair produces oscillation when concurrent writes occur
- **P2 | FD-003** | "F3: Tiered Brainstorming" | Complexity classification creates a reinforcing simplification loop
- **P2 | FD-004** | "F1: Sprint Bead Lifecycle" | Session claim TTL + auto-advance creates temporal trap at 60-minute boundary
- **P3 | FD-005** | "Sprint Bead Hierarchy" | Sprint-as-epic dual role creates emergent identity confusion
- **P3 | FD-006** | "F2: Auto-Advance Engine" | Pause trigger detection has bullwhip potential under high phase transition velocity
- **P3 | FD-007** | Overall System | Missing hormetic stress mechanisms — system optimizes for zero friction

---

## Summary

The PRD presents a well-architected state management solution but exhibits critical systems blind spots. The auto-advance engine lacks feedback-driven velocity control, creating runaway risk when pause triggers fail. State desync auto-repair produces oscillation under concurrent access. Complexity classification reinforces itself through interaction patterns. The 60-minute session claim TTL interacts dangerously with long-running auto-advance chains. The design eliminates all user friction without preserving beneficial stress that builds user understanding of system behavior.

---

### 1. **P1 | FD-001 | "F2: Auto-Advance Engine" | Auto-advance creates a runaway loop with no feedback-driven braking**

**Lens:** Systems Thinking, Compounding Loops, Schelling Traps

**Evidence:**

The PRD specifies:
> "Sprint proceeds through all phases without user confirmation"
> "Auto-advance uses strict transition table (no skip paths — every phase visited)"
> "Pause triggers: design ambiguity (2+ approaches), P0/P1 gate failure, test failure, quality gate findings"

No mechanism exists to slow phase velocity based on accumulated technical debt, user comprehension lag, or integration complexity. The pause triggers are binary (pause or continue) with no graduated response.

**Problem:**

This is a **pure feedforward system with no negative feedback loop**. If pause triggers fail to detect problems (false negatives), the sprint advances through all phases accumulating undetected defects. Behavior-over-time graph:

- **T=0:** Fresh sprint, pause triggers sensitive, velocity appropriate
- **T=1 week:** User trust increases, begins ignoring status messages
- **T=1 month:** Pause trigger logic hasn't evolved; real-world ambiguity patterns shift; false negative rate climbs
- **T=3 months:** Sprint auto-advances through fundamentally flawed designs because pause logic is stale

The system has no **velocity governor** — no mechanism that asks "are we advancing too fast for safe integration?" This is a Schelling trap: individual phase transitions appear safe, but the *rate* of transitions creates systemic risk.

**Second-order effect:** Users will adapt to auto-advance by **under-specifying features** in the initial description to avoid triggering pause conditions. This creates a reinforcing loop where:
1. User learns system rarely pauses
2. User provides less detail in feature description
3. Brainstorm phase has less signal to detect ambiguity
4. System advances with underspecified requirements
5. Implementation phase fails, but *after* multiple phases have executed
6. User loses confidence and disables auto-advance entirely

This is **over-adaptation producing system collapse**.

**Fix Options:**

1. **Velocity-sensitive pause threshold:** Track `phases_advanced_in_last_hour`. If > 2, reduce pause threshold (increase sensitivity). If a phase takes >30 min, increase pause threshold for next transition.

2. **Feedback-driven brake:** After each auto-advance, inject a micro-status check: "Phase X completed in Y minutes. Proceeding to phase Z." If phase completion time is <5 min, pause with message: "Rapid advancement detected. Review recent work before continuing?"

3. **Cumulative risk score:** Each phase adds risk points based on heuristics (phase duration, artifact size, test count). When cumulative risk > threshold, force pause regardless of phase-specific triggers.

4. **User comprehension checkpoint:** Every N phases (e.g., every 3), show a summary and require explicit `/continue` command. This isn't friction — it's a **circuit breaker** that prevents runaway execution when the user has context-switched away.

**Recommended minimum:** Add velocity governor (option 1) + cumulative risk score (option 3). These add negative feedback loops that prevent runaway behavior.

---

### 2. **P2 | FD-002 | "Correctness Safeguards" | State desync auto-repair produces oscillation when concurrent writes occur**

**Lens:** Feedback Loops, Hysteresis, Emergent Behaviors

**Evidence:**

The PRD states:
> "Desync auto-repair: On read, if bead phase != artifact header phase, rewrite artifact header to match bead (bead is authoritative)."

This repair happens "on read" in a system where multiple sessions can attempt to claim the same sprint (with session claim as the only gate).

**Problem:**

This creates a **corrective oscillation** when two conditions coincide:

1. Session A holds claim but is slow (network latency, long LLM response time)
2. Session B's claim attempt occurs just after Session A's 60-min TTL expires
3. Session A completes work and updates artifact
4. Session B reads, detects "desync", overwrites artifact header

The auto-repair is **unidirectional** (bead → artifact) but has no timestamp comparison or conflict detection. If Session A's work was more recent but Session B's claim is newer, Session B's repair will revert valid state.

**Temporal dynamics:**

- **T=0:** Session A claims sprint, begins work
- **T=59min:** Session A in long code review phase, claim about to expire
- **T=60min:** Session A completes phase, writes artifacts (but claim expired 1 second ago)
- **T=60min+1s:** Session B claims sprint (no active claim), reads state, sees "desync" (because Session A wrote without valid claim), **overwrites Session A's artifact**
- **T=61min:** Session A writes bead state, now ahead of artifact again
- **T=62min:** Next read triggers repair again

This is **chattering** — the system oscillates between states without converging.

**Hysteresis problem:** Once a desync repair has occurred, there's no record that it happened. If the repair was incorrect (reverted valid work), the system has no mechanism to detect and reverse it. The state history is lost.

**Fix Options:**

1. **Vector clock or timestamp-based repair:** Before auto-repair, check artifact `last_modified` vs bead `phase_history[current_phase+"_at"]`. Only repair if bead timestamp is newer.

2. **Append-only repair log:** Instead of silent rewrites, append repair actions to a `sprint_repairs` state field: `{"2026-02-16T10:30:00Z": "artifact_header_rewritten", "reason": "bead_phase=X, artifact_phase=Y"}`. This allows post-hoc debugging of oscillation.

3. **Grace period for expired claims:** Allow reads/writes for 5 minutes after claim expiry if the same session. Prevents the T=60min race condition above.

4. **Remove auto-repair entirely:** Make desync a **hard error** that pauses auto-advance and asks the user to resolve. Desync should be rare if locking works; if it's frequent, the system has deeper problems that auto-repair will mask.

**Recommended:** Option 1 (timestamp-based repair) + option 2 (repair log) + option 3 (grace period). Option 4 is viable if you prefer fail-safe over fail-operational.

---

### 3. **P2 | FD-003 | "F3: Tiered Brainstorming" | Complexity classification creates a reinforcing simplification loop**

**Lens:** Compounding Loops, Over-Adaptation, Emergent Behaviors

**Evidence:**

The PRD specifies:
> "Complexity classification based on feature description"
> "Classification signals: description length, ambiguity terms, pattern references"
> "Simple: research repo → one consolidated AskUserQuestion confirming approach"

The classification happens *before* the brainstorm, based only on the initial feature description.

**Problem:**

This creates a **reinforcing simplification loop**:

1. User writes terse feature description (natural economization)
2. System classifies as "simple" due to short description length
3. Brainstorm depth is reduced (one question instead of full dialogue)
4. User receives less exploration of the problem space
5. User learns that short descriptions → fast execution
6. User writes even terser descriptions in future sprints

**Emergent behavior:** Over time, the system trains users to **minimize detail** to maximize velocity. This is the opposite of the desired behavior (rich problem exploration).

**Second-order effect:** When a genuinely complex feature is described tersely (because the user doesn't yet understand its complexity), the system will:
1. Classify it as simple
2. Skip deep brainstorming
3. Discover complexity during implementation
4. Fail late (after auto-advance has consumed phases)

This is **preferential attachment** — simpler features get faster execution, which reinforces their simplicity classification in the training data (if any ML is later added). Complex features are punished with friction, incentivizing users to frame complexity as simplicity.

**Temporal dynamics (BOTG):**

- **T=0:** User provides balanced descriptions, system learns baseline
- **T=1 month:** User notices short descriptions → fast sprints
- **T=3 months:** 80% of features classified as "simple" regardless of actual complexity
- **T=6 months:** Implementation failure rate climbs, user no longer trusts auto-advance

**Fix Options:**

1. **Post-brainstorm reclassification:** After initial research, run complexity classification again based on findings (approach count, ambiguity discovered, research depth). If complexity increases, automatically expand brainstorm.

2. **Mandatory minimum interaction depth:** Even "simple" features get 2 questions: one to confirm approach, one to probe for hidden complexity ("What could make this harder than it looks?"). This prevents the zero-interaction trap.

3. **Decoupled signals:** Don't use description length as a signal. Use only semantic signals: ambiguity terms, cross-module dependencies, unfamiliar patterns. This removes the perverse incentive to write less.

4. **Explicit complexity override prompt:** After classification, always show: "Classified as [simple/medium/complex]. Override? [yes/no]". This gives the user a circuit breaker.

**Recommended:** Option 1 (post-brainstorm reclassification) + option 2 (mandatory minimum depth) + option 3 (decoupled signals). Option 4 adds friction but prevents catastrophic misclassification.

---

### 4. **P2 | FD-004 | "F1: Sprint Bead Lifecycle" | Session claim TTL + auto-advance creates temporal trap at 60-minute boundary**

**Lens:** Pace Layers, Temporal Patterns, Causal Chains

**Evidence:**

The PRD specifies:
> "Session claim: `active_session` prevents concurrent resume (with 60-min TTL)"
> "Sprint proceeds through all phases without user confirmation"

A sprint with auto-advance enabled will execute phase transitions without user interaction. If a single phase takes >60 minutes, the claim expires mid-execution.

**Problem:**

This is a **pace layer mismatch**. Two time scales are in conflict:

- **Fast layer:** 60-minute session claim TTL (chosen for human session duration)
- **Slow layer:** Auto-advance phase execution (can take hours for research-heavy or implementation-heavy phases)

When a slow phase exceeds the fast layer's boundary, the system enters an undefined state:

**Scenario:**
1. Session A claims sprint, begins research-heavy brainstorm phase
2. Phase involves deep research (fetching docs, running experiments, generating alternatives)
3. At T=60min, claim expires
4. At T=70min, Session B resumes the same sprint (no active claim)
5. At T=80min, Session A completes phase, writes artifacts
6. Session B reads state, sees Session A's writes as "invalid" (no claim)
7. Desync auto-repair triggers, potentially reverting Session A's work

**This is a temporal trap:** The system's own design (auto-advance for long phases) creates conditions that violate its own invariants (60-min claim).

**Second-order effect:** If auto-advance detects claim expiry and halts, users will learn that long phases force manual intervention, defeating the purpose of auto-advance. If auto-advance ignores claim expiry, concurrent access risk increases.

**Feedback loop potential:** If long phases frequently expire claims, users will disable auto-advance, reducing the value of the entire feature.

**Fix Options:**

1. **Phase-in-progress claim extension:** When a phase begins, extend claim by `estimated_phase_duration + 30min`. Estimate based on phase type and historical data.

2. **Heartbeat renewal:** Every 15 minutes during active phase execution, renew the claim (write current timestamp). This keeps the claim alive as long as work is ongoing.

3. **Claim handoff protocol:** When claim expires, don't release immediately. Mark as "expiring" and allow the current session to complete the current phase before release. New sessions see "sprint in use, completing phase X" and cannot claim.

4. **Phase-level locking instead of session-level locking:** Lock at phase granularity. Multiple sessions can work on different phases of the same sprint (if phases are independent). This increases concurrency but requires more careful phase ordering.

**Recommended:** Option 2 (heartbeat renewal) + option 3 (graceful expiry). These align the pace layers without requiring accurate phase duration estimation.

---

### 5. **P3 | FD-005 | "Sprint Bead Hierarchy" | Sprint-as-epic dual role creates emergent identity confusion**

**Lens:** Emergence, Complexity, Causal Graphs

**Evidence:**

The PRD states:
> "Sprint bead = strategy epic. When `/strategy` runs inside a sprint, it enriches the sprint bead with feature children instead of creating a separate epic."

A single bead now serves two semantic roles:
1. **Sprint:** Pipeline state machine (phase tracking, auto-advance, session claims)
2. **Epic:** Feature decomposition container (parent of feature beads)

**Problem:**

This is **emergent identity confusion** — the bead's meaning depends on which subsystem is interpreting it. When two subsystems share a single data structure with different conceptual models, emergent behaviors arise from their interaction:

**Scenario 1: Filtering ambiguity**
- User runs `bd ls --type=epic` (looking for feature decompositions)
- Sprint beads appear (they're marked `type=epic`)
- User confused: "Is this an epic or a sprint?"

**Scenario 2: State field collision**
- Epic-related tools expect `priority`, `status`, `owner` fields
- Sprint-related tools expect `phase`, `sprint_artifacts`, `active_session` fields
- Both write to the same bead
- Field namespace collision risk increases over time as both systems evolve

**Scenario 3: Child bead semantics**
- Feature beads are children of the sprint/epic
- If a feature bead itself becomes a sprint (nested sprint?), does it inherit epic semantics?
- The bead graph now has two overlapping hierarchies: sprint-contains-features AND epic-contains-features

**Temporal dynamics:**
- **T=0:** Sprint and epic roles are clearly separated in initial implementation
- **T=6 months:** Both subsystems add new features, state fields proliferate
- **T=1 year:** Field namespace is polluted, queries return unexpected results, debugging is hard

**This is a simple-rules-emerge-complexity problem:** The rule "sprint bead = epic" seems simple, but the *interaction* between sprint-aware and epic-aware code creates unpredictable behavior.

**Fix Options:**

1. **Explicit dual-role marker:** Add `bead_roles=["sprint", "epic"]` field. All queries must specify which role they're interested in. Queries that don't specify get an error.

2. **Namespaced state fields:** Sprint fields prefixed `sprint_*`, epic fields prefixed `epic_*`. Prevents collision and makes role explicit in every field access.

3. **Separate beads with hard link:** Sprint bead links to epic bead via `epic_id` field. Epic bead links back via `sprint_id` field. Keeps roles separate but preserves navigation.

4. **Accept the dual role, document extensively:** Make this a first-class concept. Update all queries, UI, and documentation to handle sprint/epic duality. Ensure field namespaces never collide.

**Recommended:** Option 2 (namespaced fields) + option 4 (explicit dual-role design). Option 3 (separate beads) is cleaner but likely too invasive for current architecture.

---

### 6. **P3 | FD-006 | "F2: Auto-Advance Engine" | Pause trigger detection has bullwhip potential under high phase transition velocity**

**Lens:** Bullwhip Effect, Temporal Patterns, Feedback Loops

**Evidence:**

The PRD specifies:
> "Pause triggers: design ambiguity (2+ approaches), P0/P1 gate failure, test failure, quality gate findings"

Pause triggers are **detection-based** (system detects a condition and pauses). Detection has latency: the condition may exist for some time before detection occurs. During that latency, auto-advance continues.

**Problem:**

This creates **bullwhip effect** potential when:
1. Pause condition emerges in phase N
2. Detection doesn't occur until phase N+2 (delayed detection)
3. System pauses at N+2, requiring rollback to N
4. Rollback itself is a multi-phase operation (undo, revert, re-plan)

**Scenario:**
1. Brainstorm phase generates an ambiguous design (but detection logic misses it)
2. Strategy phase proceeds, creating a plan based on the ambiguous design
3. Plan phase expands the plan, amplifying the ambiguity
4. Execute phase begins, triggers gate failure (pause condition detected)
5. System pauses, but now must unwind 3 phases of work

The **bullwhip**: The original problem (ambiguity) was small in phase N, but the *accumulated work* grows with each phase. The correction cost is much higher than if detection had occurred immediately.

**Second-order effect:** Users learn that late pauses are costly, so they disable auto-advance entirely. The system's inability to detect early becomes a reason to reject the entire feature.

**Temporal dynamics:**
- **Early detection (ideal):** Small correction cost, high user trust
- **Late detection (current risk):** Large correction cost, user frustration
- **Very late detection (worst case):** Shipped code must be reverted, user disables feature

**Fix Options:**

1. **Forward-looking pause triggers:** At end of each phase, run a lightweight check for *next-phase* pause conditions. For example, after brainstorm, check if the design has sufficient detail for strategy. This adds a phase boundary check instead of relying on mid-phase detection.

2. **Phase completion gates:** Require explicit "phase complete" criteria before auto-advance. For example, brainstorm phase is only complete if artifact includes >2 approaches OR explicit "single approach justified" annotation.

3. **Incremental pause conditions:** Instead of binary pause/continue, introduce "yellow flag" warnings that accumulate. After 3 yellow flags, force pause. This provides early signal without halting on every minor issue.

4. **Fast rollback mechanism:** If a pause occurs >1 phase after the root cause, offer automated rollback: "Design ambiguity detected in execute phase, originated in brainstorm. Roll back to brainstorm? [yes/no]".

**Recommended:** Option 1 (forward-looking triggers) + option 3 (incremental warnings). These reduce detection latency and provide graduated response.

---

### 7. **P3 | FD-007 | Overall System | Missing hormetic stress mechanisms — system optimizes for zero friction**

**Lens:** Hormesis, Systems Thinking, Over-Adaptation

**Evidence:**

The entire PRD is framed around **removing friction**:
> "over-prompts the user at non-critical phase transitions"
> "Sprint proceeds through all phases without user confirmation"
> "Remove 'what next?' prompts"

No mechanisms exist to preserve **beneficial stress** — the kind of friction that forces users to understand the system's behavior and build correct mental models.

**Problem:**

This is **hormetic inversion** — the system assumes all friction is bad, when in fact *some* friction is necessary for learning and calibration.

**Emergent behavior at scale:**

1. User runs sprints with auto-advance
2. System executes rapidly, user develops shallow understanding of what each phase does
3. User encounters a failure, doesn't understand which phase caused it (because they never saw phase transitions)
4. User loses trust, disables auto-advance
5. System returns to high-friction mode
6. **Net outcome:** All-or-nothing adoption (full auto or full manual), no middle ground

**Temporal dynamics (BOTG):**

- **T=0 (high friction):** User frustrated by prompts, but builds strong mental model
- **T=1 week (zero friction):** User delighted by speed, but mental model degrades
- **T=1 month (zero friction):** User treats system as black box, doesn't understand phase logic
- **T=3 months (failure event):** Sprint fails, user has no debugging intuition, blames "the AI"
- **T=6 months:** User disables all automation, returns to manual workflow

**This is over-adaptation producing brittleness:** The system optimizes for peak performance (zero friction) at the cost of resilience (user understanding).

**Fix Options:**

1. **Calibration period:** First 3 sprints for a user run in "learning mode" with status messages and optional pauses. After 3 sprints, auto-advance fully enables. This builds mental model before going hands-off.

2. **Transparency without friction:** Show phase transitions in statusline or logs, but don't require confirmation. User sees "Transitioning: brainstorm → strategy (auto)" but doesn't have to click.

3. **Adaptive friction:** Track user's intervention rate. If user frequently overrides auto-advance or manually rolls back, increase friction (add more pauses). If user never intervenes, reduce friction. This creates a feedback loop that matches system behavior to user competence.

4. **Failure-triggered friction:** After any sprint failure, the *next* sprint runs with all pauses enabled. This forces reflection on what went wrong. After a successful sprint, return to auto mode. This is hormetic: stress applied when needed, removed when not.

**Recommended:** Option 2 (transparency without friction) + option 4 (failure-triggered friction). These preserve learning without sacrificing velocity.

---

## Verdict

**Needs changes**

The PRD presents a sophisticated state management architecture but introduces three **P1-level systemic risks**: runaway auto-advance with no velocity governor (FD-001), state desync oscillation under concurrent access (FD-002), and complexity classification that reinforces itself toward simplification (FD-003). These are not implementation bugs — they are **feedback loop designs** that will produce emergent behaviors divergent from intended use.

The **P2-level temporal risks** (claim TTL mismatch, bullwhip pause detection) will degrade user trust over time as edge cases accumulate. The **P3-level concerns** (dual-role identity confusion, missing hormesis) reduce long-term resilience and learnability.

### Priority Fixes

**Must address before implementation:**
1. **Add velocity governor to auto-advance** (FD-001) — prevents runaway execution
2. **Timestamp-based desync repair + grace period** (FD-002) — prevents oscillation
3. **Post-brainstorm complexity reclassification** (FD-003) — breaks reinforcing simplification loop

**Should address in Phase 1:**
4. **Heartbeat claim renewal** (FD-004) — aligns pace layers
5. **Forward-looking pause triggers** (FD-006) — reduces bullwhip effect

**Consider for Phase 2+:**
6. **Namespaced state fields for sprint/epic dual role** (FD-005)
7. **Failure-triggered friction mode** (FD-007) — preserves learnability

---

<!-- flux-drive:complete -->
