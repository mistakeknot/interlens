# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Linsenkasten is an MCP (Model Context Protocol) server AND CLI tool that provides AI agents and developers access to 288 FLUX analytical lenses through graph-based navigation. It acts as a bridge between the Linsenkasten API (hosted on Railway) and MCP clients (like Claude Desktop) or terminal users.

**Key Feature**: 232 dialectic contrast pairs with 100% lens coverage - every lens has at least one thesis/antithesis relationship for deeper analytical thinking.

**Architecture**: Thin client (MCP/CLI) → REST API → NetworkX graph + Supabase

## Related Repositories

### linsenkasten-api (~/linsenkasten-api)

**IMPORTANT**: The backend API that powers this MCP server and CLI lives in a separate repository.

- `lens_search_api.py` - Flask API with graph operations and creative thinking tools
- `supabase_store.py` - Supabase integration module
- NetworkX graph implementation
- Railway deployment configuration

**API URL**: https://lens-api.up.railway.app/api/v1 (Railway deployment)

**GitHub**: https://github.com/mistakeknot/linsenkasten-api

### linsenkasten-web (~/linsenkasten-web)

The React web frontend for linsenkasten.com also lives in a separate repository.

- React SPA with grid/table/graph views
- D3 graph visualization
- Deep linking for lenses/frames/tags
- Vercel deployment

**Live Site**: https://linsenkasten.com

**GitHub**: https://github.com/mistakeknot/linsenkasten-web

### Working with the API

When making changes to API endpoints or graph operations:
1. Navigate to `~/linsenkasten-api` directory
2. Edit `lens_search_api.py` or `supabase_store.py`
3. Commit and push to https://github.com/mistakeknot/linsenkasten-api
4. Railway will auto-deploy from the main branch

### Railway Configuration

The linsenkasten-api repo has a clean, dedicated Railway configuration:

**Configuration** (`railway.json`):
- Builder: NIXPACKS (Python auto-detection)
- Start Command: `python lens_search_api.py`
- Port: 8080 (auto-detected by Railway)
- Restart Policy: ON_FAILURE with 10 retries

**To deploy API updates**:
```bash
cd ~/linsenkasten-api
# Make changes to lens_search_api.py
git add -A
git commit -m "Update API endpoints"
git push origin main
# Railway auto-deploys on push to main
```

**Environment Variables Required**:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `OPENAI_API_KEY` - OpenAI API key for embeddings
- `PORT` - Server port (default: 8080)

## Development Commands

### Running the MCP Server

```bash
# Run locally (stdio mode for MCP)
npm start
# or
node index.js

# Development with Vercel
npm run dev
```

### Running the CLI Tool

```bash
# After npm install -g
linsenkasten search "systems thinking"
linsenkasten get "Pace Layering"
linsenkasten journey "Systems Thinking" "Innovation"
linsenkasten random
linsenkasten bridge "Leadership" "Complexity"
linsenkasten central --measure betweenness --limit 10
linsenkasten neighborhood "Pace Layering" --radius 2
linsenkasten contrasts "Explore vs Exploit"
linsenkasten contrasts "Kintsugi"           # Returns: Fleet of Theseus
linsenkasten contrasts "Steelmanning"       # Returns: Blind Spots

# During development (without global install)
node cli.js search "systems thinking"
```

**Known Limitation**: The `central --measure pagerank` command works locally but fails on the Railway-hosted API due to platform constraints. Use `--measure betweenness` or `--measure eigenvector` instead - both work perfectly on Railway and provide similar hub-finding functionality.

### Installation

```bash
# Install dependencies
npm install

# Install globally (provides both MCP server and CLI)
npm install -g .
# This makes both 'linsenkasten' CLI and the MCP server available
```

### Testing the MCP Server

Since this is an MCP server, test it by:
1. Adding to Claude Desktop config (see README Quick Start)
2. Restart Claude Desktop
3. Use tools like `search_lenses` or `random_lens_provocation`

### Testing the CLI

```bash
# Basic test
linsenkasten search "innovation"

# Test creative endpoints (requires Railway API to be configured correctly)
linsenkasten random
linsenkasten journey "Systems Thinking" "Innovation"
```

No traditional test suite exists yet.

## Architecture

### Three-File Design

The codebase consists of three main files:

1. **`api-client.js`** - Shared API communication layer
   - Used by both MCP server and CLI
   - Handles all HTTP requests to Railway API
   - Includes local caching (1-hour TTL)
   - Exports functions: searchLenses, getLens, findLensJourney, etc.

2. **`index.js`** - MCP server implementation
   - Protocol adapter for MCP clients (Claude Desktop, etc.)
   - Uses api-client.js for all API calls
   - Handles MCP-specific concerns (tools, resources, protocol translation)
   - Runs in stdio mode for MCP transport

3. **`cli.js`** - Command-line interface
   - Terminal-based lens exploration tool
   - Uses api-client.js for all API calls
   - ANSI color formatting (no external dependencies)
   - Runs as global `linsenkasten` command

This design is intentional:
- Client code is purely for protocol/interface adaptation
- All business logic lives in the Railway API
- Shared API client reduces duplication
- Both MCP and CLI are thin wrappers

### Key Components

**LinsenkastenMCP Class**:
- Initializes MCP server with stdio transport
- Sets up three MCP handlers: tools, resources, tool execution
- Manages caching layer

**Caching System** (lines 47-64):
- File-based cache in `.cache/` directory
- 1-hour TTL (3600000ms)
- Used for resources (lens://all, lens://frames, etc.)
- Tools make direct API calls (no caching)

**API Communication** (lines 66-77):
- Base URL: `https://lens-api.up.railway.app/api/v1`
- Override with `LINSENKASTEN_API_URL` env var
- All responses are JSON
- Errors bubble up as McpError

### MCP Protocol Handlers

**1. ListToolsRequestSchema** (lines 81-295):
Declares 13 tools in two categories:
- Basic: search_lenses, get_lens, get_related_lenses, analyze_with_lens, combine_lenses
- Creative: find_lens_journey, find_bridge_lenses, find_contrasting_lenses (232 pairs!), get_central_lenses, get_lens_neighborhood, random_lens_provocation

**2. ListResourcesRequestSchema** (lines 298-325):
Provides 4 read-only resources:
- `lens://all` - All lenses (cached)
- `lens://frames` - Thematic groupings (cached)
- `lens://episodes` - Lenses by episode (cached, computed)
- `lens://graph` - Relationship network (cached)

**3. CallToolRequestSchema** (lines 423-936):
Executes tool calls by mapping to API endpoints or generating synthetic responses

### Tool Implementation Patterns

**Pattern 1: Direct API Passthrough** (e.g., search_lenses, find_lens_journey)
```javascript
const results = await this.fetchFromAPI(`/api/v1/endpoint?params`);
return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
```

**Pattern 2: API + Formatting** (e.g., find_lens_journey, find_bridge_lenses)
- Fetch from API
- Transform JSON into markdown for better readability
- Return formatted text

**Pattern 3: Multi-Step API Calls** (e.g., get_related_lenses, analyze_with_lens)
- First call: Search for lens by name
- Extract lens ID from results
- Second call: Use ID in subsequent API call
- Handle "not found" gracefully

**Pattern 4: Synthetic Responses** (e.g., analyze_with_lens, combine_lenses)
- Fetch lens metadata from API
- Generate templated analysis text
- No LLM calls (user's AI does the reasoning)
- This is by design: zero LLM costs for Linsenkasten

### Environment Configuration

**Required**: None (uses public API by default)

**Optional**:
- `LINSENKASTEN_API_URL` - Override API endpoint (for local development)

### Data Flow

```
MCP Client (Claude Desktop)
    ↓ stdio
LinsenkastenMCP (index.js)
    ↓ HTTPS
Railway API (lens-api.up.railway.app)
    ↓
NetworkX Graph + Supabase
```

### API Endpoints Used

See `docs/API.md` for full details. Common endpoints:
- `/api/v1/search` - Semantic search
- `/api/v1/lenses` - Get all lenses
- `/api/v1/frames` - Thematic groupings
- `/api/v1/connections` - Graph relationships
- `/api/v1/creative/*` - Graph navigation tools

### Error Handling

All errors are wrapped in `McpError` with appropriate error codes:
- `ErrorCode.InvalidRequest` - Unknown resource URI
- `ErrorCode.MethodNotFound` - Unknown tool name
- `ErrorCode.InternalError` - API failures, network errors

Network errors are logged to stderr but propagate to the client.

## Common Development Tasks

### Adding a New Tool

1. Add tool definition in `ListToolsRequestSchema` handler (line 81+)
2. Add case in `CallToolRequestSchema` switch statement (line 427+)
3. Map to appropriate API endpoint or create synthetic response
4. Follow existing patterns for formatting

### Updating API Endpoint

Change `API_BASE_URL` constant (line 21) or set `LINSENKASTEN_API_URL` environment variable.

### Modifying Cache Behavior

- TTL: Change `CACHE_TTL` constant (line 23)
- Directory: Change `CACHE_DIR` constant (line 22)
- Clear cache: Delete `.cache/` directory

### Publishing to npm

```bash
# Bump version in package.json
# Then:
npm publish
```

Package is published as `linsenkasten-mcp` and installed globally.

## Project Structure

```
linsenkasten/
├── api-client.js         # Shared API communication layer (used by MCP + CLI)
├── index.js              # MCP server implementation
├── cli.js                # Command-line interface tool
├── package.json          # npm config, dependencies, scripts, bin entry
├── README.md             # User-facing documentation
├── CLAUDE.md             # This file - development guidance
├── LICENSE               # MIT license
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore rules
├── .cache/               # Local cache directory (1-hour TTL)
├── docs/
│   ├── API.md           # REST API documentation
│   └── USAGE.md         # Usage patterns and workflows
└── examples/
    ├── claude-desktop-config.json  # MCP config example
    └── local-config.json           # Local development config
```

**External Dependencies**:
- `~/linsenkasten-api/` - Backend API repo (see Related Repository section above)
- Railway deployment: https://lens-api.up.railway.app/api/v1
- GitHub: https://github.com/mistakeknot/linsenkasten-api

## Important Constraints

### Zero LLM Calls
The server makes NO LLM calls. All reasoning happens client-side with the user's AI. This is architectural:
- Users bring their own AI
- No API keys needed for Linsenkasten
- No LLM costs for Linsenkasten

Tools like `analyze_with_lens` and `combine_lenses` return templated text that guides the user's AI to do the analysis.

### Stateless Design
Each tool call is independent. No session state, no conversation history. MCP protocol is request/response.

### Graph Operations are Server-Side
All NetworkX graph operations (path finding, centrality, clustering) happen in the Railway API, not in this MCP server.

## Key Dependencies

- `@modelcontextprotocol/sdk` (^0.5.0) - MCP protocol implementation
- `node-fetch` (^3.3.2) - HTTP client for API calls
- `express` (^4.18.2) - For Vercel deployment (SSE transport)
- `cors` (^2.8.5) - CORS middleware for web deployment

## Deployment

### As npm Package (Recommended for Users)
```bash
npm install -g linsenkasten-mcp
```

### As Local MCP Server
Clone repo, `npm install`, then reference in Claude Desktop config:
```json
{
  "mcpServers": {
    "linsenkasten": {
      "command": "node",
      "args": ["/absolute/path/to/linsenkasten/index.js"]
    }
  }
}
```

## Future Considerations

If extending this codebase:
- Keep the single-file design unless complexity genuinely requires splitting
- All new features should be API-first (add to Railway API, then wrap in MCP)
- Maintain zero-LLM-cost principle
- Cache aggressively (resources) but keep tools fresh (direct API calls)
