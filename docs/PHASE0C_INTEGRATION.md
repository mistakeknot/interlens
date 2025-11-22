# Phase 0c: MCP Integration Guide

**Status:** Ready for implementation
**Prerequisites:** Phase 0a + 0b modules complete ✅

## Integration Overview

Phase 0 modules are complete and ready for integration into `index.js` (MCP server) and `cli.js` (CLI tool).

### Completed Modules

✅ `lib/thinking-modes.js` - 6 hierarchical thinking modes
✅ `lib/belief-statements.js` - SaLT-inspired specific insights
✅ `lib/quality-evaluation.js` - 4-criteria scoring
✅ `lib/synthesis.js` - Structured solution reports
✅ `lib/refinement.js` - Quality-gated iterative improvement

## New MCP Tools to Add

### 1. suggest_thinking_mode

**Purpose:** Recommend which thinking mode to use for a problem
**Replaces:** `suggest_lens_strategy` (simpler, more actionable)

```javascript
{
  name: 'suggest_thinking_mode',
  description: 'Recommend the best thinking mode for your problem. Returns mode + relevant lenses + workflow guidance.',
  inputSchema: {
    type: 'object',
    properties: {
      problem_description: {
        type: 'string',
        description: 'Description of the problem or challenge'
      }
    },
    required: ['problem_description']
  }
}
```

**Implementation:**
```javascript
import { matchThinkingMode, getWorkflowForMode } from './lib/thinking-modes.js';

// In CallToolRequestSchema handler:
case 'suggest_thinking_mode': {
  const { problem_description } = args;
  const matches = matchThinkingMode(problem_description);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        recommended_modes: matches,
        top_mode: matches[0],
        workflow: getWorkflowForMode(matches[0].id),
        next_steps: [
          `Apply ${matches[0].lenses.slice(0, 3).join(', ')} lenses`,
          `Use tools: ${getWorkflowForMode(matches[0].id).tools.join(', ')}`
        ]
      }, null, 2)
    }]
  };
}
```

### 2. synthesize_solution

**Purpose:** Combine multiple lens applications into structured report
**New capability:** Ties insights together

```javascript
{
  name: 'synthesize_solution',
  description: 'Synthesize insights from multiple lens applications into a structured solution report with problem reframe, root cause, and sequenced actions.',
  inputSchema: {
    type: 'object',
    properties: {
      problem: {
        type: 'string',
        description: 'Original problem description'
      },
      lenses_applied: {
        type: 'array',
        items: { type: 'object' },
        description: 'Array of lens applications with beliefs'
      },
      thinking_mode: {
        type: 'string',
        description: 'Thinking mode used (optional)'
      }
    },
    required: ['problem', 'lenses_applied']
  }
}
```

**Implementation:**
```javascript
import { synthesizeSolution } from './lib/synthesis.js';

case 'synthesize_solution': {
  const { problem, lenses_applied, thinking_mode } = args;

  const report = synthesizeSolution({
    problem,
    lenses_applied,
    thinking_mode
  });

  return {
    content: [{
      type: 'text',
      text: report // Already formatted markdown
    }]
  };
}
```

### 3. refine_lens_application

**Purpose:** Improve quality of lens application iteratively
**New capability:** Quality-gated improvement

```javascript
{
  name: 'refine_lens_application',
  description: 'Iteratively improve a lens application until quality threshold met (max 3 iterations). Returns refined beliefs with quality scores.',
  inputSchema: {
    type: 'object',
    properties: {
      lens: {
        type: 'string',
        description: 'Lens name'
      },
      problem_context: {
        type: 'string',
        description: 'Problem description'
      },
      quality_threshold: {
        type: 'number',
        description: 'Minimum quality score (0-1, default: 0.7)',
        default: 0.7
      }
    },
    required: ['lens', 'problem_context']
  }
}
```

**Implementation:**
```javascript
import { refineApplication, getRefinementSummary } from './lib/refinement.js';

case 'refine_lens_application': {
  const { lens, problem_context, quality_threshold } = args;

  // Get lens definition from API
  const lensData = await api.getLens(lens);

  const result = refineApplication({
    lens,
    problem_context,
    lens_definition: lensData,
    quality_threshold: quality_threshold || 0.7
  });

  const summary = getRefinementSummary(result);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        ...summary,
        refined_beliefs: result.belief_statements
      }, null, 2)
    }]
  };
}
```

## Enhanced Existing Tools

All lens retrieval tools should now include:
1. Belief statements (specific insights)
2. Quality scores
3. Lateral connections
4. Thinking mode context

### Example: Enhanced get_lens

**Before:**
```javascript
case 'get_lens': {
  const lens = await api.getLens(args.name);
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(lens, null, 2)
    }]
  };
}
```

**After:**
```javascript
import { generateBeliefStatements } from './lib/belief-statements.js';
import { evaluateWithOverall } from './lib/quality-evaluation.js';

case 'get_lens': {
  const { name, problem_context } = args; // Add optional problem_context parameter
  const lens = await api.getLens(name);

  // If problem context provided, generate beliefs
  if (problem_context) {
    const beliefs = generateBeliefStatements(name, problem_context, lens);
    const quality = evaluateWithOverall({
      lens: name,
      belief_statements: beliefs,
      problem_context
    });

    lens.belief_statements = beliefs;
    lens.quality_scores = quality;
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(lens, null, 2)
    }]
  };
}
```

## Tool Description Updates

Update descriptions to reflect new capabilities:

**search_lenses:**
```javascript
description: 'Search for FLUX lenses by query string. Optionally provide problem context to generate specific belief statements and quality scores.'
```

**get_lens:**
```javascript
description: 'Get detailed information about a specific FLUX lens. Optionally provide problem context to generate problem-specific insights, belief statements, and quality evaluation.'
```

Add problem_context as optional parameter to:
- search_lenses
- get_lens
- find_lens_journey
- find_bridge_lenses
- get_related_lenses

## CLI Integration

Update `cli.js` with same enhancements:

```javascript
// New commands
program
  .command('mode <problem>')
  .description('Suggest thinking mode for problem')
  .action(async (problem) => {
    const modes = matchThinkingMode(problem);
    console.log(formatThinkingModes(modes));
  });

program
  .command('refine <lens> <problem>')
  .description('Refine lens application with quality gates')
  .option('-t, --threshold <number>', 'Quality threshold', '0.7')
  .action(async (lens, problem, options) => {
    const result = refineApplication({
      lens,
      problem_context: problem,
      quality_threshold: parseFloat(options.threshold)
    });
    console.log(formatRefinement(result));
  });
```

## Expected Workflow

### Typical Agent Usage (With Phase 0):

1. **Start with mode suggestion:**
   ```
   suggest_thinking_mode("API stuck at 350ms despite optimizations")
   → Returns: systems_thinking mode + Pace Layering, System Boundaries, Leverage Points
   ```

2. **Apply recommended lenses:**
   ```
   get_lens("Pace Layering", problem_context="...")
   → Returns: Lens + belief statements + quality scores
   ```

3. **Refine if quality low:**
   ```
   refine_lens_application("Pace Layering", "...")
   → Returns: Improved beliefs after 2-3 iterations, quality 0.82
   ```

4. **Synthesize solution:**
   ```
   synthesize_solution({
     problem: "...",
     lenses_applied: [pace_layering_result, leverage_points_result]
   })
   → Returns: Structured markdown report
   ```

## Testing Integration

After integration, test with benchmark problems:

```bash
# Test thinking mode suggestion
node cli.js mode "200+ accessibility issues, 6-8 weeks to fix, also need 3 features"
# Should suggest: systems_thinking mode

# Test refinement
node cli.js refine "Pace Layering" "API stuck at 350ms despite optimizations"
# Should iterate 2-3 times, achieve quality > 0.7

# Test synthesis (requires multiple lens results)
# Use MCP tool or create test script
```

## Implementation Checklist

- [ ] Add 3 new tools to ListToolsRequestSchema
- [ ] Implement 3 new tools in CallToolRequestSchema
- [ ] Add problem_context parameter to existing tools
- [ ] Enhance existing tools with belief generation
- [ ] Update tool descriptions
- [ ] Add quality evaluation to all lens retrievals
- [ ] Integrate with CLI (cli.js)
- [ ] Test with benchmark problems
- [ ] Update README with new workflows
- [ ] Document examples in docs/

## Files to Modify

1. **index.js**: Add new tools, enhance existing (200-300 lines of changes)
2. **cli.js**: Add new commands (100-150 lines)
3. **README.md**: Document new capabilities (50-100 lines)
4. **package.json**: Update version to 2.0.0

## Estimated Implementation Time

- MCP integration: 2-3 hours
- CLI integration: 1 hour
- Testing: 1-2 hours
- Documentation: 1 hour
- **Total: 5-7 hours**

## Success Criteria

✅ All 3 new tools working in MCP
✅ Existing tools enhanced with beliefs
✅ CLI commands functional
✅ Benchmark test shows quality improvement
✅ README updated with examples
✅ Zero regressions in existing functionality

---

**Next Action:** Implement MCP integration in index.js following this guide
