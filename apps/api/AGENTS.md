# Interlens API

Flask-based REST API providing access to 288+ FLUX analytical lenses through graph-based navigation and creative thinking tools. Uses NetworkX for graph operations and Supabase for data storage.

**Architecture**: Flask API → NetworkX graph (in-memory) → Supabase PostgreSQL + pgvector

## Key Files

| File | Purpose |
|------|---------|
| `lens_search_api.py` | Main Flask app — all API endpoints (~2K lines) |
| `supabase_store.py` | Supabase integration and data access layer (~13K lines) |
| `requirements.txt` | Python dependencies |
| `railway.json` | Railway deployment config |

## API Endpoints

### Basic

- `GET /api/v1/lenses` — All lenses with optional filters
- `GET /api/v1/lenses/search?q=query&limit=10` — Semantic search (sentence-transformers, free)
- `GET /api/v1/lenses/episodes/:episode` — By episode number
- `GET /api/v1/lenses/connections?lens_id=:id&limit=5` — Related lenses
- `GET /api/v1/frames` — Thematic groupings/frames
- `GET /api/v1/lenses/stats` — Stats and health check

### Creative Thinking (NetworkX graph)

- `GET /api/v1/creative/journey?source=A&target=B` — Conceptual paths
- `GET /api/v1/creative/bridges?lenses=A&lenses=B&lenses=C` — Bridge lenses
- `GET /api/v1/creative/contrasts?lens=A` — Paradoxical/contrasting lenses (232 contrasts, 100% coverage)
- `GET /api/v1/creative/central?measure=betweenness&limit=10` — Central lenses
- `GET /api/v1/creative/neighborhood?lens=A&radius=2` — Conceptual neighborhood
- `GET /api/v1/creative/random` — Random lens provocation
- `GET /api/v1/creative/clusters` — Lens clusters/communities
- `GET /api/v1/creative/gaps?context=A&context=B` — Thinking gaps
- `GET /api/v1/creative/triads?lens=A&limit=3` — Thesis/antithesis/synthesis triads
- `GET /api/v1/creative/progressions?start=A&target=B&max_steps=5` — Learning progressions

**Known limitation**: PageRank centrality works locally but fails on Railway. Use `measure=betweenness` or `measure=eigenvector` instead.

## Development

```bash
pip install -r requirements.txt
cp .env.example .env          # Edit with your credentials
python lens_search_api.py     # Runs on port 5002 (or PORT env var)
```

### Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon/service key |
| `OPENAI_API_KEY` | No | Only for admin embedding generation |
| `PORT` | No | Default 5002, Railway uses 8080 |
| `FLASK_ENV` | No | Set to `development` for debug mode |

### Testing

```bash
curl http://localhost:5002/api/v1/lenses/stats          # Health check
curl "http://localhost:5002/api/v1/lenses/search?q=systems+thinking"
curl "http://localhost:5002/api/v1/creative/random"
```

## Deployment (Railway)

Auto-deploys on push to `main`. Builder: NIXPACKS (auto-detects Python). Start: `python lens_search_api.py`.

**Production URL**: https://interlens-api-production.up.railway.app/api/v1

## Architecture Details

### NetworkX Graph

In-memory graph built on startup, cached 1 hour. Node attributes: id, name, definition, episode, related_concepts. Edge types: AI-discovered (weighted), frame-based, temporal, conceptual.

Graph operations: `nx.shortest_path()`, `nx.betweenness_centrality()`, `nx.eigenvector_centrality()`, `nx.single_source_shortest_path_length()`, plus custom bridge-finding.

### Supabase Tables

- `lenses` — Main lens data with pgvector embeddings (384-dim)
- `frames` — Thematic groupings
- `lens_connections` — Explicit relationships

### Search

Semantic search uses sentence-transformers (all-MiniLM-L6-v2, local, CPU-based, free). Model loads on startup (~5-10s). Query embeddings ~100-200ms.

### Caching

`@lru_cache` for graph building (1 hour), centrality calculations, and frame data.

### Error Handling

All endpoints return `{"success": true/false, "data": {...}, "error": "message"}`. HTTP codes: 200, 400, 404, 500.

## Troubleshooting

- **Graph building fails** — Check Supabase credentials, verify `lenses` table has data
- **Search returns no results** — Verify sentence-transformers loaded (startup logs), check embeddings are 384-dim vectors
- **Creative endpoints error** — Lens names require exact match, verify graph built successfully

## Related

- **interlens MCP** — `packages/mcp` in parent monorepo
- **interlens-web** — `apps/web` in parent monorepo, live at https://interlens.com
