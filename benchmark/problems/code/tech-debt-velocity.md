# Tech Debt vs Feature Velocity

## Problem ID
`code_tech-debt-velocity`

## Domain
code

## Title
Team Slowing Down Despite Working Harder

## Context
- SaaS product, 2.5 years in production
- Team of 8 engineers
- Used to ship 5-6 features per quarter
- Last 2 quarters: only 2-3 features shipped
- Everyone working more hours, but output decreasing
- Codebase growing: 80k → 180k LOC over 18 months
- Test suite takes 45 minutes to run
- Deployment process fragile (manual steps, occasional rollbacks)

## Challenge
Product team is frustrated: "Why is engineering so slow now?"

Engineering team is exhausted: "We spend all our time on bugs and firefighting."

Recent sprint retrospective revealed:
- 60% of sprint time spent on bug fixes and production issues
- 25% on "paying down technical debt" (refactoring, improving tests)
- 15% on new features

CTO's dilemma:
- **Option A:** Stop new features for 2 months, focus purely on tech debt
  - Product team will revolt
  - Risk losing customers to competitors

- **Option B:** Push through, keep shipping features
  - Velocity will likely get worse
  - Risk of major outage increases

Both options feel like losing. Team is stuck.

## Constraints
- Cannot hire more engineers (budget frozen)
- Cannot extend deadlines (competitive pressure)
- Cannot reduce quality (customer satisfaction already declining)
- Must show progress to investors (metrics: features shipped + reliability)

## Success Criteria
A good solution:
- Breaks the "tech debt vs features" false dichotomy
- Provides sustainable approach (not just short-term fix)
- Addresses both product needs AND engineering health
- Realistic given constraints
- Specific, actionable steps

## Prompt for Agent

```
Our engineering velocity is collapsing.

Used to ship: 5-6 features/quarter
Now shipping: 2-3 features/quarter

Team analysis:
- 60% time on bugs/firefighting
- 25% time on technical debt
- 15% time on new features

Dilemma:
- Stop features for 2 months to fix tech debt? (Product team says no)
- Keep pushing features? (Velocity will get worse)

Both options feel like losing. We're stuck in a vicious cycle.

Your role: Help us break out of this tech debt trap.
```

## Expected Lens Relevance

**High relevance:**
- **Explore vs Exploit** - New features (explore) vs stability (exploit)
- **Pace Layering** - Fast (features) vs slow (infrastructure)
- **Feedback Loops** - Vicious cycle of debt → slowdown → more debt
- **Leverage Points** - Where to intervene to break cycle
- **System Boundaries** - What counts as "feature" vs "infrastructure"

**Medium relevance:**
- **Bottleneck Theory** - What's the real constraint?
- **Innovation Cascade** - How does tech debt spread?
- **The Map Is Not the Territory** - Are metrics hiding the problem?

**Low relevance:**
- **Geometry of Dissent** - Not primarily about disagreement
- **Ritual and Ceremony** - Not cultural issue

## Baseline Solution Pattern

WITHOUT linsenkasten:

```
"Stop all feature work for 2-4 weeks. Focus on:
- Improve test suite speed
- Automate deployment
- Refactor core modules
- Fix top 10 bugs

Then resume feature development."

OR:

"Allocate 20% of each sprint to tech debt.
Continue this until debt is manageable."

OR:

"Rewrite the worst modules from scratch."
```

**Characteristics:**
- Time-based allocation (stop features OR dedicate %)
- Treats tech debt as separate from features
- Doesn't address why debt accumulated
- **Originality: 2-3/10**
- **Novelty: 1-2/10**
- **Actionability: 6/10** (clear but doesn't resolve core tension)

## Target Solution Pattern

WITH linsenkasten (using Feedback Loops + Pace Layering + Leverage Points):

```
"Applying Feedback Loops + Pace Layering + Leverage Points:

Key insight: You're not in tech debt trap. You're in a feedback loop trap.

The vicious cycle:
1. Slow velocity → pressure to ship faster
2. Cut corners to ship → create tech debt
3. Debt slows you down → even more pressure
4. Repeat → death spiral

Classic reinforcing feedback loop. Time-based solutions (2 months on debt) don't break the loop.

Through Pace Layering lens:
- Your codebase has layers moving at different speeds
- Fast layer (features) keeps accelerating
- Slow layer (core platform) is crumbling under load
- Fast layer now DEPENDS on broken slow layer (hence the slowdown)

Leverage point: Change what counts as "shipping"

Current definition of "done":
- Feature works in production

New definition of "done":
- Feature works
- Tests added
- Documentation updated
- No new flaky tests
- Deployment remains one-click

This shifts work from "later tech debt" to "part of the feature."

Pace-layered approach:

Slow layer (infrastructure - monthly pace):
- One foundational improvement per month
- Month 1: Test suite parallelization (45min → 10min)
- Month 2: Deployment automation (one-click, zero-knowledge)
- Month 3: Observability (detect issues before customers)

Fast layer (features - weekly pace):
- EVERY feature includes its infrastructure
- Feature requires flaky test? Fix the test infrastructure first
- Feature requires manual deploy step? Automate it as part of feature
- Feature creates tech debt? That debt is part of story points

This is NOT "20% on tech debt." It's "100% on sustainable shipping."

Why this breaks the loop:
- Slow layer improvements multiply fast layer productivity
- Test suite 10min (not 45min) = 35min/day saved = +30% velocity
- One-click deploy = no rollback firefighting = more feature time
- Infrastructure work ENABLES features (not competes with them)

Specific next steps:

Week 1:
- Measure: Where does time actually go? (not estimation, actual tracking)
- Identify: What slow-layer issues block multiple features?

Week 2:
- Pick ONE slow-layer issue (probably test suite speed)
- Fix it as a "feature" (with story points, in sprint)
- Measure velocity improvement

Week 3-4:
- Redefine "done" to include sustainability
- Reject features that don't meet definition
- Track both features shipped AND platform improvements

Month 2:
- Pick next slow-layer issue
- Repeat

The breakthrough: Tech debt isn't something to "pay down later." It's failure to build the right slow layer that supports the fast layer. Fix the layers, fix the velocity.
```

**Characteristics:**
- System dynamics (feedback loops, not time allocation)
- Pace layering (different speeds for different parts)
- Leverage points (change definition of "done")
- Both/and (not features OR debt, but sustainable shipping)
- **Originality: 9/10**
- **Novelty: 9/10**
- **Actionability: 8/10**

## Evaluation Notes

**What makes this interesting:**
- Extremely common problem in software teams
- Tests whether agent can see system dynamics
- False choice (features vs debt) needs reframing

**Creative leaps possible:**
- Recognizing feedback loop (vicious cycle)
- Pace layering insight (fast depends on slow)
- Leverage point: change what "shipping" means
- Tech debt as "wrong pace" not "laziness"
- Infrastructure work ENABLES features (not competes)

**What would surprise evaluators:**
- Doesn't pick "stop features" or "allocate 20%"
- Explains the death spiral mechanism
- Redefines problem (not debt, but layers)
- Concrete leverage point (definition of done)
- Measures that lead to insight

**Scoring rubric:**

| Metric | 0-3 | 4-6 | 7-10 |
|--------|-----|-----|------|
| **Originality** | Time allocation | Hybrid approach | System dynamics reframe |
| **Lens Relevance** | No lenses | Mentions feedback | Explicit loop + layers |
| **Explanation** | None | Partial | Full cycle mechanism |
| **Actionability** | Vague | Some specifics | Concrete leverage points |
| **Novelty** | Obvious | Slight insight | Non-obvious reframe |
