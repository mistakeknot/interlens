# interlens

Most people think about problems with whatever framework happens to be in their head. interlens gives you 288 named alternatives, connected as a graph.

## What this does

A "lens" is a thinking pattern extracted from the [FLUX Review](https://read.fluxcollective.org/): "second-order effects," "pace layers," "Chesterton's fence," "explore/exploit tradeoff." Each lens has a description, framing questions, and connections to related lenses, forming a graph of 288 nodes across epistemology, systems thinking, decision-making, and creativity.

interlens makes this graph queryable. Search by keyword or concept, traverse relationships, find thinking paths between distant ideas, detect gaps in your reasoning, or get a random provocation when you're stuck. The MCP server and CLI put all of this inside Claude Code; the web explorer lets you browse visually.

## Who this is for

Anyone using Claude Code for strategic thinking, architecture decisions, or problem analysis. The lenses are most useful during brainstorming, PRD writing, and design review: moments where structured thinking patterns prevent blind spots.

## Quick start

### MCP server + CLI (Claude Code)

```bash
pnpm -r install
pnpm dev:mcp
```

### Web explorer

```bash
pnpm dev:web
```

### API server

```bash
cd apps/api
pip install -r requirements.txt
python lens_search_api.py
```

## Repo layout

```
packages/mcp/    MCP server + CLI (npm: interlens-mcp)
apps/api/        Flask API (search, graph traversal)
apps/web/        React frontend (interlens.com)
```

## Deployment

- **Web:** Vercel from `apps/web`
- **API:** Railway from `apps/api`
- **MCP:** Published from `packages/mcp`

## License

MIT
