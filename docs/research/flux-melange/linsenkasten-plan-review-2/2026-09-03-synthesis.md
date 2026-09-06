# Linsenkasten plan review — third melange pass (run wf_6cad5d77-24b)

**Target:** `docs/plans/2026-09-02-linsenkasten-registry.md` at 3bf7843 (after the run-1 and run-2 folds). **Goal:** hunt the regions no earlier lens reached — Tasks 3, 5, 10, 11, the `api-local.js` shapes not yet checked against `index.js`, and the Mac-side prune sweep.

**Provenance of this file:** the workflow's synthesis agent failed with an API 529 after `heat-ledger.jsonl` was fully written (28 findings, 18 upheld, 0 refuted, 2 rounds, DRY halt). This synthesis was written by hand from the ledger and the seven lens reports under `round-0/` and `round-1/`; it records dispositions, it does not re-adjudicate. The ten round-0 findings that the round-1 probes confirmed (f-001, f-003, f-004, f-010, f-016, f-018, f-021, f-024, f-026, f-027) still carry `status: raw` in the ledger because no synthesis pass ran to promote them; they are treated as upheld below because the probes (`round-1/probe-0`, `round-1/probe-1`) verified each against the live `index.js` and the plan text.

**Lenses:** fd-harvestcore-recordintegrity, fd-localengine-shapefidelity, fd-prunesweep-hostverification (seed-adjacent); fd-bookkeeping-reconciliation, fd-horology-casing-up (seed-distant). FUSE did not fire (third run in a row).

## Clusters, by heat

1. **Name-keyed attribution defeats variant-cluster head selection** (f-001, f-021, f-024; sharpened by probe-0 into f-025 duplicate rows). Task 10 joined ledger findings to index records by bare `name`; Task 12 clusters same-name records; every member of a same-name cluster therefore inherited a byte-identical track record and the "highest `smoothed_hit_rate`" head rule was a guaranteed tie, silently broken by id while labeled `hit_rate`. Four lenses, both seeds. **Disposition:** attribution rows carry `body_hash` from scan time; the join is `(name, body_hash)`; unattributable rows are shown as `name_only` and never inherited; head tiers require a strict winner and fall through to an `"id"` label; `attributions.jsonl` is written once, globally.
2. **Gate A cannot see the new code** (f-014, P0). The marketplace pins `interlens` at 2.2.5 on both machines; toggling the plugin loads the pre-plan cache. **Disposition:** gates are `smoke.mjs`; fresh-session check moves to Task 20 step 4.
3. **`api-local.js` shapes vs. `index.js` dereferences** (f-015 journey wrapper P0; f-003/f-004/f-016/f-026/f-027 three incompatible coverage shapes and discarded counts; f-010/f-018 insight fields produced by nothing; f-028 no test or smoke exercised any of it). **Disposition:** bare path arrays + `path_weights`; `frameCoverage` returns the count map and percentage; `gap_analysis` gets its own shape; `synthesis_insight`/`overall_insight` derivation rules; handler-dereference assertions and three new smoke lines.
4. **Prune sweep at real scale** (f-019 P0 branch ownership — two live repos on the sibling's `sweep/2026-09-02`; f-002 P0 all-or-nothing mtime gate across 40+ autosynced repos; f-009 preconditions never re-checked; f-013 report gap; f-023 corpus is ~4,800 files / 43 repos, not 2,900 / 48). **Disposition:** candidacy (d) default branch; precondition (4) per target; (2)(3) re-checked per repo; `(untracked, no repo history)`; measured counts recorded in Task 14.
5. **Harvest wrapper and embed lifecycle** (f-020 P0 trap wipes a human's uncommitted `data/` on a diverged pull; f-017 digest drift kills the unattended nightly; f-005 incremental key incoherent; f-006 torn harvest file; f-022 zero-sighting fields blank; f-008 audit misses duplicates). **Disposition:** `data/`-clean precondition before the trap; embed exit 3 + one automatic `--reembed-all`; `{id: sha256(embedding_text)}`; temp-then-rename + loud parse failure; carry-forward rule; audit uniqueness.
6. **Executability nits** (f-007 stale "count is 4"; f-011 three export counts; f-012 `degree` not in the description). All folded.

## Not folded

Nothing was refuted. No accepted limitations were added by this pass.

## Fold

Folded into the plan 2026-09-06 (commit on `feat/linsenkasten`); the plan's "Review findings" section carries the per-finding table.
