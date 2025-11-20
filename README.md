# Linsenkasten API

Backend API for the Linsenkasten cognitive augmentation toolkit. Provides REST endpoints for accessing 256+ FLUX analytical lenses through graph-based navigation and creative thinking tools.

## Architecture

- **Flask** - REST API framework
- **NetworkX** - Graph operations (path finding, centrality, bridges)
- **Supabase** - PostgreSQL database for lens metadata
- **OpenAI** - Embeddings for semantic search

## API Endpoints

### Basic Endpoints

- `GET /api/v1/lenses` - Get all lenses
- `GET /api/v1/lenses/search?q=query` - Semantic search
- `GET /api/v1/lenses/episodes/:episode` - Get lenses by episode
- `GET /api/v1/lenses/connections?lens_id=:id` - Get related lenses
- `GET /api/v1/frames` - Get thematic groupings
- `GET /api/v1/lenses/stats` - API statistics

### Creative Thinking Endpoints

- `GET /api/v1/creative/journey?source=A&target=B` - Find conceptual path
- `GET /api/v1/creative/bridges?lenses=A&lenses=B` - Find bridge lenses
- `GET /api/v1/creative/contrasts?lens=A` - Find paradoxical pairs
- `GET /api/v1/creative/central?measure=betweenness` - Get central lenses
- `GET /api/v1/creative/neighborhood?lens=A&radius=2` - Explore neighborhood
- `GET /api/v1/creative/random` - Get random provocation

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase and OpenAI credentials

# Run locally
python lens_search_api.py
```

## Environment Variables

See `.env.example` for required configuration.

Required:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon key
- `OPENAI_API_KEY` - OpenAI API key for embeddings

Optional:
- `PORT` - Server port (default: 8080)
- `FLASK_ENV` - Environment (production/development)

## Deployment

### Railway

This repo is configured for Railway deployment:

1. Connect Railway to this GitHub repo
2. Set environment variables in Railway dashboard
3. Railway will auto-detect Python and use `railway.json` config
4. Start command: `python lens_search_api.py`

### Health Check

- Endpoint: `/api/v1/lenses/stats`
- Returns lens count and API status

## Related Projects

- **linsenkasten** - MCP server + CLI tool ([GitHub](https://github.com/mistakeknot/Linsenkasten))
- **xulfbot** - Discord bot that uses this API

## API Clients

This API is consumed by:
- Linsenkasten MCP server (for Claude Desktop)
- Linsenkasten CLI tool (for terminal)
- XULFbot Discord bot

## Development

```bash
# Run in development mode
FLASK_ENV=development python lens_search_api.py

# Test endpoints
curl http://localhost:5002/api/v1/lenses/stats
curl "http://localhost:5002/api/v1/lenses/search?q=systems+thinking"
```

## License

MIT License - see [LICENSE](LICENSE)

## Credits

Lens content from [FLUX Collective](https://read.fluxcollective.org/)
