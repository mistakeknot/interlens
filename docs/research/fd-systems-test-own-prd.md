# Flux-Drive Systems Review: Interlens Lens Agents PRD

**Document:** `/root/projects/Interverse/docs/prds/2026-02-15-interlens-flux-agents.md`
**Reviewer:** fd-systems (Flux-drive Systems Thinking)
**Date:** 2026-02-16

---

### Findings Index
- **P1 | SYS-1** | "Phased Delivery" | Missing Reinforcing Loop Between Agent Performance and Lens Selection
- **P2 | SYS-2** | "F3: Interlens MCP Wiring" | Hysteresis Trap in Fallback Behavior
- **P2 | SYS-3** | "Risks" | Cobra Effect Risk in Actionability Optimization
- **P2 | SYS-4** | "F4: Severity Guidance" | Bullwhip Effect in Severity Calibration
- **P3 | SYS-5** | "Phase 0: Prove It" | Pace Layer Mismatch Between Validation and Infrastructure
- **P3 | SYS-6** | "F2: Triage Pre-filter" | Emergent Categorization Behavior from Simple Rules

---

## Summary

The PRD demonstrates strong technical planning but contains critical systems blind spots: **no feedback mechanism** connects agent performance to lens curation (SYS-1), creating a static system that can't adapt to user needs. The MCP fallback design (SYS-2) exhibits hysteresis that could lock users into degraded mode. The actionability-focused success gate (SYS-3) risks creating perverse incentives. These issues don't invalidate the design but require explicit feedback loops and adaptation mechanisms before scaling to Phase 1.

---

### 1. **P1 | SYS-1 | "Phased Delivery" + "F1" | Missing Reinforcing Loop Between Agent Performance and Lens Selection**

**Lens:** Compounding Loops, Systems Thinking

**Evidence:**
- F1 specifies "12 key lenses curated from Systems Dynamics + Emergence + Resilience frames" (line 51)
- F1b creates 4 additional agents with fixed lens assignments: "each lens appears in exactly one agent's key list" (line 68)
- Phase 0 success gate: "At least 2/3 test runs produce findings the author says they'd act on" (line 21)
- No mechanism described for updating lens selection based on which lenses produce actionable findings

**Problem:**
The lens curation process is **one-directional** (FLUX taxonomy → agent prompts) with no feedback loop from agent performance back to lens selection. This creates a static system vulnerable to two failure modes:

1. **Blind spot persistence:** If certain lenses (e.g., "Hormesis") consistently produce "interesting but not actionable" findings (Risk #2, line 125), they remain in the hardcoded prompt forever because there's no pruning mechanism.

2. **Missing demand signal:** If users consistently ask follow-up questions about lenses NOT in the hardcoded 12 (e.g., "what about network effects?"), there's no reinforcing loop to promote those lenses into the core set.

Over time (T=6mo), this produces **divergence** between what the agent reviews and what users find valuable. The Phase 1 MCP integration (F3) doesn't solve this — it adds breadth but not adaptation.

**Behavior Over Time Graph:**
```
T=0: Agent uses curated 12 lenses → produces findings
T=1mo: User feedback reveals 3 lenses are weak, 2 missing lenses are critical
T=3mo: Weak lenses still hardcoded, critical lenses still missing (no update mechanism)
T=6mo: Agent perceived as "misses the point" → usage declines
```

**Fix:**
Add a **reinforcing feedback loop** in Phase 1:

1. **Instrumentation:** Agent logs which lenses were used in each finding (already implicit in finding format)
2. **Feedback signal:** Track user actions post-review (e.g., "mark finding as helpful" button, or proxy: whether finding text appears in subsequent document edits)
3. **Lens scoring:** Aggregate lens utility over 10+ reviews: `lens_score = findings_marked_helpful / total_findings_using_lens`
4. **Adaptive curation:** Monthly (or per 50 reviews), re-rank lenses by score. Demote bottom 2, promote top 2 candidates from MCP search results on the same domain.

This creates a **balancing loop** (prevent lens bloat) and a **reinforcing loop** (successful lenses get more prominence → better reviews → more use). Without this, the system is blind to its own effectiveness.

**Question for author:** How will you know if the initial 12-lens selection for fd-systems is the right set 6 months from now? What feedback mechanism connects agent performance to lens evolution?

---

### 2. **P2 | SYS-2 | "F3: Interlens MCP Wiring" | Hysteresis Trap in Fallback Behavior**

**Lens:** Hysteresis, Systems Thinking

**Evidence:**
- F3 specifies fallback behavior: "If interlens-mcp tools are available (check via ToolSearch), call search_lenses/detect_thinking_gaps; otherwise use the hardcoded key lenses" (line 86)
- When MCP unavailable: "agent includes a NOTE finding: 'MCP server unavailable — review used fallback lens subset (12/288 lenses)'" (line 88)
- "No hard dependency — MCP enriches but doesn't gate the review" (line 89)

**Problem:**
This design creates **hysteresis** (system behavior depends on path history, not just current state). Once a user experiences degraded mode (12 lenses), they may never discover MCP mode (288 lenses) even after MCP becomes available:

1. **Path A (MCP always available):** User sees full lens coverage → expects comprehensive cognitive review → satisfaction high
2. **Path B (MCP unavailable first run):** User sees NOTE about "fallback subset" → lowers expectations → doesn't install MCP because "it works fine without it" → stays in degraded mode permanently
3. **Path C (MCP flaky):** User experiences both modes → perceives agent as inconsistent → trust declines → stops using

The "NOTE finding" (line 88) is a **one-way door** — it anchors user expectations to the degraded baseline. Users who start in fallback mode have no forcing function to upgrade.

**Second-order effect:**
If most users stay in fallback mode (Path B), the MCP integration effort (F3) delivers no value, but the **maintenance burden persists** (two codepaths to test, MCP version skew issues). This is a **crumple zone** failure — the graceful degradation becomes the dominant mode.

**Behavior Over Time Graph:**
```
T=0: Agent ships with MCP fallback
T=1mo: 60% of users hit MCP-unavailable path → see NOTE → stay in fallback
T=3mo: MCP becomes stable, but those 60% never retry (hysteresis)
T=6mo: MCP codebase bitrot (rarely used) → removed in refactor → fallback becomes permanent
```

**Fix:**
Convert hysteresis into a **forcing function**:

1. **Fail loudly (option 1):** If MCP unavailable, return verdict `needs-changes` with P2 finding: "Interlens MCP required for cognitive review. Install: `claude plugins install interlens-mcp`". This forces installation but breaks graceful degradation.

2. **Persistent nag (option 2):** Every review in fallback mode includes a P3 finding: "Limited lens coverage (12/288). Install interlens-mcp for full analysis." + track "days since first fallback" → escalate to P2 after 7 days. This preserves graceful degradation but adds upgrade pressure.

3. **Auto-upgrade path (option 3):** Fallback mode includes a footer: "Run `/install-interlens-mcp` to enable full lens library." Create a skill that installs MCP + validates connection. This gives users a one-click upgrade.

Without a forcing function, hysteresis locks users in degraded mode, and the MCP integration becomes **dead code**.

**Question for author:** What percentage of users do you expect to voluntarily upgrade from 12-lens fallback to 288-lens MCP mode after seeing the NOTE? How will you measure this transition rate?

---

### 3. **P2 | SYS-3 | "Risks" | Cobra Effect Risk in Actionability Optimization**

**Lens:** Cobra Effect, Systems Thinking, Over-Adaptation

**Evidence:**
- Risk #2: "Actionability risk: FLUX lenses are descriptive frameworks — findings could be 'interesting but not actionable.' Agent prompts must include concrete questions, not just 'consider this lens.'" (line 125)
- Phase 0 success gate: "At least 2/3 test runs produce findings the author says they'd act on" (line 21)
- Non-goal: "'Questions to ask' field — deferred to post-Phase 1 feedback. Lens findings use standard prose sections for now." (line 112)

**Problem:**
The success gate optimizes for **immediate actionability**, which creates a perverse incentive (**cobra effect**): agents learn to produce shallow, concrete findings ("change this word") instead of deep, structural insights ("this strategy assumes linear growth but will hit exponential saturation").

**Causal chain:**
1. Success gate measures "findings the author says they'd act on" (line 21)
2. Authors are more likely to "act on" surface-level, low-effort changes (rename variable, add sentence)
3. Agent prompts evolve (via implicit feedback during testing) to prefer concrete over conceptual findings
4. Deep systems insights (e.g., "this feedback loop will cause oscillation") get deprioritized because they're harder to act on immediately
5. At T=6mo, fd-systems produces **technically actionable but cognitively shallow** findings — defeating the entire purpose of lens-based review

**Over-adaptation dynamic:**
The system **over-adapts** to the metric (actionability) at the expense of the goal (cognitive quality). This is the classic Goodhart's Law trap: "When a measure becomes a target, it ceases to be a good measure."

**Behavior Over Time Graph:**
```
T=0: Agent produces mix of deep (P1 systems blind spots) + shallow (P3 wording tweaks)
T=1mo: Testing shows shallow findings have higher "act on" rate → prompts shift
T=3mo: Agent optimized for actionability → produces mostly P3 findings (easy wins)
T=6mo: Users complain "fd-systems doesn't catch strategic blind spots anymore"
```

**Fix:**
Add a **balancing loop** to the success gate:

1. **Dual metric:** "At least 2/3 test runs produce findings the author says they'd act on **AND** at least 1/3 of findings are rated 'revealed a blind spot I didn't see'". This creates tension between actionability and insight depth.

2. **Severity distribution constraint:** Success gate requires findings distribution roughly matches `P1: 10-20%, P2: 40-60%, P3: 20-40%`. If all findings are P3 (easy actionability), the test fails.

3. **Time-delayed validation:** After author acts on findings, follow up in 2 weeks: "Did acting on this finding prevent a problem or improve the outcome?" This measures **consequential actionability**, not just **immediate actionability**.

Without a balancing loop, optimizing for actionability will **hollow out** the cognitive review capability, turning fd-systems into a glorified style checker.

**Question for author:** How will you distinguish between "actionable because it's deep and strategic" vs "actionable because it's shallow and easy"? What prevents the success gate from selecting for the latter?

---

### 4. **P2 | SYS-4 | "F4: Severity Guidance" | Bullwhip Effect in Severity Calibration**

**Lens:** Bullwhip Effect, Systems Thinking

**Evidence:**
- F4: "Agents use standard P0-P3 in output. Cognitive severity guidance (Blind Spot/Missed Lens/Consider Also) is a prompt-level heuristic, NOT an output format" (line 95)
- F1: "Uses standard P0-P3 severities in findings output (NOT custom labels). Agent prompt includes cognitive severity guidance: 'Blind Spot' (frame entirely absent, critical gap → P1), 'Missed Lens' (relevant frame underexplored → P2), 'Consider Also' (enrichment opportunity → P3)" (line 52)
- F4: "Verdict computation treats cognitive P1/P2/P3 identically to technical P1/P2/P3" (line 97)

**Problem:**
The severity mapping introduces a **translation layer** (cognitive heuristic → technical severity) that's vulnerable to **bullwhip effect** (small changes in upstream signal amplified downstream):

1. **Upstream signal:** Agent interprets "frame entirely absent" as Blind Spot → maps to P1
2. **Downstream interpretation:** Synthesis sees P1 → verdict computation escalates to `needs-changes`
3. **User reaction:** Author sees `needs-changes` for a cognitive gap → perceives it as equal severity to "security vulnerability" (also P1)
4. **Feedback:** Author complains "cognitive P1 is too harsh" → severity guidance revised: "Blind Spot → P1 only if it could lead to concrete failure"
5. **Calibration creep:** Over multiple revisions, cognitive P1 threshold rises → fewer P1 findings → cognitive issues under-weighted in verdict
6. **Oscillation:** Users then complain "fd-systems missed an obvious blind spot" → threshold lowered → cycle repeats

This is a **bullwhip effect** because the severity signal passes through multiple interpretation layers (agent heuristic → severity label → verdict → user perception → feedback → heuristic revision), and each layer adds noise and delay.

**Second-order effect:**
F4 specifies "Verdict computation treats cognitive P1/P2/P3 identically to technical P1/P2/P3" (line 97). This **couples** the cognitive and technical severity scales. If cognitive P1 is recalibrated (e.g., "only flag if concrete risk"), it doesn't affect the verdict scale, but it DOES affect **relative weighting**. A document with 1 technical P1 and 1 cognitive P1 now feels "unbalanced" because the cognitive P1 is subjectively less severe.

**Behavior Over Time Graph:**
```
T=0: Cognitive P1 = "frame entirely absent" → clear threshold
T=1mo: Users complain P1 is too harsh → add qualifier "critical gap"
T=3mo: "Critical gap" interpreted inconsistently → severity variance increases
T=6mo: Some agents flag everything as P1, others never use P1 → verdict unreliable
```

**Fix:**
Add a **calibration feedback loop** with **reference examples**:

1. **Severity anchors:** Document 3-5 reference examples for each cognitive severity level (e.g., "Document assumes user growth is linear (ignores saturation) = P1 Blind Spot"). Include these in agent prompts as calibration anchors.

2. **Severity audit:** After every 10 reviews, compare severity distributions across lens agents. If one agent produces 80% P1 and another produces 0% P1, their heuristics have drifted — recalibrate against reference examples.

3. **Decoupled verdict:** Instead of "treats cognitive P1/P2/P3 identically to technical", use **weighted verdict**: `technical_score = sum(technical_severities)`, `cognitive_score = sum(cognitive_severities * 0.7)`. This acknowledges that cognitive gaps have longer time-to-impact than technical bugs, reducing bullwhip sensitivity.

Without calibration anchors, the severity heuristic will **drift** over time, creating inconsistent findings and verdict oscillation.

**Question for author:** How will you ensure that "Blind Spot → P1" means the same thing across all 5 lens agents? What prevents severity inflation (everything is P1) or deflation (nothing is P1)?

---

### 5. **P3 | SYS-5 | "Phase 0: Prove It" | Pace Layer Mismatch Between Validation and Infrastructure**

**Lens:** Pace Layers, Systems Thinking

**Evidence:**
- Phase 0 goal: "Validate that lens-based cognitive review produces actionable findings" (line 16)
- Phase 0 features: "F1: Create ONE agent (fd-systems) with hardcoded lenses (no MCP dependency)" (line 18)
- Phase 0 test: "Test on 3 recent Interverse documents" (line 20)
- Phase 1 (blocked by Phase 0): "F3: Wire Interlens MCP integration" (line 24)

**Problem:**
Phase 0 validates **fast-moving concerns** (actionability, finding quality) using **slow-moving infrastructure** (hardcoded lenses, no MCP). This creates a **pace layer mismatch**:

- **Fast layer (days-weeks):** User feedback on finding quality, actionability
- **Slow layer (months):** MCP server stability, lens taxonomy evolution, knowledge graph maintenance

Phase 0 proves that hardcoded lenses work, but **doesn't validate the MCP integration**, which is the actual long-term dependency. If MCP proves unreliable in Phase 1 (e.g., slow queries, version skew, lens taxonomy breaking changes), Phase 0's success becomes irrelevant — you validated the wrong thing.

**Second-order effect:**
Phase 0's "no MCP dependency" (line 18) creates a **false sense of security**. If the test succeeds, stakeholders may assume the system is production-ready, not realizing that Phase 1's MCP integration introduces **new failure modes** (network latency, MCP server crashes, lens ID conflicts) that weren't tested.

**Behavior Over Time Graph:**
```
T=0: Phase 0 test succeeds with hardcoded lenses → greenlight Phase 1
T=1mo: Phase 1 MCP integration ships → 30% of reviews hit MCP timeout → user complaints
T=2mo: Rollback to hardcoded mode (the "proven" system) → MCP investment wasted
```

**Fix:**
Add a **parallel validation path** in Phase 0 that tests the MCP integration **feasibility** (not full functionality):

1. **MCP smoke test (F0.5):** Before Phase 0 success gate, validate that MCP server can be installed, started, and queried for `search_lenses("systems dynamics")` in <5 seconds. This doesn't prove MCP is reliable, but it proves it's **viable**.

2. **Dual-mode testing:** Run the 3-document test TWICE — once with hardcoded lenses (current plan), once with MCP `search_lenses` integration. Compare finding quality. If MCP mode produces worse findings (e.g., query returns irrelevant lenses), that's a critical signal that MCP integration won't work.

3. **Phase gate adjustment:** Success gate becomes: "At least 2/3 test runs produce actionable findings (hardcoded mode) AND MCP smoke test passes AND at least 1 dual-mode test shows MCP findings are comparable quality."

This tests **fast-layer concerns** (finding quality) and **slow-layer concerns** (MCP viability) in parallel, avoiding the pace layer mismatch.

**Question for author:** What happens if Phase 0 succeeds (hardcoded lenses work great) but Phase 1 reveals that MCP queries are too slow for real-time review? How much of Phase 0's validation transfers to the MCP-integrated system?

---

### 6. **P3 | SYS-6 | "F2: Triage Pre-filter" | Emergent Categorization Behavior from Simple Rules**

**Lens:** Simple Rules, Emergence, Systems Thinking

**Evidence:**
- F2 pre-filter rules (line 73-78):
  - `INPUT_TYPE=diff` → exclude lens agents
  - `INPUT_TYPE=file` AND extension in `.go .py .ts ...` → exclude lens agents
  - `INPUT_TYPE=file` AND extension in `.md .txt` → score lens agents normally
  - `INPUT_TYPE=directory` → score lens agents normally
- F2: "Lens agents report as category 'cognitive' in triage table" (line 79)

**Problem:**
These **simple rules** will produce **emergent categorization** that may not align with actual document semantics:

1. **False exclusions:** A `.py` file that's actually documentation (e.g., `design_decisions.py` that's a Python-formatted design doc) gets excluded because the rule keys on file extension, not content.

2. **False inclusions:** A `.md` file that's actually a code snippet library (e.g., `snippets.md` with 90% code blocks, 10% prose) gets lens review because the rule keys on extension.

3. **Edge case explosion:** What about `.yml` (config file or architecture doc?), `.json` (API spec or data dump?), `.ipynb` (Jupyter notebook — code or documentation?), `.tex` (LaTeX paper), `.org` (Emacs Org-mode doc)?

At T=0, the rules seem reasonable. At T=6mo, edge cases accumulate, and users perceive the system as "doesn't understand what I'm asking it to review."

**Emergent behavior:**
The simple extension-based rules create an **implicit taxonomy** (code vs docs) that users will eventually violate. When they do, the triage pre-filter produces confusing results (e.g., "why didn't fd-systems review my architecture doc?" → "because it was named `arch.py`").

**Behavior Over Time Graph:**
```
T=0: Extension rules cover 90% of cases cleanly
T=2mo: Users hit edge cases (.yml, .ipynb) → add special-case rules
T=4mo: 15 special-case rules → maintenance burden, rules conflict
T=6mo: "Just review everything" becomes easier than maintaining rules → pre-filter removed
```

**Fix:**
Add a **content-based heuristic** as a fallback when extension is ambiguous:

1. **Heuristic:** If file extension is ambiguous (`.yml`, `.json`, `.ipynb`, etc.), sample first 500 characters. If >70% is prose (not code), include lens agents. If >70% is code, exclude. (Use simple proxy: ratio of whitespace+punctuation to alphanumeric characters.)

2. **User override:** Allow users to pass `--review-mode=cognitive` flag to force lens agent inclusion, or `--review-mode=technical` to force exclusion. This breaks out of the emergent categorization when it's wrong.

3. **Learning loop:** Track "user overrode pre-filter" events. If a file type (e.g., `.yml`) gets overridden 80% of the time, adjust the default rule.

This doesn't eliminate emergence (simple rules always create edge cases), but it adds a **balancing loop** (user override) and a **feedback loop** (learning from overrides) to prevent rule brittleness.

**Question for author:** How will you handle files that are 50% code, 50% documentation (e.g., literate programming, Jupyter notebooks)? Should they get both technical and cognitive review, or is that redundant?

---

## Verdict

**needs-changes**

The PRD is well-structured and technically sound, but contains **critical systems blind spots** that could cause the project to fail at scale (Phase 1) even if Phase 0 succeeds:

- **SYS-1 (P1):** No feedback loop from agent performance to lens curation → static system that can't adapt
- **SYS-2 (P2):** MCP fallback design creates hysteresis trap → most users stay in degraded mode
- **SYS-3 (P2):** Actionability-focused success gate risks cobra effect → shallow findings favored over deep insights
- **SYS-4 (P2):** Severity mapping vulnerable to bullwhip effect → verdict instability

Recommendations:
1. Add lens performance feedback loop (SYS-1) to Phase 1 scope
2. Replace MCP graceful degradation with forcing function (SYS-2)
3. Add dual-metric success gate (SYS-3) to prevent actionability optimization trap
4. Define severity calibration anchors (SYS-4) before Phase 0 testing

The phased approach is sound, but Phase 0 must validate **adaptation mechanisms** (feedback loops), not just **static functionality** (hardcoded lenses work). Without adaptation, the system will ossify by Phase 1.

---

<!-- flux-drive:complete -->
