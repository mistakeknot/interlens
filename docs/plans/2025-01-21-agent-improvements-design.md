# Design: Making Linsenkasten More Useful for Agents

**Date:** 2025-01-21
**Status:** Design Complete
**Target Users:** AI agents (Claude Code, Codex CLI, Claude Desktop) using linsenkasten for creative problem-solving

## Executive Summary

Transform linsenkasten from a "lookup tool" into an **intelligent creative thinking partner** for AI agents through:

1. **Meta-tool for strategy** - Agents get recommendations, not just raw data
2. **Contextual guidance** - Every response suggests next steps
3. **Better discoverability** - Tool descriptions explain when/why to use each tool
4. **Flexible output** - JSON, compact, or rich formats for different use cases
5. **Proactive triggers** - Agents recognize when lens-based thinking helps

**Key principle:** Stay stateless. Agents have context; tools should leverage it when provided.

---

## Problem Statement

### Current State

Agents struggle to use linsenkasten effectively:

- **Discovery problem**: Don't know which tool to use when (13 tools, vague descriptions)
- **Integration problem**: Hard to chain operations or integrate with other workflows
- **Proactivity problem**: Only use linsenkasten when explicitly told to
- **Workflow problem**: Get one result, then don't know what to do next

### Example of Poor Usage

```
User: "I'm stuck on how to design this feature"

Agent: Let me search for relevant lenses...
[Calls: search_lenses(query="feature design")]

Agent: I found "Systems Thinking" lens. Here's what it says...
[Reads definition]

Agent: Does this help?
```

**What's wrong:**
- Agent didn't explore neighborhood
- Didn't check for contrasting perspectives
- Didn't use gap detection
- Just searched once and stopped

### Desired State

```
User: "I'm stuck on how to design this feature"

Agent: I notice you're stuck. Let me get a recommended approach...
[Calls: suggest_lens_strategy(problem="stuck on feature design")]

Agent: The system recommends starting with gap detection to see what
perspectives you might be missing, then using random provocation to break
out of habitual thinking.

[Calls: detect_thinking_gaps(context=["previous", "lenses", "from", "conversation"])]

Agent: You've been focused on technical architecture (15% coverage).
You're missing user experience and organizational frames. Let me get a
lens from those areas...

[Calls: random_lens_provocation(context=[...])]

Agent: "The Geometry of Dissent" - this is about how teams navigate disagreement.
Let me bridge this back to feature design...

[Calls: find_bridge_lenses(["The Geometry of Dissent", "Software Architecture"])]
```

**What's better:**
- Agent recognizes "stuck" trigger
- Uses meta-tool to get strategy
- Follows recommended sequence
- Applies insights back to problem

---

## Design Components

### 1. Meta-Tool: `suggest_lens_strategy`

**Purpose:** Entry point when agent doesn't know which tool to use.

#### Input Schema

```json
{
  "problem": "Team split on refactor vs ship decision",
  "context": ["Systems Thinking", "Pace Layering"],  // optional: lenses already explored
  "goal": "decision_making"  // optional: creativity | analysis | exploration | understanding
}
```

#### Output Schema

```json
{
  "pattern_detected": "decision_paralysis_with_tradeoffs",
  "recommended_approach": {
    "steps": [
      {
        "step": 1,
        "tool": "find_contrasting_lenses",
        "params": {"lens": "Explore vs Exploit"},
        "why": "Your problem involves competing valid options. Start with a lens that embraces this tension.",
        "example_call": "find_contrasting_lenses(lens='Explore vs Exploit')"
      },
      {
        "step": 2,
        "tool": "find_bridge_lenses",
        "params": {"lenses": ["Explore vs Exploit", "Software Architecture"]},
        "why": "Bridge the tension back to your specific context",
        "example_call": "find_bridge_lenses(lenses=['Explore vs Exploit', 'Software Architecture'])"
      },
      {
        "step": 3,
        "tool": "get_lens_neighborhood",
        "params": {"lens": "<bridge_lens_from_step_2>", "radius": 1},
        "why": "Explore practical approaches around the bridge concept",
        "example_call": "get_lens_neighborhood(lens='<bridge>', radius=1)"
      }
    ]
  },
  "insight": "Decision paralysis often benefits from embracing the tension rather than resolving it immediately. Look for frameworks that integrate both perspectives."
}
```

#### Pattern Detection Logic

| Pattern | Keywords | Recommendation |
|---------|----------|----------------|
| Decision paralysis | "or", "split", "can't decide", "debating" | `find_contrasting_lenses` → embrace tension |
| Stuck | "stuck", "tried everything", "not working" | `random_lens_provocation` → break pattern |
| Relationship | "how does X relate to Y", "connect" | `find_lens_journey` → discover path |
| Missing perspectives | "what am I missing", "blind spots" | `detect_thinking_gaps` → check coverage |
| Creative breakthrough | "new ideas", "innovative", "out of the box" | `random` + `find_bridge_lenses` workflow |
| Understanding concept | "what is", "explain", "understand" | `search_lenses` → `get_lens_neighborhood` |
| Compare/contrast | "difference between", "versus" | `find_contrasting_lenses` |

#### Implementation

**Backend:**
- Flask endpoint: `/api/v1/creative/suggest-strategy`
- Simple keyword matching initially (can enhance with LLM later)
- Returns sequenced tool recommendations

**MCP Tool Definition:**
```javascript
{
  name: 'suggest_lens_strategy',
  description: `Get recommended lens strategy for a problem. Use when:

🚨 TRIGGER SIGNALS:
- User says "I'm stuck"
- Discussion going in circles
- Need creative breakthrough
- Facing complex, multi-faceted problem
- User asks "how should I think about this?"
- You're unsure which linsenkasten tool to use

INPUT:
- problem: Natural language description of situation
- context: Optional list of lenses already explored
- goal: Optional hint about what you're trying to achieve

OUTPUT:
- Detected pattern
- Step-by-step tool recommendations with rationale
- Example calls you can execute

💡 This is your entry point to linsenkasten when you don't know where to start.`,
  inputSchema: {
    type: 'object',
    properties: {
      problem: {
        type: 'string',
        description: 'Natural language description of the problem or situation'
      },
      context: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: Lens names already explored in this conversation'
      },
      goal: {
        type: 'string',
        enum: ['creativity', 'analysis', 'exploration', 'decision_making', 'understanding'],
        description: 'Optional: What you\'re trying to achieve'
      }
    },
    required: ['problem']
  }
}
```

**CLI Support:**
```bash
linsenkasten suggest "Team can't decide between option A and B"
linsenkasten suggest "I'm stuck on this design problem" --goal creativity
```

---

### 2. Contextual Hints System

Every tool response includes a `next_steps` section with suggested follow-ups.

#### Hint Structure

```json
{
  "results": { /* tool-specific results */ },
  "next_steps": {
    "suggestions": [
      {
        "action": "explore_depth",
        "tool": "get_lens_neighborhood",
        "why": "You found Systems Thinking - explore related concepts around it",
        "call": "get_lens_neighborhood(lens='Systems Thinking', radius=2)",
        "priority": "high"
      },
      {
        "action": "find_contrasts",
        "tool": "find_contrasting_lenses",
        "why": "Get opposing perspectives to Systems Thinking for dialectic exploration",
        "call": "find_contrasting_lenses(lens='Systems Thinking')",
        "priority": "medium"
      }
    ],
    "insight": "💡 When you find a lens that resonates, explore its neighborhood or find contrasts to deepen understanding"
  }
}
```

#### Tool-Specific Hint Rules

**After `search_lenses`:**
```
Suggestions:
1. Explore neighborhood of interesting result
2. Find contrasts to top result
3. If low frame diversity → suggest random_lens_provocation
```

**After `find_lens_journey`:**
```
Suggestions:
1. Explore the bridge lenses (middle of path)
2. Check coverage: detect_thinking_gaps with all path lenses
3. Find alternative paths: find_bridge_lenses
```

**After `random_lens_provocation`:**
```
Suggestions:
1. Bridge back to domain: find_bridge_lenses([random, domain])
2. Continue gap exploration: random_lens_provocation(context=[...])
3. Explore this frame: search_lenses(query=<frame name>)
```

**After `find_bridge_lenses`:**
```
Suggestions:
1. Explore bridge neighborhood
2. Check if stuck in one frame: detect_thinking_gaps
3. Apply bridge to problem (agent-specific)
```

**After `detect_thinking_gaps`:**
```
Suggestions:
1. Fill gaps: random_lens_provocation(context=[...])
2. Explore unexplored frame: search_lenses(query=<unexplored_frame>)
3. Get specific suggestion: suggest_lens_strategy
```

**After `get_lens_neighborhood`:**
```
Suggestions:
1. Expand radius if interesting neighbors found
2. Find contrasts to source lens
3. Pick interesting neighbor → explore its neighborhood
```

**After `find_contrasting_lenses`:**
```
Suggestions:
1. Explore each contrast's neighborhood
2. Find bridges between contrasts
3. Apply dialectic to problem
```

**After `get_central_lenses`:**
```
Suggestions:
1. Explore neighborhood of top central lens
2. Use central lens as starting point for analysis
3. Check coverage after exploring centrals
```

#### Hint Display Rules

**Show hints when:**
- Results are empty/unexpected → suggest alternatives
- Results are interesting → suggest logical next steps
- Tool-specific patterns detected

**Don't show hints for:**
- "You're using this wrong" messages
- Generic "here are all possibilities" lists
- Hints requiring state tracking

**CLI Control:**
```bash
--hints=full      # Default: all context-specific hints
--hints=minimal   # Only when results empty/unexpected
--no-hints        # Suppress all hints (for scripting)
```

**Hint format (text response):**
```markdown
## Results
[tool results here]

## Next Steps

✅ **Explore the bridge**: You found "Pace Layering" connects your concepts
   → get_lens_neighborhood(lens='Pace Layering', radius=1)
   → See what makes it a natural bridge

📊 **Check coverage**: Are you missing important perspectives?
   → detect_thinking_gaps(context=['Systems Thinking', 'Pace Layering', 'Innovation'])
   → Identify blind spots in your exploration

💡 When you find a journey, the bridge lenses are often the key insights
```

---

### 3. Enhanced Tool Descriptions

Add trigger patterns, use cases, and workflow guidance to every tool.

#### Description Template

```
[One-line summary]. Use when:

🚨 TRIGGER SIGNALS:
- [User behavior/statement that suggests this tool]
- [Problem pattern this addresses]

PARAMETERS:
- [Key parameters explained]
- [Optional parameters and defaults]

⚠️ WARNINGS:
- [Limitations/gotchas]
- [When NOT to use this tool]

💡 WORKFLOW TIP:
- [Suggested next step after using this tool]
- [Common follow-up patterns]

EXAMPLES:
- [Example call 1]
- [Example call 2]
```

#### Example: Enhanced Descriptions

**`search_lenses`**
```javascript
{
  name: 'search_lenses',
  description: `Search for FLUX lenses by semantic query. Use when:

🚨 TRIGGER SIGNALS:
- Starting exploration on a new topic
- Looking for lenses related to specific concepts
- User asks "What lenses are there about X?"
- You know the domain/theme but not specific lens names

PARAMETERS:
- query: Natural language search (semantic, not keyword matching)
- limit: Max results (default: 10)

EXAMPLES:
- search_lenses(query='decision making', limit=5)
- search_lenses(query='organizational change')
- search_lenses(query='innovation and creativity')

💡 WORKFLOW TIP:
After searching, explore the neighborhood of interesting results or find contrasts.
If results are all from same frame, use random_lens_provocation for diversity.`,
  inputSchema: { /* ... */ }
}
```

**`find_lens_journey`**
```javascript
{
  name: 'find_lens_journey',
  description: `Find conceptual path between two lenses. Use when:

🚨 TRIGGER SIGNALS:
- User asks "How does X relate to Y?"
- Need to connect two disparate concepts
- Building logical argument or narrative from A to B
- Want to understand relationship between ideas

PARAMETERS:
- source: Starting lens name (e.g., "Pace Layering")
- target: Destination lens name (e.g., "Innovation Cascade")

⚠️ WARNINGS:
- Both lenses must exist in graph (use search first if unsure)
- No path found? Try find_bridge_lenses instead
- Very long paths (5+ steps) may not be meaningful

💡 WORKFLOW TIP:
The bridge lenses (middle of path) are often the most interesting insights.
After finding journey:
1. Explore bridge neighborhoods: get_lens_neighborhood(lens=<bridge>)
2. Check coverage: detect_thinking_gaps(context=<all path lenses>)

EXAMPLES:
- find_lens_journey(source='Systems Thinking', target='Innovation')
- find_lens_journey(source='Leadership', target='Product Design')`,
  inputSchema: { /* ... */ }
}
```

**`find_bridge_lenses`**
```javascript
{
  name: 'find_bridge_lenses',
  description: `Find lenses that bridge between 2+ disparate concepts. Use when:

🚨 TRIGGER SIGNALS:
- Need lateral thinking to connect unrelated domains
- Stuck in one perspective, need cross-pollination
- Want to find shared patterns across different areas
- Building interdisciplinary insights
- After random_lens_provocation → bridge back to your domain

PARAMETERS:
- lenses: 2-4 concept names (sweet spot: 2-3)

⚠️ WARNINGS:
- Too few concepts (1): Not enough to bridge
- Too many concepts (5+): Results become noisy
- Concepts too similar: Bridge may be trivial

💡 WORKFLOW TIP:
Bridge lenses are often the most valuable insights - they reveal unexpected connections.
After finding bridges:
1. Explore bridge neighborhood: get_lens_neighborhood(lens=<bridge>, radius=1)
2. Apply bridge concept to your specific problem
3. Check if you're stuck in one frame: detect_thinking_gaps

EXAMPLES:
- find_bridge_lenses(lenses=['Leadership', 'Software Architecture'])
- find_bridge_lenses(lenses=['Innovation', 'Risk Management', 'Teams'])
- find_bridge_lenses(lenses=['Random Lens', 'Product Design'])`,
  inputSchema: { /* ... */ }
}
```

**`random_lens_provocation`**
```javascript
{
  name: 'random_lens_provocation',
  description: `Get random lens for creative provocation. Use when:

🚨 TRIGGER SIGNALS:
- User says "I'm stuck"
- Discussion going in circles, need pattern interrupt
- Need fresh perspective unrelated to current domain
- Want to break out of habitual thinking
- Exploring "what if we looked at this completely differently?"

PARAMETERS:
- context: Optional list of lens names already explored

🎯 GAP-AWARE MODE:
- WITH context=[] → 80% chance of lens from unexplored frames (guided exploration)
- WITHOUT context → Pure random selection (creative chaos)

💡 WORKFLOW TIP:
After getting random provocation:
1. Bridge it back: find_bridge_lenses([random_lens, your_domain_lens])
2. Explore the bridge to find practical connections
3. Continue gap-aware: random_lens_provocation(context=[..., new_lens])

EXAMPLES:
- random_lens_provocation()  # Pure random
- random_lens_provocation(context=['Pace Layering', 'Systems Thinking'])  # Gap-aware
- random_lens_provocation(context=['lens1', 'lens2', 'lens3'])  # After exploration`,
  inputSchema: { /* ... */ }
}
```

**`detect_thinking_gaps`**
```javascript
{
  name: 'detect_thinking_gaps',
  description: `Analyze thinking gaps across 28 FLUX frames. Use when:

🚨 TRIGGER SIGNALS:
- Mid-conversation checkpoint: "What am I missing?"
- Before making important decisions (coverage check)
- After exploring 3+ lenses (check if stuck in one frame)
- Planning comprehensive exploration strategy
- User asks "Are we missing any perspectives?"

PARAMETERS:
- context: List of lens names explored so far (required)

OUTPUT:
- Frame coverage % (X/28 frames)
- Unexplored frames (blind spots)
- Underexplored frames (only 1 lens)
- Suggested lenses to fill gaps

💡 WORKFLOW TIP:
After detecting gaps:
1. Fill gaps: random_lens_provocation(context=[...])  # Auto-targets gaps
2. Explore specific frame: search_lenses(query='<unexplored_frame_name>')
3. Strategic coverage: Iterate until 30-50% coverage for comprehensive analysis

EXAMPLES:
- detect_thinking_gaps(context=['Systems Thinking', 'Pace Layering'])
- detect_thinking_gaps(context=['lens1', 'lens2', 'lens3', 'lens4'])

⚠️ WARNINGS:
- Needs 2+ lenses for meaningful analysis
- Context should come from agent's conversation history`,
  inputSchema: { /* ... */ }
}
```

**`get_central_lenses`**
```javascript
{
  name: 'get_central_lenses',
  description: `Get most central/important lenses in knowledge graph. Use when:

🚨 TRIGGER SIGNALS:
- Starting new exploration (identify key concepts first)
- Want broadly applicable/versatile frameworks
- Need "starter kit" of essential lenses
- Understanding the most influential ideas in FLUX

PARAMETERS:
- measure: betweenness | pagerank | eigenvector (default: betweenness)
  - betweenness: Lenses that bridge many concepts (best for connecting ideas)
  - pagerank: Most 'important' based on network structure
  - eigenvector: Lenses connected to other important lenses (influence)
- limit: Max results (default: 10)

⚠️ WARNINGS:
- pagerank measure fails on Railway deployment (use betweenness instead)

💡 WORKFLOW TIP:
Central lenses are great starting points for exploration.
After getting central lenses:
1. Pick one → explore neighborhood: get_lens_neighborhood(lens=<central>)
2. Use as foundation for analysis
3. Check coverage after exploring: detect_thinking_gaps

EXAMPLES:
- get_central_lenses(measure='betweenness', limit=5)
- get_central_lenses(measure='eigenvector', limit=10)`,
  inputSchema: { /* ... */ }
}
```

**`get_lens_neighborhood`**
```javascript
{
  name: 'get_lens_neighborhood',
  description: `Explore conceptual neighborhood around a lens. Use when:

🚨 TRIGGER SIGNALS:
- Found interesting lens → want to see related concepts
- Deep dive into specific area
- Understanding connections around a concept
- After finding central lens or bridge lens

PARAMETERS:
- lens: Lens name to explore
- radius: How far to explore
  - 1 = direct connections only
  - 2 = connections of connections (default, recommended)

💡 WORKFLOW TIP:
Neighborhoods reveal clusters of related concepts.
After exploring:
1. Pick interesting neighbor → explore its neighborhood
2. Expand radius if you want broader context
3. Find contrasts: find_contrasting_lenses(lens=<source>)

EXAMPLES:
- get_lens_neighborhood(lens='Pace Layering', radius=1)
- get_lens_neighborhood(lens='Systems Thinking', radius=2)

⚠️ WARNINGS:
- Radius 3+ gets very large (use with caution)`,
  inputSchema: { /* ... */ }
}
```

**`find_contrasting_lenses`**
```javascript
{
  name: 'find_contrasting_lenses',
  description: `Find paradoxical/contrasting lenses for dialectic thinking. Use when:

🚨 TRIGGER SIGNALS:
- User facing dilemma or tradeoff (A vs B)
- Need opposing perspectives
- Exploring tensions and contradictions
- Want to embrace paradox rather than resolve it
- Synthesis thinking (thesis + antithesis → synthesis)

PARAMETERS:
- lens: Lens name to find contrasts for

💡 WORKFLOW TIP:
Contrasts reveal deeper insights through exploring tensions.
After finding contrasts:
1. Explore each contrast's neighborhood
2. Find bridges between contrasts: find_bridge_lenses([lens, contrast])
3. Apply dialectic to problem: How can both be true?

EXAMPLES:
- find_contrasting_lenses(lens='Explore vs Exploit')
- find_contrasting_lenses(lens='Systems Thinking')
- find_contrasting_lenses(lens='Innovation Cascade')`,
  inputSchema: { /* ... */ }
}
```

**All 13+ tools** should follow this enhanced format.

---

### 4. Output Format Options

Add flexible output formatting for different use cases.

#### CLI Flags

```bash
# Format options
--format=full      # Default: colored text with hints and formatting
--format=json      # Machine-readable JSON (all fields)
--format=compact   # Plain text, no colors, no hints, minimal formatting
--format=jsonl     # JSON Lines (one result per line, streaming-friendly)

# Field selection (works with all formats)
--fields=name,episode,definition  # Select specific fields only

# Hint control
--hints=full       # All contextual hints (default)
--hints=minimal    # Only show hints for empty/unexpected results
--no-hints         # Suppress all hints (same as --hints=none)
```

#### Examples

**Full format (default):**
```bash
$ linsenkasten search "innovation"

🔍 Search Results for "innovation"

1. Innovation Cascade (Episode 45)
   Definition: How innovations spread through systems in cascading waves...
   Concepts: diffusion, adoption, network effects

2. Systems Innovation (Episode 78)
   Definition: Innovation at the system level rather than component level...
   Concepts: systemic change, emergence, transformation

Found 2 lenses

## Next Steps

✅ Explore neighborhood: get_lens_neighborhood(lens='Innovation Cascade')
🔀 Find contrasts: find_contrasting_lenses(lens='Innovation Cascade')
```

**JSON format:**
```bash
$ linsenkasten search "innovation" --format=json

{
  "tool": "search_lenses",
  "params": {
    "query": "innovation",
    "limit": 10
  },
  "results": {
    "lenses": [
      {
        "id": 123,
        "name": "Innovation Cascade",
        "definition": "How innovations spread through systems...",
        "episode": 45,
        "related_concepts": ["diffusion", "adoption"]
      }
    ],
    "count": 2
  },
  "next_steps": {
    "suggestions": [
      {
        "action": "explore_depth",
        "tool": "get_lens_neighborhood",
        "why": "Explore related concepts around Innovation Cascade",
        "call": "get_lens_neighborhood(lens='Innovation Cascade', radius=2)"
      }
    ]
  }
}
```

**Compact format:**
```bash
$ linsenkasten search "innovation" --format=compact --no-hints

Innovation Cascade - Episode 45
Systems Innovation - Episode 78
```

**Field selection:**
```bash
$ linsenkasten search "innovation" --fields=name,episode

Innovation Cascade (45)
Systems Innovation (78)
```

**JSON + fields (for piping):**
```bash
$ linsenkasten search "innovation" --format=json --fields=name,episode | jq '.results.lenses[]'

{"name": "Innovation Cascade", "episode": 45}
{"name": "Systems Innovation", "episode": 78}
```

#### Implementation

**CLI (cli.js):**
```javascript
// Parse format flag
const format = args['--format'] || 'full';
const fields = args['--fields'] ? args['--fields'].split(',') : null;
const hints = args['--hints'] || (args['--no-hints'] ? 'none' : 'full');

// Format response based on flags
function formatResponse(data, format, fields, hints) {
  switch(format) {
    case 'json':
      return JSON.stringify(filterFields(data, fields), null, 2);
    case 'compact':
      return formatCompact(data, fields);
    case 'jsonl':
      return formatJSONLines(data, fields);
    case 'full':
    default:
      return formatFull(data, fields, hints);
  }
}
```

**MCP:**
- MCP responses always include full data + hints (agents can ignore if not needed)
- No format flags needed (agents parse JSON natively)

---

### 5. Proactivity Mechanisms

Help agents recognize WHEN to use linsenkasten without explicit prompting.

#### 5.1 Usage Guide Resource

**New MCP resource:** `lens://guide/when-to-use`

```markdown
# When to Use Linsenkasten: Agent Guide

This guide helps you recognize situations where lens-based thinking would be valuable.

## Quick Decision Tree

1. **Don't know which tool to use?** → Start with `suggest_lens_strategy`
2. **User is stuck?** → Use `random_lens_provocation` or `suggest_lens_strategy`
3. **Need to connect ideas?** → Use `find_lens_journey` or `find_bridge_lenses`
4. **Exploring new topic?** → Use `search_lenses` → `get_lens_neighborhood`
5. **Mid-conversation check?** → Use `detect_thinking_gaps`

## Recognize These Signals

### 🚨 User is Stuck

**Signals:**
- "I'm stuck"
- "Not sure how to approach this"
- "We keep going in circles"
- "Can't make progress"
- "Tried everything"

**Action:**
```
suggest_lens_strategy(problem=<user's situation>)
```

**Why:** User needs a fresh perspective or new framework. Getting strategic recommendations helps break the pattern.

---

### 🔄 Repetitive Discussion

**Signals:**
- Same arguments repeated multiple times
- No progress being made
- Bikeshedding on details
- Conversation looping

**Action:**
```
random_lens_provocation(context=<lenses used so far>)
```

**Why:** Pattern interrupt needed. Random lens from unexplored frame provides fresh angle.

---

### 🤔 Multi-Perspective Needed

**Signals:**
- "What are different ways to think about this?"
- "What are the pros and cons?"
- "Help me see this from another angle"
- User needs comprehensive analysis

**Action:**
```
find_contrasting_lenses(lens=<current perspective>)
# or
get_central_lenses(measure='betweenness', limit=5)
```

**Why:** User needs multiple viewpoints. Contrasts provide dialectic thinking, centrals provide foundational frameworks.

---

### 🌉 Connecting Disparate Ideas

**Signals:**
- "How does X relate to Y?"
- "What's the connection between..."
- Bridging different domains
- Interdisciplinary thinking

**Action:**
```
find_lens_journey(source='X', target='Y')
# or
find_bridge_lenses(lenses=['X', 'Y'])
```

**Why:** User needs conceptual bridge. Journey shows path, bridges show connectors.

---

### ✅ Decision Making

**Signals:**
- "Should we do A or B?"
- "Can't decide between..."
- Evaluating tradeoffs
- Comparing options

**Action:**
```
find_contrasting_lenses(lens='<decision context>')
# or
suggest_lens_strategy(problem='deciding between A and B', goal='decision_making')
```

**Why:** Decisions benefit from embracing tension rather than forcing resolution. Contrasting lenses reveal the paradox.

---

### 🎯 Coverage Check (Proactive)

**When to use:**
- After exploring 3+ lenses
- Mid-conversation (every 10-15 messages)
- Before important decision
- When planning comprehensive analysis

**Action:**
```
detect_thinking_gaps(context=<all lenses used in conversation>)
```

**Why:** Agents don't naturally notice when they're stuck in one frame. Proactive gap checking prevents blind spots.

**How to extract context:**
- Review conversation history
- Extract all lens names mentioned
- Pass as array to detect_thinking_gaps

---

## Common Workflows

### Workflow 1: Problem-Solving Session

**Scenario:** User presents complex problem, you need to help them think through it.

**Steps:**
1. Call `suggest_lens_strategy(problem=<description>)`
2. Follow the recommended sequence
3. After 3-4 tools, check gaps: `detect_thinking_gaps(context=[...])`
4. Apply insights back to original problem

**Example:**
```
User: "Our team can't agree on technical architecture for new feature"

1. suggest_lens_strategy(problem="team disagreement on architecture")
   → Recommends: contrasting lenses, then bridges

2. find_contrasting_lenses(lens="Software Architecture")
   → Get dialectic perspectives

3. find_bridge_lenses(lenses=["Architecture Lens 1", "Team Dynamics"])
   → Connect technical and human factors

4. detect_thinking_gaps(context=[all lenses used])
   → Check if missing organizational or decision-making frames

5. Apply insights: "Based on these lenses, here's a framework for your decision..."
```

---

### Workflow 2: Creative Exploration

**Scenario:** User exploring new domain, wants to understand it deeply.

**Steps:**
1. `search_lenses(query=<domain>)`
2. Pick interesting result → `get_lens_neighborhood(lens=<result>, radius=2)`
3. Find contrasts → `find_contrasting_lenses(lens=<result>)`
4. Check coverage → `detect_thinking_gaps(context=[...])`
5. Fill gaps → `random_lens_provocation(context=[...])`

**Example:**
```
User: "I want to understand innovation better"

1. search_lenses(query="innovation")
   → Find "Innovation Cascade"

2. get_lens_neighborhood(lens="Innovation Cascade", radius=2)
   → Explore related concepts (diffusion, adoption, etc.)

3. find_contrasting_lenses(lens="Innovation Cascade")
   → Get opposing views (stability, preservation)

4. detect_thinking_gaps(context=["Innovation Cascade", "Diffusion", "Stability"])
   → Coverage: 10% (3/28 frames) - missing organizational, human factors

5. random_lens_provocation(context=[...])
   → System suggests lens from organizational dynamics frame
```

---

### Workflow 3: Breaking Out of Rut

**Scenario:** Conversation feels stuck, need creative breakthrough.

**Steps:**
1. `random_lens_provocation(context=<lenses from conversation>)`
2. `find_bridge_lenses(lenses=[random_lens, domain_lens])`
3. `get_lens_neighborhood(lens=<bridge>, radius=1)`
4. Apply bridge concept to problem

**Example:**
```
User: "We've tried everything to improve team velocity. Nothing works."

1. Extract context from conversation: ["Agile", "Team Dynamics", "Process"]

2. random_lens_provocation(context=["Agile", "Team Dynamics", "Process"])
   → System suggests "The Geometry of Dissent" (organizational frame)

3. find_bridge_lenses(lenses=["The Geometry of Dissent", "Software Teams"])
   → Bridge: "Pace Layering" (different speeds in organization)

4. get_lens_neighborhood(lens="Pace Layering", radius=1)
   → Explore related concepts

5. Apply: "Maybe the issue isn't velocity but misaligned pace layers.
   Some team members operating at infrastructure pace (slow, stable)
   while others at feature pace (fast, iterative)."
```

---

### Workflow 4: Comprehensive Analysis

**Scenario:** Important decision, need thorough multi-perspective analysis.

**Steps:**
1. Get foundational lenses → `get_central_lenses(measure='betweenness', limit=5)`
2. Apply each to problem
3. Check coverage → `detect_thinking_gaps(context=[all applied lenses])`
4. Fill gaps → `search_lenses(query=<unexplored_frame>)` or `random_lens_provocation`
5. Iterate until 30-50% coverage
6. Synthesize insights

**Example:**
```
User: "Should we pivot our product strategy?"

1. get_central_lenses(measure='betweenness', limit=5)
   → Get: Systems Thinking, Pace Layering, Explore vs Exploit, etc.

2. Apply each lens to pivot decision
   → Document insights from each perspective

3. detect_thinking_gaps(context=[5 central lenses])
   → Coverage: 18% (5/28 frames) - missing market, user, risk frames

4. search_lenses(query="market dynamics")
   → Find market-related lenses

5. search_lenses(query="risk management")
   → Find risk-related lenses

6. detect_thinking_gaps(context=[all 10 lenses])
   → Coverage: 35% (10/28 frames) - good enough for decision

7. Synthesize: "Based on 10 different frameworks across 35% of FLUX dimensions..."
```

---

## Integration Tips

### Extracting Context from Conversation

Agents should track lens names mentioned in conversation:

```javascript
// Example: Agent keeps list of lenses used
const lensesUsed = [];

// After each lens tool call, add to list
function trackLens(lensName) {
  if (!lensesUsed.includes(lensName)) {
    lensesUsed.push(lensName);
  }
}

// When calling gap detection or random provocation
detect_thinking_gaps({ context: lensesUsed })
random_lens_provocation({ context: lensesUsed })
```

### When to Check Gaps (Proactive Triggers)

**Good times:**
- After 3 lens tools used
- Every 10-15 messages in long conversation
- Before important decision
- Mid-exploration checkpoint
- User asks "what else should I consider?"

**Implementation idea:**
```javascript
// Pseudo-code for agent
let toolCallCount = 0;

function afterLensTool() {
  toolCallCount++;

  if (toolCallCount % 3 === 0) {
    // Every 3rd tool call, check gaps
    suggest("Consider checking coverage: detect_thinking_gaps(context=[...])");
  }
}
```

### Applying Insights Back to Problem

Linsenkasten provides frameworks, but **you** (the agent) apply them:

**Bad:**
```
Agent: I found "Systems Thinking" lens. Here's what it says... [reads definition]
```

**Good:**
```
Agent: I found "Systems Thinking" lens. Applying it to your auth refactor decision:

The lens highlights feedback loops - refactoring now creates a positive loop (easier changes later)
vs shipping creates negative loop (technical debt compounds).

It also reveals leverage points: auth is a foundational layer. Changes at foundation
have outsized impact on system behavior.

This suggests: Refactor is the systems-aware choice despite short-term cost.
```

The agent uses the lens definition to generate **specific insights about the user's problem**.

---

## Anti-Patterns to Avoid

### ❌ One-and-Done
```
Agent: Let me search for lenses...
[Calls: search_lenses once]
Agent: Here's what I found. [Reads result]
```

**Why bad:** No exploration, no depth, just lookup.

**Better:** Search → neighborhood → contrasts → gaps → apply

---

### ❌ Ignoring Context
```
[Throughout conversation, uses Systems Thinking 5 times]
Agent: Let me get a random lens...
[Calls: random_lens_provocation() without context]
```

**Why bad:** Pure random when gap-aware would be better. Missing opportunity to explore blind spots.

**Better:** Extract lenses from conversation, pass as context

---

### ❌ Not Following Hints
```
Agent: [Gets lens journey with bridge lens]
Agent: Here's the path. [Stops]
```

**Why bad:** Ignores "explore the bridge" hint. Misses the insight.

**Better:** Follow next_steps suggestions in response

---

### ❌ No Coverage Checking
```
[After 10 lens tool calls, all from Systems & Complexity frame]
Agent: [Never checks gaps]
```

**Why bad:** Stuck in one perspective, blind to other dimensions.

**Better:** Proactively check gaps every 3-5 tool calls

---

## Summary

**Entry point:** `suggest_lens_strategy` when unsure

**Pattern recognition:** Learn the trigger signals (stuck, connecting, deciding, etc.)

**Workflows:** Follow the 4 common patterns (problem-solving, exploration, breakthrough, analysis)

**Proactivity:** Check gaps every 3-5 tools, extract context from conversation

**Application:** Don't just read lenses - apply them to the user's specific problem

**Hints:** Follow next_steps suggestions in responses
```

#### 5.2 Pattern Detection in suggest_lens_strategy

Built-in pattern matching helps recognize problem types:

| Keywords | Pattern | Recommendation |
|----------|---------|----------------|
| "stuck", "tried everything", "not working" | stuck_pattern | `random_lens_provocation` → break out |
| "or", "versus", "split", "can't decide" | decision_paralysis | `find_contrasting_lenses` → embrace tension |
| "how does X relate to Y", "connect" | relationship_query | `find_lens_journey` → discover path |
| "what am I missing", "blind spots" | coverage_check | `detect_thinking_gaps` → identify gaps |
| "new ideas", "innovative", "creative" | creativity_need | `random` + `bridges` workflow |
| "should we", "pros and cons", "evaluate" | decision_support | `contrasting` + `central` lenses |
| "understand", "explain", "what is" | understanding_need | `search` → `neighborhood` → `contrasts` |
| "going in circles", "same argument" | repetition_detected | `random_lens_provocation` → pattern interrupt |

#### 5.3 Smart Response Metadata

Include helpful metadata when patterns detected:

```json
{
  "results": {
    "lenses": [...]
  },
  "meta": {
    "frame_diversity": "low",
    "dominant_frames": ["Systems & Complexity"],
    "all_results_from_same_frame": true
  },
  "proactivity_hint": "💡 All results from Systems & Complexity frame. To explore other perspectives, try random_lens_provocation or detect_thinking_gaps."
}
```

**When to include proactivity hints:**
- Low frame diversity in search results
- Empty/null results (suggest alternatives)
- Tool called without context when context would improve results
- Results suggest next logical step

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Goal:** Quick wins that immediately improve agent experience.

**Tasks:**
1. ✅ Enhanced tool descriptions
   - Update all 13+ tools in `index.js` with enhanced format
   - Include trigger signals, workflow tips, examples
   - Estimated: 4-6 hours

2. ✅ Output format flags
   - Add `--format`, `--fields`, `--hints` to `cli.js`
   - Implement formatters (json, compact, jsonl)
   - Estimated: 3-4 hours

3. ✅ Usage guide resource
   - Write `docs/agent-guide.md`
   - Add `lens://guide/when-to-use` resource to MCP
   - Estimated: 2-3 hours

**Deliverables:**
- Updated `index.js` with enhanced descriptions
- Updated `cli.js` with format flags
- New `docs/agent-guide.md`
- Updated MCP resource list

**Testing:**
- Verify all tools have enhanced descriptions
- Test all format flags with CLI
- Read guide resource from Claude Desktop

---

### Phase 2: Backend - Strategy Tool (Week 2)

**Goal:** Implement suggest_lens_strategy endpoint.

**Tasks:**
1. ✅ Pattern detection logic
   - Implement keyword matching for common patterns
   - Map patterns to tool sequences
   - File: `linsenkasten-api/pattern_detection.py`
   - Estimated: 4-6 hours

2. ✅ Flask endpoint
   - `/api/v1/creative/suggest-strategy`
   - Accept problem, context, goal
   - Return recommended steps with rationale
   - File: `linsenkasten-api/lens_search_api.py`
   - Estimated: 3-4 hours

3. ✅ Test endpoint
   - Test with various problem patterns
   - Verify recommendations make sense
   - Estimated: 2 hours

**Deliverables:**
- New `/api/v1/creative/suggest-strategy` endpoint
- Pattern detection module
- API tests

**Testing:**
```bash
curl -X POST https://lens-api.up.railway.app/api/v1/creative/suggest-strategy \
  -H "Content-Type: application/json" \
  -d '{"problem": "Team split on decision", "goal": "decision_making"}'
```

---

### Phase 3: Backend - Contextual Hints (Week 3)

**Goal:** Add next_steps to all tool responses.

**Tasks:**
1. ✅ Define hint rules for each tool
   - Document next_steps for all 13 tools
   - Create hint generation functions
   - File: `linsenkasten-api/hint_generator.py`
   - Estimated: 6-8 hours

2. ✅ Update all endpoints
   - Add next_steps to response format
   - Implement tool-specific hints
   - Files: All endpoints in `lens_search_api.py`
   - Estimated: 6-8 hours

3. ✅ Add metadata detection
   - Frame diversity checking
   - Empty result handling
   - Proactivity hints
   - Estimated: 3-4 hours

**Deliverables:**
- All API responses include next_steps
- Hint generation module
- Response metadata

**Testing:**
- Call each tool, verify hints present
- Check hints are contextually appropriate
- Verify hints disabled with flag

---

### Phase 4: MCP Integration (Week 3-4)

**Goal:** Integrate all improvements into MCP server.

**Tasks:**
1. ✅ Add suggest_lens_strategy tool
   - Add to ListToolsRequestSchema
   - Add to CallToolRequestSchema
   - Format response nicely
   - File: `linsenkasten/index.js`
   - Estimated: 2-3 hours

2. ✅ Add usage guide resource
   - Add `lens://guide/when-to-use` to resources
   - Serve `docs/agent-guide.md` content
   - File: `linsenkasten/index.js`
   - Estimated: 1-2 hours

3. ✅ Update all tool descriptions
   - Copy enhanced descriptions from Phase 1
   - Verify formatting in Claude Desktop
   - File: `linsenkasten/index.js`
   - Estimated: 2-3 hours

4. ✅ Handle next_steps in responses
   - Format hints nicely for MCP clients
   - Add hint suppression flag if needed
   - File: `linsenkasten/index.js`
   - Estimated: 2-3 hours

**Deliverables:**
- Updated MCP server with all new features
- New tool: suggest_lens_strategy
- New resource: lens://guide/when-to-use
- All responses include next_steps

**Testing:**
- Test in Claude Desktop
- Verify all tools work
- Check resource is readable
- Test suggest_lens_strategy flow

---

### Phase 5: CLI Integration (Week 4)

**Goal:** Add suggest command and finalize CLI improvements.

**Tasks:**
1. ✅ Add suggest command
   - `linsenkasten suggest "<problem>"`
   - Support --goal flag
   - Format output nicely
   - File: `linsenkasten/cli.js`
   - Estimated: 2-3 hours

2. ✅ Update help text
   - Document all new features
   - Include examples
   - File: `linsenkasten/cli.js`
   - Estimated: 1-2 hours

3. ✅ Format next_steps in CLI
   - Pretty-print hints with colors
   - Respect --no-hints flag
   - File: `linsenkasten/cli.js`
   - Estimated: 2-3 hours

**Deliverables:**
- New `suggest` CLI command
- Updated help text
- Pretty next_steps formatting

**Testing:**
```bash
linsenkasten suggest "Team can't decide on approach"
linsenkasten suggest "I'm stuck" --goal creativity
linsenkasten search "innovation" --format=json --no-hints
```

---

### Phase 6: Documentation & Polish (Week 4)

**Goal:** Update all documentation and examples.

**Tasks:**
1. ✅ Update README.md
   - Document suggest_lens_strategy
   - Add workflow examples
   - Update feature list
   - File: `linsenkasten/README.md`
   - Estimated: 2-3 hours

2. ✅ Update USAGE.md
   - Add agent integration guide
   - Include workflow examples
   - Document all new flags/features
   - File: `linsenkasten/docs/USAGE.md`
   - Estimated: 2-3 hours

3. ✅ Create examples
   - Example agent conversations
   - CLI workflow examples
   - File: `linsenkasten/docs/examples/`
   - Estimated: 2-3 hours

4. ✅ Update CLAUDE.md
   - Document new architecture
   - Update development guide
   - File: `linsenkasten/CLAUDE.md`
   - Estimated: 1-2 hours

**Deliverables:**
- Updated documentation across all files
- Example conversations
- Migration guide (if needed)

---

## Success Metrics

### Before Implementation

**Agent behavior:**
- Uses linsenkasten only when explicitly told
- Common pattern: single search call, read result, done
- No multi-tool workflows
- Doesn't know which tool to use

**Measurable (if we had telemetry):**
- Tools per conversation: ~1-2
- Most used: search_lenses (80%), get_lens (15%), other (5%)
- Multi-tool sequences: rare
- Gap detection usage: <1%

### After Implementation

**Agent behavior:**
- Recognizes trigger patterns, uses proactively
- Common pattern: suggest_lens_strategy → follow sequence → check gaps
- Natural multi-tool workflows emerge
- Agents understand when/why to use each tool

**Measurable (if we had telemetry):**
- Tools per conversation: 3-6
- Most used: suggest_lens_strategy (40%), search (20%), bridges (15%), gaps (10%), other (15%)
- Multi-tool sequences: common (50%+ of sessions)
- Gap detection usage: 10-20%

### Qualitative Indicators

**Good signs:**
- Agents apply lens insights to user's specific problem (not just reading definitions)
- Agents check coverage proactively without being prompted
- Agents follow next_steps suggestions
- Users report "Claude is thinking more creatively"

**Red flags:**
- Agents still only using search_lenses
- Next_steps ignored
- suggest_lens_strategy never used
- No improvement in multi-tool workflows

---

## Open Questions & Future Enhancements

### Questions to Resolve During Implementation

1. **Pattern detection accuracy:** Will simple keyword matching be good enough, or do we need LLM-based pattern detection?

2. **Hint verbosity:** Are 2-3 suggestions per response too many? Should we limit to 1 high-priority suggestion?

3. **Format defaults:** Should JSON format include hints by default, or only with --hints=full?

4. **CLI vs MCP parity:** Should CLI and MCP have exactly the same features, or can they diverge?

### Future Enhancements (Post-V1)

**1. LLM-Enhanced Pattern Detection**
- Use small LLM to detect problem patterns (more accurate than keywords)
- Still zero-cost for users (Linsenkasten pays)
- Better strategy recommendations

**2. Session Support (Optional)**
- For human users who want persistent context
- Not required for agents (they have conversation history)
- Could be useful for multi-day explorations

**3. Workflow Templates**
- Predefined sequences: "creative_exploration", "decision_support", "comprehensive_analysis"
- Execute multiple tools in one call
- Example: `linsenkasten workflow creative --topic "product strategy"`

**4. Telemetry & Analytics**
- Optional opt-in usage tracking
- Help improve pattern detection
- Identify which tools/workflows are most valuable

**5. Collaborative Features**
- Export exploration session
- Share lens combinations
- Community-contributed workflows

**6. Integration Hooks**
- Webhooks for async operations (if needed)
- Plugin system for custom tools
- API client libraries (Python, JS)

---

## Appendix: Design Decisions

### Why No Sessions?

**Decision:** Keep tools stateless, agents provide context explicitly.

**Rationale:**
- Agents already have conversation context
- Sessions add complexity (storage, expiry, cleanup)
- Explicit context is more transparent
- Agents can extract lens names from history easily
- Simpler architecture, easier to maintain

**Alternative considered:** Session management with auto-tracking
- **Pros:** Automatic context, no manual extraction
- **Cons:** Requires state storage, unclear session boundaries, complexity
- **Decision:** Explicit context is better

---

### Why Contextual Hints?

**Decision:** Include next_steps in every response.

**Rationale:**
- Agents don't know lens-based thinking workflows
- Learning through usage is more effective than reading docs
- Suggestions are contextual (more relevant than generic docs)
- Can be suppressed for scripting use cases

**Alternative considered:** Static workflow documentation only
- **Pros:** Simpler responses, no hint generation logic
- **Cons:** Agents don't read long docs, no contextual guidance
- **Decision:** Contextual hints are worth the complexity

---

### Why Meta-Tool?

**Decision:** Create suggest_lens_strategy as entry point.

**Rationale:**
- Agents struggle with "which tool?" decision
- Single entry point is simpler than "read 13 descriptions"
- Pattern detection can improve over time
- Teaches workflows through recommendations

**Alternative considered:** Just better tool descriptions
- **Pros:** Simpler, no new endpoint needed
- **Cons:** Still requires agent to choose, no workflow guidance
- **Decision:** Meta-tool + better descriptions is best

---

### Why Enhanced Descriptions?

**Decision:** Add trigger signals, workflow tips, examples to all tools.

**Rationale:**
- Agents DO read tool descriptions when choosing
- Current descriptions too vague ("Search for lenses" doesn't help)
- Trigger signals help pattern recognition
- Workflow tips teach best practices
- Examples clarify usage

**Alternative considered:** Keep descriptions minimal
- **Pros:** Cleaner, less to maintain
- **Cons:** Agents continue not knowing when to use what
- **Decision:** Rich descriptions are necessary

---

## Appendix: Example Conversations

### Example 1: Problem-Solving with Meta-Tool

```
User: We're redesigning our onboarding flow and the team is split. Half want
progressive disclosure (simple start, reveal complexity gradually) and half
want comprehensive upfront (show everything, let users choose their path).
Both have good arguments. How do we decide?

Claude: This is a classic design tension. Let me use linsenkasten to help frame this decision.

[Calls: suggest_lens_strategy(problem="Team split on progressive vs comprehensive onboarding", goal="decision_making")]

The system detected this as decision paralysis with valid tradeoffs. It recommends:
1. Start with "Explore vs Exploit" lens to embrace the tension
2. Find bridges between this lens and UX design
3. Explore the bridge's neighborhood for practical approaches

Let me follow this sequence...

[Calls: get_lens("Explore vs Exploit")]

Perfect - this lens frames your decision beautifully:
- Progressive disclosure = Exploitation (optimize for new users, proven pattern)
- Comprehensive upfront = Exploration (empower power users, discover new patterns)

Both are valid strategies depending on user maturity and product goals.

Now let me find bridges to UX design...

[Calls: find_bridge_lenses(lenses=["Explore vs Exploit", "User Experience Design"])]

Interesting! "Pace Layering" emerged as a bridge lens. This suggests thinking about:
- What moves fast (surface UI, first impressions) vs slow (power features, expertise)
- Different user segments operating at different "paces"

This reframes your decision: Instead of "progressive OR comprehensive", consider:
- Fast layer: Progressive disclosure for new users (optimize conversion)
- Slow layer: Comprehensive view for power users (enable mastery)
- Architecture: Design system that supports both with user control

Let me check if we're missing other important perspectives...

[Calls: detect_thinking_gaps(context=["Explore vs Exploit", "Pace Layering"])]

Coverage: 7% (2/28 frames). We're missing:
- User psychology & learning
- Business/growth metrics
- Team dynamics & communication

These are all relevant to your decision. Let me explore the user psychology angle...

[Calls: search_lenses(query="user learning and psychology", limit=3)]

Found "Zone of Proximal Development" - this is about optimal learning challenge.
Applying it to your onboarding:

Progressive disclosure = staying in ZPD (challenge but not overwhelm)
Comprehensive = potentially outside ZPD (too much too fast)

But... some users have wider ZPD (power users). Back to Pace Layering solution.

Recommendation:
1. Default to progressive (optimize for new user ZPD)
2. Provide "power mode" toggle (serve comprehensive users)
3. Track metrics for each flow (measure which converts better for which segments)
4. Architecture: Build comprehensive, surface progressively (easier to hide than add)

This approach synthesizes all four lenses:
- Explore vs Exploit: Both strategies have value
- Pace Layering: Different speeds for different users
- UX Design: User control over complexity
- Zone of Proximal Development: Match challenge to capability

Does this help reframe the decision?
```

**What made this good:**
- Agent recognized decision tension trigger
- Used suggest_lens_strategy as entry point
- Followed recommended sequence
- Checked for gaps proactively
- Applied lens insights to specific problem
- Synthesized multiple perspectives into actionable recommendation

---

### Example 2: Creative Exploration with Gap Awareness

```
User: I want to think more creatively about how we do team retrospectives.
We always do the same format and it's getting stale.

Claude: Great opportunity to explore fresh perspectives on retrospectives.
Let me use gap-aware exploration to avoid obvious team/agile lenses.

[Calls: search_lenses(query="team retrospectives", limit=3)]

Found some agile-related lenses: "Retrospective Prime Directive", "Team Learning"

These are good but probably what you're already familiar with. Let me check
what frames we're missing...

[Calls: detect_thinking_gaps(context=["Retrospective Prime Directive", "Team Learning"])]

Coverage: 7% (2/28 frames) - heavily weighted toward Agile/Team frames.

Unexplored: Creative processes, Systems thinking, Organizational dynamics,
Decision making, Complexity, Time & change...

Let me get a random lens from these unexplored areas...

[Calls: random_lens_provocation(context=["Retrospective Prime Directive", "Team Learning"])]

"The Geometry of Dissent" (Organizational Dynamics frame)

This lens is about how people navigate disagreement in organizations -
comfort with dissent varies by culture and creates different interaction geometries.

Interesting! Let me bridge this back to retrospectives...

[Calls: find_bridge_lenses(lenses=["The Geometry of Dissent", "Team Retrospectives"])]

Bridge found: "Psychological Safety"

This is revealing a blind spot! Your retrospectives might be stale because
people aren't comfortable expressing dissent. The "geometry" in your retro
might be too flat (everyone agrees) or too sharp (conflict avoided).

Let me explore this neighborhood...

[Calls: get_lens_neighborhood(lens="Psychological Safety", radius=1)]

Related concepts: Trust, vulnerability, learning culture, mistake tolerance

This suggests a new retro format:
1. Start with dissent mapping: "What's something we do that you privately disagree with?"
2. Geometry exercise: Map comfort levels on 2D grid (comfort with giving dissent vs receiving it)
3. Design retro format that matches your actual geometry (not idealized)

Let me get one more perspective from a different unexplored frame...

[Calls: random_lens_provocation(context=["Retrospective Prime Directive", "Team Learning", "The Geometry of Dissent", "Psychological Safety"])]

"Ritual and Ceremony" (Cultural & Social Practices frame)

This lens examines how rituals create meaning and mark transitions.

Applying to retrospectives: Maybe they're stale because they've become
rote (ritual without meaning) instead of ceremony (meaningful transition).

New idea: Design retrospective as a ceremony:
- Opening ritual: Light transition from "doing" to "reflecting"
- Core ceremony: Meaningful practices (not checklist)
- Closing ritual: Mark transition back to action

Combining both lenses:
1. Map your team's dissent geometry (Geometry of Dissent)
2. Design ceremony that matches it (Ritual and Ceremony)
3. Build psychological safety into the ritual (Psychological Safety)

Example ceremony for low-dissent-comfort teams:
- Opening: Anonymous "confessions" (lower stakes dissent)
- Core: Small group discussions (safer than full team)
- Closing: Collective commitment (group ownership)

This is very different from standard "what went well / what didn't" format!

Want to explore more perspectives or apply these ideas?
```

**What made this good:**
- Agent recognized staleness = need for fresh perspective
- Used gap detection proactively
- Applied gap-aware random selection
- Found bridges back to domain
- Combined multiple perspectives
- Generated specific, novel retro formats

---

### Example 3: Stuck Problem with Pattern Interrupt

```
User: I've been trying to fix this performance issue for days. Tried caching,
indexing, query optimization, code profiling. Nothing makes a meaningful difference.
I'm stuck.

Claude: I hear frustration - you've tried multiple technical approaches without
breakthrough. This might benefit from stepping outside the technical frame entirely.

Let me get a completely random lens to break the pattern...

[Calls: random_lens_provocation()]

"Pace Layering" (Systems & Time frame)

This lens is about different parts of a system moving at different speeds:
- Fast layers: Fashion, commerce, surface features
- Slow layers: Infrastructure, governance, culture

Interesting reframe: What if your performance issue isn't about optimizing
the fast layer (code) but about a slow layer constraint?

Let me bridge this back to software performance...

[Calls: find_bridge_lenses(lenses=["Pace Layering", "Software Performance"])]

Bridge: "System Boundaries and Constraints"

This suggests looking at architectural boundaries. Your fast-layer optimizations
(caching, indexing) might be constrained by slow-layer decisions (data model,
service boundaries, infrastructure).

Questions this lens raises:
1. Is the performance issue actually in the code you're optimizing?
2. What slow-layer decisions constrain your fast-layer fixes?
3. Are you optimizing at the wrong pace layer?

Let me explore this neighborhood...

[Calls: get_lens_neighborhood(lens="System Boundaries and Constraints", radius=1)]

Related: "Leverage Points", "Bottleneck Theory", "Feedback Loops"

Applying "Leverage Points" lens: The highest leverage interventions are often
at paradigm/architecture level (slow layer), not parameter tuning (fast layer).

This reframes your stuck problem:
- You've been optimizing parameters (cache size, index types) = fast layer
- Real issue might be architectural (data model, boundaries) = slow layer
- Fast optimizations can't overcome slow constraints

Different debugging approach:
1. What slow-layer decisions created this performance envelope?
2. Map the pace layers in your system (what can change fast vs slow)
3. Identify which layer contains the bottleneck
4. If slow-layer constraint, fast-layer optimization won't help

Specific suggestions:
- Trace request across service boundaries (slow-layer issue?)
- Check data model decisions (schema normalized for reads or writes?)
- Examine architectural assumptions (microservices creating latency?)
- Look at infrastructure limits (database connection pools, network)

The "stuck" feeling might be because you're operating at wrong pace layer.

Sound like a useful reframe? Want to explore more perspectives on this?
```

**What made this good:**
- Agent recognized "stuck" trigger pattern
- Used pure random (no context) for maximum pattern interrupt
- Found unexpected connection (pace layering → performance)
- Reframed from technical to architectural
- Generated specific debugging approaches
- Showed how lens changes perspective

---

## Conclusion

This design transforms linsenkasten from a passive lookup tool into an active thinking partner for AI agents. By implementing:

1. **suggest_lens_strategy** - Strategic entry point
2. **Contextual hints** - Workflow guidance in responses
3. **Enhanced descriptions** - Clear trigger patterns
4. **Flexible formats** - JSON, compact, full output
5. **Proactivity mechanisms** - Usage guide and pattern detection

We enable agents to:
- Recognize when lens-based thinking helps
- Choose appropriate tools confidently
- Follow effective workflows naturally
- Check coverage proactively
- Apply insights to specific problems

The implementation is pragmatic (4-week timeline), maintains core principles (stateless, zero-cost), and delivers measurable improvements in agent behavior.

Ready to build! 🚀
