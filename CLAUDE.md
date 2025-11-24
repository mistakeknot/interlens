# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Linsenkasten API backend.

## Project Overview

Linsenkasten API is a Flask-based REST API that provides access to 256+ FLUX analytical lenses through graph-based navigation and creative thinking tools. It uses NetworkX for graph operations and Supabase for data storage.

**Architecture**: Flask API → NetworkX graph operations → Supabase PostgreSQL

**Recent Updates (2025-11-24)**:
- ✅ **Dialectic Contrasts: 100% Coverage!** - All 288 lenses now have contrast relationships
  - Total contrasts: 25 → 232 (827% increase)
  - Coverage: 100% of lenses have at least one dialectic relationship
  - 5 automated batches + 15 manually curated contrasts for edge cases
  - Algorithm: 70% embedding distance + 30% dialectic keyword scoring
  - Distance sweet spot: 0.65-0.92 for true thesis/antithesis pairs
  - Scripts: `scripts/generate_contrasts_json.py` and `scripts/merge_contrasts.py`
- ✅ **FREE Search**: sentence-transformers (no OpenAI costs!)
  - Query embeddings: sentence-transformers/all-MiniLM-L6-v2 (local, CPU-based)
  - Corpus embeddings: All 288 lenses embedded with same model
  - Database: pgvector VECTOR(384) for efficient similarity search
  - Cost: Zero ongoing embedding costs
- ✅ Graph module integrated: All creative endpoints working with NetworkX 3.1
- ⚠️ PageRank centrality: Works locally but fails on Railway (use betweenness/eigenvector instead)

## Key Files

- **`lens_search_api.py`** (2,029 lines) - Main Flask application with all API endpoints
- **`supabase_store.py`** (13,317 lines) - Supabase integration and data access layer
- **`requirements.txt`** - Python dependencies
- **`railway.json`** - Railway deployment configuration

## API Endpoints

### Basic Endpoints

- `GET /api/v1/lenses` - Get all lenses with optional filters
- `GET /api/v1/lenses/search?q=query&limit=10` - Semantic search with sentence-transformers (FREE, no API costs)
- `GET /api/v1/lenses/episodes/:episode` - Get lenses by episode number
- `GET /api/v1/lenses/connections?lens_id=:id&limit=5` - Get related lenses
- `GET /api/v1/frames` - Get thematic groupings/frames
- `GET /api/v1/lenses/stats` - API statistics and health check

### Creative Thinking Endpoints

These use NetworkX graph operations:

- `GET /api/v1/creative/journey?source=A&target=B` - Find conceptual paths between lenses
- `GET /api/v1/creative/bridges?lenses=A&lenses=B&lenses=C` - Find bridge lenses connecting multiple concepts
- `GET /api/v1/creative/contrasts?lens=A` - Find paradoxical/contrasting lenses (232 contrasts, 100% coverage!)
- `GET /api/v1/creative/central?measure=betweenness&limit=10` - Get central lenses (betweenness, pagerank, eigenvector)
- `GET /api/v1/creative/neighborhood?lens=A&radius=2` - Explore conceptual neighborhood
- `GET /api/v1/creative/random` - Get random lens provocation with suggestions
- `GET /api/v1/creative/clusters` - Get lens clusters/communities
- `GET /api/v1/creative/gaps?context=A&context=B` - Detect thinking gaps in exploration
- `GET /api/v1/creative/triads?lens=A&limit=3` - Get thesis/antithesis/synthesis triads (NEW - 2025-11-24)
- `GET /api/v1/creative/progressions?start=A&target=B&max_steps=5` - Get learning progressions (NEW - 2025-11-24)

**Known Limitation**: PageRank centrality (`measure=pagerank`) works locally but fails on Railway with a system-level error (likely memory/architecture constraints). Fallback to betweenness is implemented but Railway crashes before Python can catch the error. Use `measure=betweenness` or `measure=eigenvector` instead - both work perfectly and provide similar hub-finding functionality.

## Development

### Local Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run locally
python lens_search_api.py
# Server runs on port 5002 (or PORT env var)
```

### Environment Variables

Required:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon/service key

Optional:
- `OPENAI_API_KEY` - Only needed for admin embedding generation (search uses FREE sentence-transformers)
- `PORT` - Server port (default: 5002, Railway uses 8080)
- `FLASK_ENV` - Set to 'development' for debug mode
- `LENS_API_PORT` - Alternative port variable

### Testing

```bash
# Health check
curl http://localhost:5002/api/v1/lenses/stats

# Search
curl "http://localhost:5002/api/v1/lenses/search?q=systems+thinking"

# Creative endpoint
curl "http://localhost:5002/api/v1/creative/random"
```

## Deployment

### Railway

This repo is configured for Railway deployment:

**Configuration** (`railway.json`):
- Builder: NIXPACKS (auto-detects Python)
- Start Command: `python lens_search_api.py`
- Restart Policy: ON_FAILURE with 10 retries

**Deployment**:
```bash
# Push to GitHub main branch
git push origin main
# Railway auto-deploys
```

**Production URL**: https://linsenkasten-api-production.up.railway.app/api/v1

### Environment Variables in Railway

Set these in Railway dashboard:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `OPENAI_API_KEY`
- `PORT=8080` (Railway sets this automatically)

## Architecture Details

### NetworkX Graph

The API maintains an in-memory NetworkX graph of lens relationships:

**Node attributes**:
- `id`, `name`, `definition`, `episode`, `related_concepts`

**Edge types**:
- AI-discovered relationships (weighted by similarity)
- Frame-based relationships (lenses in same frame)
- Temporal relationships (adjacent episodes)
- Conceptual relationships (shared concepts)

**Graph operations** (in `lens_search_api.py`):
- Path finding: `nx.shortest_path()`, `nx.all_shortest_paths()`
- Centrality: `nx.betweenness_centrality()`, `nx.pagerank()`, `nx.eigenvector_centrality()`
- Neighborhood: `nx.single_source_shortest_path_length()`
- Bridge finding: Custom algorithm using shared concepts

### Supabase Integration

**Tables**:
- `lenses` - Main lens data with embeddings
- `frames` - Thematic groupings
- `lens_connections` - Explicit relationships

**Key operations** (`supabase_store.py`):
- `search_lenses_by_embedding()` - Vector similarity search
- `get_all_lenses()` - Fetch all lenses with caching
- `get_frames()` - Get thematic groupings

### Caching

The API uses `@lru_cache` for expensive operations:
- Graph building (cached for 1 hour)
- Centrality calculations
- Frame data

### Error Handling

All endpoints return consistent JSON:
```json
{
  "success": true/false,
  "data": {...},      // on success
  "error": "message"  // on failure
}
```

HTTP status codes:
- 200 - Success
- 400 - Bad request (missing params)
- 404 - Resource not found
- 500 - Server error

## Related Projects

- **linsenkasten** (~/linsenkasten) - MCP server + CLI that consumes this API
  - GitHub: https://github.com/mistakeknot/Linsenkasten
  - npm: `linsenkasten-mcp`

- **linsenkasten-web** (~/linsenkasten-web) - React web frontend that consumes this API
  - GitHub: https://github.com/mistakeknot/linsenkasten-web
  - Live: https://linsenkasten.com

- **xulfbot** (~/xulfbot) - Discord bot
  - GitHub: https://github.com/mistakeknot/XULFbot

## Common Tasks

### Adding a New API Endpoint

1. Add route in `lens_search_api.py`:
```python
@app.route('/api/v1/new-endpoint', methods=['GET'])
def new_endpoint():
    try:
        # Implementation
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
```

2. Test locally
3. Commit and push - Railway auto-deploys

### Adding a New Graph Operation

1. Add function in `lens_search_api.py` (around line 200-400 where graph ops are)
2. Use the cached graph: `G = build_lens_graph()`
3. Implement using NetworkX functions
4. Add API endpoint to expose it
5. Test and deploy

### Modifying Supabase Queries

1. Edit `supabase_store.py`
2. Update the `SupabaseLensStore` class methods
3. Test locally with your Supabase instance
4. Deploy

### Updating Dependencies

1. Edit `requirements.txt`
2. Test locally: `pip install -r requirements.txt`
3. Commit and push
4. Railway rebuilds with new dependencies

## Important Constraints

### Graph is In-Memory

The NetworkX graph is built on startup and cached in memory. For large-scale changes:
- Graph rebuilds when cache expires (1 hour)
- Or on server restart
- Or when underlying Supabase data changes

### No Authentication

The API currently has no authentication. It's public and relies on:
- CORS for browser access control
- Railway's built-in DDoS protection
- Rate limiting would need to be added

### sentence-transformers (FREE Embeddings)

Semantic search uses sentence-transformers (local, CPU-based, FREE):
- No external API dependencies for search
- Model loaded on startup (~5-10 seconds)
- Query embeddings generated locally (~100-200ms)
- OPENAI_API_KEY only needed for admin embedding generation (optional)

## Troubleshooting

**Graph building fails**:
- Check Supabase credentials
- Verify `lenses` table has data
- Check server logs for specific errors

**Search returns no results**:
- Check that sentence-transformers model loaded successfully (see startup logs)
- Verify lenses have embeddings in Supabase (should be 384-dim vectors)
- Test with simple query like "systems" or "feedback"
- Check similarity thresholds (scores typically 0.2-0.5)

**Creative endpoints return errors**:
- Verify lens names exist (exact match required)
- Check that graph was built successfully
- Ensure NetworkX operations aren't timing out

## Performance Notes

- Graph building: ~2-5 seconds on cold start
- Centrality calculations: Cached for 1 hour, ~3-10 seconds to compute
- Search queries: ~200-500ms (depends on OpenAI API latency)
- Path finding: ~50-200ms
- Health check (`/stats`): <10ms

## Future Considerations

- Add Redis for persistent caching across restarts
- Implement rate limiting
- Add authentication/API keys
- Optimize graph operations for larger datasets
- Add GraphQL endpoint
- Implement webhook notifications for data changes
