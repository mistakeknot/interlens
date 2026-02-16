# Interlens (monorepo)

Interlens is a cognitive augmentation toolkit that provides access to 288 FLUX analytical lenses through a graph-powered API, a web explorer, and an MCP server + CLI.

## Repo layout

- `packages/mcp` — **MCP server + CLI** (npm package: `interlens-mcp`)
- `apps/api` — **Backend API** (Flask + NetworkX)
- `apps/web` — **Web frontend** (React)

## Quick start (local dev)

### Install JS deps (pnpm)

```bash
pnpm -r install
```

### Run the web app

```bash
pnpm dev:web
```

The web app can be pointed at a local API via `.env.local` in `apps/web`.

### Run the MCP server locally

```bash
pnpm dev:mcp
```

## Deployment notes

- Web is typically deployed to Vercel from `apps/web`.
- API is typically deployed to Railway from `apps/api`.
- MCP package is published from `packages/mcp`.

(See package/app READMEs for details.)
