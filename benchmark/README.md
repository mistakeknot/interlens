# Linsenkasten Creative Thinking Benchmark Suite

Research-backed evaluation framework for measuring agent creative problem-solving improvements.

## Directory Structure

```
benchmark/
├── README.md                 # This file
├── metrics/                  # Evaluation metrics
│   ├── semantic_diversity.py  # Tier 1: Semantic diversity scorer
│   ├── frame_coverage.py      # Tier 1: Frame coverage tracker
│   ├── tool_patterns.py       # Tier 1: Tool usage analyzer
│   └── quality_scorer.py      # Tier 2: LLM-as-judge quality
├── problems/                 # Test problem repository (15 total)
│   ├── TEMPLATE.md          # Problem template
│   ├── code/                # Code problems (3)
│   ├── design/              # Design problems (3)
│   ├── strategy/            # Strategy problems (3)
│   ├── product/             # Product problems (3)
│   └── team/                # Team problems (3)
├── results/                 # Test results and logs
│   ├── baseline/            # Baseline (no linsenkasten)
│   ├── current/             # Current (with linsenkasten)
│   └── phase0/              # After Phase 0 improvements
└── run_benchmark.py         # Main test runner
```

## Quick Start

### Prerequisites
```bash
# Install Python dependencies
pip install openai anthropic numpy

# Set API keys
export OPENAI_API_KEY=your_key_here
export ANTHROPIC_API_KEY=your_key_here
```

### Run Individual Metrics

**Semantic Diversity:**
```bash
python benchmark/metrics/semantic_diversity.py results/baseline/problem1.md
```

**Frame Coverage:**
```bash
python benchmark/metrics/frame_coverage.py results/baseline/problem1.md
```

**Tool Patterns:**
```bash
python benchmark/metrics/tool_patterns.py results/baseline/problem1.md
```

**Quality (LLM-as-judge):**
```bash
python benchmark/metrics/quality_scorer.py results/baseline/problem1.md
```

### Run Full Benchmark

**Evaluate single directory:**
```bash
python benchmark/run_benchmark.py --results results/baseline/
```

**Compare two conditions:**
```bash
python benchmark/run_benchmark.py --compare results/baseline/ results/improved/
```

**Evaluate random sample (save cost):**
```bash
python benchmark/run_benchmark.py --results results/baseline/ --sample 5
```

**Skip expensive LLM-as-judge:**
```bash
python benchmark/run_benchmark.py --results results/baseline/ --no-llm-judge
```

## Metrics

### Tier 1: Automated (Fast, Cheap)

**Semantic Diversity (0-10)**
- Measures: Conceptual diversity via embedding distances
- Method: Extract concepts → embed → measure pairwise cosine distances
- Baseline expectation: 2-3/10 (clustered around generic advice)
- Target: 6-8/10 (exploring diverse conceptual spaces)
- Cost: ~$0.0001 per evaluation (OpenAI embeddings)

**Frame Coverage (0-10)**
- Measures: % of expected FLUX lenses applied + depth of application
- Method: Pattern matching for lens mentions + application indicators
- Baseline expectation: 0-2/10 (no lenses, or just mentioned)
- Target: 7-9/10 (multiple lenses deeply applied)
- Cost: Free (local computation)

**Tool Usage Patterns (0-10)**
- Measures: Sophistication of linsenkasten tool usage
- Method: Detect tool calls + effective sequences + anti-patterns
- Baseline expectation: 0/10 (no tools used)
- Target: 6-8/10 (creative tool sequences)
- Cost: Free (local computation)

### Tier 2: LLM-as-Judge (Moderate Cost)

**Quality Score (0-10, 4 dimensions)**
- Specificity: Concrete vs vague (1-10)
- Novelty: Original vs generic (1-10)
- Actionability: Clear next steps (1-10)
- Coherence: Logical flow (1-10)
- Method: Claude Sonnet 4.5 evaluates against baseline/target solutions
- Baseline expectation: 3-4/10 average
- Target: 7-8/10 average
- Cost: ~$0.01-0.05 per evaluation

### Tier 3: Human Validation (Milestones Only)

**Manual Review:**
- Qualitative assessment of solution quality
- Validation that LLM-as-judge scores are accurate
- Catching edge cases and blind spots
- Run at: baseline, post-Phase0, final
- Cost: 2-4 hours of human time per milestone

## Test Problems

### Code (3 problems)
1. Performance optimization stuck
2. Microservices vs monolith decision
3. Tech debt vs feature velocity

### Design (3 problems)
1. Onboarding drop-off
2. Feature discoverability
3. Accessibility improvements

### Strategy (3 problems)
1. Market positioning
2. Pivot decision
3. Build vs buy vs partner

### Product (3 problems)
1. Engagement decline
2. Pricing model
3. Feature prioritization

### Team (3 problems)
1. Remote collaboration
2. Cross-functional alignment
3. Retrospective effectiveness

## Success Criteria

### Target Improvement: +67%

Starting from baseline ~3/10 average → target 5/10 average

**Per-Metric Targets:**
- Semantic Diversity: 2.5 → 6.5 (+160%)
- Frame Coverage: 1.0 → 7.5 (+650%)
- Tool Usage: 0.0 → 6.5 (+∞, from zero baseline)
- Quality: 3.5 → 7.0 (+100%)

**Overall Average: 1.75 → 6.875 (+293% absolute, +67% toward maximum)**

### Evaluation Workflow

**Step 1: Manual Testing (You)**

For 3-5 sample problems:

1. **Baseline condition** - Open Claude Code, paste problem, solve WITHOUT using linsenkasten
   - Save to: `benchmark/results/baseline/problem-name_no-linsenkasten.md`

2. **Current condition** - Open Claude Code, paste problem, linsenkasten MCP available, use it
   - Save to: `benchmark/results/current/problem-name_with-linsenkasten.md`

3. **Run automated scoring:**
   ```bash
   python benchmark/run_benchmark.py --compare results/baseline/ results/current/
   ```

**Step 2: Analyze Results**

Review automated metrics to see:
- Are lenses being applied? (frame coverage)
- Are they exploring diverse concepts? (semantic diversity)
- Are they using tools effectively? (tool patterns)
- Is solution quality better? (LLM-as-judge)

**Step 3: Iterate on Phase 0**

If not hitting +67% target:
- Adjust Phase 0 implementation based on metrics
- Re-test with same sample problems
- Repeat until target achieved

**Step 4: Full Validation**

Once sample shows +67%:
- Test all 15 problems
- Run human validation (Tier 3)
- Document baseline results for paper trail

## Development

### Adding New Test Problems
1. Create problem file in appropriate domain directory
2. Follow template in `problems/TEMPLATE.md`
3. Include: context, challenge, constraints, success criteria

### Adding New Metrics
1. Implement metric in appropriate tier directory
2. Add to `run_benchmark.py` test suite
3. Update CTS calculation if needed
4. Document in this README

## References

- [LatEval](https://arxiv.org/html/2308.10855) - Interactive lateral thinking
- [Divergent](https://github.com/lechmazur/divergent) - Semantic divergence
- [LiveIdeaBench](https://arxiv.org/html/2412.17596v2) - 4D creativity
- [Torrance Tests](https://www.sciencedirect.com/science/article/pii/S2713374523000249) - AUT

See `docs/plans/2025-01-21-benchmark-suite.md` for complete design.
