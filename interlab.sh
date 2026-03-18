#!/usr/bin/env bash
set -euo pipefail
# interlens/interlab.sh — wraps Python benchmark runner for interlab.
# Primary: quality_score (from quality_scorer.py)
# NOTE: run_benchmark.py flag is --no-llm-judge (not --no-llm)
# NOTE: output is written to file via --output, not stdout
# NOTE: requires --results <dir> with existing response files

DIR="$(cd "$(dirname "$0")" && pwd)"
BENCH_DIR="$DIR/packages/mcp/benchmark"
RESULTS_DIR="$BENCH_DIR/results"
RESULTS="/tmp/interlens-bench-$$.json"

if [[ ! -f "$BENCH_DIR/run_benchmark.py" ]]; then
    echo "METRIC quality_score=-1"
    echo "METRIC error=1"
    exit 0
fi

# Check if there are any response files to evaluate
if [[ ! -d "$RESULTS_DIR" ]] || [[ -z "$(ls "$RESULTS_DIR"/*.json 2>/dev/null)" ]]; then
    echo "METRIC quality_score=-1"
    echo "METRIC error=1"
    echo "METRIC error_reason=no_response_files"
    exit 0
fi

# Run benchmark, write JSON to file (stdout is human-readable text)
(cd "$BENCH_DIR" && python3 run_benchmark.py --results "$RESULTS_DIR" --sample 3 --no-llm-judge --output "$RESULTS") >/dev/null 2>&1 || {
    echo "METRIC quality_score=-1"
    echo "METRIC error=1"
    rm -f "$RESULTS"
    exit 0
}

# Parse scores from JSON file
QUALITY=$(python3 -c "
import json
try:
    data = json.load(open('$RESULTS'))
    if isinstance(data, list):
        scores = [e.get('overall_score', e.get('composite_score', 0)) for e in data]
    elif isinstance(data, dict) and 'evaluations' in data:
        scores = [e.get('overall_score', 0) for e in data['evaluations']]
    elif isinstance(data, dict) and 'results' in data:
        scores = [e.get('overall_score', 0) for e in data['results']]
    else:
        scores = []
    avg = sum(scores) / len(scores) if scores else 0
    print(f'{avg:.4f}')
except (json.JSONDecodeError, KeyError, ZeroDivisionError, FileNotFoundError):
    print('-1')
" 2>/dev/null) || QUALITY="-1"
rm -f "$RESULTS"

if [[ "$QUALITY" == "-1" ]]; then
    echo "METRIC quality_score=-1"
    echo "METRIC error=1"
else
    echo "METRIC quality_score=$QUALITY"
    echo "METRIC benchmark_exit_code=0"
fi
