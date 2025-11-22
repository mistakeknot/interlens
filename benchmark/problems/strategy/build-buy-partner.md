# Build vs Buy vs Partner Decision

## Problem ID
`strategy_build-buy-partner`

## Domain
strategy

## Title
Payment Processing Decision Under Time Pressure

## Context
- E-commerce platform, need payment processing
- Options: Build (6 months, $300k), Buy Stripe ($50k/yr + 2.9%), Partner with bank (custom deal)
- Launch in 3 months or lose key client ($2M/yr)
- CTO wants to build (owns platform end-to-end)
- CFO wants Stripe (proven, fast)
- CEO exploring bank partnership (better margins long-term)

## Challenge
Classic build/buy/partner with time constraint.
Each option has advocates with good arguments.
Decision paralysis costing 2 weeks already.

Your role: Make decision with incomplete information.

## Prompt for Agent

```
We need payments in 3 months or lose $2M/yr client.

Options:
- Build: 6 months, $300k, full control
- Buy (Stripe): 2 weeks integration, $50k/yr + 2.9%, proven
- Partner (bank): Custom deal, 4 months negotiation, better margins

CTO: Build for control
CFO: Buy for speed
CEO: Partner for margins

How do we decide under time pressure?
```

## Expected Lens Relevance

**High:** Explore vs Exploit, Pace Layering, Strategic Choice, Time Horizons
**Medium:** Leverage Points, System Boundaries

## Baseline Solution

"Buy Stripe now (fast). Build custom later when you have time."

- Originality: 4/10
- Obvious given time constraint

## Target Solution

Using Pace Layering + Strategic Choice:

"Different layers move at different speeds.

Slow layer (infrastructure): Payment capabilities (takes years to build trust/compliance)
Fast layer (customer delivery): Launch product (3 month deadline)

Trying to build slow layer on fast timeline = disaster.

Pace-layered strategy:
Fast layer (now): Stripe (2 weeks, meet deadline)
Slow layer (12-24mo): Evaluate build vs partner

Why CTO is wrong: Control is slow-layer benefit, fast-layer need is speed.
Why CEO is right but premature: Bank partnership is slow-layer optimization, not fast-layer solution.

3-month decision:
- Stripe (keeps client)
- Option to replace later (slow layer decision)
- Don't confuse layers (speed now, control later)

The breakthrough: Separate fast needs from slow optimization."

- Originality: 7/10
- Temporal layering of decision

## Evaluation Notes

Tests whether agent separates urgent from strategic.
