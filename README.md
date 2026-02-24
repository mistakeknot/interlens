# interlens

288 cognitive lenses for structured thinking — a graph-powered toolkit for analyzing problems from multiple perspectives.

## What This Does

A "lens" is a named thinking pattern extracted from the [FLUX podcast](https://read.fluxcollective.org/) — things like "second-order effects," "pace layers," "Chesterton's fence," or "explore/exploit tradeoff." Each lens has a description, framing questions, and connections to related lenses, forming a graph of 288 nodes across epistemology, systems thinking, decision-making, creativity, and more.

interlens makes this graph queryable. Search for lenses by keyword or concept, traverse relationships between them, find thinking paths between distant ideas, detect gaps in your reasoning, or get a random provocation when you're stuck. The MCP server and CLI put all of this inside Claude Code; the web explorer lets you browse visually.

## Who This Is For

Anyone using Claude Code for strategic thinking, architecture decisions, or problem analysis. The lenses are most useful during brainstorming, PRD writing, and design review — moments where structured thinking patterns prevent blind spots.

## Quick Start

### MCP Server + CLI (Claude Code)

```bash
pnpm -r install
pnpm dev:mcp
```

### Web Explorer

```bash
pnpm dev:web
```

### API Server

```bash
cd apps/api
pip install -r requirements.txt
python lens_search_api.py
```

## Repo Layout

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
