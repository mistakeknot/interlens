#!/usr/bin/env python3
"""
Quality Scorer (LLM-as-Judge)

Uses Claude Sonnet 4.5 to assess solution quality on 4 dimensions:
1. Specificity - Concrete, actionable recommendations vs vague platitudes
2. Novelty - Original insights vs obvious/generic advice
3. Actionability - Clear next steps vs abstract concepts
4. Coherence - Logical flow and internal consistency

Comparison:
- Evaluates response against baseline and target solutions from problem.md
- Provides comparative ranking and qualitative feedback

Cost: ~$0.01-0.05 per evaluation (Claude Sonnet 4.5 API)
"""

import os
import re
import json
from typing import Dict, List, Tuple
from pathlib import Path
from anthropic import Anthropic

# Initialize Anthropic client
client = Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))
MODEL = 'claude-sonnet-4-5-20250929'


EVALUATION_PROMPT = """You are an expert evaluator assessing the quality of creative problem-solving responses.

You will be given:
1. A business/product problem
2. A baseline solution (conventional wisdom, 2-4/10 originality)
3. A target solution (creative reframe using FLUX lenses, 7-9/10 originality)
4. A response to evaluate (from an AI agent)

Your task: Score the response on 4 dimensions (1-10 scale) and provide comparative ranking.

## Scoring Rubric

### 1. Specificity (1-10)
- 1-3: Vague platitudes ("improve communication", "find balance")
- 4-6: General recommendations with some detail
- 7-8: Concrete, specific actions with clear parameters
- 9-10: Highly specific with numbers, timelines, roles, metrics

### 2. Novelty (1-10)
- 1-3: Obvious/generic advice (echoes baseline)
- 4-6: Somewhat original but conventional thinking
- 7-8: Fresh perspective with creative reframe
- 9-10: Breakthrough insight, non-obvious solution (matches target)

### 3. Actionability (1-10)
- 1-3: Abstract concepts with no clear next steps
- 4-6: Some guidance but missing implementation details
- 7-8: Clear action plan with sequenced steps
- 9-10: Immediately executable with decision criteria

### 4. Coherence (1-10)
- 1-3: Contradictory or unclear logic
- 4-6: Basic logical flow with some gaps
- 7-8: Well-structured argument with supporting evidence
- 9-10: Flawless internal consistency, compelling narrative

## Comparative Ranking
After scoring, classify the response:
- **Below Baseline**: Worse than conventional wisdom (1-3/10 average)
- **Baseline Level**: Generic best practices (3-5/10 average)
- **Above Baseline**: Better than generic but not target (5-7/10 average)
- **Target Level**: Creative reframe with breakthrough insights (7-9/10 average)
- **Exceeds Target**: Beyond target solution in quality (9-10/10 average)

## Output Format
Return a JSON object with this structure:
{
  "scores": {
    "specificity": <1-10>,
    "novelty": <1-10>,
    "actionability": <1-10>,
    "coherence": <1-10>,
    "average": <1-10, rounded to 1 decimal>
  },
  "ranking": "<Below Baseline|Baseline Level|Above Baseline|Target Level|Exceeds Target>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
  "comparison_to_baseline": "<1-2 sentence comparison>",
  "comparison_to_target": "<1-2 sentence comparison>",
  "key_insight": "<What's the most valuable insight in this response?>"
}

Be rigorous. Reserve 9-10 scores for truly exceptional work. Most responses will be 4-7 range."""


def load_problem_file(problem_file: str) -> Dict[str, str]:
    """
    Parse problem.md to extract context, challenge, baseline, and target solutions.

    Returns:
        Dictionary with problem components
    """
    with open(problem_file, 'r') as f:
        content = f.read()

    # Extract sections using regex
    sections = {}

    # Context (everything between ## Context and ## Challenge)
    context_match = re.search(r'## Context\s+(.+?)\s+## Challenge', content, re.DOTALL)
    sections['context'] = context_match.group(1).strip() if context_match else ""

    # Challenge
    challenge_match = re.search(r'## Challenge\s+(.+?)\s+(?:##|$)', content, re.DOTALL)
    sections['challenge'] = challenge_match.group(1).strip() if challenge_match else ""

    # Baseline Solution
    baseline_match = re.search(r'## Baseline Solution\s+(.+?)\s+##', content, re.DOTALL)
    sections['baseline'] = baseline_match.group(1).strip() if baseline_match else ""

    # Target Solution
    target_match = re.search(r'## Target Solution\s+(.+?)\s+##', content, re.DOTALL)
    sections['target'] = target_match.group(1).strip() if target_match else ""

    # Problem statement (for agent prompt)
    prompt_match = re.search(r'## Prompt for Agent\s+```\s+(.+?)\s+```', content, re.DOTALL)
    sections['prompt'] = prompt_match.group(1).strip() if prompt_match else ""

    return sections


def evaluate_response(
    response_text: str,
    problem_sections: Dict[str, str]
) -> Dict:
    """
    Evaluate a response using Claude Sonnet 4.5 as judge.

    Args:
        response_text: Agent's response to evaluate
        problem_sections: Parsed problem.md sections

    Returns:
        Evaluation results dictionary
    """
    # Construct evaluation prompt
    user_message = f"""## Problem

{problem_sections.get('prompt', '')}

**Context:**
{problem_sections.get('context', '')}

**Challenge:**
{problem_sections.get('challenge', '')}

## Baseline Solution (Conventional Wisdom)

{problem_sections.get('baseline', '')}

## Target Solution (Creative Reframe)

{problem_sections.get('target', '')}

## Response to Evaluate

{response_text}

---

Please evaluate the response above using the scoring rubric. Return your assessment as JSON."""

    # Call Claude Sonnet 4.5
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=2000,
            temperature=0.3,  # Lower temperature for more consistent scoring
            messages=[
                {
                    "role": "user",
                    "content": EVALUATION_PROMPT + "\n\n" + user_message
                }
            ]
        )

        # Extract JSON from response
        content = response.content[0].text

        # Try to parse JSON (might be wrapped in markdown code blocks)
        json_match = re.search(r'```json\s*(\{.+?\})\s*```', content, re.DOTALL)
        if json_match:
            evaluation = json.loads(json_match.group(1))
        else:
            # Try to parse entire response as JSON
            evaluation = json.loads(content)

        # Add metadata
        evaluation['model'] = MODEL
        evaluation['tokens_used'] = response.usage.input_tokens + response.usage.output_tokens

        return evaluation

    except Exception as e:
        return {
            'error': str(e),
            'scores': {
                'specificity': 0,
                'novelty': 0,
                'actionability': 0,
                'coherence': 0,
                'average': 0
            },
            'ranking': 'Error'
        }


def analyze_file(response_file: str, problem_file: str = None) -> Dict:
    """
    Analyze a response file for quality using LLM-as-judge.

    Args:
        response_file: Path to agent response markdown
        problem_file: Path to corresponding problem.md

    Returns:
        Dictionary with quality evaluation
    """
    # Read response
    with open(response_file, 'r') as f:
        response_text = f.read()

    # Auto-detect problem file if not provided
    if not problem_file:
        basename = os.path.basename(response_file)
        problem_id = basename.split('_')[0]

        benchmark_dir = Path(__file__).parent.parent
        for domain in ['code', 'design', 'strategy', 'product', 'team']:
            candidate = benchmark_dir / 'problems' / domain / f'{problem_id}.md'
            if candidate.exists():
                problem_file = str(candidate)
                break

    if not problem_file or not os.path.exists(problem_file):
        return {
            'error': f'Problem file not found for {response_file}',
            'response_file': response_file
        }

    # Load problem sections
    problem_sections = load_problem_file(problem_file)

    # Evaluate response
    evaluation = evaluate_response(response_text, problem_sections)

    # Add file metadata
    evaluation['response_file'] = response_file
    evaluation['problem_file'] = problem_file

    return evaluation


def compare_responses(baseline_file: str, improved_file: str, problem_file: str = None) -> Dict:
    """
    Compare quality between baseline and improved responses.

    Returns:
        Comparison metrics
    """
    baseline = analyze_file(baseline_file, problem_file)
    improved = analyze_file(improved_file, problem_file)

    if 'error' in baseline or 'error' in improved:
        return {
            'baseline': baseline,
            'improved': improved,
            'error': 'One or both evaluations failed'
        }

    # Calculate improvements
    baseline_avg = baseline['scores']['average']
    improved_avg = improved['scores']['average']

    improvement = improved_avg - baseline_avg
    improvement_pct = (improvement / baseline_avg * 100) if baseline_avg > 0 else 0

    dimension_improvements = {}
    for dim in ['specificity', 'novelty', 'actionability', 'coherence']:
        dim_improvement = improved['scores'][dim] - baseline['scores'][dim]
        dimension_improvements[dim] = round(dim_improvement, 1)

    return {
        'baseline': baseline,
        'improved': improved,
        'improvement': round(improvement, 1),
        'improvement_pct': round(improvement_pct, 1),
        'dimension_improvements': dimension_improvements
    }


def print_report(result: Dict):
    """Pretty-print a quality evaluation report."""
    print("\n" + "="*60)
    print("QUALITY EVALUATION (LLM-as-Judge)")
    print("="*60)

    if 'error' in result:
        print(f"\n❌ Error: {result['error']}")
        return

    scores = result['scores']
    print(f"\n📊 Overall Score: {scores['average']}/10")
    print(f"   Ranking: {result['ranking']}")

    print(f"\n📈 Dimension Scores:")
    print(f"   Specificity:   {scores['specificity']}/10")
    print(f"   Novelty:       {scores['novelty']}/10")
    print(f"   Actionability: {scores['actionability']}/10")
    print(f"   Coherence:     {scores['coherence']}/10")

    if 'strengths' in result:
        print(f"\n✅ Strengths:")
        for strength in result['strengths']:
            print(f"   • {strength}")

    if 'weaknesses' in result:
        print(f"\n⚠️  Weaknesses:")
        for weakness in result['weaknesses']:
            print(f"   • {weakness}")

    if 'key_insight' in result:
        print(f"\n💡 Key Insight:")
        print(f"   {result['key_insight']}")

    if 'comparison_to_baseline' in result:
        print(f"\n📋 vs Baseline:")
        print(f"   {result['comparison_to_baseline']}")

    if 'comparison_to_target' in result:
        print(f"\n🎯 vs Target:")
        print(f"   {result['comparison_to_target']}")

    if 'tokens_used' in result:
        print(f"\n💰 Cost: ~${result['tokens_used'] * 0.000003:.4f} ({result['tokens_used']} tokens)")

    print("\n" + "="*60 + "\n")


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python quality_scorer.py <response_file.md> [problem_file.md]")
        print("   or: python quality_scorer.py <baseline.md> <improved.md> [problem.md]")
        sys.exit(1)

    if len(sys.argv) == 2:
        # Single file analysis
        result = analyze_file(sys.argv[1])
        print_report(result)

    elif len(sys.argv) >= 3:
        # Comparison mode
        problem_arg = sys.argv[3] if len(sys.argv) > 3 else None
        comparison = compare_responses(sys.argv[1], sys.argv[2], problem_arg)

        if 'error' in comparison:
            print(f"\n❌ Error: {comparison['error']}\n")
            sys.exit(1)

        print("\n" + "="*60)
        print("QUALITY COMPARISON (LLM-as-Judge)")
        print("="*60)

        print("\n📋 BASELINE:")
        print(f"   Overall: {comparison['baseline']['scores']['average']}/10")
        print(f"   Ranking: {comparison['baseline']['ranking']}")

        print("\n✨ IMPROVED:")
        print(f"   Overall: {comparison['improved']['scores']['average']}/10")
        print(f"   Ranking: {comparison['improved']['ranking']}")

        print("\n📈 IMPROVEMENT:")
        print(f"   Absolute: +{comparison['improvement']}")
        print(f"   Relative: +{comparison['improvement_pct']}%")

        print("\n📊 By Dimension:")
        for dim, improvement in comparison['dimension_improvements'].items():
            indicator = "↑" if improvement > 0 else ("↓" if improvement < 0 else "→")
            print(f"   {dim.capitalize()}: {indicator} {improvement:+.1f}")

        print("\n" + "="*60 + "\n")
