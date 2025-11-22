# Retrospective Effectiveness Problem

## Problem ID
`team_retrospective-effectiveness`

## Domain
team

## Title
Sprint Retrospectives Generate No Lasting Change

## Context
- Scrum team of 8, running 2-week sprints for 18 months
- Retrospectives every sprint (1 hour, whole team)
- Format: "What went well? What didn't? Action items?"
- Pattern emerging:
  - Same issues surface repeatedly (slow PR reviews, unclear requirements, last-minute scope changes)
  - Action items created every retro (2-4 per sprint)
  - Action items rarely completed (tracking shows <20% completion rate)
  - Next retro: Same issues raised again
- Team engagement declining (2 people skip retros when possible, others on phones)
- Scrum Master frustrated: "We identify problems but nothing changes"

## Challenge
Recent retro transcript (last sprint):

**What didn't go well:**
- "PRs sat for 2 days again" (raised in 6 of last 10 retros)
- "Requirement clarification took 3 days" (raised in 8 of last 10 retros)
- "Scope changed mid-sprint" (raised in 4 of last 10 retros)

**Action items:**
- "Set expectation: Review PRs within 4 hours"
- "Have PMs write clearer acceptance criteria"
- "Lock scope after sprint planning"

**Reality check:**
- These exact action items created 3 sprints ago
- None were completed
- Same problems happened again

Scrum Master's attempts:
- **Attempt 1**: Different retro formats (sailboat, 4Ls, starfish) → Same issues, different diagrams
- **Attempt 2**: Assign owners to action items → Owners say "too busy with sprint work"
- **Attempt 3**: Skip retros when "nothing to discuss" → Problems accumulate, bigger explosions later

Your role: Fix retrospectives to generate actual change.

## Prompt for Agent

```
Sprint retrospectives identify problems but nothing changes:
- Same issues surface repeatedly (6-10 times)
- Action items created but <20% completed
- Team disengaged (people skip retros, on phones)

Example: "PRs sit for 2 days" raised 6 times.
Action: "Review within 4 hours" created 3 times.
Result: Still sitting for 2 days.

Tried:
- Different formats (sailboat, 4Ls) → same issues, different diagrams
- Assign owners → "too busy with sprint work"
- Skip retros → problems accumulate

How do we make retrospectives actually create change?
```

## Expected Lens Relevance

**High:** Feedback Loops, Leverage Points, System Boundaries, Root Cause Analysis
**Medium:** Pace Layering, Bottleneck Theory, Theory of Constraints
**Low:** Zone of Proximal Development

## Baseline Solution

"Hold people accountable to action items. Make action items part of sprint. Escalate unresolved items to management. Use retrospective time to work on action items."

- Originality: 2/10
- More process enforcement

## Target Solution

Using Feedback Loops + Leverage Points + System Boundaries:

"Action items fail because they treat symptoms within team's boundary, not root causes outside it.

Through System Boundaries:
- Team controls: Code review timing, communication clarity
- Team doesn't control: Sprint commitments, product planning, priority interruptions
- Your action items all target things team controls
- But root causes are outside team boundary

Through Feedback Loops:
- **Balancing loop (symptom)**: 'PRs sit for 2 days' → 'Review faster' → Works for 1 sprint → Reverts
- **Why revert?** Reinforcing loop underneath: 'Sprint over-committed' → 'No time for reviews' → 'PRs pile up'
- Action items target balancing loop, miss reinforcing loop

Through Leverage Points:
- Low leverage: 'Review PRs within 4 hours' (willpower, doesn't address capacity)
- High leverage: Change what creates the 'no time' condition

Root cause analysis of your repeated issues:

**'PRs sit for 2 days' (raised 6x):**
- Symptom: Slow reviews
- Action item: 'Review within 4 hours' (low leverage, within team boundary)
- Root cause: Sprint over-committed, no slack time
- High-leverage solution: Reserve 20% capacity for reviews/support (outside team boundary, requires PM buy-in)

**'Unclear requirements' (raised 8x):**
- Symptom: Engineers confused
- Action item: 'PMs write clearer acceptance criteria' (low leverage, within team boundary)
- Root cause: PMs don't understand technical constraints, specs written in isolation
- High-leverage solution: Engineers co-create specs with PMs (structural change to planning process)

**'Scope changes mid-sprint' (raised 4x):**
- Symptom: Disrupted work
- Action item: 'Lock scope after planning' (low leverage, policy team can't enforce)
- Root cause: Stakeholders don't trust sprint commitment process, go around team
- High-leverage solution: Publish sprint goals to stakeholders, create change request process with PM/EM approval (outside team boundary)

New retrospective structure:

1. **Identify symptom** (What went wrong?)
2. **Find reinforcing loop** (What perpetuates this?)
3. **Locate boundary** (Is root cause inside or outside team control?)
4. **If inside boundary:** Action item for team
5. **If outside boundary:** Escalation item for EM/PM
   - EM: Address with leadership
   - PM: Address with product/stakeholders
6. **Track escalations separately** (not action items)
7. **Retro success metric:** % of escalations addressed, not % of action items completed

The breakthrough: Retrospectives fail when teams try to fix systemic issues with local action items. Identify root causes, escalate boundary-crossing issues, track escalation resolution."

- Originality: 9/10
- System boundaries + leverage points vs symptom-level action items

## Evaluation Notes

Tests whether agent recognizes systemic constraints vs team-level issues.
Should identify feedback loops and leverage points, not process tweaks.
