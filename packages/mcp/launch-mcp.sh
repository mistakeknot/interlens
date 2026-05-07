#!/usr/bin/env bash
# Bootstrap wrapper for interlens MCP server.
# Builds dist/bundle.mjs on first launch (it is gitignored, so plugin
# tarballs ship without it).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Plugin harnesses can launch with a stripped PATH that drops common Node
# install locations (nvm, homebrew). Add canonical paths before lookup.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:${PATH:-}"

if ! command -v node &>/dev/null; then
    echo "interlens: node not found on PATH — MCP server unavailable" >&2
    exit 1
fi

cd "$SCRIPT_DIR"

# Ensure the built bundle exists. dist/bundle.mjs is gitignored.
if [ ! -f "dist/bundle.mjs" ]; then
    echo "interlens: building MCP bundle..." >&2
    if [ ! -d "node_modules" ]; then
        if command -v pnpm &>/dev/null; then
            pnpm install --silent --prod=false 2>&1 >&2 || true
        elif command -v npm &>/dev/null; then
            npm install --no-fund --no-audit 2>&1 >&2 || true
        fi
    fi
    if command -v pnpm &>/dev/null; then
        pnpm run build 2>&1 >&2 || npm run build 2>&1 >&2
    else
        npm run build 2>&1 >&2
    fi
fi

if [ ! -f "dist/bundle.mjs" ]; then
    echo "interlens: build failed; dist/bundle.mjs still missing" >&2
    exit 1
fi

exec node "$SCRIPT_DIR/dist/bundle.mjs" "$@"
