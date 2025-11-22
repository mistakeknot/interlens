# Market Positioning Decision

## Problem ID
`strategy_market-positioning`

## Domain
strategy

## Title
Stuck Between Enterprise and SMB Market Positioning

## Context
- CRM SaaS, 18 months old
- Started targeting SMBs (10-50 employees)
- Average deal: $200/mo, sales cycle: 2 weeks
- Recently landed 3 enterprise clients (500+ employees)
- Enterprise average: $5,000/mo, sales cycle: 4 months
- Product works for both but roadmap prioritizes one or other

## Challenge
Board pushing for enterprise (higher revenue, prestige).
Current customers (SMBs) feeling neglected (recent features too complex).
Sales team split: SMB reps easy wins, enterprise reps chasing whales.
Engineering: enterprise features require 3x effort vs SMB.

Data: SMB churn at 12% (was 8%), enterprises sticky but slow to close.

Your role: Choose market positioning that doesn't kill current business.

## Prompt for Agent

```
We're stuck between two markets:
- SMBs: $200/mo, 2 week sales, 500 customers, 12% churn (rising)
- Enterprise: $5k/mo, 4 month sales, 3 customers, complex needs

Board wants enterprise focus (higher revenue).
SMB customers complaining features too complex.
Engineering can't serve both (enterprise needs 3x effort).

How do we choose without killing current revenue?
```

## Expected Lens Relevance

**High:** Explore vs Exploit, Pace Layering, System Boundaries, Strategic Choice
**Medium:** Innovation Cascade, Feedback Loops
**Low:** Zone of Proximal Development

## Baseline Solution

"Pick enterprise (higher revenue potential) or pick SMB (proven market).

Or: Serve both with different product tiers."

- Originality: 2/10
- Doesn't address transition risk

## Target Solution

Using Pace Layering + Explore vs Exploit:

"Don't choose markets. Choose pace strategy.

Through Pace Layering:
- Fast layer: SMB revenue (pays bills TODAY)
- Slow layer: Enterprise positioning (future growth)

Through Explore vs Exploit:
- SMB = exploit (known market, cash flow)
- Enterprise = explore (learning, growth potential)

Current problem: You're treating them as either/or when they're different time horizons.

Pace-layered strategy:
Slow layer (12-24 months): Build enterprise capabilities
- Dedicated enterprise team (2 engineers)
- Enterprise features in separate track
- Doesn't block SMB roadmap

Fast layer (weekly/monthly): Optimize SMB experience
- Simplify UI for SMBs (not more complex)
- Quick wins, fast iteration
- Maintain 8% churn

Why SMB churn rose: Enterprise features leaked into SMB product (pace confusion).

Solution: Separate fast/slow explicitly
- SMB product stays simple (fast-layer)
- Enterprise gets advanced features (slow-layer)
- Shared core platform (foundation)

The breakthrough: Serve both by acknowledging different time scales."

- Originality: 8/10
- Temporal strategy vs market choice

## Evaluation Notes

Tests whether agent sees time-based vs market-based strategy.
