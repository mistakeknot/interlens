# data/ — the Linsenkasten store

Single git-synced store read by `packages/mcp` on every machine. Nothing here is served from a host.

- `curated/` — the 258 FLUX lenses (`lenses.json`), 280 typed connections (`connections.json`: principle | contrast | synthesis | emergence | application), 28 thematic frames (`frames.json`). Hand-curated; edited rarely.
- `generated/` — the harvested `fd-*` layer. `index.jsonl` one record per unique lens body; `lenses/<id>.md` the body; `specs/<id>.json` the flux-gen spec when one was found; `edges.jsonl` typed edges; `attributions.jsonl` ledger finding ↔ lens rows; `reuse-log.jsonl` append-only reuse records.
- `harvest/<machine>.jsonl` — per-machine sightings (one row per file seen). Inputs to merge; never edited by hand.
- `embeddings/` — `nomic-embed-text` 768-d float32 little-endian row-major matrices with `.ids.json` giving row order; `meta.json` records model, dim, counts and the harvest commit. Regenerated only by `python3 -m harvest embed` (canonical run: zklw).
- `reports/` — dated harvest / merge / prune sweep reports. Every collapse and every deletion is listed here.
- `prune-targets.txt` — the explicit list of repos prune may touch. Reviewed by a human before `--apply`.
