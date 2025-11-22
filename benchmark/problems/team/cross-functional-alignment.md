# Cross-Functional Alignment Failure

## Problem ID
`team_cross-functional-alignment`

## Domain
team

## Title
Product, Engineering, and Design Keep Building Wrong Things

## Context
- Startup, 40 people, product-led growth
- Organized into cross-functional squads (3 squads of 8-10 people each)
- Each squad: PM, Designer, 5-6 Engineers, Data Analyst
- Problem: Squads ship features that don't integrate, duplicate work, conflict with each other
- Recent examples:
  - Squad A built CSV export, Squad B built Excel export (same sprint, neither knew)
  - Squad C's new navigation broke Squad A's feature (found in production)
  - Design system diverging (each designer making different components)
  - Engineering shared libraries: no ownership, conflicting patterns

## Challenge
Leadership team's coordination attempts:

**Attempt 1: Weekly cross-squad sync**
- 1-hour meeting, all PMs + designers + tech leads
- Result: Information overload, no decisions made

**Attempt 2: Central roadmap planning**
- Quarterly planning with all squads
- Result: 2-day planning session, roadmap obsolete in 3 weeks

**Attempt 3: Guild structure**
- Engineering guild, design guild, PM guild (meet biweekly)
- Result: More meetings, still misaligned

**Attempt 4: Shared Notion wiki**
- "Document everything, check wiki before building"
- Result: Wiki ignored, nobody reads it

Recent crisis: Customer-facing feature required 3 squads to coordinate. Took 8 weeks (estimated 3 weeks). Each squad's piece worked in isolation but integration failed 4 times.

Your role: Fix cross-functional alignment without killing squad autonomy.

## Prompt for Agent

```
3 cross-functional squads keep building wrong things:
- Duplicate work (CSV + Excel export, same sprint)
- Breaking each other (Squad C broke Squad A's feature)
- No integration (8-week feature across 3 squads, estimated 3 weeks)

Tried:
- Weekly cross-squad sync → info overload
- Quarterly planning → roadmap obsolete in 3 weeks
- Guild structure → more meetings, still misaligned
- Shared wiki → nobody reads it

How do we coordinate squads without killing autonomy?
```

## Expected Lens Relevance

**High:** Pace Layering, System Boundaries, Conway's Law, Leverage Points
**Medium:** Feedback Loops, Communication Patterns, Explore vs Exploit
**Low:** Zone of Proximal Development

## Baseline Solution

"Improve communication, clearer documentation, better planning, architectural review board, microservices with clear contracts."

- Originality: 2/10
- More process, doesn't address structure

## Target Solution

Using Pace Layering + Conway's Law + System Boundaries:

"Squads optimized for fast-layer autonomy. Integration is slow-layer concern. Your structure creates misalignment by design.

Through Conway's Law:
- Organization structure determines system architecture
- 3 autonomous squads → 3 separate systems (not intentional architecture)
- No architectural coherence because no organizational coherence at that layer

Through Pace Layering:
- Fast layer (sprints): Squads ship features independently (good autonomy)
- Slow layer (quarters): Platform, design system, shared components (no ownership)
- Foundation layer (years): Architecture, technical standards (nobody governing)

Root cause: Squads own fast layer, but nobody owns slow/foundation layers.

Solution: Pace-layered ownership model

**Fast Layer: Squad Autonomy** (2-week sprints)
- Squads build features for their domain
- Minimal coordination needed
- Keep current structure

**Slow Layer: Platform Team** (quarterly/yearly)
- NEW: 4-person platform team (2 engineers, 1 designer, 1 PM)
- Owns: Design system, shared components, integration patterns
- Squads are CUSTOMERS of platform team
- Platform team: 'Build the tools squads need to stay autonomous'

**Foundation Layer: Architecture Guild** (biannual)
- Tech leads + architects (not whole guild)
- Sets: API standards, data patterns, deployment practices
- Meets quarterly for 2-hour decisions (not biweekly info-sharing)

How this fixes your problems:

**CSV/Excel duplicate work:**
- Platform team provides: 'Export Component' (CSV/Excel/JSON options)
- Squads use component instead of building exports

**Squad C breaks Squad A:**
- Platform team owns: Integration testing, contract testing
- Squads can't deploy if contracts break

**Design system diverging:**
- Platform designer owns: Component library
- Squad designers customize within system, not invent new patterns

**8-week 3-squad feature:**
- Platform PM: Coordinates cross-squad epics (rare)
- Squads: Own their domain's piece
- Platform team: Owns integration layer

The breakthrough: Layer ownership by time scale. Squads own fast. Platform owns slow. Architecture guild owns foundation. Your current structure has nobody owning slow/foundation."

- Originality: 9/10
- Pace-layered ownership vs flat squad autonomy

## Evaluation Notes

Tests whether agent sees organizational structure vs process gap.
Should identify ownership vacuum at slow/foundation layers.
