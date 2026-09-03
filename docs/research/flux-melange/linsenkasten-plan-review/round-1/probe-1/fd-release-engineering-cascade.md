# fd-release-engineering-cascade — round 1

## Findings Index
- [P1] ts-ip-file-narrated-not-created — Task 22's zklw unit reads `~/.local/share/linsenkasten/ts-ip`, which does not exist on zklw and no task step writes it (§Task 22)
- [P1] host-flag-file-semantics-unspecified — `--host` is spec'd as a plain bind-address string in the Server section but silently expected to be a path-to-read in the zklw unit, with no CLI logic described to reconcile the two (§Task 22)
- [P2] narrated-as-done phrasing hides a missing step — "written once by `tailscale ip -4 > …`" reads as background fact, not an instruction, which is why it was never turned into an executable step (§Task 22)

## Findings

### ts-ip-file-narrated-not-created
- **Severity:** P1
- **Where:** `docs/plans/2026-09-02-linsenkasten-registry.md:759` (ExecStart) and `:764` (the parenthetical narrating the file)
- **What:** CONFIRMS the prior finding. Task 22's systemd unit passes `--host %h/.local/share/linsenkasten/ts-ip`, and the prose explains this is "written once by `tailscale ip -4 > ~/.local/share/linsenkasten/ts-ip`" — phrased as an accomplished fact, immediately followed in the same parenthetical by "`loginctl show-user mk -p Linger` says `yes` on zklw, checked 2026-09-02," which reads as if both clauses share that same "checked" status. Live inspection of zklw shows neither the directory nor the file exists, and no numbered step anywhere in Task 22 (or any other task — verified by grepping the whole plan for `ts-ip`/`tailscale ip`, only one hit at line 764) runs the `tailscale ip -4 > …` command. This is a distributed-consistency gap of exactly the kind this lens exists to catch: an artifact the plan's prose depends on, with no task that provably creates it, and no verify line that would catch its absence before the service is expected to be live.
- **Evidence:**
  ```
  $ ssh -o BatchMode=yes zklw 'ls -la ~/.local/share/linsenkasten/'
  ls: cannot access '/home/mk/.local/share/linsenkasten/': No such file or directory
  $ ssh -o BatchMode=yes zklw 'loginctl show-user $(whoami) -p Linger'
  Linger=yes
  $ ssh -o BatchMode=yes zklw 'tailscale ip -4'
  100.78.63.67
  $ grep -n "ts-ip\|tailscale ip" docs/plans/2026-09-02-linsenkasten-registry.md
  515: (unrelated — reuse-log.jsonl fallback path, same parent dir)
  759: ExecStart=...--host %h/.local/share/linsenkasten/ts-ip...
  764: (the only mention of actually writing the file — inline prose, not a step)
  770: (curl verify against the live tailnet IP)
  836: (unrelated — reuse-log.jsonl reference in a table)
  ```
  Task 22's own second `<verify>` line (`curl -s -m 8 http://$(ssh zklw tailscale ip -4):7411/api/v1/lenses/stats` expect `generated_lenses`) will fail on a from-scratch run: `systemctl --user enable --now linsenkasten-explorer` starts a unit whose ExecStart tries to read a file that isn't there, so the server either crashes on boot (best case, loud failure) or — worse, if `server.js`'s arg-parsing falls back silently to treating the missing path as a literal hostname — attempts to bind to the string `/home/mk/.local/share/linsenkasten/ts-ip`, which is neither `0.0.0.0` nor the tailnet IP, and the curl verify times out with no error pointing at the real cause. `Restart=on-failure` will crash-loop the unit either way with nothing in the plan to alert on it.
  Also note plain shell redirection doesn't `mkdir -p`: even a human manually running `tailscale ip -4 > ~/.local/share/linsenkasten/ts-ip` on a fresh zklw checkout gets `No such file or directory` unless something first creates the parent directory — nothing in the plan does.
- **Suggestion:** Add an explicit numbered step to Task 22 — e.g. `mkdir -p ~/.local/share/linsenkasten && tailscale ip -4 > ~/.local/share/linsenkasten/ts-ip` — run once on zklw before `systemctl --user enable --now`, and make it idempotent (safe to re-run) since the harvest timer and explorer share the same directory.

### host-flag-file-semantics-unspecified
- **Severity:** P1
- **Where:** `docs/plans/2026-09-02-linsenkasten-registry.md:743` ("**Server** ... `--host` (default `127.0.0.1`)") vs `:759` and `:764` (ExecStart passing a path, and the parenthetical explaining "`--host` accepts a path: the server reads the file...")
- **What:** The Server section — the only place that specifies `server.js`'s actual CLI-argument contract — describes `--host` as a plain bind-address string with a `127.0.0.1` default, with no mention that it can also be a filesystem path whose contents get read as the real host. That path-reading behavior is introduced 21 lines later, only inside the zklw systemd unit's inline parenthetical, and never as a requirement on `server.js` itself. A sonnet-grade executor implementing the Server section first (as the task's own structure invites) has no textual basis to add "detect whether `--host` looks like a path, and if so, read it and use its contents as the bind address" logic — that behavior exists only in the plan-author's head, asserted by the zklw unit's usage rather than specified for the code to implement. Even after fixing the missing-file gap above, the service still won't come up correctly unless this second, separate gap is also closed.
- **Evidence:** Line 743: `` `--host` (default `127.0.0.1`), `--port` (default `7411`), `--static <dir>` (default `apps/web/build`)`` — no file-path variant mentioned. Line 759: `ExecStart=/usr/bin/env node packages/mcp/server.js --host %h/.local/share/linsenkasten/ts-ip --port 7411`. Line 764: `` (`--host` accepts a path: the server reads the file to get zklw's Tailscale IP, written once by...) `` — this is the *only* place the file-reading contract is stated, and it is prose commentary on the unit file, not a requirement listed against `server.js`.
- **Suggestion:** Move the path-detection contract into the Server section itself as an explicit rule (e.g. "if `--host` resolves to an existing file, read its trimmed contents as the bind address; otherwise use the value literally"), so it's part of what Task 22's own acceptance criteria for `server.js` cover, not something only visible by cross-referencing the systemd unit 20 lines later.

### narrated-as-done phrasing hides a missing step
- **Severity:** P2 [t]
- **Where:** `docs/plans/2026-09-02-linsenkasten-registry.md:764`
- **What:** The parenthetical bundles two claims with different epistemic status into one clause using the same past-tense/"checked" register: the Linger check (independently confirmed correct, live) and the ts-ip file (not live, never created). Because both read as completed facts side by side, the missing artifact is invisible on a read-through — it looks like a settings note, not a TODO. This is a task-authoring pattern worth flagging on its own: anywhere else in the plan a one-time setup command is described in a parenthetical aside rather than as a numbered step or `<verify>` line, the same failure mode (silently-assumed-done state) can recur.
- **Evidence:** Same sentence, two clauses: "written once by `tailscale ip -4 > ~/.local/share/linsenkasten/ts-ip`; ...; `loginctl show-user mk -p Linger` says `yes` on zklw, checked 2026-09-02" — no verb tense or marker distinguishes "this is a step to run" from "this was already checked."
- **Suggestion:** When a plan states a live-system fact as already verified, mark it distinctly (e.g. a `(verified <date>: ...)` tag) and reserve unmarked imperative/passive phrasing for steps that still need to run; audit other tasks for the same pattern before treating narrated setup as done.

## Verdict
The prior finding is CONFIRMED by live inspection: `~/.local/share/linsenkasten/` and its `ts-ip` file do not exist on zklw, and grepping the entire plan turns up no step that creates them — only the one narrative clause at line 764 that reads as if the work were already done. The gap compounds with a second, independent spec gap (the Server section never documents that `--host` can be a path to read), so even a hand-fix of the missing file wouldn't make Task 22's own verify line reliably pass without also closing that second gap.
