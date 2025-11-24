# Changelog

All notable changes to linsenkasten-mcp will be documented in this file.

## [2.1.0] - 2025-11-24

### Added
- **100% Dialectic Contrast Coverage**: All 288 lenses now have at least one thesis/antithesis relationship
- **232 contrast pairs**: 827% increase from the original 25 pairs
- **Curated contrasts for edge cases**: 15 manually curated high-quality contrasts for lenses that didn't match automatically

### Improved
- **Contrast quality**: All pairs within semantic sweet spot (0.65-0.92 cosine distance)
- **Dialectic detection**: Algorithm uses 70% embedding distance + 30% dialectic keyword scoring
- **Documentation**: Updated README and CLAUDE.md with contrast examples and workflows

### Example Contrasts
```
Kintsugi ↔ Fleet of Theseus (repair with history vs identity through replacement)
Steelmanning ↔ Blind Spots (engaging vs avoiding opposition)
Regression to the Mean ↔ Compounding Loops (returning to average vs amplifying deviation)
Fuzzy Planning ↔ Draw Me a Bridge (embracing uncertainty vs demanding precision)
```

### CLI Usage
```bash
# Every lens now returns meaningful contrasts
linsenkasten contrasts "Kintsugi"
linsenkasten contrasts "Stoicism and Gratitude"
linsenkasten contrasts "Composable Alphabets"
```

## [1.1.0] - 2025-11-21

### Added
- **Gap Detection System**: Analyze conceptual coverage across 28 FLUX thematic frames to identify thinking blind spots
- **`gaps` CLI command**: `linsenkasten gaps --context "Lens1" --context "Lens2"` shows which frames you've explored vs. neglected
- **Gap-aware random selection**: `linsenkasten random --context "Lens1" --context "Lens2"` uses 80/15/5 biasing to favor unexplored dimensions
- **`detect_thinking_gaps` MCP tool**: Full gap analysis for AI agents in Claude Desktop
- **Context parameter for `random_lens_provocation` MCP tool**: Enables stateless gap tracking

### How It Works
- Pass lens names you've explored via `--context` flags (can be repeated)
- System maps lenses to thematic frames and calculates coverage
- Identifies unexplored frames (0 lenses), underexplored frames (1 lens), and explored frames (2+ lenses)
- Biased random selection: 80% from unexplored, 15% from underexplored, 5% from any frame
- Stateless design: no session tracking, just pass the list each time

### Example
```bash
linsenkasten gaps --context "Pace Layering" --context "Innovation" --context "Systems Thinking"
# Output: Coverage: 7.1% (2/28 frames)
#         Blind spots: 26 unexplored frames

linsenkasten random --context "Pace Layering" --context "Innovation"
# Returns: Lens from unexplored frame (80% chance)
```

## [1.0.1] - 2025-01-21

### Improved
- **Semantic search now works properly**: Search queries now use OpenAI embeddings + pgvector for true semantic similarity instead of keyword matching
- **Better search results**: Queries like "decision making", "leadership", and "systems thinking" now return highly relevant lenses
- **No breaking changes**: All existing commands work the same, just better results

### Technical Details
- API backend now uses `search_lenses_by_embedding()` for semantic search
- Typical search now returns 10-30 relevant results vs. 0-2 with keyword matching
- All creative navigation tools (journey, bridge, neighborhood, contrasts) continue to work perfectly

## [1.0.0] - 2025-01-20

### Added
- Initial release with MCP server and CLI tool
- 8 creative thinking commands (search, journey, bridge, central, neighborhood, contrasts, random, get)
- Integration with FLUX lens database (256+ lenses)
- Graph-based conceptual navigation
