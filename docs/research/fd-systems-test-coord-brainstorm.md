# Systems Analysis: Multi-Session Coordination Brainstorm

**Document Reviewed:** `/root/projects/Interverse/docs/plans/2026-02-15-multi-session-coordination-brainstorm.md`
**Reviewer:** Flux-drive Systems Thinking Reviewer
**Date:** 2026-02-16
**Review Focus:** Feedback loops, emergence, causal chains, temporal dynamics, unintended consequences

---

### Findings Index

- P1 | SYS-1 | "Phase 1: Git Safety" | Auto-refresh index creates thundering herd on high-commit repos
- P2 | SYS-2 | "P0: Git Index Isolation" | Missing balancing loop for per-session index proliferation
- P1 | SYS-3 | "P0: Mandatory File Reservation" | Auto-reserve TTL creates oscillating lock contention under load
- P2 | SYS-4 | "P1: Post-Commit Sync" | Rebase-on-commit loop has unbounded amplification potential
- P1 | SYS-5 | "P1: Work Partitioning" | Bead-agent binding creates preferential attachment to early claimers
- P2 | SYS-6 | "Phase 4: UX Polish" | Statusline update frequency vs. cognitive load tradeoff unspecified
- P3 | SYS-7 | "Architecture Decision" | Agent Teams vs Intermute presents classic pace layer mismatch risk

---

## Summary

The coordination design demonstrates strong understanding of concurrency primitives but underspecifies the system's temporal behavior under variable load. Three critical feedback loops are either missing balancing mechanisms (index proliferation, reservation TTL renewal) or lack analysis of their steady-state behavior (broadcast-triggered rebases). The design assumes coordination overhead scales linearly with agent count, but the proposed auto-reserve + broadcast architecture creates quadratic message complexity (N agents × M reservations × broadcast fanout). The 15-minute TTL default appears arbitrary and could produce either lock starvation (too short under deep work) or deadlock accumulation (too long under session churn). The system needs explicit hysteresis analysis for the transition from 1→2→3+ concurrent sessions.

---

### 1. **P1 | SYS-1 | "Phase 1: Git Safety" | Auto-refresh index creates thundering herd on high-commit repos**

**Evidence:**
> "Post-commit hook: `git read-tree HEAD` to refresh index + broadcast via Intermute WebSocket"

When Session A commits, *all other sessions* receive a WebSocket notification. The design implies each session should refresh its index. But:
- If 5 sessions are active and Session A commits, 4 sessions simultaneously run `git read-tree HEAD`
- If Session B immediately commits after, 4 sessions (including A, now refreshed) again run `git read-tree HEAD`
- Under high commit velocity (e.g., Clavain's parallel sprint agents each committing every 2-5 minutes), this becomes a *reinforcing loop*: more commits → more broadcasts → more index refreshes → more I/O contention → slower git operations → incentive to batch commits → larger commits → more index churn per commit

**Problem (Feedback Loop):**
The design lacks a **balancing mechanism** to dampen broadcast-triggered work. At T+6mo with 10 concurrent agents on a fast-moving repo, every commit triggers 9 simultaneous `git read-tree` operations. This is a *bullwhip effect* — small trigger (one commit) creates amplified response downstream (N-1 parallel refreshes).

**Temporal Behavior (BOTG):**
- **T=0 (2 sessions):** Negligible impact, ~2 refreshes/commit
- **T=3mo (5 sessions, sprint workflows):** 4 refreshes/commit, occasional index.lock contention if commits overlap
- **T=6mo (10+ sessions, continuous operation):** 9+ refreshes/commit, sustained I/O pressure, potential for refresh-commit overlap creating index lock errors

**Fix:**
1. **Rate-limit index refreshes per session** — debounce the broadcast handler (e.g., "refresh at most once per 30 seconds, queue interim commits")
2. **Lazy refresh strategy** — don't refresh on broadcast; instead, refresh *on next PreToolUse:Read/Edit* if a new commit was broadcast since last refresh (pull-based, not push-based)
3. **Explicit hysteresis**: Define thresholds for when to switch from eager refresh (low activity) to lazy refresh (high activity)

**Lens Applied:** Bullwhip Effect, Feedback Loops (reinforcing), BOTG, Pace Layers

---

### 2. **P2 | SYS-2 | "P0: Git Index Isolation" | Missing balancing loop for per-session index proliferation**

**Evidence:**
> "SessionStart hook sets `GIT_INDEX_FILE=.git/index-$CLAUDE_SESSION_ID` — each session gets its own staging area"

This creates one `.git/index-<session_id>` file per session. The design specifies creation but not cleanup.

**Problem (Emergence):**
- If sessions are long-lived (tmux persists across days), index files accumulate
- If Clavain spawns 50 sprint sub-agents over a week, `.git/` fills with 50 stale index files
- Each index file is typically 1-10KB, but on large repos (e.g., Linux kernel: 3MB index), this becomes 150MB of stale index files
- Git operations that scan `.git/` (e.g., `git gc`, `git fsck`) slow down proportional to file count

**Temporal Behavior (BOTG):**
- **T=0:** Clean `.git/index` + 2 session-specific indices
- **T=1mo:** 20 session indices (10 stale)
- **T=6mo:** 200+ indices (180 stale)
- **T=2yr:** Thousands of indices, `.git/` directory scans become O(n²) bottleneck

**Problem (Missing Balancing Loop):**
The system has a *creation loop* (new session → new index) but no *cleanup loop* (session end → delete index). This is a **systems trap** — the default path (do nothing) leads to degradation.

**Fix:**
1. **SessionEnd hook:** Delete `.git/index-$CLAUDE_SESSION_ID` on session termination
2. **Orphan cleanup:** Intermute's heartbeat mechanism already detects dead sessions — extend it to clean up stale indices (e.g., "if no heartbeat for session X in 24h, delete `.git/index-X`")
3. **Bounded TTL:** Even active sessions could periodically recreate their index (e.g., daily) to prevent long-lived sessions from holding stale state

**Lens Applied:** Feedback Loops (missing balancing), Emergence (simple rule → aggregate problem), BOTG

---

### 3. **P1 | SYS-3 | "P0: Mandatory File Reservation" | Auto-reserve TTL creates oscillating lock contention under load**

**Evidence:**
> "Auto-reserve on first edit (15min TTL, auto-renewing on subsequent edits)"

The 15-minute TTL is presented as a fixed constant, but the document doesn't analyze how this interacts with:
- Agent work rhythms (deep work sessions vs. rapid iteration)
- Reservation renewal triggers (what counts as a "subsequent edit"?)
- Multi-file reservations (agent editing 10 files in sequence — does each renew the others' TTLs?)

**Problem (Oscillation Risk):**
Consider this scenario:
1. **Agent A** reserves `file.go`, works for 10 minutes, pauses to think/read docs (no edits for 5 min)
2. **TTL expires at 15:00** → reservation released
3. **Agent B** immediately reserves `file.go` (it's now available)
4. **Agent A** resumes work at 15:02 → tries to edit → **blocked** (Agent B holds lock)
5. Agent A waits, Agent B finishes → Agent A re-reserves
6. Agent B realizes they need to edit again → **blocked** (Agent A holds lock)

This is **hysteresis** — the system's state depends on timing, not just current intent. If the TTL is too short relative to natural work pauses, agents oscillate between holding and losing locks.

**Problem (Simple Rules → Emergence):**
The auto-reserve rule ("reserve on first edit") seems simple, but at scale:
- If an agent edits 5 files in sequence, do they hold 5 concurrent reservations?
- If yes, and 4 agents each edit 5 files, that's 20 active reservations
- The system becomes a **preferential attachment network** — agents who start work early accumulate more reservations, crowding out later arrivals

**Temporal Behavior (BOTG):**
- **T=0 (1-2 agents):** 15min TTL works fine, agents rarely collide
- **T=3mo (5 agents, sprint workflows):** Lock contention appears during "thinking pauses" (agent waiting for Oracle/WebSearch results, reading docs, etc.)
- **T=6mo (10+ agents):** High lock churn, agents spend significant time blocked on reservations, incentive to "touch" files periodically just to hold the lock (over-adaptation)

**Fix:**
1. **Adaptive TTL** — start at 15min, extend to 30min if agent is actively editing related files (detect via file path clustering)
2. **Grace period** — if Agent A's reservation expires and Agent A tries to edit within 2 minutes, auto-renew instead of blocking (first-mover advantage)
3. **Explicit analysis** — model the steady-state lock distribution under different agent counts and TTL values (simulation or analytical model)

**Lens Applied:** Hysteresis, Simple Rules → Emergence, Oscillation, Over-Adaptation, BOTG

---

### 4. **P2 | SYS-4 | "P1: Post-Commit Sync" | Rebase-on-commit loop has unbounded amplification potential**

**Evidence:**
> "Interlock's PostToolUse:Bash hook detects `git commit` success → calls endpoint → triggers all other sessions' next PreToolUse to `git pull --rebase`"

The design specifies that a commit broadcast triggers *all other sessions* to rebase. But what if a rebase itself produces a commit (e.g., conflict resolution)?

**Problem (Causal Chain):**
1. Agent A commits → broadcasts to B, C, D
2. B, C, D each `git pull --rebase`
3. B's rebase produces a conflict, agent resolves it → creates a new commit
4. B's commit broadcasts to A, C, D
5. A, C, D rebase → C's rebase conflicts → C commits
6. C's commit broadcasts to A, B, D
7. **Loop continues** — each conflict resolution triggers another round of rebases

This is a **positive feedback loop** with no specified damping. The system could enter a *rebase storm* where agents spend more time rebasing than doing original work.

**Problem (Second-Order Effects):**
The document assumes rebases are cheap and non-conflicting. But:
- Rebases can fail (merge conflicts)
- Conflict resolution takes human time (agent must analyze + fix)
- Failed rebases leave dirty working trees, blocking further work
- If rebase failure rate is >0, the system's effective throughput *decreases* as agent count increases (more agents → more commits → more rebases → more conflicts → less work)

**Temporal Behavior (BOTG):**
- **T=0 (2 agents, disjoint files):** Rebases succeed instantly, no conflicts
- **T=3mo (5 agents, some shared files):** Occasional conflicts, manageable
- **T=6mo (10 agents, high code locality):** Frequent conflicts, rebase backlog accumulates, agents block waiting for clean tree

**Fix:**
1. **Damping mechanism** — introduce a cooldown: "if this session rebased in the last 60 seconds, queue the next rebase request instead of executing immediately"
2. **Conflict-aware backoff** — if a rebase produces conflicts, delay broadcasting the resolution commit by 30 seconds (gives other agents time to finish their current rebases)
3. **Explicit capacity analysis** — define the *commit rate threshold* beyond which rebase-on-commit breaks down, and either warn the user or switch to a batch-rebase strategy (e.g., "rebase every 5 minutes" instead of "rebase on every commit")

**Lens Applied:** Feedback Loops (reinforcing, unbounded), Causal Chain (second-order effects), Bullwhip Effect, BOTG

---

### 5. **P1 | SYS-5 | "P1: Work Partitioning" | Bead-agent binding creates preferential attachment to early claimers**

**Evidence:**
> "When `bd update <id> --status=in_progress` runs, record `INTERMUTE_AGENT_ID` in issue metadata. If another session tries to claim the same issue, warn via Intermute message."

The system uses *first-come-first-served* for bead assignment. But the document doesn't address:
- **What if Agent A claims a bead, works for 10 minutes, gets stuck, and abandons it (but doesn't release the claim)?**
- **What if Agent B could complete the bead in 5 minutes, but Agent A (less capable) holds the claim?**

**Problem (Preferential Attachment + Over-Adaptation):**
- Early-starting agents accumulate more beads
- If an agent is slow or gets stuck, other agents are blocked from helping
- The system has no mechanism to detect "stalled work" and reassign
- This creates **deadlock accumulation** — the bead queue grows because beads are claimed but not completed

**Problem (Schelling Trap):**
The warning ("another session tried to claim your bead") creates a *norm* of "don't touch claimed work." But if the original claimant is stuck, this norm prevents helpful intervention. The system needs an *escape hatch* — a way to signal "I'm stuck, someone else should take this" without requiring the stuck agent to proactively release.

**Temporal Behavior (BOTG):**
- **T=0 (1-2 agents, high trust):** Agents manually coordinate, no issues
- **T=3mo (5 agents, mixed capability):** Slow agents claim work, fast agents idle waiting for free beads, throughput below optimal
- **T=6mo (10+ agents, automated dispatch):** Significant bead hoarding, queue backlog, inefficient allocation

**Fix:**
1. **Timeout-based reassignment** — if a bead stays `in_progress` for >60 minutes with no file edits, auto-release the claim and notify the original agent
2. **Capability routing** — track agent performance (time-to-completion per bead type) and route complex beads to high-capability agents
3. **Explicit handoff protocol** — allow Agent B to *request* a claimed bead from Agent A, triggering a notification (A can accept or reject)

**Lens Applied:** Preferential Attachment, Schelling Traps, Over-Adaptation, Deadlock (accumulation), BOTG

---

### 6. **P2 | SYS-6 | "Phase 4: UX Polish" | Statusline update frequency vs. cognitive load tradeoff unspecified**

**Evidence:**
> "Interline statusline shows '2 agents: AgentA→src/foo.go, AgentB→tests/'. WebSocket subscription to Intermute reservation events. Update on reserve/release/commit."

The statusline updates on every reservation event. But:
- If 10 agents each edit 5 files in rapid sequence, that's 50 reservation events
- If the statusline redraws on every event, it creates visual churn
- If the statusline batches updates, it lags behind reality

**Problem (Pace Layer Mismatch):**
- **Agent work pace:** ~1 edit per 30 seconds (thinking → editing → committing)
- **Reservation event pace:** ~1 event per 5 seconds (auto-reserve on edit)
- **Human perception pace:** ~1 statusline check per 5-10 seconds (glance at status)

The statusline update frequency (event-driven, ~5sec) is faster than human perception frequency (~10sec) but slower than the event rate under load (multiple agents → multiple events per second). This creates either:
- **Laggy updates** (batch too much) → stale info
- **Jittery updates** (batch too little) → cognitive noise

**Problem (Unspecified Tradeoff):**
The document doesn't define the *update policy*. Should the statusline:
- Update immediately on every event (low latency, high jitter)?
- Debounce updates (e.g., "redraw at most once per 2 seconds")?
- Show diffs (e.g., "AgentB just reserved 3 new files" with a fade-out)?

**Fix:**
1. **Define update policy** — e.g., "debounce to 1 update per 2 seconds, show last N events"
2. **Adaptive frequency** — under high event rate (>10 events/min), switch from live updates to summary view ("5 active agents, 12 files reserved")
3. **User preference** — allow toggling between live mode (jittery, real-time) and digest mode (calm, batched)

**Lens Applied:** Pace Layers, BOTG (human vs. system time scales), Emergence (event frequency → UX degradation)

---

### 7. **P3 | SYS-7 | "Architecture Decision" | Agent Teams vs Intermute presents classic pace layer mismatch risk**

**Evidence:**
> "Recommendation: Build on Intermute for the coordination primitives (reservations, commit lock, messaging), but evaluate Agent Teams for the orchestration layer (task assignment, teammate awareness). They complement rather than compete."

The recommendation is sound, but the document underanalyzes the *integration risk* between a fast-moving external dependency (Agent Teams, experimental CC feature) and a stable internal system (Intermute).

**Problem (Pace Layers):**
- **Intermute:** Slow-changing (internal, you control release cadence)
- **Agent Teams:** Fast-changing (Anthropic controls, experimental, may change API/behavior weekly)
- **Integration layer:** Must adapt to Agent Teams changes while preserving Intermute stability

This is a classic **pace layer mismatch** — the fast layer (Agent Teams) could force breaking changes on the slow layer (Intermute). For example:
- Agent Teams v2 changes the task file format → Intermute's bead-agent binding breaks
- Agent Teams is deprecated → you've built integration code that now needs ripping out

**Problem (Crumple Zone):**
The design needs a *crumple zone* — an abstraction layer that absorbs Agent Teams changes without propagating them to Intermute. The recommendation doesn't specify this.

**Temporal Behavior (BOTG):**
- **T=0:** Agent Teams experimental, low investment, easy to swap out
- **T=3mo:** Deep integration, Agent Teams embedded in workflows
- **T=6mo:** Agent Teams API changes, requires refactor
- **T=12mo:** Agent Teams deprecated or goes GA with breaking changes → high migration cost

**Fix:**
1. **Adapter pattern** — create an `AgentCoordinator` interface with two implementations: `IntermuteBacked` and `AgentTeamsBacked`. Switch between them via config.
2. **Explicit feature flag** — "use Agent Teams if available, fall back to Intermute if not"
3. **Limit integration depth** — don't let Agent Teams become a *hard dependency* for Clavain workflows. Use it for UX (statusline, task list) but keep Intermute as the *source of truth* for reservations.

**Lens Applied:** Pace Layers, Crumple Zones, Hysteresis (integration depth → exit cost), BOTG

---

## Additional Observations (Not Findings, But Worth Noting)

### Open Questions Are Well-Chosen
The document's "Open Questions" section asks:
> "Commit lock granularity — project-level lock (simple) vs. file-set lock (allows parallel commits to disjoint files)?"

This is exactly the right systems question. File-set locking introduces *complex coordination* (need to detect disjoint file sets, resolve lock ordering to avoid deadlock) but could unlock parallelism. The tradeoff is between **system simplicity** (project-level lock, easy to reason about) and **system throughput** (file-set lock, higher capacity but more failure modes).

A follow-up analysis should model this as a *capacity planning* problem: "At what agent count does the project-level lock become the bottleneck, and is that threshold higher or lower than the complexity cost of file-set locking?"

### Agent Teams Evaluation Is Appropriately Deferred
The P2 item "Agent Teams Evaluation" is correctly scoped as "nice to have." The document resists the temptation to over-invest in an unstable dependency. This is good systems thinking — don't couple to a fast-changing layer until it stabilizes.

---

## Verdict: **Needs Changes**

The design is fundamentally sound but underspecifies the system's behavior under load and over time. The P1 findings (thundering herd on index refresh, TTL-based oscillation, rebase amplification, bead hoarding) represent real failure modes that will emerge at scale. The design should be extended with:

1. **Explicit load modeling** — what happens at 5, 10, 20 concurrent agents?
2. **Steady-state analysis** — what is the equilibrium behavior of the auto-reserve + broadcast loops?
3. **Damping mechanisms** — rate limits, backoff, adaptive TTLs
4. **Cleanup loops** — balance every creation loop (sessions, reservations, indices) with a cleanup loop

The P2 and P3 findings are quality-of-life issues that won't break the system but will degrade UX and maintainability if ignored.

**Recommendation:** Address SYS-1, SYS-3, SYS-4, SYS-5 before implementing Phase 1. These are not implementation bugs — they're *missing design constraints* that will be expensive to retrofit later.

---

<!-- flux-drive:complete -->
