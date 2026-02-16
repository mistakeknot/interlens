# Rename Analysis: linsenkasten to interlens (content only)

**Date:** 2026-02-16
**Scope:** All files inside `/root/projects/Interverse/plugins/interlens/` (content updates only, no file renames)

## Naming Mappings Applied

| Old Pattern | New Pattern | Context |
|---|---|---|
| `linsenkasten` | `interlens` | lowercase references (CLI commands, URLs, package names) |
| `Linsenkasten` | `Interlens` | title case references (headings, prose, comments) |
| `LINSENKASTEN_API_URL` | `INTERLENS_API_URL` | environment variable |
| `LinsenkastenMCP` | `InterlensMCP` | JavaScript class name |
| `linsenkasten-mcp` | `interlens-mcp` | npm package name, binary name |
| `linsenkasten.com` | `interlens.com` | domain references |
| `linsenkasten-api-production.up.railway.app` | `interlens-api-production.up.railway.app` | Railway deployment URL |
| `linsenkasten.vercel.app` | `interlens.vercel.app` | Vercel deployment URL |

## Exclusions

- `.git/` directory (not touched)
- `node_modules/` (not present in working tree)
- `pnpm-lock.yaml` (not present in working tree)
- No file or directory renames performed (content only)

## Files Updated

### Core Package Files (packages/mcp/)

| File | Changes |
|---|---|
| `packages/mcp/package.json` | name, bin entries, keywords, repository URL |
| `packages/mcp/index.js` | class name `LinsenkastenMCP` to `InterlensMCP`, server name string, log message |
| `packages/mcp/cli.js` | all CLI help text, command names, env var `LINSENKASTEN_API_URL` to `INTERLENS_API_URL` |
| `packages/mcp/api-client.js` | env var `LINSENKASTEN_API_URL` to `INTERLENS_API_URL`, fallback Railway URL |
| `packages/mcp/.env.example` | env var name and comments |
| `packages/mcp/README.md` | all references (install commands, config examples, URLs) |
| `packages/mcp/schemas/openapi.yaml` | title, description, contact name/URL, server URL |
| `packages/mcp/schemas/openai-functions.json` | name, description, api_base_url comment |
| `packages/mcp/examples/claude-desktop-config.json` | server key name |
| `packages/mcp/examples/local-config.json` | server key name |
| `packages/mcp/lib/thinking-modes.js` | comment header |

### MCP Documentation (packages/mcp/docs/)

| File | Changes |
|---|---|
| `packages/mcp/docs/API.md` | all references |
| `packages/mcp/docs/chatgpt-gpt-config.md` | all references |
| `packages/mcp/docs/claude-project-template.md` | all references |
| `packages/mcp/docs/codex-cli-integration.md` | all references |
| `packages/mcp/docs/PUBLISH_v2.0.0.md` | all references |
| `packages/mcp/docs/SESSION_SUMMARY.md` | all references |
| `packages/mcp/docs/USAGE.md` | all references |
| `packages/mcp/docs/plans/2025-01-21-research-synthesis.md` | all references |
| `packages/mcp/docs/plans/2025-01-21-agent-improvements-design.md` | all references |
| `packages/mcp/docs/plans/2025-01-21-benchmark-suite.md` | all references |
| `packages/mcp/docs/plans/2025-01-21-phase0-implementation.md` | all references |

### Benchmark Files (packages/mcp/benchmark/)

| File | Changes |
|---|---|
| `packages/mcp/benchmark/README.md` | all references |
| `packages/mcp/benchmark/IMPLEMENTATION_STATUS.md` | all references |
| `packages/mcp/benchmark/run_benchmark.py` | all references |
| `packages/mcp/benchmark/metrics/tool_patterns.py` | all references |
| `packages/mcp/benchmark/metrics/frame_coverage.py` | filename pattern in comment |
| `packages/mcp/benchmark/problems/TEMPLATE.md` | all references |
| `packages/mcp/benchmark/problems/code/microservices-decision.md` | all references |
| `packages/mcp/benchmark/problems/code/performance-stuck.md` | all references |
| `packages/mcp/benchmark/problems/code/tech-debt-velocity.md` | all references |
| `packages/mcp/benchmark/problems/design/onboarding-dropoff.md` | all references |
| `packages/mcp/benchmark/results/PHASE0_RESULTS.md` | all references |
| `packages/mcp/benchmark/results/BASELINE_RESULTS.md` | all references |
| `packages/mcp/benchmark/results/baseline/accessibility-improvements_no-interlens.md` | all references |
| `packages/mcp/benchmark/results/baseline/feature-prioritization_no-interlens.md` | all references |
| `packages/mcp/benchmark/results/baseline/performance-stuck_no-interlens.md` | all references |
| `packages/mcp/benchmark/results/current/accessibility-improvements_with-interlens.md` | all references |
| `packages/mcp/benchmark/results/current/feature-prioritization_with-interlens.md` | all references |
| `packages/mcp/benchmark/results/current/performance-stuck_with-interlens.md` | header and tool usage text |

### Root Files

| File | Changes |
|---|---|
| `package.json` | workspace name |
| `CLAUDE.md` | all references |
| `README.md` | all references |
| `CHANGELOG.md` | all references (CLI commands, package name) |
| `LICENSE` | copyright holder name |

### Web Frontend (apps/web/)

| File | Changes |
|---|---|
| `apps/web/package.json` | package name |
| `apps/web/CLAUDE.md` | all references |
| `apps/web/README.md` | all references (project name, URLs, repo links, directory structure) |
| `apps/web/public/index.html` | meta description, page title |
| `apps/web/public/manifest.json` | short_name, name |
| `apps/web/src/components/LensExplorerLinear.jsx` | h1 header text |
| `apps/web/src/components/LensExplorerClean.jsx` | h1 header text |
| `apps/web/api/health.js` | service name, endpoint URL |
| `apps/web/api/index.js` | page title, h1, MCP config example, web app link |
| `apps/web/api/mcp-sse.js` | connection.init name, serverInfo name |

### API Backend (apps/api/)

| File | Changes |
|---|---|
| `apps/api/CLAUDE.md` | all references |
| `apps/api/README.md` | all references (project name, repo links, client names) |
| `apps/api/.env.example` | comment header |
| `apps/api/lens_search_api.py` | CORS allowed origins (6 domain entries) |
| `apps/api/scripts/generate_contrasts_simple.py` | docstring header and description |
| `apps/api/migrations/README.md` | database name in heading |
| `apps/api/docs/PROJECT_EVALUATION.md` | all references (heading, descriptions, tool names) |
| `apps/api/docs/RAILWAY_EXECUTION.md` | directory reference in comment |
| `apps/api/docs/plans/2025-01-21-gap-detection-design.md` | all references (prose, CLI examples, layer names) |
| `apps/api/docs/plans/2025-11-22-creative-enhancements-design.md` | directory references |
| `apps/api/docs/plans/2025-11-22-implementation-summary.md` | directory and task references |

### Research Docs (docs/)

| File | Changes |
|---|---|
| `docs/research/fd-systems-test-own-prd.md` | all references (review title, finding descriptions, MCP references) |

## Verification

Final case-insensitive grep for `linsenkasten` across the entire plugin directory returned **zero matches**.

## Notable Patterns

1. **CORS origins in lens_search_api.py** contained 6 domain variants (with/without www, http/https, vercel preview pattern). All updated to `interlens`.

2. **Environment variable** `LINSENKASTEN_API_URL` appeared in 3 locations: `api-client.js` (runtime), `.env.example` (template), and `cli.js` (help text). All updated to `INTERLENS_API_URL`.

3. **Class name** `LinsenkastenMCP` in `index.js` required targeted editing (not simple replace_all) because the case pattern differs from standard title case.

4. **Railway URL** `linsenkasten-api-production.up.railway.app` appeared in `api-client.js` and `openapi.yaml`. Updated to `interlens-api-production.up.railway.app`.

5. **MCP SSE endpoint references** `mcp.linsenkasten.com` appeared in `health.js` and `index.js`. Updated to `mcp.interlens.com`.

## Total Files Updated

**67 files** across all directories within the plugin.
