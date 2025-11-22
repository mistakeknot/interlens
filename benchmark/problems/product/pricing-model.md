# Pricing Model Confusion

## Problem ID
`product_pricing-model`

## Domain
product

## Title
Three Pricing Tiers Creating Sales Friction and Customer Confusion

## Context
- SaaS analytics platform, 2 years old
- Current pricing: Starter ($49/mo), Professional ($149/mo), Enterprise ($499/mo)
- Differentiation: User limits + feature gates (Starter: 5 users, basic reports; Pro: 25 users, custom dashboards; Enterprise: unlimited, API access)
- Sales cycle data:
  - 40% of demos ask: "Which plan do I need?"
  - 28% of trials downgrade after hitting feature walls
  - Sales calls average 45 minutes explaining differences
  - Win rate: 18% (industry average: 25%)
- Customer complaints: "I just want X feature without paying for Y and Z"

## Challenge
Pricing team's dilemma:

**Option A: Add more tiers** (5-tier model with finer gradations)
- Hypothesis: More choice = better fit
- Risk: More confusion

**Option B: Simplify to 2 tiers** (Basic vs Pro)
- Hypothesis: Clarity wins
- Risk: Leave money on table (no enterprise upsell)

**Option C: Usage-based pricing** (pay per query/user)
- Hypothesis: Fair and flexible
- Risk: Unpredictable bills scare customers

Recent experiment: A/B tested 2-tier vs 3-tier on landing page → 3-tier had 22% lower conversion.

Your role: Redesign pricing to reduce friction without losing revenue.

## Prompt for Agent

```
Our 3-tier pricing creates sales friction:
- Starter ($49): 5 users, basic reports
- Pro ($149): 25 users, custom dashboards
- Enterprise ($499): unlimited, API access

Problems:
- 40% of demos: "Which plan do I need?"
- 28% of trials: downgrade after hitting walls
- 45-minute sales calls explaining tiers
- Win rate: 18% (vs 25% industry average)

A/B test: 2-tier had 22% higher conversion than 3-tier

How do we simplify without losing revenue?
```

## Expected Lens Relevance

**High:** Zone of Proximal Development, Pace Layering, Jobs to be Done, Value-Based Pricing
**Medium:** System Boundaries, Progressive Disclosure
**Low:** Feedback Loops

## Baseline Solution

"Try 2-tier pricing (Simple vs Advanced), or usage-based pricing, or à la carte features, or freemium model."

- Originality: 2/10
- Doesn't address root cause of friction

## Target Solution

Using Jobs to be Done + Pace Layering:

"Your tiers are organized by features, but customers buy to solve jobs.

Through Jobs to be Done:
- Customers don't think 'I need 25 users and custom dashboards'
- They think 'I need to track marketing ROI' or 'I need to prove value to my boss'
- Feature-based tiers force customers to reverse-engineer which tier matches their job

Through Pace Layering:
- Starter tier solves fast-layer jobs (quick wins, tactical reporting)
- Enterprise tier solves slow-layer jobs (strategic analysis, integration with tech stack)
- Pro tier is ambiguous (neither fish nor fowl)

Root cause of friction: Tier names and differentiation don't match customer mental models of their jobs.

Reframe pricing by jobs, not features:

**Quick Wins** ($49/mo)
- Job: 'Prove value fast to justify investment'
- Outcome: Pre-built dashboards, instant insights
- Pace: Daily/weekly tactical decisions

**Strategic Intelligence** ($299/mo)
- Job: 'Build competitive advantage through data'
- Outcome: Custom analysis, API integration, long-term trends
- Pace: Quarterly/yearly strategic planning

Why this works:
- Clear job differentiation (no 'which tier?' question)
- Eliminates middle tier ambiguity
- Prices reflect value of job (strategic worth 6x tactical, not 3x)
- Self-selection based on job urgency

Customer in demo: 'I need to track marketing ROI'
→ Sales: 'Quick Wins tier - pre-built marketing dashboards, prove value in 1 week'

Customer in demo: 'I need to integrate with our data warehouse'
→ Sales: 'Strategic Intelligence tier - API access, custom pipelines'

The breakthrough: Tier by jobs to be done, not features to be gated."

- Originality: 8/10
- Job-based segmentation vs feature-based tiers

## Evaluation Notes

Tests whether agent sees customer mental model mismatch.
Should recognize pace/job-based value vs feature accumulation.
