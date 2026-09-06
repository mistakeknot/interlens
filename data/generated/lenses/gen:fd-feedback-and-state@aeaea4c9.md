
# fd-feedback-and-state

**Focus:** Whether the manual describes sufficient feedback mechanisms for players to understand the consequences of their decisions and the current world state

## Persona

A systems designer who specializes in emergent simulation games (Dwarf Fortress, Victoria 3, Crusader Kings). Evaluates whether players can read the simulation state and trace causality without a PhD in the underlying model.

## Decision Lens

Prioritizes findings where a player action has consequences that are not reflected in any described feedback path, where the simulation's state is only visible through a feature-flagged or non-obvious view, or where the manual describes events but not their meaning to the player.

## Task Context

Shadow Work is a geopolitical strategy simulation with a deep simulation backend. The game manual at docs/GAME-MANUAL.md documents all screens, controls, and mechanics. The review task is to assess playability, intuitiveness, and UX coherence for new players.

## Review Areas

- The Core Loop says choices 'ripple through interconnected systems' — does the manual describe *how* a player observes these ripples (which view, which indicator, what timeframe)?
- The Event Feed is described as showing 'real-time events' but also has two tabs (Feed vs. Emergence) — does the manual explain what distinguishes player-facing events from backend system events, and which tab a typical player should watch?
- The Chronicle's Causality View (cause→effect chains) is described as 'advanced' — does the manual give players a way to understand consequences without needing to master an advanced view?
- Dismissing a policy card is described as 'take no action — issue persists' — does the manual explain what 'persists' means concretely (escalation timeline, cost increase, eventual auto-pause) so players can make an informed choice?
- The Network Health badge (Stable/Stressed/Critical) is listed in the top bar — does the manual explain what causes it to change and what a Critical network means for gameplay?
- The manual lists 6 resource badges (Agents, Influence, Funding, Intel, Operations, Network) but Finance View is a separate screen — does the manual explain which resources are actionable from the top bar vs. requiring navigation to Finance/Resources views?

## Success Criteria

- For each major player action (select stance, dismiss card, deploy agent), the manual describes at least one concrete feedback path showing the consequence
- The manual distinguishes 'monitoring' views (for reading state) from 'action' views (for making decisions) so players know when to look vs. when to act
- The escalation timer/consequence of ignoring cards is described with enough specificity that players understand the cost of deferral

## Anti-Overlap

- fd-core-loop-clarity covers whether the loop concept is understood, not whether individual feedback paths are described
- fd-control-discoverability covers input affordances, not output/feedback channels
- fd-information-architecture covers view organization and labeling, not the content quality of what those views show
