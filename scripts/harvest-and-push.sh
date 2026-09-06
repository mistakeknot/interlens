#!/usr/bin/env bash
# harvest-and-push.sh <machine> — one atomic registry sweep: any failure discards what THIS run wrote under data/.
set -euo pipefail
MACHINE="${1:?machine name required}"; ROOTS="${LINSENKASTEN_ROOTS:-$HOME/projects}"
STATE="$HOME/.local/share/linsenkasten"; mkdir -p "$STATE"
cd "$(dirname "$0")/.."
# Precondition (melange-3 f-020): never start over uncommitted work under data/ — the trap below would discard it.
if [ -n "$(git status --porcelain data)" ]; then
  echo "harvest-and-push: data/ has uncommitted changes; commit or discard them first (nothing was touched):" >&2
  git status --porcelain data >&2; exit 4
fi
trap 'rc=$?; if [ $rc -ne 0 ]; then git checkout -q -- data && git clean -fdq data; echo "$(date -u +%FT%TZ) rc=$rc step=${STEP:-?}" >> "$STATE/harvest-failed.log"; fi' EXIT
STEP=pull;  git pull -q --ff-only origin main   # diverged? the log says step=pull; a human runs git pull --rebase; data/ is untouched
for STEP in "scan --machine $MACHINE --roots $ROOTS" merge stats; do python3 -m harvest $STEP; done
STEP="embed --check"
set +e; python3 -m harvest embed --check; rc=$?; set -e
if [ $rc -eq 3 ]; then   # model digest changed (Task 11): the one expected, recurring failure — re-embed once, log it apart from failures
  echo "$(date -u +%FT%TZ) $MACHINE: nomic-embed-text digest changed; re-embedding every row" >> "$STATE/reembed.log"
  STEP="embed --reembed-all"; python3 -m harvest embed --reembed-all --check
elif [ $rc -ne 0 ]; then exit $rc; fi
for STEP in edges audit; do python3 -m harvest $STEP; done
STEP=commit
if [ -n "$(git status --porcelain data)" ]; then
  printf '%s\n' "data: $MACHINE harvest $(date -u +%F)" > /tmp/lk-harvest-msg
  git add data && git commit -q --no-verify -F /tmp/lk-harvest-msg -- data
  STEP=push
  for i in 1 2 3; do git push -q origin HEAD:main && break; git pull -q --rebase --autostash origin main || true; [ $i -eq 3 ] && { echo "$(date -u +%FT%TZ) push failed after 3 attempts" >> "$STATE/push-failed.log"; exit 1; }; done
fi
