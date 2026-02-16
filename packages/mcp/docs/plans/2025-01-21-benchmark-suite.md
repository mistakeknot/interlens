# Interlens Creative Thinking Benchmark Suite

**Date:** 2025-01-21
**Purpose:** Measure improvement in agent creative problem-solving with interlens
**Based on:** LatEval, Divergent, LiveIdeaBench, Torrance Tests research

## Overview

This benchmark suite evaluates whether interlens actually improves agent creative thinking across three tiers:
- **Tier 1:** Automated metrics (diversity, coverage, patterns)
- **Tier 2:** Semi-automated quality scoring (originality, feasibility, fluency, flexibility)
- **Tier 3:** Interactive reasoning evaluation (real problems, expert review)

## Design Principles

1. **Comparative:** Always test WITH and WITHOUT interlens
2. **Quantitative:** Numeric scores for objective comparison
3. **Domain-diverse:** Test across code, design, strategy, product problems
4. **Reproducible:** Same prompts, same scoring criteria
5. **Incremental:** Quick tests during development, deep tests at milestones

---

## Tier 1: Automated Metrics (Quick)

**Time:** < 1 minute per test
**Frequency:** Every design iteration
**Automation:** 100%

### Test 1.1: Semantic Diversity Score

**Inspired by:** Divergent benchmark

**Test procedure:**
```javascript
// Give agent topic + interlens access
// Measure semantic diversity of lenses explored

prompt = "Explore lenses related to 'team collaboration'"

// Agent explores lenses for 5 minutes
lenses_explored = [
  "Pace Layering",
  "Geometry of Dissent",
  "Ritual and Ceremony",
  "Feedback Loops",
  "System Boundaries"
]

// Calculate pairwise semantic distance (using embeddings)
diversity_score = avg_pairwise_distance(embeddings(lenses_explored))
// Range: 0.0 (all identical) to 1.0 (maximally diverse)
```

**Scoring:**
- Compute embeddings for each lens name + definition
- Calculate pairwise cosine distance
- Average all pairs → diversity score

**Baseline without interlens:**
- Agent picks lenses manually: ~0.3-0.4 (low diversity)

**Target with interlens (gap-aware random):**
- System guides to diverse frames: ~0.6-0.8 (high diversity)

**Expected improvement:** +50-100% diversity score

---

### Test 1.2: Frame Coverage Score

**Inspired by:** Gap detection mechanism

**Test procedure:**
```javascript
// Give agent problem + interlens
// Measure % of 28 FLUX frames explored

prompt = "Analyze: Should we pivot our product strategy?"

// Agent explores for 10 minutes
lenses_used = [/* list of lenses */]

// Map to frames
frames_covered = unique(lenses_used.map(l => l.frame))
coverage_score = frames_covered.length / 28
// Range: 0.0 (0 frames) to 1.0 (all 28 frames)
```

**Scoring:**
- Count unique frames touched
- Divide by 28 (total FLUX frames)

**Baseline without interlens:**
- Agent explores naturally: ~10-15% coverage (2-4 frames)

**Target with interlens (gap detection + random):**
- System guides to unexplored: ~30-50% coverage (8-14 frames)

**Expected improvement:** +200-300% frame coverage

---

### Test 1.3: Tool Usage Patterns

**Inspired by:** Agent orchestration research

**Test procedure:**
```javascript
// Track tool call sequences
// Measure workflow sophistication

// Pattern 1: Single-shot (bad)
tools_called = ["search_lenses"] // 1 tool, done

// Pattern 2: Linear sequence (ok)
tools_called = ["search", "get_lens", "neighborhood"] // 3 tools, simple chain

// Pattern 3: Adaptive workflow (good)
tools_called = [
  "suggest_thinking_mode",
  "random_provocation",
  "find_bridge_lenses",
  "detect_gaps",
  "random_provocation",
  "synthesize_insights"
] // 6 tools, adaptive
```

**Scoring:**
- **Sophistication score:**
  - 0: No tools used
  - 1: Single tool (search only)
  - 2: 2-3 tools, linear
  - 3: 4-5 tools, some branching
  - 4: 6+ tools, adaptive workflow with gap detection

**Baseline without interlens:**
- Average sophistication: ~1.2 (single tool or simple chain)

**Target with interlens (workflow guidance):**
- Average sophistication: ~3.5 (multi-tool adaptive)

**Expected improvement:** +200% workflow sophistication

---

## Tier 2: Quality Evaluation (Semi-Automated)

**Time:** 5-10 minutes per test
**Frequency:** Phase completions
**Automation:** 80% (LLM judges, human spot-checks)

### Test 2.1: LiveIdeaBench 4-Dimension Scoring

**Inspired by:** LiveIdeaBench scientific creativity benchmark

**Test problems (domain-diverse):**

1. **Code problem:** "Our API response time is slow (200ms avg), tried caching and indexing with minimal improvement. What's wrong?"

2. **Design problem:** "Users drop off during onboarding. How should we redesign the flow?"

3. **Strategy problem:** "Competitor launched similar feature. Should we pivot or double down?"

4. **Product problem:** "Team collaboration tool. How to make it more effective?"

**Evaluation dimensions:**

#### Originality (0-10)
**Definition:** Uniqueness and novelty of insights

**LLM Judge Prompt:**
```
Evaluate the originality of this solution on a scale of 0-10:
0 = Generic, obvious, common advice
5 = Somewhat novel, slight reframe
10 = Highly original, unexpected perspective

Solution: [agent's output]

Consider:
- Does it reframe the problem in a novel way?
- Are the insights non-obvious or counter-intuitive?
- Would an expert find this perspective fresh?

Score (0-10):
Reasoning:
```

**Baseline without interlens:**
- Score: ~3-4 (generic advice, obvious solutions)

**Target with interlens (lens-based reframing):**
- Score: ~7-8 (novel reframes, unexpected connections)

**Expected improvement:** +3-4 points

---

#### Feasibility (0-10)
**Definition:** Scientifically sound, implementable, practical

**LLM Judge Prompt:**
```
Evaluate the feasibility of this solution on a scale of 0-10:
0 = Impossible, violates constraints, impractical
5 = Theoretically possible but difficult
10 = Highly practical, immediately actionable

Solution: [agent's output]

Consider:
- Can this be implemented with available resources?
- Does it respect technical/organizational constraints?
- Are the recommendations specific and actionable?

Score (0-10):
Reasoning:
```

**Baseline without interlens:**
- Score: ~7-8 (practical but generic)

**Target with interlens (grounded insights):**
- Score: ~7-8 (maintain practicality)

**Expected improvement:** 0 points (maintain feasibility)

---

#### Fluency (0-10)
**Definition:** Diverse, non-redundant insights generated

**Automated Scoring:**
```javascript
// Count distinct insights in output
insights = extract_insights(output)
unique_insights = remove_duplicates(insights)

fluency_score = min(unique_insights.length, 10)
// Cap at 10 to normalize scale
```

**Baseline without interlens:**
- Score: ~3-4 (3-4 distinct insights)

**Target with interlens (multi-lens exploration):**
- Score: ~7-8 (7-8 distinct insights from different lenses)

**Expected improvement:** +3-4 points

---

#### Flexibility (0-10)
**Definition:** Consistent performance across problem domains

**Scoring:**
```javascript
// Test on 4 different domain problems
scores = [code_score, design_score, strategy_score, product_score]

// Flexibility = 30th percentile (worst performance)
// High flexibility = consistently good across all domains
flexibility_score = percentile(scores, 0.30)
```

**Baseline without interlens:**
- Score: ~4-5 (good in familiar domains, weak in others)

**Target with interlens (universal frameworks):**
- Score: ~6-7 (consistent across domains)

**Expected improvement:** +1-2 points

---

### Test 2.2: Torrance Alternate Uses Adaptation

**Inspired by:** Torrance Tests of Creative Thinking

**Test procedure:**
```
Problem: "Generate unconventional applications of [concept]"

Examples:
- "Unconventional applications of 'Pace Layering' lens"
- "Unusual ways to apply 'Geometry of Dissent' to product design"
- "Creative uses of graph traversal for ideation"
```

**Metrics:**
- **Fluency:** Number of applications generated (target: 8-10)
- **Flexibility:** Number of distinct categories (target: 5-7)
- **Originality:** Statistical rarity (LLM judge 0-10, target: 7-8)
- **Elaboration:** Detail level (simple mention vs worked example, target: 7-8)

**Baseline without interlens:**
- Fluency: 4-5, Flexibility: 2-3, Originality: 3-4, Elaboration: 4-5

**Target with interlens:**
- Fluency: 8-10, Flexibility: 5-7, Originality: 7-8, Elaboration: 7-8

**Expected improvement:** +50-100% across all dimensions

---

## Tier 3: Interactive Reasoning (Manual)

**Time:** 30-60 minutes per test
**Frequency:** Major milestones (Phase 0, Phase 1, etc.)
**Automation:** 20% (human expert evaluation)

### Test 3.1: LatEval-Style Problem Solving

**Inspired by:** LatEval lateral thinking puzzles

**Test procedure:**

1. **Setup:**
   - Give agent real-world design problem
   - No specific instructions (let agent decide how to use interlens)
   - Time limit: 20 minutes

2. **Example problems:**

   **Problem A: Product Strategy**
   ```
   Context: SaaS company, 500 customers, $50k MRR, growth stalled for 6 months
   Team debate: Invest in new features vs improve existing vs sales/marketing
   Your role: Help team make decision using creative thinking frameworks
   ```

   **Problem B: Technical Architecture**
   ```
   Context: Monolith → microservices migration, team of 12 engineers
   Tension: Fast delivery (monolith familiarity) vs long-term scalability (microservices)
   Your role: Provide fresh perspective on this tradeoff
   ```

   **Problem C: Team Dynamics**
   ```
   Context: Remote team, low engagement in retrospectives, same issues raised repeatedly
   Tried: Different formats, anonymous feedback, external facilitators
   Your role: Break the pattern with novel approach
   ```

3. **Agent interaction:**
   - Agent can use any interlens tools
   - Track: which tools, in what sequence, what insights
   - Record: final recommendation/solution

4. **Evaluation metrics (human expert):**

#### Question Relevance (QR) - 0-10
"Did the agent use relevant lenses for this problem?"
- 0-3: Irrelevant lenses chosen
- 4-6: Somewhat relevant, generic
- 7-10: Highly relevant, well-matched

#### Question Divergence (QD) - 0-10
"Did the agent explore diverse perspectives?"
- 0-3: Single frame/perspective
- 4-6: 2-3 frames, moderate diversity
- 7-10: 4+ frames, high diversity

#### Answer Consistency (AC) - 0-10
"Does the solution integrate lens insights coherently?"
- 0-3: Lens insights ignored or disconnected
- 4-6: Some integration, partial application
- 7-10: Deep integration, clear application

#### Solution Quality (SQ) - 0-10
"How useful is this solution for the actual problem?"
- 0-3: Not useful, too abstract
- 4-6: Somewhat useful, needs work
- 7-10: Highly useful, actionable

#### Novelty (N) - 0-10
"How novel is this approach compared to conventional solutions?"
- 0-3: Generic, obvious
- 4-6: Slight reframe
- 7-10: Unexpected, creative

**Baseline without interlens:**
- QR: N/A, QD: 2-3, AC: N/A, SQ: 5-6, N: 3-4

**Target with interlens:**
- QR: 7-8, QD: 7-9, AC: 7-8, SQ: 7-8, N: 7-8

**Expected improvement:** +50-100% on diversity, novelty, solution quality

---

## Benchmark Test Suite

### Full Test Battery (All Tiers)

**Run this after each major phase:**

```
Phase 0 Completion Test:
├── Tier 1 (Automated) - 10 problems
│   ├── Semantic Diversity (avg across 10)
│   ├── Frame Coverage (avg across 10)
│   └── Tool Usage Patterns (avg sophistication)
├── Tier 2 (Semi-Auto) - 4 problems
│   ├── LiveIdeaBench 4D (code, design, strategy, product)
│   └── Torrance AUT (2 problems)
└── Tier 3 (Manual) - 3 problems
    └── LatEval-style (product, technical, team)

Total time: ~3-4 hours
Frequency: Major milestones
```

### Quick Regression Test (Tier 1 only)

**Run this after each design iteration:**

```
Quick Test:
└── Tier 1 (Automated) - 3 problems
    ├── Semantic Diversity
    ├── Frame Coverage
    └── Tool Usage Patterns

Total time: ~5 minutes
Frequency: Every iteration
```

---

## Scoring Dashboard

### Overall Creative Thinking Score (CTS)

Weighted composite of all metrics:

```
CTS = (
  0.15 * semantic_diversity +
  0.15 * frame_coverage +
  0.10 * tool_sophistication +
  0.15 * originality +
  0.10 * feasibility +
  0.10 * fluency +
  0.10 * flexibility +
  0.15 * solution_quality
) * 10

Range: 0-10
Target: 7+ (good), 8+ (excellent)
```

### Comparison Metrics

| Metric | Baseline (No LK) | Target (With LK) | Improvement |
|--------|------------------|------------------|-------------|
| Semantic Diversity | 0.35 | 0.70 | +100% |
| Frame Coverage | 12% | 35% | +192% |
| Tool Sophistication | 1.2 | 3.5 | +192% |
| Originality | 3.5 | 7.5 | +114% |
| Feasibility | 7.5 | 7.5 | 0% |
| Fluency | 3.5 | 7.0 | +100% |
| Flexibility | 4.5 | 6.5 | +44% |
| Solution Quality | 5.5 | 7.5 | +36% |
| **Overall CTS** | **4.3** | **7.2** | **+67%** |

---

## Test Problems Repository

### Code Problems
1. Performance issue despite optimization (Pace Layering)
2. Microservices vs monolith decision (Systems Thinking)
3. Tech debt vs feature velocity (Explore vs Exploit)

### Design Problems
1. Onboarding drop-off (User Psychology + Systems)
2. Feature discoverability (Information Architecture)
3. Accessibility improvements (Universal Design)

### Strategy Problems
1. Market positioning (Competitive Dynamics)
2. Pivot decision (Strategic Change)
3. Build vs buy vs partner (Decision Theory)

### Product Problems
1. Engagement decline (Behavioral Economics)
2. Pricing model (Value Creation)
3. Feature prioritization (Resource Allocation)

### Team Problems
1. Remote collaboration (Communication Patterns)
2. Cross-functional alignment (Organizational Design)
3. Retrospective effectiveness (Learning Systems)

---

## Implementation Checklist

### Phase 0: Setup

- [ ] Create test problem bank (15 problems across 5 domains)
- [ ] Implement Tier 1 automated scoring (semantic diversity, coverage, patterns)
- [ ] Configure LLM judges for Tier 2 (originality, feasibility, fluency, flexibility)
- [ ] Recruit 2-3 domain experts for Tier 3 manual evaluation
- [ ] Set up tracking/logging infrastructure

### Phase 1: Baseline

- [ ] Run full test battery WITHOUT interlens
- [ ] Record baseline scores across all metrics
- [ ] Document agent behavior patterns
- [ ] Identify weakest areas (lowest scores)

### Phase 2: Iteration

- [ ] Implement Phase 0 design improvements
- [ ] Run quick regression tests (Tier 1) after each change
- [ ] Track metric trends over iterations
- [ ] Adjust implementation based on data

### Phase 3: Validation

- [ ] Run full test battery WITH interlens
- [ ] Compare to baseline
- [ ] Verify expected improvements achieved
- [ ] Document unexpected findings

### Phase 4: Continuous

- [ ] Run quick tests on every commit
- [ ] Run full battery on releases
- [ ] Track long-term trends
- [ ] Refine benchmarks based on learnings

---

## Success Criteria

### Minimum Viable Improvement (Pass)
- Overall CTS improvement: +30% vs baseline
- At least 3 of 8 metrics improve by +25%
- No metric degrades by more than -10%

### Target Improvement (Good)
- Overall CTS improvement: +50% vs baseline
- At least 5 of 8 metrics improve by +50%
- No metric degrades by more than -5%

### Stretch Goal (Excellent)
- Overall CTS improvement: +67% vs baseline (as projected)
- All 8 metrics improve or maintain
- Agent behavior shows adaptive workflows in 60%+ of sessions

---

## Known Limitations

1. **LLM Judge Variance:** Originality/feasibility scoring may vary between models
   - Mitigation: Use 3+ judge consensus

2. **Domain Bias:** Some problems may favor certain lens types
   - Mitigation: Diverse problem set across 5 domains

3. **Novelty Decay:** As agents learn patterns, novelty may decrease
   - Mitigation: Rotate problems, add new domains

4. **Measurement Effect:** Testing may influence agent behavior
   - Mitigation: Blind baseline (agent doesn't know it's being tested)

---

## Future Enhancements

### V2 Benchmarks
- Real-world case studies (actual client problems)
- Longitudinal tracking (agent improvement over time)
- Multi-agent collaboration (do agents work better together?)
- Human-AI comparison (how do agents compare to expert humans?)

### Advanced Metrics
- Time-to-insight (how fast does agent generate novel ideas?)
- Insight decay (do insights remain novel over time?)
- Transfer learning (does agent apply patterns to new domains?)
- Explanation quality (how well does agent justify lens choices?)

---

## References

- [LatEval](https://arxiv.org/html/2308.10855) - Interactive lateral thinking evaluation
- [Divergent](https://github.com/lechmazur/divergent) - Semantic divergence benchmark
- [LiveIdeaBench](https://arxiv.org/html/2412.17596v2) - Scientific creativity 4D evaluation
- [Torrance Tests](https://www.sciencedirect.com/science/article/pii/S2713374523000249) - Alternate Uses Task
- [CPS Framework](https://arxiv.org/abs/2204.10358) - Creative problem solving survey
- [SaLT](https://arxiv.org/html/2412.07977) - Lateral thinking in multi-agent systems

---

## Conclusion

This benchmark suite provides:
- **Quantitative measurement** of creative thinking improvement
- **Multi-tier evaluation** (quick tests to deep analysis)
- **Domain diversity** (code, design, strategy, product, team)
- **Research-backed metrics** (from academic benchmarks)
- **Actionable feedback** (specific areas to improve)

**Expected outcome:** Validate that research-informed design (Phase 0) delivers +67% improvement in overall creative thinking score vs baseline.

**Next step:** Implement Tier 1 automated metrics and establish baseline before Phase 0 implementation.
