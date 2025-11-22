# Remote Collaboration Breakdown

## Problem ID
`team_remote-collaboration`

## Domain
team

## Title
Distributed Team Lost Productivity After Going Fully Remote

## Context
- Engineering team of 25, went fully remote 8 months ago (previously co-located)
- Velocity dropped 30% (story points per sprint: 120 → 85)
- Meeting time up 40% (15 hrs/week → 21 hrs/week per person)
- Slack messages up 200% (overwhelming notification fatigue)
- PRs taking 2-3 days to review (was same-day when co-located)
- Junior developers struggling (asking fewer questions, stuck longer)
- Innovation dropped (no whiteboard sessions, no hallway conversations)

## Challenge
Engineering manager's attempts:

**Attempt 1: More meetings**
- Daily standups + sync meetings + office hours
- Result: Meeting fatigue, less coding time

**Attempt 2: Better tools**
- Invested in Miro, Loom, Tuple, Tandem
- Result: Tool sprawl, unclear which tool for what

**Attempt 3: Async-first culture**
- "Write everything down", RFC docs for decisions
- Result: Decision paralysis, everything requires a doc

**Attempt 4: Return to office (hybrid)**
- Team resisted, threatens retention
- Some live far from office now

Recent incident: Critical bug took 2 days to fix (would've been 2 hours in office). Required 6 people across 3 time zones. Coordination overhead killed productivity.

Your role: Redesign remote collaboration to restore productivity without forcing RTO.

## Prompt for Agent

```
Went fully remote 8 months ago. Productivity tanked:
- Velocity: 120 → 85 story points/sprint (-30%)
- Meetings: 15 → 21 hrs/week (+40%)
- PR review time: same-day → 2-3 days
- Junior devs: stuck longer, asking less

Tried:
- More meetings → meeting fatigue
- Better tools → tool sprawl
- Async-first → decision paralysis
- Hybrid RTO → team threatens to quit

How do we get productivity back without forcing office return?
```

## Expected Lens Relevance

**High:** Pace Layering, Synchronous vs Asynchronous, Communication Bandwidth, Zone of Proximal Development
**Medium:** System Boundaries, Feedback Loops, Leverage Points
**Low:** Bottleneck Theory

## Baseline Solution

"Find right balance of sync/async. Set clearer communication norms. Use right tool for each task. Have 'core hours' overlap."

- Originality: 3/10
- Generic best practices

## Target Solution

Using Pace Layering + Communication Bandwidth + ZPD:

"You're trying to replicate office patterns remotely. Remote requires different patterns matched to time scales.

Through Pace Layering, different work happens at different speeds:

**Fast layer (minutes/hours): Real-time problem solving**
- Co-located office: Tap shoulder, whiteboard, pair program
- Remote equivalent: DON'T use meetings (too heavyweight)
- Remote pattern: 'Work-in-public' in designated Slack channels
  - Junior dev: Posts 'Stuck on auth flow' in #help-quick
  - Senior dev: Screenshare in 2 minutes (not scheduled meeting)
  - Pair programming: 'Live coding' channel, anyone can join stream

**Medium layer (days): Code review, decisions**
- Co-located office: PR review between meetings, hallway consensus
- Remote equivalent: DON'T use async docs (too slow) or meetings (too heavyweight)
- Remote pattern: 'Office hours' + threaded decisions
  - PR review: 2-hour 'review blocks' 3x/week, everyone reviewing together
  - Decisions: 24-hour comment window, then 30-min video call to decide

**Slow layer (weeks): RFCs, architecture, planning**
- Co-located office: Whiteboard sessions, multi-day discussions
- Remote equivalent: Async docs work HERE (right pace)
- Remote pattern: Written RFC → async feedback → scheduled deep dive

Why velocity dropped:
- Fast-layer work (shoulder tap, quick questions) moved to medium-layer (Slack threads, scheduled meetings)
- Pace mismatch killed flow

Why junior devs struggle:
- ZPD: Juniors need fast feedback loops (minutes, not days)
- Remote async = feedback every 24 hours (too slow to learn)
- Solution: 'Active pairing hours' 2hrs/day, junior devs work alongside senior in video/screenshare

Why PR reviews slow:
- Async PR review = whenever someone has time (unpredictable)
- Solution: Scheduled 'review blocks' create predictable fast layer

The breakthrough: Layer communication patterns by time scale. Fast work needs synchronous bandwidth. Slow work needs async depth. Medium needs hybrid."

- Originality: 9/10
- Pace-layered communication architecture vs one-size-fits-all remote

## Evaluation Notes

Tests whether agent recognizes pace/bandwidth mismatches.
Should avoid "find balance" platitudes and provide structural solution.
