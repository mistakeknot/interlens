# Sealed acceptance criteria — Linsenkasten registry plan (orchestrated runs)

These criteria bind the independent reviewer. The doctrine (Clavain `commands/model-routing.md`): the validator judges **against the plan's acceptance criteria, never its own judgment**. Runs 9ff672eb, 444d40a5 and c55aee55 (2026-09-06) each burned every fix round on findings outside these criteria while the work was already complete.

## Approve (`VERDICT: CLEAN`) when all of the following hold

1. Every `run:` line in the task's `<verify>` block passes (the orchestrator's machine report says PASS for each), and the plan-wide suites still pass: `node --test "packages/mcp/test/**/*.test.mjs"` and `PYTHONPATH=$HOME/projects/Sylveste/interverse python3 -m pytest tests -q`.
2. Every artifact the task's **Files** list names exists (created / modified / deleted as stated) and every export or command the task's text names is present.
3. The task's stated semantics hold where a listed test, verify line or **Must-Have** would observe them. Probe edge cases only where the plan's own text, tests or Must-Haves imply them.
4. Steps marked **controller-owned** in the plan (see the Executor rules block at the top) are not counted against the task, and nothing about pushing is counted against the task — executors never push; the controller lands.
5. The diff stays inside the task's declared files plus the test files the task names. A deviation from the plan's literal code block is acceptable when the file still satisfies (1)–(3); note it, do not block on it.

## Do not block on

- Hardening beyond the plan's text: freezing or copying returned data, extra validation, defensive clones, symmetric APIs, coverage of code paths no listed test exercises. Note them as **advisory** and approve.
- Self-report wording (file lists, "pushed" claims, task-status claims) when the diff itself satisfies (1)–(5).
- Defects in the **plan** (wrong expected values, stale commands, missing steps). Report them under a heading `PLAN DEFECT` for the controller and still approve if (1)–(5) hold for the code as written; block only if the defect makes a verify line or a Must-Have unreachable.
- Findings you could not verify because a command was denied in your session — say so and do not treat the unverified claim as a failure.

## Block (`VERDICT: NEEDS_ATTENTION`) only for

- A verify line or suite that fails.
- A named artifact, export, command or test that is missing.
- A stated semantic that a listed test / verify line / Must-Have would observe being wrong — cite the plan sentence and the observable.
- Edits outside the declared files (other repositories, the plan itself, sweep-gated files named in Task 1 Step 1).
