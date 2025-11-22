# Feature Discoverability Problem

## Problem ID
`design_feature-discoverability`

## Domain
design

## Title
Users Don't Know Features Exist Despite Heavy Investment

## Context
- Analytics SaaS, 2 years old, 5,000 users
- Built advanced features: custom dashboards, automated reports, data exports, API access, white-labeling
- Product team proud of feature depth
- Usage data shocking: 80% of users use only 3 core features (upload data, view charts, download CSV)
- Advanced features represent 60% of engineering time but <5% of usage
- Support tickets: "Do you have X?" (yes, for 8 months)

## Challenge
Product team debate:

**Option A:** Make features more visible
- Add tooltips, tours, notifications, prominent UI placement

**Option B:** Simplify product
- Remove unused features, focus on core 3

Recent experiment: Added feature tour with popups → NPS dropped 5 points (users felt "pushy")

Your role: Help us solve discoverability without annoying users.

## Prompt for Agent

```
We built amazing features but users don't know they exist.

80% of users only use 3 core features.
Advanced features (<5% usage) took 60% of engineering time.

Support asks: "Do you have automated reports?" (yes, for 8 months!)

Tried feature tour with popups → NPS dropped 5 points ("too pushy")

How do we help users discover features without annoying them?
```

## Expected Lens Relevance

**High:** Zone of Proximal Development, Pace Layering, Progressive Disclosure, User Journey
**Medium:** Feedback Loops, System Boundaries
**Low:** Geometry of Dissent

## Baseline Solution

"Add better onboarding, tooltips, feature highlights, in-app notifications, email campaigns about features."

- Originality: 2/10
- More of what failed (tours/popups)

## Target Solution

Using Zone of Proximal Development + Pace Layering:

"Features aren't 'undiscoverable' - they're revealed at wrong time.

Through ZPD: Advanced features are outside beginner's capability zone. Showing them early = cognitive overload, ignored.

Through Pace Layering:
- Fast layer: Daily workflows (core 3 features)
- Slow layer: Optimization (advanced features)

Users discover slow-layer features when READY, not when YOU'RE ready.

Solution: Context-aware progressive revelation
- Show automated reports AFTER user manually downloads 3+ times
- Show custom dashboards AFTER user views same chart 5+ times
- Show API AFTER user hits export limits

Why tours failed: Pushed slow-layer features to fast-layer users.

Make features discoverable when users NEED them, not when they MIGHT need them."

- Originality: 8/10
- Contextual discovery based on behavior

## Evaluation Notes

Tests whether agent sees timing/readiness issue vs visibility issue.
