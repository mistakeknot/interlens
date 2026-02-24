# Interlens

A cognitive augmentation toolkit that gives AI agents access to 288 FLUX analytical lenses through graph-based navigation, creative thinking tools, and conceptual exploration. Works with Claude, ChatGPT, Codex CLI, and any AI platform via REST API.

[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is interlens?

> **✨ New in v2.2.1**: Fixed MCP server startup issues with Claude Desktop. Now provides separate `interlens` (CLI) and `interlens-mcp` (MCP server) commands.

Interlens ("lens box" in German) is a knowledge graph of analytical frameworks from the [FLUX Collective](https://read.fluxcollective.org/) newsletter. It transforms 288 conceptual lenses into an explorable graph that AI agents can navigate to:

- **Make logical leaps** through bridge discovery
- **Navigate concept space** systematically
- **Find paradoxes** for dialectic thinking (232 contrast pairs, 100% lens coverage!)
- **Break habitual patterns** with creative provocations
- **Explore connections** between disparate ideas

## Quick start

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "interlens": {
      "url": "https://interlens.com/api/mcp/v1/sse"
    }
  }
}
```

**Config location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Restart Claude Desktop. Done! 🎉

## Command line interface

Interlens also includes a powerful CLI for exploring lenses directly from your terminal:

```bash
# Install globally
npm install -g interlens-mcp

# Search for lenses
interlens search "systems thinking"

# Get lens details
interlens get "Pace Layering"

# Find conceptual journey
interlens journey "Systems Thinking" "Innovation"

# Get random provocation
interlens random

# Analyze thinking gaps (NEW in v1.1.0)
interlens gaps --context "Pace Layering" --context "Innovation"

# Get gap-aware random lens (NEW in v1.1.0)
interlens random --context "Pace Layering" --context "Innovation"

# Find bridge lenses
interlens bridge "Leadership" "Complexity" "Communication"

# Get central lenses
interlens central --measure betweenness --limit 10

# Explore neighborhood
interlens neighborhood "Pace Layering" --radius 2

# Find contrasts
interlens contrasts "Explore vs Exploit"
```

### CLI features
- **Colorized output** - Beautiful terminal formatting
- **Flexible queries** - Natural language lens names
- **Scriptable** - Pipe-able output for automation
- **Fast** - Direct API access with local caching
- **Help system** - Run `interlens help` for usage info

### CLI examples

**Quick lens lookup:**
```bash
interlens get "Systems Thinking"
```

**Find connections between concepts:**
```bash
interlens journey "Pace Layering" "Innovation Cascade"
```

**Creative problem-solving workflow:**
```bash
# 1. Get random provocation
interlens random

# 2. Bridge back to your domain
interlens bridge "Random Lens Name" "Product Design"

# 3. Explore the bridge
interlens neighborhood "Bridge Lens Name"
```

**Explore the knowledge graph:**
```bash
# Find most important concepts
interlens central --measure pagerank

# Explore around a concept
interlens neighborhood "Systems Thinking" --radius 2

# Find paradoxes (232 contrast pairs available!)
interlens contrasts "Explore vs Exploit"
```

**Dialectic Thinking Workflow (NEW!):**
```bash
# Every lens now has at least one contrast pair
interlens contrasts "Kintsugi"
# Returns: Fleet of Theseus (repair vs replacement philosophies)

interlens contrasts "Steelmanning"
# Returns: Blind Spots (engaging vs avoiding opposition)

interlens contrasts "Regression to the Mean"
# Returns: Compounding Loops (returning to average vs amplifying deviation)
```

## Features

### 15 Tools for Creative Thinking

**Core Exploration:**
- `search_lenses` - Semantic search across 256+ lenses
- `get_lens` - Detailed lens information
- `get_related_lenses` - Find similar lenses
- `get_lens_frames` - Thematic groupings

**Creative Navigation:**
- `find_lens_journey` - Discover conceptual paths between ideas
- `find_bridge_lenses` - Connect disparate concepts for lateral thinking
- `find_contrasting_lenses` - Explore paradoxes and tensions (232 pairs, 100% coverage)
- `get_central_lenses` - Identify hub concepts in the network
- `get_lens_neighborhood` - Explore conceptual neighborhoods
- `random_lens_provocation` - Break thinking patterns with randomness (now with gap-aware selection!)

**Gap Detection (NEW in v1.1.0):**
- `detect_thinking_gaps` - Analyze conceptual coverage across 28 FLUX frames
- Gap-aware random selection - 80/15/5 biasing toward unexplored dimensions

### Graph-Powered intelligence

Built on a NetworkX graph with:
- **288 lenses** from FLUX episodes 11-200+
- **232 dialectic contrast pairs** - Every lens has thesis/antithesis relationships
- **Weighted relationships**: AI-discovered, frame-based, temporal, conceptual
- **Centrality measures**: Betweenness, PageRank, eigenvector
- **Path finding**: Navigate between any two concepts

## Usage examples

### Find a conceptual journey
```
Use find_lens_journey to discover how "Systems Thinking" connects to "Innovation"
```

Output shows the intermediate concepts that bridge these ideas.

### Bridge disparate ideas
```
Use find_bridge_lenses to find lenses connecting "Leadership", "Complexity", and "Communication"
```

Discover unexpected connections for creative problem-solving.

### Explore paradoxes (232 contrast pairs!)
```
Use find_contrasting_lenses on "Exploit vs Explore" to find complementary tensions
```

Every lens now has at least one dialectic contrast. Examples:
- **Kintsugi** ↔ **Fleet of Theseus** (repair with history vs identity through replacement)
- **Fuzzy Planning** ↔ **Draw Me a Bridge** (embracing uncertainty vs demanding precision)
- **Stoicism and Gratitude** ↔ **Jevons Paradox** (contentment vs never-enough)
- **Composable Alphabets** ↔ **Conceptual Integrity** (flexibility vs coherence)

### Find hub concepts
```
Use get_central_lenses with measure="betweenness" to identify key conceptual bridges
```

Map the conceptual landscape strategically.

### Random provocation
```
Use random_lens_provocation to get a creative spark
```

Break out of local thinking patterns.

### Gap detection workflow (NEW in v1.1.0)

**Scenario:** You've been exploring lenses about systems and technology. Are you missing important perspectives?

```bash
# Check what frames you've covered
interlens gaps --context "Pace Layering" --context "Innovation" --context "Systems Thinking"

# Output:
# Coverage: 7.1% (2/28 frames)
# Unexplored: 26 frames - Balance & Paradox, Communication & Dialogue, Creative Problem Solving...
```

**Get gap-aware suggestions to explore blind spots:**

```bash
# System biases toward unexplored frames (80% chance)
interlens random --context "Pace Layering" --context "Innovation" --context "Systems Thinking"

# Suggests: "Logic and Gut" (decision-making lens)
# Coverage jumps to 14.3% (4/28 frames)
```

**Continue exploring to build comprehensive coverage:**

```bash
interlens random --context "Pace Layering" --context "Innovation" --context "Logic and Gut"

# Suggests: "Dancing with Art" (artistic expression evolution)
# Coverage: 18% (5/28 frames)

interlens random --context "Pace Layering" --context "Innovation" --context "Logic and Gut" --context "Dancing with Art"

# Suggests: "The Geometry of Dissent" (organizational dynamics)
# Coverage: 21.4% (6/28 frames)
```

**The Result:** Started in tech/systems comfort zone → guided to cognitive processes, creative expression, and social dynamics. Exactly the lateral moves that break habitual thinking!

## Creative workflows

**Lateral Thinking:**
```
random_lens_provocation → find_bridge_lenses → combine_lenses
```

**Conceptual Navigation:**
```
find_lens_journey(start, end) → explore intermediate concepts
```

**Dialectic Exploration (232 contrast pairs, 100% coverage!):**
```
find_contrasting_lenses → synthesize thesis/antithesis → generate insights
```

**Strategic Mapping:**
```
get_central_lenses → get_lens_neighborhood → explore territory
```

## Architecture

**Zero LLM Costs for You:**
- Users bring their own AI (Claude Desktop, Cursor, etc.)
- Interlens provides structured lens data
- All reasoning happens client-side with user's API keys

**What Interlens Provides:**
- NetworkX graph operations (path finding, centrality, etc.)
- Supabase queries for lens metadata
- Structured JSON responses

**Your Costs:**
- Only your Claude/AI API usage
- No hidden charges from Interlens

## Cross-Platform support

Interlens works with multiple AI platforms:

| Platform | Support | Setup Guide |
|----------|---------|-------------|
| **Claude Code** | ✅ Full MCP | See Quick Start above |
| **Claude Desktop** | ✅ Full MCP | See Quick Start above |
| **ChatGPT** | ✅ Via GPT Actions | [docs/chatgpt-gpt-config.md](docs/chatgpt-gpt-config.md) |
| **Codex CLI** | ✅ Function Calling | [docs/codex-cli-integration.md](docs/codex-cli-integration.md) |
| **Claude.ai** | 📋 Project Template | [docs/claude-project-template.md](docs/claude-project-template.md) |
| **Any Agent** | ✅ REST API | [schemas/openapi.yaml](schemas/openapi.yaml) |

### Export schemas

Generate schemas for integration with other platforms:

```bash
# OpenAI function calling schema (ChatGPT, Codex CLI)
interlens export --format openai > functions.json

# OpenAPI 3.0 specification (any REST client)
interlens export --format openapi > api.yaml
```

### Creating a chatGPT GPT

1. Export the OpenAPI schema: `interlens export --format openapi`
2. Create a new GPT at https://chatgpt.com/gpts/editor
3. Add Actions using the OpenAPI schema
4. Point to API: `https://interlens-api-production.up.railway.app/api/v1`

See [docs/chatgpt-gpt-config.md](docs/chatgpt-gpt-config.md) for detailed instructions.

## Installation options

### Option 1: npx (Recommended - no install)

Add to your Claude Desktop config:

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

### Option 2: global install

Install via npm:

```bash
npm install -g interlens-mcp
```

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "interlens": {
      "command": "interlens-mcp"
    }
  }
}
```

### Option 3: local development

Want to run from source?

```bash
# Clone this repo
git clone https://github.com/mistakeknot/Interlens.git
cd interlens

# Install dependencies
npm install

# Run locally
npm start

# Update Claude Desktop config
{
  "mcpServers": {
    "interlens": {
      "command": "node",
      "args": ["/path/to/interlens/index.js"]
    }
  }
}
```

## API endpoints

All tools are backed by REST API endpoints:

- `/api/v1/creative/journey` - Path finding
- `/api/v1/creative/bridges` - Bridge discovery
- `/api/v1/creative/contrasts` - Paradox detection
- `/api/v1/creative/central` - Centrality measures
- `/api/v1/creative/neighborhood` - Local exploration
- `/api/v1/creative/random` - Random sampling

See [docs/API.md](docs/API.md) for full API documentation.

## Resources

Interlens provides three MCP resources:

- `lens://all` - Complete lens catalog (256+ lenses)
- `lens://frames` - Thematic groupings (20+ frames)
- `lens://graph` - Relationship network structure

## Use cases

**For AI Agents:**
- Enhance reasoning with proven analytical frameworks
- Make unexpected connections between concepts
- Navigate problem spaces systematically
- Break out of local optima in thinking

**For Knowledge Work:**
- Research assistance with conceptual navigation
- Creative problem-solving through lens combinations
- Strategic thinking with hub concept identification
- Learning paths through conceptual journeys

**For Developers:**
- Build AI agents with cognitive augmentation
- Add analytical frameworks to your tools
- Create knowledge navigation interfaces
- Integrate FLUX lenses into workflows

## About fLUX

FLUX is a weekly newsletter from the [FLUX Collective](https://read.fluxcollective.org/) exploring systems thinking, organizational dynamics, and complexity. Each episode introduces analytical lenses for understanding complex systems.

Interlens makes these lenses computationally accessible for AI agents and tools.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE)

## Links

- **Live API**: https://interlens.com/api/mcp/v1/sse
- **FLUX Newsletter**: https://read.fluxcollective.org/
- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/interlens/issues)

---

Built with ❤️ for the AI agent ecosystem
