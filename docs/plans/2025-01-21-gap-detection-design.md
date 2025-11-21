# Gap Detection via Smart Suggestions - Design Document

**Date:** 2025-01-21
**Author:** Design session with Claude Code
**Status:** Approved for Implementation

## Executive Summary

This design adds intelligent gap detection to Linsenkasten's creative thinking tools, transforming it from a "pull" system (agents request lenses) to a "nudge" system that guides agents toward unexplored conceptual dimensions. This enhances cognitive coverage and prevents agents from getting stuck in familiar thinking patterns.

## Goals

1. **Enhance Cognitive Augmentation**: Help AI agents explore diverse conceptual dimensions, not just familiar ones
2. **Maintain Exploratory Feel**: Nudge, don't force - preserve serendipity and agent autonomy
3. **Zero Breaking Changes**: All existing functionality works identically
4. **Simple Implementation**: Leverage existing frame structure, no complex AI tagging

## Approach: Frame-Based Coverage Analysis

### What Are Frames?

FLUX lenses are organized into 20+ thematic frames (e.g., "Systems Thinking", "Organizational Dynamics", "Cognitive Models", "Temporal Dynamics", "Economic Patterns"). This metadata already exists in Supabase.

### Coverage Analysis Algorithm

1. **Parse Context**: Agent provides recently explored lens names
2. **Resolve to Frames**: Look up which frame(s) each lens belongs to
3. **Calculate Coverage**: Count lenses per frame, identify gaps
4. **Identify Gaps**:
   - Unexplored frames: 0 lenses used
   - Underexplored frames: 1 lens used
   - Explored frames: 2+ lenses used

### Biasing Strategy

Apply weighted random selection to suggestions:
- **80% Strong Bias**: Suggest from completely unexplored frames
- **15% Medium Bias**: Suggest from underexplored frames (1 lens)
- **5% Serendipity**: Random from any frame (maintain exploration)

**Example:** If agent explored 5 "Systems Thinking" lenses and 2 "Strategy" lenses, next random provocation has 80% chance of suggesting from frames like "Cognitive Models", "Temporal Dynamics", or "Social Patterns".

## Three Interaction Patterns

### 1. Passive Mode (Existing Behavior)

**No changes to existing usage:**
```bash
linsenkasten random
→ Pure randomness, no bias
```

### 2. Guided Mode (Enhanced Tools)

**Random provocation with context:**
```bash
linsenkasten random --context "Systems Thinking,Feedback Loops,Emergence"
→ Gap-biased suggestion with explanation
```

**Bridge discovery with context:**
```bash
linsenkasten bridge "Leadership" "Innovation" --context "Systems Thinking,Strategy"
→ Prioritizes bridges crossing from explored→unexplored frames
```

### 3. Reflective Mode (New Tool)

**Explicit gap detection:**
```bash
linsenkasten gaps --context "Systems Thinking,Feedback Loops,Strategy,Leadership"
→ Full coverage report + specific suggestions from gaps
```

**Response format:**
```json
{
  "success": true,
  "coverage": {
    "explored_frames": {
      "Systems & Complexity": 2,
      "Strategic Thinking": 1,
      "Leadership": 1
    },
    "unexplored_frames": ["Temporal Dynamics", "Cognitive Models", ...],
    "total_frames": 23,
    "coverage_percentage": 13
  },
  "suggestions": [
    {
      "frame": "Temporal Dynamics",
      "sample_lenses": ["Pace Layers", "Lindy Effect", "Cathedral Thinking"]
    },
    {
      "frame": "Cognitive Models",
      "sample_lenses": ["Cognitive Bias", "Mental Models", "Fast and Slow Thinking"]
    }
  ]
}
```

## Technical Implementation

### Architecture Overview

**Components:**
- **API Layer** (linsenkasten-api): Core logic in `lens_search_api.py`
- **Data Layer** (Supabase): Frame metadata and lens-frame relationships
- **MCP/CLI Layer** (linsenkasten): Updated tool schemas and CLI flags

**Key Principle:** Stateless design - context is optional, agent-controlled, no session tracking required.

### API Changes

#### New Supabase Query (supabase_store.py)

```python
def get_frames_for_lenses(self, lens_names: List[str]) -> Dict[str, List[str]]:
    """
    Return mapping of lens_name -> [frame_names]

    Args:
        lens_names: List of lens names to look up

    Returns:
        Dictionary mapping each lens to its frame(s)
        Example: {"Systems Thinking": ["Systems & Complexity"], ...}
    """
    response = self.client.table('lenses') \
        .select('name, frames') \
        .in_('name', lens_names) \
        .execute()

    return {lens['name']: lens.get('frames', []) for lens in response.data}
```

#### Helper Functions (lens_search_api.py)

**1. Calculate Coverage:**
```python
def calculate_frame_coverage(context_lens_names: List[str]) -> Dict:
    """
    Analyze which frames have been explored vs. unexplored.

    Args:
        context_lens_names: List of recently explored lens names

    Returns:
        Dictionary with explored/unexplored/underexplored frame lists
    """
    # Get all available frames
    all_frames = supabase_store.get_all_frames()

    # Map context lenses to their frames
    lens_frame_map = supabase_store.get_frames_for_lenses(context_lens_names)

    # Count frame usage
    explored_frames = {}
    for lens, frames in lens_frame_map.items():
        for frame in frames:
            explored_frames[frame] = explored_frames.get(frame, 0) + 1

    # Categorize frames
    unexplored = [f for f in all_frames if f not in explored_frames]
    underexplored = [f for f, count in explored_frames.items() if count == 1]

    return {
        'explored': explored_frames,
        'unexplored': unexplored,
        'underexplored': underexplored,
        'total_frames': len(all_frames)
    }
```

**2. Bias Selection:**
```python
def bias_lens_selection(all_lenses: List[Dict], coverage_data: Dict) -> Dict:
    """
    Apply 80/15/5 weighted random selection toward gaps.

    Args:
        all_lenses: Full lens catalog
        coverage_data: Output from calculate_frame_coverage()

    Returns:
        Selected lens dictionary
    """
    import random

    # Categorize lenses by frame coverage
    unexplored_lenses = [
        l for l in all_lenses
        if any(f in coverage_data['unexplored'] for f in l.get('frames', []))
    ]
    underexplored_lenses = [
        l for l in all_lenses
        if any(f in coverage_data['underexplored'] for f in l.get('frames', []))
    ]

    # Apply weighted random selection
    rand = random.random()

    if rand < 0.80 and unexplored_lenses:
        return random.choice(unexplored_lenses)
    elif rand < 0.95 and underexplored_lenses:
        return random.choice(underexplored_lenses)
    else:
        return random.choice(all_lenses)
```

**3. Generate Gap Report:**
```python
def generate_gap_report(coverage_data: Dict, selected_lens: Dict) -> Dict:
    """
    Format gap analysis for API response.

    Args:
        coverage_data: Output from calculate_frame_coverage()
        selected_lens: The lens that was selected

    Returns:
        Gap analysis dictionary for response
    """
    lens_frame = selected_lens.get('frames', ['Unknown'])[0]

    return {
        'explored_frames': list(coverage_data['explored'].keys()),
        'unexplored_count': len(coverage_data['unexplored']),
        'suggested_from_frame': lens_frame,
        'was_gap_biased': lens_frame in coverage_data['unexplored'],
        'coverage': {
            'explored': len(coverage_data['explored']),
            'unexplored': len(coverage_data['unexplored']),
            'total': coverage_data['total_frames']
        }
    }
```

#### Modified Endpoints

**Enhanced `/api/v1/creative/random`:**
```python
@app.route('/api/v1/creative/random', methods=['GET'])
def random_lens_provocation():
    """
    Get random lens provocation, optionally biased toward unexplored frames.

    Query params:
        context[] (optional): List of recently explored lens names

    Returns:
        Random lens + optional gap_analysis
    """
    context = request.args.getlist('context')

    if context:
        # Gap-biased mode
        coverage = calculate_frame_coverage(context)
        selected_lens = bias_lens_selection(all_lenses, coverage)
        gap_analysis = generate_gap_report(coverage, selected_lens)
    else:
        # Original behavior
        selected_lens = random.choice(all_lenses)
        gap_analysis = None

    return jsonify({
        'success': True,
        'lens': selected_lens,
        'gap_analysis': gap_analysis
    })
```

**Enhanced `/api/v1/creative/bridges`:**
```python
@app.route('/api/v1/creative/bridges', methods=['GET'])
def find_bridge_lenses():
    """
    Find bridges between concepts, optionally prioritizing frame-crossing.

    Query params:
        lenses[] (required): Lens names to bridge between
        context[] (optional): Recently explored lenses for frame-crossing bias

    Returns:
        Bridge lenses, prioritized by frame diversity if context provided
    """
    target_lenses = request.args.getlist('lenses')
    context = request.args.getlist('context')

    # Find bridges using existing algorithm
    bridges = lens_graph.find_bridge_lenses(target_lenses)

    if context:
        # Analyze frame coverage
        coverage = calculate_frame_coverage(context + target_lenses)

        # Boost bridges from unexplored frames
        for bridge in bridges:
            bridge_frames = bridge.get('frames', [])
            if any(f in coverage['unexplored'] for f in bridge_frames):
                bridge['score'] *= 1.5  # Boost frame-crossing bridges

        # Re-sort by boosted scores
        bridges.sort(key=lambda b: b['score'], reverse=True)

        gap_analysis = {
            'prioritized_frame_crossing': True,
            'coverage': coverage
        }
    else:
        gap_analysis = None

    return jsonify({
        'success': True,
        'bridges': bridges,
        'gap_analysis': gap_analysis
    })
```

**New `/api/v1/creative/gaps`:**
```python
@app.route('/api/v1/creative/gaps', methods=['GET'])
def detect_thinking_gaps():
    """
    Explicit gap detection - analyze coverage and suggest from gaps.

    Query params:
        context[] (required): List of recently explored lens names

    Returns:
        Coverage analysis + specific suggestions from unexplored frames
    """
    context = request.args.getlist('context')

    if not context:
        return jsonify({
            'success': False,
            'error': 'context parameter required'
        }), 400

    # Calculate coverage
    coverage = calculate_frame_coverage(context)

    # Generate suggestions from unexplored frames
    suggestions = []
    for frame in coverage['unexplored'][:5]:  # Top 5 gaps
        frame_lenses = [
            l for l in all_lenses
            if frame in l.get('frames', [])
        ]

        if frame_lenses:
            suggestions.append({
                'frame': frame,
                'sample_lenses': random.sample(
                    frame_lenses,
                    min(3, len(frame_lenses))
                )
            })

    return jsonify({
        'success': True,
        'coverage': {
            'explored_frames': coverage['explored'],
            'unexplored_frames': coverage['unexplored'],
            'underexplored_frames': coverage['underexplored'],
            'total_frames': coverage['total_frames'],
            'coverage_percentage': (
                len(coverage['explored']) / coverage['total_frames'] * 100
            )
        },
        'suggestions': suggestions
    })
```

### MCP Tool Updates (linsenkasten/index.js)

**Updated `random_lens_provocation` tool:**
```javascript
{
  name: 'random_lens_provocation',
  description: 'Get creative spark with random lens. Optionally provide context to bias toward unexplored conceptual dimensions.',
  inputSchema: {
    type: 'object',
    properties: {
      context: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: Recently explored lens names for gap-biased suggestions'
      }
    }
  }
}
```

**Updated `find_bridge_lenses` tool:**
```javascript
// Add to existing schema:
context: {
  type: 'array',
  items: { type: 'string' },
  description: 'Optional: Explored lenses to prioritize frame-crossing bridges'
}
```

**New `detect_thinking_gaps` tool:**
```javascript
{
  name: 'detect_thinking_gaps',
  description: 'Analyze your exploration coverage and identify unexplored conceptual dimensions. Helps break out of thinking ruts.',
  inputSchema: {
    type: 'object',
    properties: {
      context: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lens names you have explored so far in this thinking session',
        minItems: 1
      }
    },
    required: ['context']
  }
}
```

**Tool execution handler:**
```javascript
case 'detect_thinking_gaps': {
  const context = args.context;
  const params = new URLSearchParams();

  context.forEach(lens => params.append('context[]', lens));

  const result = await this.fetchFromAPI(
    `/api/v1/creative/gaps?${params.toString()}`
  );

  // Format as markdown for better readability
  let text = '# Thinking Coverage Analysis\n\n';
  text += `**Coverage:** ${result.coverage.coverage_percentage.toFixed(1)}% `;
  text += `(${Object.keys(result.coverage.explored_frames).length}/${result.coverage.total_frames} frames explored)\n\n`;

  text += '## Explored Frames\n';
  for (const [frame, count] of Object.entries(result.coverage.explored_frames)) {
    text += `- **${frame}**: ${count} lens${count > 1 ? 'es' : ''}\n`;
  }

  text += '\n## Unexplored Dimensions\n';
  text += 'Consider exploring these conceptual areas:\n\n';

  for (const suggestion of result.suggestions) {
    text += `### ${suggestion.frame}\n`;
    text += 'Sample lenses:\n';
    for (const lens of suggestion.sample_lenses) {
      text += `- **${lens.name}**: ${lens.definition}\n`;
    }
    text += '\n';
  }

  return {
    content: [{
      type: 'text',
      text: text
    }]
  };
}
```

### CLI Updates (linsenkasten/cli.js)

**Add `--context` flag to random command:**
```javascript
if (args[0] === 'random') {
  const contextIdx = args.indexOf('--context');
  const context = contextIdx !== -1 ? args[contextIdx + 1].split(',') : null;

  const result = await randomLensProvocation(context);

  // Display result
  console.log(formatLens(result.lens));

  if (result.gap_analysis) {
    console.log('\n' + chalk.cyan('Gap Analysis:'));
    console.log(`Suggested from: ${chalk.yellow(result.gap_analysis.suggested_from_frame)}`);
    console.log(`Coverage: ${result.gap_analysis.coverage.explored}/${result.gap_analysis.coverage.total} frames explored`);
  }
}
```

**Add new `gaps` command:**
```javascript
if (args[0] === 'gaps') {
  const contextIdx = args.indexOf('--context');

  if (contextIdx === -1) {
    console.error('Error: --context required for gaps command');
    console.log('Usage: linsenkasten gaps --context "Lens1,Lens2,Lens3"');
    process.exit(1);
  }

  const context = args[contextIdx + 1].split(',');
  const result = await detectThinkingGaps(context);

  console.log(chalk.bold('\nThinking Coverage Analysis'));
  console.log(`Coverage: ${chalk.cyan(result.coverage.coverage_percentage.toFixed(1) + '%')}`);
  console.log(`Frames explored: ${Object.keys(result.coverage.explored_frames).length}/${result.coverage.total_frames}\n`);

  console.log(chalk.bold('Explored Frames:'));
  for (const [frame, count] of Object.entries(result.coverage.explored_frames)) {
    console.log(`  ${chalk.green('✓')} ${frame}: ${count} lens${count > 1 ? 'es' : ''}`);
  }

  console.log(chalk.bold('\nUnexplored Dimensions:'));
  for (const suggestion of result.suggestions) {
    console.log(`\n  ${chalk.yellow(suggestion.frame)}`);
    console.log('  Sample lenses:');
    for (const lens of suggestion.sample_lenses) {
      console.log(`    • ${chalk.cyan(lens.name)}`);
    }
  }
}
```

## Testing & Validation

### Manual Testing

**1. Test Zero Context (Baseline):**
```bash
curl "https://lens-api.up.railway.app/api/v1/creative/random"
# Should work exactly as before, no gap_analysis field
```

**2. Test Single Frame Context:**
```bash
curl "https://lens-api.up.railway.app/api/v1/creative/random?context[]=Systems%20Thinking&context[]=Feedback%20Loops&context[]=Emergence"
# All 3 from same frame → expect 80% from different frame
# gap_analysis should show 1 explored, 22 unexplored
```

**3. Test Mixed Frame Context:**
```bash
curl "https://lens-api.up.railway.app/api/v1/creative/random?context[]=Systems%20Thinking&context[]=Pace%20Layers&context[]=Cognitive%20Bias"
# Multiple frames → expect bias toward completely unexplored
```

**4. Test Detect Gaps Tool:**
```bash
curl "https://lens-api.up.railway.app/api/v1/creative/gaps?context[]=Systems%20Thinking&context[]=Feedback%20Loops"
# Expect: Clear report + 5 frame suggestions with sample lenses
```

**5. Test CLI:**
```bash
linsenkasten random --context "Systems Thinking,Feedback Loops"
linsenkasten gaps --context "Systems Thinking,Feedback Loops,Strategy"
```

**6. Test MCP in Claude Desktop:**
```
Use random_lens_provocation with context: ["Systems Thinking", "Feedback Loops"]
Use detect_thinking_gaps with context: ["Systems Thinking", "Strategy", "Leadership"]
```

### Validation Script

**Verify 80/15/5 distribution:**
```python
import requests
import json
from collections import defaultdict

# Test parameters
API_BASE = "https://lens-api.up.railway.app/api/v1"
CONTEXT = ["Systems Thinking", "Feedback Loops", "Emergence"]  # All from Systems frame
TRIALS = 100

# Get frame info for context
context_frames = set()
for lens in CONTEXT:
    # Look up lens to get its frame
    # (would need actual lens data)
    context_frames.add("Systems & Complexity")

# Run trials
results = {'unexplored': 0, 'underexplored': 0, 'explored': 0, 'frames': defaultdict(int)}

for i in range(TRIALS):
    params = '&'.join([f'context[]={lens}' for lens in CONTEXT])
    response = requests.get(f'{API_BASE}/creative/random?{params}')
    data = response.json()

    lens_frame = data['lens'].get('frames', ['Unknown'])[0]
    results['frames'][lens_frame] += 1

    if lens_frame in context_frames:
        results['explored'] += 1
    else:
        results['unexplored'] += 1

# Print results
print(f"\n=== Results over {TRIALS} trials ===")
print(f"Unexplored frames: {results['unexplored']} ({results['unexplored']/TRIALS*100:.1f}%)")
print(f"Explored frames: {results['explored']} ({results['explored']/TRIALS*100:.1f}%)")
print(f"\nExpected: ~80% unexplored, ~5% explored")

print(f"\nFrame distribution:")
for frame, count in sorted(results['frames'].items(), key=lambda x: -x[1]):
    print(f"  {frame}: {count} ({count/TRIALS*100:.1f}%)")
```

### Edge Cases

**Test Case 1: Invalid Lens Names**
```bash
curl "...?context[]=InvalidLens&context[]=Systems%20Thinking"
# Expected: Ignore invalid, process valid ones
```

**Test Case 2: All Frames Covered**
```bash
# Provide lenses from all 23 frames
curl "...?context[]=Lens1&context[]=Lens2&...&context[]=Lens23"
# Expected: Fall back to pure random (no gaps exist)
```

**Test Case 3: Duplicate Context**
```bash
curl "...?context[]=Systems%20Thinking&context[]=Systems%20Thinking"
# Expected: Deduplicate before analysis
```

**Test Case 4: Empty Context Array**
```bash
curl "...?context[]="
# Expected: Treat as no context, original behavior
```

### Success Criteria

✅ Original behavior preserved when context omitted
✅ 80/15/5 distribution holds over 100 trials (±10% tolerance)
✅ Gap analysis accurately reflects frame coverage
✅ Detect gaps returns actionable suggestions (5 frames, 3 lenses each)
✅ MCP tools work in Claude Desktop with context parameter
✅ CLI tools work with `--context` flag
✅ Bridge tool prioritizes frame-crossing bridges when context provided
✅ Edge cases handled gracefully

## Implementation Plan

### Phase 1: API Foundation (linsenkasten-api)

**Files to modify:**
1. `supabase_store.py` - Add `get_frames_for_lenses()`
2. `lens_search_api.py` - Add helper functions and modify endpoints

**Tasks:**
- [ ] Add `get_frames_for_lenses()` to supabase_store.py
- [ ] Add `calculate_frame_coverage()` helper
- [ ] Add `bias_lens_selection()` helper
- [ ] Add `generate_gap_report()` helper
- [ ] Modify `/api/v1/creative/random` endpoint
- [ ] Modify `/api/v1/creative/bridges` endpoint
- [ ] Add `/api/v1/creative/gaps` endpoint
- [ ] Test locally with curl
- [ ] Deploy to Railway
- [ ] Test production endpoints

### Phase 2: MCP Integration (linsenkasten)

**Files to modify:**
1. `api-client.js` - Add functions for new endpoints/parameters
2. `index.js` - Update tool schemas and handlers

**Tasks:**
- [ ] Update `randomLensProvocation()` to accept context
- [ ] Update `findBridgeLenses()` to accept context
- [ ] Add `detectThinkingGaps()` function
- [ ] Update MCP tool schemas
- [ ] Add tool execution handlers
- [ ] Test locally with MCP inspector
- [ ] Test in Claude Desktop

### Phase 3: CLI Integration (linsenkasten)

**Files to modify:**
1. `cli.js` - Add `--context` flag and `gaps` command

**Tasks:**
- [ ] Add `--context` flag to `random` command
- [ ] Add `--context` flag to `bridge` command
- [ ] Add new `gaps` command
- [ ] Update help text
- [ ] Test all CLI commands
- [ ] Update README with examples

### Phase 4: Documentation & Release

**Files to modify/create:**
1. `linsenkasten-api/CHANGELOG.md` - Document new feature
2. `linsenkasten-api/CLAUDE.md` - Update with gap detection info
3. `linsenkasten/CHANGELOG.md` - Document new tools
4. `linsenkasten/README.md` - Add gap detection examples
5. `linsenkasten/docs/USAGE.md` - Add gap detection workflows

**Tasks:**
- [ ] Update API documentation
- [ ] Update MCP documentation
- [ ] Add usage examples
- [ ] Create demo video/screenshots
- [ ] Bump versions (API + MCP/CLI)
- [ ] Publish to npm
- [ ] Announce on GitHub/socials

## Future Enhancements

**Short-term (v1.1):**
- Add `--format json` to CLI for programmatic use
- Add coverage visualization (ASCII bar charts)
- Persist agent context across MCP sessions (optional)

**Medium-term (v1.2):**
- Add manual dimension taxonomy alongside frames (temporal, spatial, social, etc.)
- Multi-dimensional tagging (lenses can score on multiple dimensions)
- Graph-derived clusters as alternative dimensions

**Long-term (v2.0):**
- AI-generated conceptual dimensions from embedding space
- Collaborative gap detection (multi-agent coordination)
- Learning system (track which gaps led to insights)
- Integration with InfraNodus for visual gap detection

## References

**Research Sources:**
- InfraNodus gap detection methodology
- KG-RAG framework (bridging knowledge + creativity)
- MCP ecosystem (clear-thought-patterns server)
- Computational creativity / conceptual blending theory

**Related Design Documents:**
- FLUX frames taxonomy (existing Supabase data)
- NetworkX graph structure (lens_search_api.py)
- MCP protocol specification (modelcontextprotocol.io)

---

**Design Approved:** 2025-01-21
**Ready for Implementation:** Yes
**Next Step:** Begin Phase 1 (API Foundation)
