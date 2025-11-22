# Phase 0 Implementation Plan

**Date:** 2025-01-21
**Status:** In Progress
**Goal:** Implement critical foundations identified in research synthesis
**Target:** Maintain/exceed +153% benchmark improvement (currently 2.56 → 6.48/10)

## Benchmark Context

✅ **Baseline established:**
- Frame Coverage: 1/10 → 7.5/10 (+650%)
- Semantic Diversity: 3/10 → 7/10 (+133%)
- Tool Usage: 0/10 → 3/10 (+∞%)
- Solution Quality: 6.25/10 → 8.4/10 (+34%)
- **Overall: 2.56/10 → 6.48/10 (+153%)**

**Key finding:** Pace Layering lens is extremely powerful for structural reframes.

## Phase 0 Critical Additions

Based on research (SaLT, AutoTRIZ, Six Thinking Hats, CPS framework):

### 1. Belief Statement Generation (SaLT Pattern)

**Current:** Lens definitions are abstract
```json
{
  "name": "Pace Layering",
  "definition": "Different parts of a system change at different rates..."
}
```

**After:** Specific insights about the problem
```json
{
  "lens": "Pace Layering",
  "belief_statements": [
    {
      "belief": "Your performance bottleneck exists at architectural layer (slow), not code layer (fast)",
      "confidence": 0.75,
      "reasoning": "5+ fast-layer optimizations show <10% improvement → constraint is upstream",
      "evidence": ["Caching: 5%", "Indexing: 12%", "Query opt: 8%"],
      "lateral_connections": ["System Boundaries", "Bottleneck Theory"],
      "implications": ["Profile across layers", "Examine data model", "Check request architecture"]
    }
  ]
}
```

**Implementation:**
- Add `generate_belief_statements` function to index.js
- Integrate with existing lens retrieval
- Use problem context to generate specific beliefs (not LLM-based, template-based)

### 2. Quality Evaluation (CPS Component 4)

**Current:** No quality assessment

**After:** 4-criteria scoring
```json
{
  "quality": {
    "specificity": 0.8,   // Concrete vs vague
    "novelty": 0.9,       // Original vs generic
    "actionability": 0.7, // Clear next steps
    "coherence": 0.85,    // Logical flow
    "overall": 0.81
  }
}
```

**Implementation:**
- Pattern-based heuristics (not LLM)
- Specificity: Count of concrete details, numbers, specific tools/methods
- Novelty: Presence of lens-specific terminology, reframing language
- Actionability: Presence of action verbs, step sequences, decision criteria
- Coherence: Length, structure, logical connectors

### 3. Synthesis Module (AutoTRIZ Pattern)

**Current:** Tools return individual results

**After:** Structured solution reports
```markdown
## Problem Reframe
[Using Pace Layering + Leverage Points]

## Root Cause
Fast-layer optimizations hitting ceiling because bottleneck is in slow layer (data architecture)

## Key Insights
1. [From Pace Layering] Dashboard data changes slowly (hours) but computed fast (milliseconds) - pace mismatch
2. [From Leverage Points] Fixing 15 components > fixing 200 issues (leverage multiplication)

## Recommended Actions
1. Week 1-2: Move computation to slow layer (background jobs)
2. Week 3-4: Validate with prototype
3. Timeline: <50ms response time (from 350ms)
```

**Implementation:**
- `synthesize_solution` tool
- Takes: problem + applied lenses + belief statements
- Returns: Structured markdown report

### 4. Thinking Modes (Six Hats Pattern)

**Current:** 13+ flat tools (overwhelming)

**After:** 5-6 hierarchical modes
```javascript
{
  "modes": [
    {
      "mode": "systems_thinking",
      "description": "Understand structure, dynamics, relationships",
      "lenses": ["Pace Layering", "Feedback Loops", "System Boundaries", "Leverage Points"],
      "use_when": "Complex interdependencies, stuck despite many attempts, unclear root cause"
    },
    {
      "mode": "strategic_thinking",
      "description": "Navigate uncertainty, balance trade-offs, choose direction",
      "lenses": ["Explore vs Exploit", "Time Horizons", "Strategic Choice", "Competitive Dynamics"],
      "use_when": "High-stakes decisions, uncertain outcomes, resource allocation"
    },
    {
      "mode": "innovation_thinking",
      "description": "Generate novel solutions, break assumptions, find alternatives",
      "lenses": ["Innovation Cascade", "Jobs to be Done", "Constraints", "Progressive Disclosure"],
      "use_when": "Need breakthrough ideas, conventional solutions failing, market differentiation"
    },
    {
      "mode": "diagnostic_thinking",
      "description": "Find root causes, identify bottlenecks, trace problems",
      "lenses": ["Root Cause Analysis", "Bottleneck Theory", "Five Whys", "Theory of Constraints"],
      "use_when": "Something's broken, performance issues, unexpected failures"
    },
    {
      "mode": "adaptive_thinking",
      "description": "Learn, evolve, improve over time",
      "lenses": ["Zone of Proximal Development", "Feedback Loops", "Iterative Improvement"],
      "use_when": "Team learning, gradual improvement, skill building"
    }
  ]
}
```

**Implementation:**
- `suggest_thinking_mode` tool (replaces `suggest_lens_strategy`)
- Returns mode + 3-4 most relevant lenses within that mode
- Simpler decision tree for agents

### 5. Iterative Refinement (Sequential Thinking Pattern)

**Current:** One-shot lens application

**After:** Quality-gated iteration
```
1. Apply lens → generate belief statements
2. Evaluate quality (4 criteria)
3. If quality < 0.7 → refine (add evidence, sharpen reasoning)
4. If quality >= 0.7 → proceed to synthesis
5. Iterate max 3 times
```

**Implementation:**
- `refine_application` tool
- Takes: lens + belief statements + quality scores
- Returns: Improved version with more specificity/evidence
- Built-in stopping condition

## Implementation Priority

Based on benchmark findings (Pace Layering is key):

**Week 1 (High Impact):**
1. ✅ Belief Statement Generation (biggest gap identified)
2. ✅ Thinking Modes (simplify discovery)
3. ✅ Synthesis Module (tie insights together)

**Week 2 (Supporting):**
4. ⏳ Quality Evaluation (enable iteration)
5. ⏳ Iterative Refinement (quality gates)

## Architecture Changes

### New MCP Tools

```javascript
// Replaces suggest_lens_strategy
{
  name: "suggest_thinking_mode",
  description: "Recommend which thinking mode to use for your problem",
  parameters: { problem_description: string, context?: string }
}

// New synthesis tool
{
  name: "synthesize_solution",
  description: "Combine lens insights into structured solution report",
  parameters: { problem: string, lenses_applied: string[], belief_statements: object[] }
}

// New refinement tool
{
  name: "refine_lens_application",
  description: "Improve lens application quality with more evidence and specificity",
  parameters: { lens: string, initial_beliefs: object[], quality_scores: object }
}
```

### Enhanced Existing Tools

All lens retrieval tools (`get_lens`, `search_lenses`, etc.) now return:
```javascript
{
  name: "Pace Layering",
  definition: "...",
  belief_statements: [/* generated based on problem context */],
  quality: {/* 4-criteria scores */},
  lateral_connections: ["System Boundaries", "Leverage Points"],
  thinking_mode: "systems_thinking"
}
```

## Testing Strategy

### Validation Against Benchmark

Re-run 3 sample problems with Phase 0 enhancements:
- performance-stuck
- accessibility-improvements
- feature-prioritization

**Expected results:**
- Frame Coverage: 7.5/10 → 9/10 (better depth via belief statements)
- Semantic Diversity: 7/10 → 8/10 (lateral connections)
- Tool Usage: 3/10 → 6/10 (iterative refinement, synthesis)
- Solution Quality: 8.4/10 → 9.5/10 (synthesis module)
- **Overall: 6.48/10 → 8.13/10** (+25% additional improvement)

### Success Criteria

✅ **Minimum:** Maintain +153% baseline improvement
🎯 **Target:** Achieve +200% improvement (2.56 → 7.68/10)
🚀 **Stretch:** Achieve +250% improvement (2.56 → 8.96/10)

## Implementation Files

```
linsenkasten/
├── index.js                          # Update with new tools
├── api-client.js                     # Add belief statement generation
├── lib/
│   ├── belief-statements.js          # NEW: Generate problem-specific beliefs
│   ├── quality-evaluation.js         # NEW: 4-criteria scoring
│   ├── synthesis.js                  # NEW: Structured solution reports
│   ├── thinking-modes.js             # NEW: Mode definitions and matching
│   └── refinement.js                 # NEW: Iterative improvement logic
├── data/
│   └── thinking-modes.json           # Mode → lens mappings
└── docs/
    └── PHASE0_CHANGES.md             # Documentation of changes
```

## Rollout Plan

1. **Implement on feature branch** ✓ (current)
2. **Test with benchmark suite** (next)
3. **Validate improvement maintained/exceeded**
4. **Merge to main**
5. **Publish npm update**
6. **Update README with new workflows**

## Notes

- Keep zero-LLM principle (all logic is template/heuristic-based)
- Maintain backward compatibility (old tools still work)
- New tools are additive, not replacing
- CLI gets same enhancements as MCP

---

**Next Action:** Implement belief statement generation module
