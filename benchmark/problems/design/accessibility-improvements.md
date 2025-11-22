# Accessibility Improvements

## Problem ID
`design_accessibility-improvements`

## Domain
design

## Title
Accessibility Compliance vs Product Velocity Tension

## Context
- B2B SaaS selling to enterprises
- New client requires WCAG 2.1 AA compliance (accessibility standards)
- Current product: fails automated tests (200+ issues)
- Accessibility audit: 6-8 weeks of work estimated
- Product roadmap: 3 major features committed to other clients
- Engineering team: no accessibility expertise
- Deadline: 12 weeks to both fix accessibility AND ship features

## Challenge
Product manager's dilemma:
- Stop feature work for 6-8 weeks → miss commitments to other clients
- Ignore accessibility → lose $500k/year enterprise deal
- Do both → team will burn out, quality will suffer

CTO suggests: "Hire accessibility consultant, do it properly"
- Cost: $80k
- Timeline: Still 6-8 weeks
- Doesn't solve feature velocity problem

Your role: Break through this impossible tradeoff.

## Prompt for Agent

```
We need WCAG 2.1 AA compliance for major deal ($500k/year).

Current state: 200+ accessibility issues
Fix timeline: 6-8 weeks of engineering time

But we also committed to 3 major features for other clients (same 12-week window).

Can't do both. Can't stop either.

How do we solve this impossible constraint?
```

## Expected Lens Relevance

**High:** Pace Layering, Leverage Points, Explore vs Exploit, System Boundaries
**Medium:** Bottleneck Theory, Feedback Loops
**Low:** Innovation Cascade

## Baseline Solution

"Hire contractors to fix accessibility while team ships features.

Or: Renegotiate timelines with one client.

Or: Work overtime/weekends to do both."

- Originality: 2/10
- Doesn't solve constraint (money, time, burnout)

## Target Solution

Using Pace Layering + Leverage Points:

"This isn't accessibility vs features. It's slow-layer debt preventing fast-layer velocity.

Through Pace Layering:
- Slow layer: UI component library, design system (should be accessible by default)
- Fast layer: Features built on components

Root cause: Fast layer (features) built without accessible slow layer (components).

Current approach: Fix 200 issues = bandaids on broken foundation.

Leverage point: Fix the slow layer (component library) once.

Proposal:
Week 1-2: Audit components (not whole app)
- Identify: 15-20 base components used everywhere
- Fix: Make these WCAG compliant
- Document: Accessibility patterns for team

Week 3-12: Build features using compliant components
- New features start accessible
- Old features gradually replaced as components used

Why this works:
- Fixes slow layer (multiplies across all features)
- Team learns accessibility through components (skill building)
- Features continue (using new components)
- 200 issues become 20 component fixes

The breakthrough: Don't fix accessibility issues. Fix the layer that creates them."

- Originality: 9/10
- Systemic solution vs tactical fixes

## Evaluation Notes

Tests whether agent sees root cause (component layer) vs symptoms (200 issues).
Creative leap: Fix foundation not features.
