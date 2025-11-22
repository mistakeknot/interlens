# Performance Optimization Stuck

## Problem ID
`code_performance-stuck`

## Domain
code

## Title
API Performance Stuck Despite Multiple Optimization Attempts

## Context
- SaaS platform with 5,000 daily active users
- Python/Django backend, PostgreSQL database
- Core API endpoint `/api/users/dashboard` averaging 350ms response time
- Team has spent 2 weeks trying optimizations
- Product team frustrated - UX suffers from slow load times

## Challenge
The `/api/users/dashboard` endpoint is too slow (350ms avg, 800ms p95). The team has tried:

1. ✅ Redis caching (improved 5%)
2. ✅ Database query optimization (improved 8%)
3. ✅ Added database indexes (improved 12%)
4. ✅ Code profiling and algorithm improvements (improved 3%)
5. ✅ Connection pooling tuning (improved 2%)

**Total improvement: ~30% (from 500ms to 350ms)**
**Still not acceptable (target: <150ms)**

The team is stuck. Every "obvious" optimization has been tried with diminishing returns.

## Constraints
- Cannot rewrite in different language/framework (6 months of technical debt)
- Database cannot be replaced (compliance/migration risk)
- Limited budget for infrastructure upgrades
- Must ship improvement in 2 weeks
- Cannot break existing API contract

## Success Criteria
A good solution:
- Identifies root cause of performance bottleneck
- Suggests actionable next steps (specific, testable)
- Explains why previous optimizations had limited impact
- Provides path to <150ms target
- Is feasible within constraints

## Prompt for Agent

```
Our API endpoint `/api/users/dashboard` is averaging 350ms response time.
We need it under 150ms but we're stuck.

We've already tried:
- Caching (Redis) → 5% improvement
- Database query optimization → 8% improvement
- Indexing → 12% improvement
- Code-level optimization → 3% improvement
- Connection pooling → 2% improvement

Total improvement is only ~30%. Still far from our <150ms target.

The team is frustrated. We keep optimizing the code and queries but
hitting diminishing returns. What are we missing?

Your role: Help us break through this performance plateau with a fresh perspective.
```

## Expected Lens Relevance

**High relevance:**
- **Pace Layering** - Fast layer (code) vs slow layer (architecture/schema)
- **System Boundaries** - Where are the actual boundaries? Cross-boundary calls?
- **Bottleneck Theory** - What's the actual constraint?
- **Leverage Points** - Where to intervene in the system?

**Medium relevance:**
- **Feedback Loops** - Are optimizations creating new bottlenecks?
- **Emergence** - System behavior emerging from component interactions
- **The Map Is Not the Territory** - Is profiling showing the real problem?

**Low relevance:**
- **Innovation Cascade** - Not really about innovation diffusion
- **Geometry of Dissent** - Not about team disagreement
- **Ritual and Ceremony** - Not about cultural practices

## Baseline Solution Pattern

WITHOUT linsenkasten, typical responses:

```
"Have you tried:
- Async processing
- CDN for static assets
- Horizontal scaling
- Microservices architecture
- Moving to GraphQL
- Using a faster database
- Rewriting in Go/Rust"
```

**Characteristics:**
- Suggests more tactics at same layer
- Focuses on technology changes
- Doesn't explain why current optimizations failed
- **Originality: 2-3/10** (generic advice)
- **Novelty: 2/10** (obvious suggestions)
- **Actionability: 4/10** (unclear which to try, many violate constraints)

## Target Solution Pattern

WITH linsenkasten (using Pace Layering + System Boundaries):

```
"I'm applying Pace Layering lens to this problem.

Observation: You've been optimizing the fast layer (code, queries, caching)
but the bottleneck might be in the slow layer (data model, architecture).

Evidence:
- Code optimizations show diminishing returns (<5% each)
- This pattern suggests fast-layer changes can't overcome slow-layer constraints
- Like optimizing a sports car's engine when it's stuck in mud

Hypothesis: The issue isn't code performance but architectural layer mismatch.

Testable predictions:
1. Profile across architectural layers, not just code execution time
   - Measure: DB query time, network latency, serialization, data fetching
2. Check if normalized schema optimized for writes but endpoint needs reads
3. Look for N+1 queries hidden in ORM (query optimization missed this)
4. Measure data transfer volume (might be fetching too much data)

Specific next steps:
1. Add distributed tracing (OpenTelemetry) to see full request journey
2. Profile at system boundaries: app→db, db→app, serialization
3. Examine the data model: is dashboard fetching from 15+ tables?
4. Consider: denormalized read model OR materialized view OR CQRS pattern

Why previous optimizations failed:
- Caching: Still fetching too much data from wrong layer
- Query optimization: Can't optimize queries that shouldn't exist
- Indexing: Helps slow layer but doesn't fix layer mismatch
- Code: Fast layer can't overcome slow layer constraints

The breakthrough: Move from optimizing code (fast) to redesigning data flow (slow).
```

**Characteristics:**
- Lens-based reframing (Pace Layering)
- Explains WHY previous attempts failed
- Specific, testable hypotheses
- Actionable next steps
- **Originality: 8/10** (architectural reframe, not just tactics)
- **Novelty: 8/10** (layer mismatch insight is non-obvious)
- **Actionability: 9/10** (specific steps, measurable, feasible)

## Evaluation Notes

**What makes this interesting:**
- Real problem pattern (diminishing returns on optimization)
- Tests whether agent can reframe from tactical to architectural
- Multiple lenses could apply (Pace Layering, System Boundaries, Bottleneck Theory)

**Creative leaps possible:**
- Recognizing fast vs slow layer distinction
- Seeing optimization pattern as evidence of wrong layer
- Connecting to data model design choices
- Suggesting CQRS/materialized views vs more caching

**What would surprise evaluators:**
- Agent doesn't just suggest more tactics
- Agent explains the optimization pattern (diminishing returns)
- Agent connects to architectural decisions made months/years ago
- Agent provides testable hypotheses (not just guesses)
- Agent uses lens language explicitly ("through Pace Layering I observe...")

**Scoring rubric:**

| Metric | 0-3 | 4-6 | 7-10 |
|--------|-----|-----|------|
| **Originality** | More tactics | Mentions architecture | Clear layer reframe |
| **Lens Relevance** | No lenses | Generic mention | Explicit application |
| **Explanation** | None | Partial | Full WHY previous failed |
| **Actionability** | Vague | Some specifics | Clear testable steps |
| **Novelty** | Obvious | Slight reframe | Non-obvious insight |
