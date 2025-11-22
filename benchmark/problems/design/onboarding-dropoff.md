# Onboarding Drop-Off Problem

## Problem ID
`design_onboarding-dropoff`

## Domain
design

## Title
Users Abandoning Onboarding Flow at 60% Rate

## Context
- Project management SaaS tool
- 1,000 signups per week
- Only 400 complete onboarding (60% drop-off)
- Industry average: 30-40% drop-off
- Onboarding is 5 steps:
  1. Create account (100% complete this)
  2. Create first project (85% reach here, 70% complete)
  3. Invite team members (60% reach here, 50% complete)
  4. Set up integrations (40% reach here, 25% complete)
  5. Create first task (25% reach here, 20% complete)

## Challenge
Product team debate on how to fix:

**Team A (Progressive Disclosure):**
- Start simple: Just "create project" initially
- Reveal complexity gradually
- Get users to "aha moment" faster
- Minimize cognitive load upfront

**Team B (Comprehensive Upfront):**
- Show everything: Projects, teams, integrations, tasks all at once
- Let power users self-serve
- Don't force linear flow
- Empower users to choose their path

Both teams have data supporting their view:
- **A's data:** Users who complete step 2 quickly (< 2 min) have 80% retention
- **B's data:** Power users (10% of signups) skip around, want full access immediately

Recent A/B test tried progressive disclosure → drop-off went from 60% to 65% (worse!)

Team is confused and stuck.

## Constraints
- Cannot completely rebuild onboarding (6-week project)
- Must work for both solo users and team leads
- Must integrate with existing product
- Analytics show users spend avg 8 minutes in onboarding (industry avg: 10 min)

## Success Criteria
A good solution:
- Explains why both approaches have merit
- Identifies root cause of drop-off (not just symptoms)
- Suggests testable improvements
- Works for different user segments
- Can be implemented incrementally

## Prompt for Agent

```
Our onboarding has 60% drop-off (industry average: 30-40%).

Team debate:
- Progressive disclosure (start simple, reveal gradually)?
- Comprehensive upfront (show everything, let users choose)?

We A/B tested progressive disclosure → drop-off got WORSE (60% → 65%).

Data shows:
- Users who complete step 2 quickly have better retention
- Power users want immediate access to everything
- Average time in onboarding: 8 minutes (industry avg: 10 min)

We're stuck. Both approaches have supporting evidence.

Your role: Help us break through this onboarding impasse.
```

## Expected Lens Relevance

**High relevance:**
- **Zone of Proximal Development** - Optimal challenge level for learning
- **Pace Layering** - Different user types need different speeds
- **Explore vs Exploit** - Learning vs doing tension
- **System Boundaries** - What's "onboarding" vs "product"?

**Medium relevance:**
- **The Map Is Not the Territory** - Are we measuring the right thing?
- **Feedback Loops** - User actions signal needs
- **Geometry of Dissent** - Team disagreement patterns

**Low relevance:**
- **Bottleneck Theory** - Not primarily a constraint problem
- **Innovation Cascade** - Not about pattern diffusion

## Baseline Solution Pattern

WITHOUT linsenkasten:

```
"Try these onboarding improvements:
- Add tooltips and help text
- Create video tutorials
- Reduce number of steps (combine some)
- Add progress bar
- Send email reminders
- Offer live chat support during onboarding"
```

**Characteristics:**
- Tactical UX improvements
- Doesn't explain why A/B test failed
- Doesn't address core tension (progressive vs comprehensive)
- **Originality: 2-3/10**
- **Novelty: 1-2/10**
- **Actionability: 6/10**

## Target Solution Pattern

WITH linsenkasten (using Zone of Proximal Development + Pace Layering):

```
"Applying Zone of Proximal Development + Pace Layering:

Key insight: Progressive vs comprehensive is a false choice. Different users need different paces.

Through Zone of Proximal Development lens:
- Onboarding should match user's capability zone
- Too simple → boredom (power users)
- Too complex → overwhelm (beginners)
- Your onboarding assumes ONE zone for ALL users (hence the conflict)

Why A/B test failed:
- Progressive disclosure optimizes for beginners
- But you LOST the 10% power users (they got frustrated)
- 10% of 1000 = 100 users/week lost = explains 60% → 65% increase

Through Pace Layering lens:
- Beginners operate at "slow" pace (need guidance)
- Power users operate at "fast" pace (know what they want)
- Forcing same pace on both = bad experience for both

Reframe: Don't choose ONE flow. Design for MULTIPLE paces.

Proposed solution: "Pace-Adaptive Onboarding"

Step 1 (universal):
"I'm here to: [ ] Start my first project [ ] Set up for my team"

This ONE question identifies pace:
- "First project" → slow pace (beginner flow)
- "Set up for team" → fast pace (power user flow)

Slow pace flow (Progressive):
1. Create project (with hand-holding)
2. Create first task (quick win)
3. Invite team (after success)
4. Integrations (optional, later)

Fast pace flow (Comprehensive):
1. Show full dashboard
2. Highlight: projects, teams, integrations, tasks (all visible)
3. Let user choose order
4. Provide "skip" options

Measuring success differently:
- Current metric: Completion rate (misleading - power users might skip)
- Better metric: "Time to first value"
  - Beginners: First task created
  - Power users: Team invited + project created
- Both can succeed without completing all 5 steps

Specific next steps:
1. Add pace detection (one question at start)
2. Split onboarding into two flows
3. Track "time to value" not "completion rate"
4. Test: Does 10% go fast pace? Does drop-off improve?

Why this resolves conflict:
- Team A is right for slow-pace users (beginners)
- Team B is right for fast-pace users (power users)
- You need both, adaptive to user type
- Pace Layering principle: Different users should move at different speeds

The breakthrough: Stop designing ONE onboarding. Design for MULTIPLE paces.
```

**Characteristics:**
- Multiple lenses (ZPD + Pace Layering)
- Explains A/B test failure
- Both/and solution (not either/or)
- User segmentation by capability
- **Originality: 8/10**
- **Novelty: 8/10**
- **Actionability: 9/10**

## Evaluation Notes

**What makes this interesting:**
- Classic UX debate (progressive vs comprehensive)
- A/B test made it worse (counterintuitive)
- Both teams have data (no clear winner)

**Creative leaps possible:**
- ZPD lens (optimal challenge per user)
- Different users = different paces
- One question to segment
- Metric is wrong (completion vs value)
- 10% power users explain test failure

**What would surprise evaluators:**
- Explains why test failed mathematically
- Both teams are right (for different users)
- Adaptive pace concept
- Changed success metric
- Simple segmentation (one question)
