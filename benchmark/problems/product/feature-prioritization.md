# Feature Prioritization Paralysis

## Problem ID
`product_feature-prioritization`

## Domain
product

## Title
Roadmap Deadlock Between Customer Requests and Strategic Vision

## Context
- Project management SaaS, 18 months old, 3,000 customers
- Backlog: 200+ feature requests
- Product team using RICE scoring (Reach, Impact, Confidence, Effort)
- Top 10 RICE scores: All customer-requested incremental improvements
- Strategic bets (AI assistant, workflow automation, mobile app): Mid-tier RICE scores
- CEO wants strategic bets (differentiation, future growth)
- Head of CS wants customer requests (retention, NPS)
- Engineering wants to reduce tech debt (not in roadmap at all)

## Challenge
Product manager's roadmap paralysis:

**Q1 Roadmap Options**:
- **Option A**: Top 10 RICE scores (all customer requests)
  - Pros: High certainty, customer delight
  - Cons: Competitor also has these, no differentiation

- **Option B**: Strategic bets (AI assistant, automation)
  - Pros: Differentiation, future positioning
  - Cons: High risk, might not land, customers didn't ask for it

- **Option C**: 50/50 split
  - Pros: Balanced
  - Cons: Under-resource both, strategic bets need focus

Recent pressure: Top customer threatened to churn if specific feature not built (timeline entry editing). It's #3 on RICE. But it doesn't advance strategic vision.

Your role: Break the prioritization framework deadlock.

## Prompt for Agent

```
We use RICE scoring for roadmap prioritization.

Problem: Top 10 RICE scores are all customer requests (incremental).
Strategic bets (AI assistant, automation) are mid-tier RICE.

CEO wants strategic bets (differentiation).
CS wants customer requests (retention).
Engineering wants tech debt time (not scored at all).

Top customer threatening churn if we don't build their request (#3 RICE).

How do we prioritize when framework says one thing, strategy says another?
```

## Expected Lens Relevance

**High:** Explore vs Exploit, Pace Layering, Innovation Portfolio, Time Horizons
**Medium:** Leverage Points, Feedback Loops, Strategic Choice
**Low:** Zone of Proximal Development

## Baseline Solution

"Split roadmap: 70% customer requests, 30% strategic bets. Or use different framework (ICE, WSJF). Or let CEO override framework."

- Originality: 3/10
- Doesn't resolve underlying tension

## Target Solution

Using Explore vs Exploit + Pace Layering + Innovation Portfolio:

"RICE optimizes for exploit (known value). You also need explore (unknown value). Single framework can't serve both.

Through Explore vs Exploit:
- Customer requests = exploit (proven demand, incremental value)
- Strategic bets = explore (uncertain demand, transformational potential)
- Tech debt = sustain (enables future velocity)

Through Pace Layering:
- Customer requests = fast layer (quarterly satisfaction, retention)
- Strategic bets = slow layer (2-year differentiation, market position)
- Tech debt = foundation layer (enables all other layers)

Current problem: You're using fast-layer metrics (RICE: reach/impact NOW) to evaluate slow-layer bets (strategic value in 2 years).

Solution: Portfolio approach with explicit time/risk allocation

**Fast Layer (50% capacity): Exploit**
- RICE-scored customer requests
- Quarterly NPS/retention impact
- High certainty, incremental value
- Includes top customer's churn-risk feature

**Slow Layer (35% capacity): Explore**
- Strategic bets (AI assistant, automation)
- 2-year competitive positioning
- High uncertainty, transformational potential
- NOT RICE-scored (use different criteria: strategic fit, learning value)

**Foundation Layer (15% capacity): Sustain**
- Tech debt, infrastructure, performance
- Enables future velocity
- Scored by: 'Does this unlock future features?'

Why customer request AND strategic bet:
- Fast layer keeps business running (retention, cash flow)
- Slow layer builds future (differentiation, growth)
- Foundation layer prevents collapse (tech debt bankruptcy)

For top customer's request (#3 RICE):
- Fast layer allocation: Yes, build it (retention is fast-layer job)
- Doesn't conflict with AI assistant (slow-layer job)

The breakthrough: Match prioritization framework to time horizon. RICE for fast, strategic fit for slow, velocity impact for foundation."

- Originality: 9/10
- Portfolio approach with layered frameworks vs single framework tyranny

## Evaluation Notes

Tests whether agent sees explore/exploit and time horizon tensions.
Should recognize framework applicability boundaries.
