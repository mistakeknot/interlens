# Interlens Web

React SPA for exploring 288+ FLUX analytical lenses. Interactive browsing, search, graph visualization, and deep linking.

**Live**: https://interlens.com | **API**: https://lens-api.up.railway.app/api/v1

## Key Files

| File | Purpose |
|------|---------|
| `src/components/LensExplorerLinear.jsx` | Main component — all exploration features |
| `src/components/useLenses.js` | Custom hooks for data fetching |
| `src/components/LensGraphView.jsx` | D3 force-directed graph visualization |
| `src/App.js` | Root component with React Router |
| `vercel.json` | Vercel deployment config |

## Architecture

```
App.js (Router)
  └── LensExplorerLinear (Main UI)
      ├── useLenses() — data fetching
      ├── useFrames() — frame data
      ├── useBackgroundLoader() — preloading
      ├── LensGraphView — D3 visualization
      └── Modal components (lens/frame/tag details)
```

**Data flow**: `useLenses.js` → Railway API → React hooks (useState/useMemo/useEffect) → D3 graph

**Routes**: `/` (explorer), `/lens/:id`, `/frame/:id`, `/tag/:name`

## Development

```bash
npm install               # Install deps
npm start                 # Dev server at http://localhost:3000
npm run build             # Production build
npm test                  # Run tests
npm test -- --coverage    # With coverage
```

Override API URL via `.env.local`:
```
REACT_APP_API_URL=http://localhost:5002/api/v1
```

## Key Features

- **Search** — Debounced (300ms), calls `/api/v1/lenses/search`
- **Tag system** — Unique tags from `lens.related_concepts`, multi-select filtering
- **Keyboard nav** — `j/→` next, `k/←` prev, `Esc` close modal
- **Graph** — D3 force-directed, node sizes by centrality, interactive drag/zoom/pan

## Deployment

Vercel, auto-deploys on push to `main`. Manual: `vercel --prod`.

## Troubleshooting

- **Port in use** — `lsof -ti:3000 | xargs kill -9`
- **API errors** — Check API: `curl https://lens-api.up.railway.app/api/v1/lenses/stats`, verify CORS, check `.env.local`
- **Build errors** — `rm -rf node_modules && npm install`, `npm cache clean --force`
- **Graph not rendering** — Check `npm list d3`, verify data format, check console

## Related

- **interlens API** — `apps/api` in parent monorepo
- **interlens MCP** — `packages/mcp` in parent monorepo
