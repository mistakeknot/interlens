This file provides guidance when working in the **Interlens monorepo**.

## Layout

- `packages/mcp` — MCP server + CLI (published as `interlens-mcp`)
- `apps/api` — Flask API powering lens search + graph operations
- `apps/web` — React frontend for interlens.com

## Conventions

- Prefer `pnpm` for JS workspaces.
- Avoid committing secrets (check `.env*`).
- Keep generated artifacts out of git (`node_modules/`, `__pycache__/`, `*.pyc`).

## Common tasks

- Install deps: `pnpm -r install`
- Web dev: `pnpm dev:web`
- MCP dev: `pnpm dev:mcp`

## Deploy hints

- Vercel project root: `apps/web`
- Railway start: `python lens_search_api.py` from `apps/api`
- npm publish: from `packages/mcp`
