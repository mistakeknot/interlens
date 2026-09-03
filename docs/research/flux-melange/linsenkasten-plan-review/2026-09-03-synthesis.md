---
artifact_type: melange-synthesis
method: flux-melange
target: docs/plans/2026-09-02-linsenkasten-registry.md
target_description: "Linsenkasten execution plan — 25 tasks in 8 stages (local engine over data/, Python harvest pipeline, interflux reuse seam, rename to linsenkasten, remnant retirement, zklw explorer + harvest timer, prune, docs and goal close) with an exec manifest, already folded with the brainstorm melange's 29 upheld findings"
goal: "Review the Linsenkasten implementation plan for what the first melange (over the brainstorm) left uncovered: (1) Fork 1's rename cascade — npm linsenkasten-mcp at 2.2.1, the GitHub redirect flip, the MCP server key, the marketplace row, settings keys on both machines, interflux and Clavain references, directory moves on Mac and zklw including the git worktree; (2) behavioral equivalence of the graph.py→lib/graph.js port and the api-local.js result shapes packages/mcp/index.js actually reads; (3) the zklw explorer server's exposure and the daily harvest timer's failure modes; (4) split-brain and ordering between the two machines across harvest, merge, embed, edges and prune, verified against zklw's live state over ssh; (5) whether each task is executable by a sonnet-grade executor exactly as written. Prioritize anything that would corrupt or delete data, break the plugin for a fresh session, or leave the two machines disagreeing."
weights: risk-hunt
rounds_run: 3
halt_reason: BUDGET
total_fusions: 0
emergent_findings: 1
runtime: claude
date: 2026-09-03
---

# Linsenkasten plan review — melange synthesis

Seven lenses, three rounds, 35 ledger rows: 26 upheld, 5 raw, 2 refuted, 2 fusion-lane rows. Re-scored at synthesis against the plan text and, where a claim rested on live state, against the machines themselves.

**Re-scoring note.** I moved five scores off their round-time triage estimates. Up: f-015 (4→6 — the drift it describes is detected only by Task 18's reuse proof, and f-033 shows that proof cannot run), f-014 (novelty 0→1 — the 88.6% measurement is new information, not a restatement of f-005's spec contradiction), f-033 (novelty 2→3 — it takes three artifacts cross-referenced plus a live `git worktree list` to see), f-022 (novelty 1→2), f-017 (risk 2→3). Down: f-006 (risk 9→6 — one advisory tool, silently wrong, not a corrupting one), f-016 (novelty 3→2 — the `grep -c` exit-code gotcha is commodity shell knowledge; its placement in a `<verify>` line is what's sharp, not the fact).

**Independent re-verification at synthesis time** (read-only `ssh -o BatchMode=yes zklw`): `~/.local/share/linsenkasten/` still does not exist; the checkout is `## main...origin/main` with no `feat/linsenkasten`; `systemctl --user list-unit-files` matches nothing on `linsenkasten|interlens|harvest`; nothing listens on 7411 or 7412. I also read `packages/mcp/index.js:450-490`, the plan's Task 2/8/9/12/16/18/21/24 bodies, and `lattice/src/lattice/connectors/interlens.py` directly. Every claim I leaned on below, I saw.

---

## 1. Novelty × Risk Frontier

The front is **degenerate**: three findings sit at (novelty 3, risk 9) and dominate every other point. That is itself the run's headline — the three deepest findings are also the three most dangerous, which is not the usual shape and means there is no cheap-insight/expensive-insight tradeoff to manage here. I lead with the apex, then give the two shoulders the brief asks for, because they are different *failure classes* even though they are dominated.

### Apex — (novelty 3, risk 9)

**f-028 — merge rebuilds the registry from ground the prune already emptied.** *(lens: fd-salvage-excavation-record)*

`harvest/merge.py` has no memory of the outgoing `index.jsonl`. It reads every `data/harvest/*.jsonl` — themselves rewritten wholesale by `scan.py`'s live filesystem walk — groups by `body_hash`, and emits one record per hash. Every field, `first_seen` included, is recomputed from a *currently sighted* file's frontmatter. Once Task 24 deletes a lens's `fd-*.md` from zklw's disk, the next `scan && merge` finds no sighting anywhere and drops the record. Not at some future 04:30: Task 24's own text says "a fresh `scan --machine zklw` if any target changed," so the erasure fires inside the plan's own final stage.

- **Blast 3:** the index record *is* the deliverable. `edges.jsonl` regenerates wholesale too, so lineage, cluster and cohort go with it. The body survives orphaned at `data/generated/lenses/<id>.md` with nothing pointing at it — which is worse than a clean delete, because `harvest audit` (index ⇔ bodies ⇔ embeddings, same ids same counts) will then fail on the mismatch and exit 1, wedging every subsequent run.
- **Likelihood 3:** certain, by construction. I grepped the plan for `tombstone|never remov|carry.forward|persist.*index|retained|preserve` — zero matches across 852 lines. Nothing unions this run's sightings with the prior index; nothing treats a body still on disk as sufficient to keep its record alive.
- Severity *for reference*: P0.

The shape of this is what earns the novelty: Stage G's entire argument is that the registry record makes deletion safe, and the pipeline is built so that deletion destroys the record. Observation is destruction, and the context sheet was never filled before the trowel.

**f-002 — an external consumer in two other repos hardcodes the path the plan deletes.** *(lens: fd-release-engineering-cascade)*

`lattice/src/lattice/connectors/interlens.py:28` sets `DEFAULT_LENSES_REL = Path("interverse/interlens/apps/api/all_lenses_for_analysis.json")`, mirrored byte-for-byte in `core/interweave/src/lattice/connectors/interlens.py:28`. Task 20 step 5's "grep and edit live config" never names this file.

- **Blast 3:** two repos, each with a `tests/test_connector_interlens.py` this plan never runs, and a `.claude-plugin/integration.json` listing interlens as a recommended companion. The connector indexes lenses into CanonGraph; it fails silently at the next harvest.
- **Likelihood 3:** certain, and I upgrade the mechanism from the round-0 report's "breaks twice" to **three independent breaks**: Task 2 `git mv`s the file to `data/curated/lenses.json`, Task 20 renames the parent directory, and Task 21 deletes `apps/api/` *entirely*. The third is unrecoverable by any rename-sweep fix — the file the connector names will not exist under any path.
- Severity: P1 as filed; on my read it is P0-adjacent, because no sweep of the interlens repo can repair it.

**f-013 — two advertised MCP resources call the function Task 6 specifies to throw.** *(lens: fd-jurilinguistics-authentic-text)*

Task 6's 17-row `api-local.js` export table is a contract with `index.js`'s *tool* handlers. It misses the *resource* handlers. I read `packages/mcp/index.js:450-490`: `lens://episodes` and `lens://graph` each call `api.getCachedData(...)` (a no-op returning `null` under `api-local.js`, per the table's own first row) and then **unconditionally** `api.fetchFromAPI(...)`, which the table's third row defines as `throws Error('linsenkasten: remote API retired; use the local store')`. Both URIs are advertised in `ListResourcesRequestSchema` at `index.js:405,411`.

- **Blast 3:** every fresh session on both machines, for any client that reads a resource. The goal named "break the plugin for a fresh session" as a top priority; this is that, exactly.
- **Likelihood 3:** certain. Task 6's Must-Haves and `<verify>` block exercise only the 17 tool-facing exports; `ReadResourceRequestSchema` is never touched by a test, a smoke call, or a verify line.
- Severity: P0.

### Shoulder A — max novelty, mid risk (3, 6)

Four findings, each a different way the plan's own acceptance machinery cannot see its own failure.

- **f-032 — the npm layer is undetectable drift by design** *(fusion: fd-release-engineering-cascade × fd-algorithmic-port-parity)*. Task 20's `<verify>` runs `gh repo view`, one `grep -c` on `marketplace.json`, one on `~/.claude/settings.json`. None queries `registry.npmjs.org`. Since the publish pipeline never invokes npm at all (f-031), the plugin ecosystem reads "linsenkasten 3.0.0" everywhere the plan checks while the installable package stays frozen at the 2025 `2.2.1` snapshot. Blast 2 (non-plugin install path only) × likelihood 3.
- **f-015 — `embeddingText` is byte-identical by prose only** *(fd-jurilinguistics-authentic-text)*. `normalize_body` gets a golden-hash test in Task 8. Its sibling recipe, ported Python→JS, gets a sentence. `re.S | re.M` versus JS `s`/`m` is a one-flag drift that silently pushes cosines below `RESOLVE_MIN_COSINE = 0.86`, so the registry reads *empty* rather than *broken*. I raised risk to 6 (blast 3 × likelihood 2): the failure defeats Fork 3's entire value proposition, and its only detection path is Task 18's reuse proof — which f-033 shows cannot run.
- **f-029 — the Sylveste deletion strands a shared checkout and depends on an unmerged PR** *(fd-salvage-excavation-record)*. Task 23's special case (main protected → branch `chore/prune-fd-agents`, open a PR) has no step returning the checkout to its original branch, and `exec.yaml`'s `task-25 depends: [task-18, task-22, task-24]` waits on the sweep having *run*, not the PR having *merged*. Live: `~/projects/Sylveste` is on `estate-checks-falsifiable`, not main — so the branch the plan forks from, and strands the checkout on, is not even the branch it thinks. 396 `fd-*.md` files, matching the plan's own count. Blast 2 × likelihood 3.
- **f-033 — Task 18's DONE-WHEN proof cannot resolve a registry root from the worktree the plan runs in** *(fd-proof-house-definitive)*. `find_registry_root()`'s four candidates are `$LINSENKASTEN_ROOT`, `.../interverse/linsenkasten`, `.../interverse/interlens`, and the marketplace plugin cache. The worktree at `~/projects/.worktrees/interlens-linsenkasten` — where all the work lands — appears under none of them, and the main checkout at `.../interlens` sits on `sweep/2026-09-02` with no `data/generated/`. Task 18's command carries no `LINSENKASTEN_ROOT=` prefix; the only place that variable is set anywhere in the plan is Task 16's own `tmp_path` fixture, which sidesteps precisely this gap. `expect: contains "reused 1"` will print `reused 0`. I raised novelty to 3. Blast 2 × likelihood 3.

### Shoulder B — mid novelty, max risk (1, 9)

**f-014 — the port's directedness is not a spec quibble, it is 88.6% of the data.** *(fd-jurilinguistics-authentic-text)*

Task 4 specifies `lib/graph.js` as an "undirected weighted graph" and claims to port `graph.py:48-142` exactly. `graph.py:22` is `self.graph = nx.DiGraph()`. The lens loaded the real `claude_lens_connections_analysis.json`: 280 rows, of which only 32 (11.4%) have a reciprocal — **248 (88.6%) are one-directional**, including the plan's own `graph.test.mjs` fixture pair. `get_central_lenses`, a Must-Have tool, computes `nx.betweenness_centrality` on the directed graph (normalization `1/((n-1)(n-2))`) with no `to_undirected()` anywhere in its path; an undirected port normalizes at `2/((n-1)(n-2))` over a graph with 248 edges the original never had. Blast 3 (every graph tool: neighborhoods, bridges, contrasts, centrality) × likelihood 3.

Novelty 1 rather than 0 because the measurement is the finding — f-005 established the contradiction, f-014 established that it is not a rounding difference.

### Second shelf — heat 12, not on the front, named because they carry forks the front does not

- **f-006** *(fd-algorithmic-port-parity)*: the live `get_central_lenses` schema at `index.js:216-231` accepts `{betweenness, pagerank, eigenvector}`; Task 4 implements `betweenness|degree|closeness` and silently maps everything else to betweenness. A caller asking for pagerank gets betweenness with no error. `graph.py`'s own fallback is `degree_centrality` — so even the fallback diverges from the thing it claims to port. Risk cut 9→6.
- **f-007** *(fd-algorithmic-port-parity)*: `find_bridges` in Python needs a candidate to bridge *one* pair and returns top 5; Task 4 requires adjacency to *every* id in the group and returns top 10. On a graph that is 88.6% one-directional, universal adjacency will return `[]` for most real groups — a Must-Have tool that answers nothing. `graph.test.mjs`'s only assertion is `Array.isArray(...)`, so either semantics passes.
- **f-012** *(fd-distsys-harvest-splitbrain)*: Task 15's and Task 22's scripts both `git push origin HEAD:main` bare under `set -euo pipefail` with no retry, and the Mac's on-demand equivalent is never written down at all, so its collision behavior is unverifiable from the plan.
- **f-020** *(fd-hydrography-chart-currency)*: `zklw-harvest.sh` chains `scan && merge && stats && embed --check && edges && audit` with the commit+push in a trailing conditional. `embed --check` can legitimately fail (Ollama digest mismatch, brief unreachability) *after* scan and merge have already rewritten tracked `data/` files — leaving zklw dirty, so the next night's `git pull --ff-only` refuses and the registry wedges. No `OnFailure=`, no dirty-tree reset, and `linsenkasten-harvest.service` carries no `Restart=` at all while the explorer unit right next to it has `Restart=on-failure`. Confirmed live: no such units exist yet, so nothing later patches this.
- **f-001** *(fd-release-engineering-cascade)*: Task 19's `<verify>` regex `^(CHANGELOG.md|docs/)` excludes *all* of `docs/`, not the brainstorms/plans/research the prose says — so it reports pass while `docs/vision.md`, `docs/interlens-vision.md` (8 hits) and `docs/roadmap.json` keep the old name.

---

## 2. Top Fusions

**One emergent finding; zero fusion attempts.** The controller issued DEEPEN, STEER-WIDE and PROBE-DISAGREEMENT across three rounds and never issued a FUSE. The single `kind: fusion` lens, `npm-publish-adjudication`, was a disagreement adjudicator spawned by PROBE-DISAGREEMENT, not a hybrid intersection-detector. So the fusion lane is a **negative result for the run as a whole**, and the one emergent finding came out of an adjudication rather than a designed intersection.

### f-032 — emergent

- **Parents:** fd-release-engineering-cascade × fd-algorithmic-port-parity (via the three-parent adjudicator, which also carried fd-hydrography-chart-currency).
- **Intersection justification (as filed):** neither parent connected the publish-never-invoked defect to Task 20's `<verify>` blind spot. fd-release-engineering-cascade reported "no task verifies publish authorization" (f-003); fd-algorithmic-port-parity reported the corrected auth state and the stale README install path (f-022/f-024). Only the intersection produces the standing claim: the drift is **permanent and undetectable by design**, because the pipeline that would fix it does not exist and the check that would notice it queries the wrong three things.
- **Evidence:** Task 20's `<verify>` is exactly `gh repo view mistakeknot/linsenkasten --json name -q .name`, `grep -c '"linsenkasten"' .../marketplace.json`, `grep -c 'linsenkasten@interagency-marketplace": true' ~/.claude/settings.json`. The review brief's Fork 1 lists the npm package alongside the GitHub redirect, the MCP key, the marketplace row and the settings keys; the plan's verify coverage stops one layer short of the only one of those five that lives outside the repo.

### f-031 — fusion output, self-demoted to convergence

The adjudicator explicitly wrote its own demotion: "fd-algorithmic-port-parity (f-022) already reported this exact location+cause in round 1, so this is a confirmation, not an emergent intersection." Honest bookkeeping, and it is why `emergent_findings: 1` and not 2. Its contribution is depth, not novelty: it read intercore's `internal/publish` Go package end-to-end — `grep -rn "npm" internal/publish/*.go` returns zero matches, every `exec.Command` is `git`/`bash`/`ps`, `discovery.go:125` registers `package.json` purely as a version-bump target, and the only per-plugin arbitrary-command hook (`scripts/post-bump.sh`, `engine.go:353-359`) does not exist in this repo.

### Negative results — pairs never fused that had visible tension

- **fd-salvage-excavation-record × fd-distsys-harvest-splitbrain: never attempted.** This is the run's biggest missed fusion. f-028 (prune erases the record) came from salvage alone; f-020 (the timer wedges on a dirty tree) came from distsys alone. Their intersection is a live question the ledger never asks: *the wedge and the erasure are anti-correlated* — a harvest that fails after merge leaves the registry stale but intact, while a harvest that succeeds after a prune erases records permanently. Which failure the two machines land in depends on whether Ollama was up at 04:30. Nobody looked.
- **fd-proof-house-definitive × fd-algorithmic-port-parity: never attempted.** Proof-house supplies "the maker may not strike his own marks"; port-parity supplies "a test derived from prose is not evidence of equivalence." Their intersection is f-030's stronger form: Task 21 deletes `graph.py` after Task 4 built its tests from a *hand-written prose spec of* `graph.py`, so the reference and the only thing that could adjudicate against it both leave in the same plan.
- **fd-hydrography-chart-currency × fd-jurilinguistics-authentic-text: independent here.** Hydrography reads identity propagation; jurilinguistics reads text divergence. They landed on disjoint task ranges (Stage E/F versus Stage B/D) and produced no shared cluster.

---

## 3. Taste Calls

### Smells to fix

**f-027 — narrated-as-done register** *(taste −1, kind: smell; fd-release-engineering-cascade)*. Plan line 764 bundles two claims of different epistemic status into one clause in one tense: "written once by `tailscale ip -4 > ~/.local/share/linsenkasten/ts-ip`; ...; `loginctl show-user mk -p Linger` says `yes` on zklw, checked 2026-09-02." One half was verified live and is true. The other half describes a command nobody has run — I re-checked at synthesis: the directory does not exist. Because both read as settled, the missing artifact is invisible on a read-through. This is the taste call of the run because it is a *generative* defect: it names the authoring habit that produced the bug, not just the bug. Any place else the plan narrates a one-time setup command in prose instead of listing it as a step carries the same risk.

**f-017 — commit steps left to inference against the plan's own stated contract** *(taste −1, kind: smell; I am assigning this taste score at synthesis; it was filed taste 0)*. The plan declares a no-judgment-calls design goal at line 26, then gives roughly seventeen commit steps as a heading plus a backticked message with no command and — critically — no step that writes that message into `/tmp/msg`. Only three steps show the full `git commit --no-verify -F /tmp/msg -- <paths>` form. The smell is not the missing keystrokes; it is that a plan which names its own contract violates it in its most-repeated step, which invites an executor to improvise exactly where the house rules are strictest.

### Elegance to preserve

**No `+taste` finding exists in the ledger.** With `weights: risk-hunt` and seven lenses each constructed as a defect detector, no lens carried an elegance primitive — a structural consequence of the run's configuration, not a verdict on the plan.

For the record, from my own reading rather than any lens: **Task 12's calibration table is genuinely good design.** It reports the ten closest pairs *below* `VARIANT_MIN_COSINE` (not merged) and the ten farthest pairs *inside* clusters (merged), with names and scores, and puts that in front of a human *before* Task 23 deletes anything. That makes a threshold falsifiable at the moment it starts authorizing destruction, which is the right place. Whatever else changes in Stage G, keep that. (Flagged as a synthesis observation, not a ledger finding — it carries no id and does not appear in `surfaced.jsonl`.)

---

## 4. Convergence Spine

High confidence, low novelty. These are commodity — several lenses reached them independently, and two rounds of live verification did not move them. Trust them; do not spend attention re-deriving them.

- **`feat/linsenkasten` is never merged** (f-010 fd-distsys-harvest-splitbrain, f-018 fd-hydrography-chart-currency; novelty 0, risk 9). No task in the plan merges or pushes the branch to main. Task 14 step 6 is the bare word "Push." with no ref; Task 15 then has zklw run `git pull --ff-only origin main` and immediately start harvesting. Re-confirmed at synthesis: zklw is `## main...origin/main` at a pre-plan commit with no local `feat/linsenkasten`. Task 15 fails at its first substantive command, and everything in Stages E–H that assumes zklw has the code is built on that. This is the single most load-bearing gap and the one nobody should have to argue about.
- **`--host` path semantics are specified nowhere the executor will read** (f-021, f-026, both fd-release-engineering-cascade / fd-hydrography-chart-currency; refuted f-009 in the same cluster; novelty 0, risk 9). Line 743 — the only place `server.js`'s CLI contract is stated — defines `--host` as a bind address defaulting to `127.0.0.1`. Line 759's `ExecStart` passes a filesystem path. Line 764, a parenthetical *about the unit*, is the only statement that the server reads that file. An executor implementing the Server section has no textual basis to build the path-detection branch. Neither Task 22 verify line exercises it.
- **The `ts-ip` file does not exist and no step creates it** (f-025; the same cluster's f-011 is filed *refuted* while f-025 explicitly says CONFIRMED — see §5). Re-verified at synthesis: `ls ~/.local/share/linsenkasten/` → no such file or directory. Plain `>` redirection does not `mkdir -p`, so even a human running the narrated command by hand fails on a fresh zklw. `Restart=on-failure` then crash-loops the unit with no alerting anywhere in the plan.
- **`graph.py` is a DiGraph, the plan says undirected** (f-005 fd-algorithmic-port-parity, f-014 fd-jurilinguistics-authentic-text; novelty 0/1, risk 9). See the Shoulder B entry.
- **The npm package predates this plan and is the project's own** (f-003, f-019, f-023; novelty 0). `linsenkasten-mcp@2.2.1`, maintainer `gensysven`, `repository: mistakeknot/Linsenkasten`, `bin {linsenkasten, linsenkasten-mcp}` matching Task 19's planned map exactly. `gh repo view mistakeknot/linsenkasten` already redirects to the live `mistakeknot/interlens` — the repo was *named* linsenkasten before an earlier rename. So Task 20 step 1's `gh repo rename` is de-risked, and f-023 stands as a clean negative result (risk 0). `interlens-mcp`, the name in the current `package.json`, has never been published at all.
- **`interpub:release` never invokes `npm publish`** (f-022 fd-algorithmic-port-parity, f-031 adjudicator; novelty 0–2, risk 3). Verified through intercore's Go source. Consequence: **f-024** — Task 19's sed sweep rewrites `packages/mcp/README.md:46` and `:340` from `npm install -g interlens-mcp` to `npm install -g linsenkasten-mcp`, turning a broken instruction into a *working* one that serves a stale Nov-2025 snapshot predating the entire registry rewrite and Task 21's deletion of `apps/api`.

---

## 5. Live Disagreements

### Open at halt: npm auth state — adjudicated in substance, never closed in the ledger

- **f-003 / f-019** (fd-release-engineering-cascade, fd-hydrography-chart-currency): "this session's npm auth is confirmed absent."
- **f-022 / f-031** (fd-algorithmic-port-parity, then the adjudicator): auth is **present but non-functional** — `~/.npmrc` contains a configured `_authToken`, `npm whoami` returns 401 — and the sub-claim is a distraction because `interpub:release` never reaches npm at all.

The adjudicator settled this by reading `internal/publish` end-to-end. **f-003 and f-019 still carry `status: raw` with the refuted sub-claim intact**, which is why the controller still lists this contradiction as open. It is a bookkeeping artifact, not a live technical dispute: the mechanism is settled.

**The genuinely unresolved question underneath is a taste call the plan never states, and it is mk's.** Is `npm install -g linsenkasten-mcp` a supported install path or not?

- If **yes**: Task 20 needs an actual `npm publish` step (with working auth), and f-024's README rewrite is correct but premature.
- If **no**: Task 19 should *delete* the README's Option-2 install instructions rather than rename them, and f-032's blind spot stops mattering.

Renaming a broken instruction into a working-but-wrong one, which is what the plan does today, is the only answer that is definitely incorrect. Nothing in the plan or the brief states the intent.

### Second contradiction, internal to the ledger: is `ts-ip` missing?

`f-011` is filed `status: refuted`; `f-025`, in the same cluster, reads "CONFIRMED" with the same evidence. The refutation is not explained in any lens record. I re-ran the check read-only at synthesis — `~/.local/share/linsenkasten/` does not exist on zklw — so **f-025 is authoritative and f-011's status is an error**. Flagged rather than silently corrected, because the ledger is the artifact of record. The same pattern likely explains `f-009`'s refutation: its absolute claim ("the semantics *never* say to treat `--host` as a file path") is false because line 764's parenthetical exists, and the sharper f-026 replaced it — a correct refutation of an overstated claim whose substance survived.

---

## Standing, not surfaced

Upheld, real, below the surfacing bar — recorded so nothing is lost. **f-004**: renaming the marketplace row orphans `~/.claude/plugins/cache/interagency-marketplace/interlens/` with no cleanup step. **f-008**: Task 4's DFS/ascending-id tie-break and `limit=5` default for `findPaths` have no basis in `graph.py`'s `find_path`, which sorts by weight with no secondary key and hardcodes `[:3]`. **f-016**: Task 6's `grep -c "api-client" packages/mcp/index.js` expecting `"0"` is unsatisfiable — `grep -c` prints `0` and exits 1, so a harness checking both cannot pass it once the task succeeds. **f-023**: the GitHub rename is already de-risked by an existing redirect (negative result). **f-030**: nothing captures `graph.py`'s runtime output as a fixture before Task 21 deletes it, and nothing points a future reader at the pre-deletion history. **f-034**: `.github/workflows/ci.yml` on `sweep/2026-09-02` sets no `PYTHONPATH` and never vendors `_shared`, which `tests/structural/conftest.py:6-11` needs — the same reason Task 1's local verify line sets it by hand — and nothing checks the CI job goes green. **f-035**: `exec.yaml` has no edge between task-17 (writes `linsenkasten` into live interflux docs) and task-19/20 (which create the tool under that name); `mode: dependency-driven, max_parallel: 3` permits the wrong order.

---

## If you read one thing

**f-028.** Stage G's whole safety argument is that the registry record survives the deletion it authorizes. `merge.py` is built so that it cannot. Everything else on this list makes something fail; this one makes something disappear, unattended, with the audit that would notice firing only after the overwrite has already hit disk.

---

## Appendix — Spice Trail

**Round 0 — assay, 2 agents dispatched, 21 findings, yield 14, novel_cluster_rate 0.81.**
Five base lenses ran (three adjacent: fd-release-engineering-cascade, fd-algorithmic-port-parity, fd-distsys-harvest-splitbrain; two distant: fd-jurilinguistics-authentic-text, fd-hydrography-chart-currency). Coverage mapped cleanly onto the brief's forks: release-engineering and hydrography took Fork 1's rename cascade, port-parity and jurilinguistics took Fork 2's equivalence, distsys took Forks 3 and 4. Every zklw claim was checked live over ssh in this round, which is what makes f-010/f-018 and f-011/f-025 trustworthy. Two findings were refuted in-round for overstatement (f-009, f-011) — both times the substance survived in a sharper sibling.

**Round 1 — probe, 3 directives, 9 findings, yield 5, novel_cluster_rate 0.67.**
- `DEEPEN → fd-algorithmic-port-parity`, rationale "risk 6, unconfirmed — confirm or refute." Paid: it confirmed-with-correction the npm auth claim (f-022), found the stale README install path (f-024), and discovered the repo's own pre-rename history (f-023, a de-risking negative result). It also opened the contradiction round 2 had to adjudicate.
- `DEEPEN → fd-release-engineering-cascade`, same rationale. Paid: f-025 nailed the `ts-ip` gap to the filesystem, f-026 reframed the `--host` problem from "the spec is wrong" to "the spec section an executor builds from does not contain the requirement" — the version that actually helps a sonnet executor — and f-027 named the authoring habit.
- `STEER-WIDE → fd-salvage-excavation-record`, rationale "novel_cluster_rate 0.81 ≥ 0.6 — widening still pays." **This was the run's best call.** A brand-new lens on rescue archaeology produced f-028, the highest-heat finding in the ledger, plus f-029 and f-030. Nothing in the adjacent or distant tiers was going to ask "what happens to the record when the thing it records is removed."

**Round 2 — probe, 2 directives, 5 findings, yield 4, novel_cluster_rate 0.80.**
- `PROBE-DISAGREEMENT`, rationale "open contradiction — adjudicate." Spawned the three-parent `npm-publish-adjudication` lens, which resolved the auth question by reading intercore's Go source and — the valuable part — produced the run's only emergent finding (f-032) as a by-product of the adjudication rather than the adjudication itself. It also honestly demoted its own f-031 from fusion to convergence.
- `STEER-WIDE → fd-proof-house-definitive`, rationale "novel_cluster_rate 0.67 ≥ 0.6 — widening still pays." Paid again: f-033 (the reuse proof cannot resolve a root), f-034 (CI), f-035 (manifest ordering) — three findings squarely on Fork 5, the executability fork, which the first two rounds had barely touched.

**Halt: BUDGET.**

The gain signal did **not** justify stopping. Yield decayed 14 → 5 → 4, but `novel_cluster_rate` went 0.81 → 0.67 → **0.80** — it rose in the final round. Both STEER-WIDE directives paid immediately and disproportionately, and the second one opened an entire fork the earlier rounds had left almost empty. The loop was still finding new territory at 80% when the budget ran out, and no FUSE was ever attempted.

---

## Caveats

- **Budget-clamped, not gain-clamped.** `novel_cluster_rate` was 0.80 at halt, up from 0.67. On the run's own evidence, another round of STEER-WIDE would have paid. Treat this synthesis as a floor on what is wrong with the plan, not a ceiling.
- **Zero FUSE directives were issued.** `total_fusions: 0`. The one `kind: fusion` lens was a disagreement adjudicator. The fusion lane — the mechanism that produces findings no single lens can reach — was never exercised. The highest-value untried pair is fd-salvage-excavation-record × fd-distsys-harvest-splitbrain (see §2 negative results).
- **No failed probes.** All 7 agents across 3 rounds returned findings; `failed: 0` in every round.
- **Fork 2 is only half covered.** Behavioral equivalence was probed hard on the *graph* surface (f-005/f-006/f-007/f-008/f-014) and once, decisively, on the resource handlers (f-013). The `api-local.js` result shapes for roughly eleven other exports — `getRandomProvocation`, `detectThinkingGaps`, `getDialecticTriads`, `getLensProgressions`, `getLensesByEpisode`, `getRelatedLenses`, `getFrames` — were never checked against what `index.js` actually reads. Given that f-013 proves this exact defect class is present, that hole is the most likely place another P0 is sitting.
- **Regions never reached.** Task 3 (`store.js`), Task 5 (embed / Ollama tiering), Task 10 (stats), Task 11 produced no findings at all. Task 23's Mac-side sweep was probed only through its Sylveste special case (f-029); the 3,023-file Mac corpus and `prune-targets.txt`'s human-review gate were never examined.
- **zklw's `settings.json` was never checked.** Fork 1 names settings keys "on both machines." Every settings-key finding in the ledger cites the Mac's `~/.claude/settings.json` only. Whether zklw carries an `interlens@interagency-marketplace` permission key that Task 20 must also flip is unknown.
- **All zklw verification was read-only, per instruction.** No state on zklw was modified at any point, in any round, including this synthesis pass.
- **Two ledger status values are wrong or unexplained.** `f-011` is `refuted` while its confirming sibling `f-025` is `raw`; `f-003`/`f-019` remain `raw` with a sub-claim the round-2 adjudication corrected. `refuted` findings are excluded from `surfaced.jsonl` per protocol, so f-011 does not appear there — its substance is carried by f-025.
- **Severity fields are the round-time triage values and are not authoritative.** Ranking here is by heat (novelty × risk.product) as re-scored at synthesis; severity appears for reference only.
