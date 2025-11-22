# Engagement Decline Problem

## Problem ID
`product_engagement-decline`

## Domain
product

## Title
Weekly Active Users Dropping Despite New Features

## Context
- B2B productivity SaaS, 15,000 users
- Launched 4 major features in last 6 months (team chat, file sharing, video calls, integrations)
- WAU (Weekly Active Users): dropped from 78% to 62% over same period
- DAU/WAU ratio: dropped from 0.45 to 0.31 (users engaging less frequently)
- Support tickets: down 20% (fewer questions about new features)
- Survey feedback: "Too many features", "Don't know what to use", "Feels bloated"
- Product team response: "We built what customers requested!"

## Challenge
Product manager's confusion:
- Built features from customer requests
- Shipped high-quality implementations
- Yet engagement is dropping

Competing hypotheses:
- **PM theory**: We haven't marketed features well enough
- **Design theory**: UI is cluttered, need better onboarding
- **Sales theory**: We're attracting wrong customer segment
- **Engineering theory**: Features have bugs we don't know about

Recent experiment: Sent email campaign highlighting new features → 8% open rate, no engagement lift.

Your role: Diagnose why adding features decreased engagement.

## Prompt for Agent

```
We shipped 4 major features customers requested:
- Team chat
- File sharing
- Video calls
- Integrations

But engagement is dropping:
- WAU: 78% → 62%
- DAU/WAU: 0.45 → 0.31

Feedback: "Too many features", "Feels bloated"

We built what they asked for. Why is engagement declining?
```

## Expected Lens Relevance

**High:** Zone of Proximal Development, Pace Layering, Feature Fatigue, Progressive Disclosure
**Medium:** Feedback Loops, System Boundaries, Jobs to be Done
**Low:** Bottleneck Theory

## Baseline Solution

"Better onboarding, feature tours, simplify UI, remove unused features, improve feature discovery."

- Originality: 3/10
- Treats symptom (discoverability) not cause

## Target Solution

Using Zone of Proximal Development + Pace Layering:

"You didn't add features. You expanded the Zone of Proximal Development beyond users' capability.

Through ZPD:
- Users could handle 1 core workflow (project management)
- Each feature adds cognitive load (chat = new workflow, files = new workflow, etc.)
- 4 new features = 4x ZPD expansion in 6 months
- Users can't assimilate that fast → retreat to safer, simpler tools

Through Pace Layering:
- Users adopt at slow pace (months to internalize new workflows)
- You shipped at fast pace (feature per 6 weeks)
- Pace mismatch = cognitive overload

The data proves it:
- WAU down: Users avoiding product (too complex)
- DAU/WAU down: Even active users engaging less frequently (fatigue)
- Survey: 'Too many features' = explicit ZPD overload signal

Root cause: You optimized for feature shipping velocity, not adoption velocity.

Solution: Pace-layer feature releases to match user capability

Fast layer (existing users): Master current features before new ones
- Don't release new features until >60% adoption of previous
- Progressive revelation: Show chat only after 10+ projects created

Slow layer (power users): Advanced features for ready users
- Segment by capability (novice/intermediate/advanced)
- Unlock features based on mastery signals

The breakthrough: Ship features at pace users can absorb them, not pace you can build them."

- Originality: 9/10
- Capability-paced feature release vs feature-factory approach

## Evaluation Notes

Tests whether agent recognizes user capability constraints.
Should identify pace mismatch between shipping and adoption.
