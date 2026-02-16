# Interlens v2.0.0 Published to npm

**Date:** 2025-01-22
**Package:** interlens-mcp@2.0.0
**Registry:** https://registry.npmjs.org/
**npm URL:** https://www.npmjs.com/package/interlens-mcp

## Publication Details

**Published by:** gensysven <mistakeknot@vibeguider.org>
**Published:** Just now (2025-01-22)
**Package size:** 75.4 kB (tarball), 268.6 kB (unpacked)
**Total files:** 21
**Shasum:** d224c4769e167dbab40a9a0b985bb201d9d0138e

## What's New in v2.0.0

### Phase 0 Enhanced Thinking Capabilities

**Major Version Bump:** 1.1.0 → 2.0.0 (breaking changes in tool responses)

### New MCP Tools (3)

1. **`suggest_thinking_mode`** - Recommends 1 of 6 hierarchical thinking modes based on problem patterns
   - Input: problem_description
   - Output: Recommended modes with match scores, lenses, and workflow guidance
   - Reduces cognitive load (6 modes vs 256+ lenses)

2. **`synthesize_solution`** - Combines multiple lens applications into structured solution report
   - Input: problem, lenses_applied (with beliefs), thinking_mode
   - Output: Markdown report with problem reframe, root cause, sequenced actions
   - Ties insights together coherently

3. **`refine_lens_application`** - Iteratively improves lens application quality
   - Input: lens, problem_context, quality_threshold (default: 0.7)
   - Output: Refined beliefs with quality scores and iteration history
   - Max 3 iterations, stops when threshold met

### Enhanced Existing Tools (3)

1. **`search_lenses`** - Now accepts optional `problem_context` parameter
   - Generates belief statements + quality scores for each result
   - Returns specific insights instead of just lens definitions

2. **`get_lens`** - Now accepts optional `problem_context` parameter
   - Generates problem-specific beliefs with confidence scores
   - Includes quality evaluation (specificity, novelty, actionability, coherence)

3. **`analyze_with_lens`** - Completely rewritten
   - Returns belief statements + quality scores (not templated text)
   - Each belief includes: confidence, reasoning, evidence, lateral connections, implications

### New Modules (5)

All modules in `lib/` directory (2,224 total lines):

1. **`lib/thinking-modes.js`** (510 lines)
   - 6 hierarchical thinking modes (systems, strategic, diagnostic, innovation, adaptive, organizational)
   - Pattern matching for problem → mode suggestion
   - Structured workflows per mode

2. **`lib/belief-statements.js`** (485 lines)
   - SaLT-inspired specific insights (not abstract definitions)
   - Confidence scores + reasoning traces
   - Lateral connections to related lenses
   - Lens-specific templates for high-use lenses

3. **`lib/quality-evaluation.js`** (400+ lines)
   - 4-criteria scoring: specificity, novelty, actionability, coherence
   - Pattern-based heuristics (no LLM calls)
   - Quality gates enable iterative refinement
   - 0.7 default threshold

4. **`lib/synthesis.js`** (380+ lines)
   - AutoTRIZ Module 4 inspired
   - Combines multiple lens insights into solution reports
   - Problem reframe, root cause, sequenced actions
   - Markdown formatting

5. **`lib/refinement.js`** (330+ lines)
   - Quality-gated iterative improvement
   - Max 3 iterations, 0.7 threshold
   - Dimension-specific refinements (specificity, novelty, actionability, coherence)
   - Stops when threshold met or no improvement

### Architecture

**Zero LLM Costs Maintained:**
- All logic is template/heuristic-based
- No API keys required for Interlens
- Users bring their own AI (Claude Desktop, etc.)

**ES Module Syntax:**
- All modules use `export` (not `module.exports`)
- Compatible with MCP SDK and modern Node.js

### Benchmark Validation

**Tested on 3 sample problems:**
- performance-stuck (code domain)
- accessibility-improvements (design domain)
- feature-prioritization (product domain)

**Results:**
- Phase 0 (v2.0.0) avg: 0.87/10
- With-Interlens (v1.x) avg: 0.648/10
- Baseline (no tools) avg: 0.242/10

**Improvements:**
- Phase 0 vs Baseline: **+260%** (target was +67%) ✅
- Phase 0 vs v1.x: **+34%** additional improvement ✅

**Quality Scores (0-1 scale):**
- Specificity: 0.82-0.88
- Novelty: 0.85-0.90
- Actionability: 0.86-0.90
- Coherence: 0.84-0.90

## Installation

### Global Installation (Recommended)

```bash
npm install -g interlens-mcp
```

This installs both:
- **MCP server** (for Claude Desktop, etc.)
- **CLI tool** (terminal command: `interlens`)

### Local Installation

```bash
npm install interlens-mcp
```

### Verify Installation

```bash
interlens --version  # Should show: 2.0.0
interlens search "systems thinking"
```

## Usage

### MCP Server (Claude Desktop)

Update `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "interlens": {
      "command": "npx",
      "args": ["-y", "-p", "interlens-mcp@latest", "interlens-mcp"]
    }
  }
}
```

Or with global installation:

```json
{
  "mcpServers": {
    "interlens": {
      "command": "interlens-mcp"
    }
  }
}
```

> **Note:** As of v2.2.1, you must explicitly invoke `interlens-mcp` (the MCP server binary) rather than just the package name, since the package also includes a CLI tool (`interlens`).

Restart Claude Desktop to load the server.

### CLI Tool

```bash
# Search for lenses
interlens search "systems thinking"

# Get specific lens
interlens get "Pace Layering"

# Random provocation
interlens random

# Creative exploration
interlens journey "Leadership" "Innovation"
interlens bridge "Strategy" "Design"
interlens central --measure betweenness
```

### Phase 0 Workflow (MCP)

**Typical agent workflow:**

1. **Suggest thinking mode:**
   ```
   Use suggest_thinking_mode tool with problem description
   → Returns: systems_thinking mode with Pace Layering, System Boundaries, Leverage Points
   ```

2. **Apply recommended lenses:**
   ```
   Use analyze_with_lens for each lens
   → Returns: Belief statements with confidence scores + quality evaluation
   ```

3. **Refine if needed:**
   ```
   If quality < 0.7, use refine_lens_application
   → Returns: Improved beliefs after 2-3 iterations
   ```

4. **Synthesize solution:**
   ```
   Use synthesize_solution with all lens applications
   → Returns: Structured markdown report with problem reframe, actions, tradeoffs
   ```

## Breaking Changes from v1.x

### Tool Response Format Changes

**`analyze_with_lens` (BREAKING):**
- **Before (v1.x):** Returned templated text analysis
- **After (v2.0.0):** Returns JSON with belief_statements + quality_scores

**`search_lenses` (Backward compatible):**
- Still returns lens list
- New optional `problem_context` parameter adds beliefs to each result

**`get_lens` (Backward compatible):**
- Still returns lens object
- New optional `problem_context` parameter adds beliefs + quality

### Migration Guide

**If using `analyze_with_lens`:**

v1.x code expecting text response:
```javascript
const result = await analyze_with_lens({ text: "...", lens_name: "Pace Layering" });
// result = "Analyzing through Pace Layering lens: ..."
```

v2.0.0 code receives JSON:
```javascript
const result = await analyze_with_lens({ text: "...", lens_name: "Pace Layering" });
// result = { name: "Pace Layering", belief_statements: [...], quality_scores: {...} }
```

**If using `search_lenses` or `get_lens` without problem_context:**
- No changes required (backward compatible)
- Optionally add `problem_context` parameter to get beliefs

## Package Contents

**Published files (21):**
- Core: index.js (38.3 kB), cli.js (17.3 kB), api-client.js (5.0 kB)
- Modules: lib/*.js (5 files, 65.5 kB total)
- Docs: docs/*.md (7 files, 125.0 kB total)
- Examples: examples/*.json (2 files, 246 B total)
- Other: LICENSE, README.md, package.json

**Not published:**
- benchmark/ (test suite)
- node_modules/
- .cache/
- .gitignore, .env

## Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^0.5.0",
  "node-fetch": "^3.3.2",
  "express": "^4.18.2",
  "cors": "^2.8.5"
}
```

No dependency changes from v1.x.

## Links

- **npm Package:** https://www.npmjs.com/package/interlens-mcp
- **GitHub:** https://github.com/mistakeknot/Interlens
- **Documentation:** https://github.com/mistakeknot/Interlens#readme
- **API Docs:** docs/API.md
- **Usage Guide:** docs/USAGE.md
- **Phase 0 Integration:** docs/PHASE0C_INTEGRATION.md

## Keywords

New keywords in v2.0.0:
- creative-problem-solving
- belief-statements
- quality-evaluation

Full list: mcp, flux, lens, interlens, cli, systems-thinking, knowledge-graph, creative-problem-solving, belief-statements, quality-evaluation

## Support

- **Issues:** https://github.com/mistakeknot/Interlens/issues
- **License:** MIT
- **Maintainer:** gensysven <mistakeknot@vibeguider.org>

## Next Steps

**For Users:**
1. Update installation: `npm install -g interlens-mcp@2.0.0`
2. Restart Claude Desktop (if using MCP)
3. Try new workflow: suggest_thinking_mode → analyze_with_lens → synthesize_solution

**For Contributors:**
- Full benchmark suite available in benchmark/ directory
- Validation results in benchmark/results/PHASE0_RESULTS.md
- Research synthesis in docs/plans/

**Future Development:**
- CLI integration for Phase 0 tools (optional)
- Full 15-problem benchmark validation (optional)
- Additional thinking modes (optional)
- More lens-specific belief templates (optional)

---

**Published successfully on 2025-01-22**
**Version:** 2.0.0
**Status:** Production ready ✅
