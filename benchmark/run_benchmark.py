#!/usr/bin/env python3
"""
Benchmark Test Runner

Orchestrates benchmark evaluation across all metrics:
- Tier 1: Automated metrics (semantic diversity, frame coverage, tool patterns)
- Tier 2: LLM-as-judge quality assessment
- Generates comprehensive reports

Usage:
  python run_benchmark.py --results <results_dir>
  python run_benchmark.py --compare baseline improved
  python run_benchmark.py --sample 5  # Run on random sample
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List
import random

# Add metrics directory to path
sys.path.insert(0, str(Path(__file__).parent / 'metrics'))

from semantic_diversity import analyze_file as analyze_diversity
from frame_coverage import analyze_file as analyze_coverage
from tool_patterns import analyze_file as analyze_tools
from quality_scorer import analyze_file as analyze_quality


class BenchmarkRunner:
    """Orchestrates benchmark evaluation."""

    def __init__(self, results_dir: str, use_llm_judge: bool = True):
        self.results_dir = Path(results_dir)
        self.use_llm_judge = use_llm_judge
        self.results = []

    def find_response_files(self, pattern: str = "*.md") -> List[Path]:
        """Find all response files matching pattern."""
        return sorted(self.results_dir.glob(pattern))

    def evaluate_single_response(self, response_file: Path) -> Dict:
        """Run all metrics on a single response file."""
        print(f"Evaluating: {response_file.name}...")

        result = {
            'file': str(response_file),
            'filename': response_file.name,
        }

        # Tier 1: Semantic Diversity
        try:
            diversity = analyze_diversity(str(response_file))
            result['diversity'] = diversity
        except Exception as e:
            result['diversity'] = {'error': str(e)}

        # Tier 1: Frame Coverage
        try:
            coverage = analyze_coverage(str(response_file))
            result['coverage'] = coverage
        except Exception as e:
            result['coverage'] = {'error': str(e)}

        # Tier 1: Tool Patterns
        try:
            tools = analyze_tools(str(response_file))
            result['tools'] = tools
        except Exception as e:
            result['tools'] = {'error': str(e)}

        # Tier 2: Quality (LLM-as-judge)
        if self.use_llm_judge:
            try:
                quality = analyze_quality(str(response_file))
                result['quality'] = quality
            except Exception as e:
                result['quality'] = {'error': str(e)}

        return result

    def evaluate_all_responses(self) -> List[Dict]:
        """Evaluate all response files in results directory."""
        response_files = self.find_response_files()

        print(f"\nFound {len(response_files)} response files in {self.results_dir}")
        print("="*60)

        results = []
        for response_file in response_files:
            result = self.evaluate_single_response(response_file)
            results.append(result)

        return results

    def generate_summary_report(self, results: List[Dict]) -> Dict:
        """Generate aggregate statistics across all results."""
        if not results:
            return {'error': 'No results to summarize'}

        # Aggregate scores
        diversity_scores = [r['diversity'].get('diversity_score', 0) for r in results if 'diversity' in r]
        coverage_scores = [r['coverage'].get('coverage_score', 0) for r in results if 'coverage' in r]
        tool_scores = [r['tools'].get('tool_score', 0) for r in results if 'tools' in r]
        quality_scores = [r['quality']['scores'].get('average', 0) for r in results if 'quality' in r and 'scores' in r['quality']]

        summary = {
            'total_responses': len(results),
            'diversity': {
                'average': round(sum(diversity_scores) / len(diversity_scores), 2) if diversity_scores else 0,
                'min': min(diversity_scores) if diversity_scores else 0,
                'max': max(diversity_scores) if diversity_scores else 0,
            },
            'coverage': {
                'average': round(sum(coverage_scores) / len(coverage_scores), 2) if coverage_scores else 0,
                'min': min(coverage_scores) if coverage_scores else 0,
                'max': max(coverage_scores) if coverage_scores else 0,
            },
            'tools': {
                'average': round(sum(tool_scores) / len(tool_scores), 2) if tool_scores else 0,
                'min': min(tool_scores) if tool_scores else 0,
                'max': max(tool_scores) if tool_scores else 0,
            },
        }

        if quality_scores:
            summary['quality'] = {
                'average': round(sum(quality_scores) / len(quality_scores), 2),
                'min': min(quality_scores),
                'max': max(quality_scores),
            }

        # Overall benchmark score (average of all metrics)
        all_scores = diversity_scores + coverage_scores + tool_scores + (quality_scores if quality_scores else [])
        summary['overall_score'] = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0

        return summary

    def print_summary_report(self, summary: Dict):
        """Pretty-print summary report."""
        print("\n" + "="*60)
        print("BENCHMARK SUMMARY REPORT")
        print("="*60)

        print(f"\n📊 Responses Evaluated: {summary['total_responses']}")
        print(f"🎯 Overall Score: {summary['overall_score']}/10")

        print(f"\n📈 Metrics Breakdown:")
        print(f"   Semantic Diversity: {summary['diversity']['average']}/10 (range: {summary['diversity']['min']}-{summary['diversity']['max']})")
        print(f"   Frame Coverage:     {summary['coverage']['average']}/10 (range: {summary['coverage']['min']}-{summary['coverage']['max']})")
        print(f"   Tool Usage:         {summary['tools']['average']}/10 (range: {summary['tools']['min']}-{summary['tools']['max']})")

        if 'quality' in summary:
            print(f"   Solution Quality:   {summary['quality']['average']}/10 (range: {summary['quality']['min']}-{summary['quality']['max']})")

        print("\n" + "="*60 + "\n")

    def save_results(self, results: List[Dict], output_file: str):
        """Save results to JSON file."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump({
                'results': results,
                'summary': self.generate_summary_report(results)
            }, f, indent=2)

        print(f"✅ Results saved to: {output_file}")


def compare_conditions(baseline_dir: str, improved_dir: str, use_llm_judge: bool = True) -> Dict:
    """
    Compare two conditions (e.g., baseline vs with-linsenkasten).

    Assumes files are named consistently:
    - baseline/problem1.md
    - improved/problem1.md
    """
    baseline_path = Path(baseline_dir)
    improved_path = Path(improved_dir)

    baseline_files = {f.name: f for f in baseline_path.glob("*.md")}
    improved_files = {f.name: f for f in improved_path.glob("*.md")}

    # Find matching files
    matching = set(baseline_files.keys()) & set(improved_files.keys())

    print(f"\nComparing {len(matching)} matching responses:")
    print(f"  Baseline: {baseline_dir}")
    print(f"  Improved: {improved_dir}")
    print("="*60)

    comparisons = []

    for filename in sorted(matching):
        print(f"\n{filename}:")

        baseline_file = baseline_files[filename]
        improved_file = improved_files[filename]

        # Run metrics on both
        baseline_result = BenchmarkRunner(baseline_path, use_llm_judge).evaluate_single_response(baseline_file)
        improved_result = BenchmarkRunner(improved_path, use_llm_judge).evaluate_single_response(improved_file)

        # Calculate improvements
        comparison = {
            'filename': filename,
            'baseline': baseline_result,
            'improved': improved_result,
            'improvements': {}
        }

        # Diversity improvement
        b_div = baseline_result['diversity'].get('diversity_score', 0)
        i_div = improved_result['diversity'].get('diversity_score', 0)
        comparison['improvements']['diversity'] = round(i_div - b_div, 1)

        # Coverage improvement
        b_cov = baseline_result['coverage'].get('coverage_score', 0)
        i_cov = improved_result['coverage'].get('coverage_score', 0)
        comparison['improvements']['coverage'] = round(i_cov - b_cov, 1)

        # Tool improvement
        b_tool = baseline_result['tools'].get('tool_score', 0)
        i_tool = improved_result['tools'].get('tool_score', 0)
        comparison['improvements']['tools'] = round(i_tool - b_tool, 1)

        # Quality improvement
        if 'quality' in baseline_result and 'quality' in improved_result:
            b_qual = baseline_result['quality']['scores'].get('average', 0)
            i_qual = improved_result['quality']['scores'].get('average', 0)
            comparison['improvements']['quality'] = round(i_qual - b_qual, 1)

        # Print quick comparison
        print(f"  Diversity: {b_div} → {i_div} ({comparison['improvements']['diversity']:+.1f})")
        print(f"  Coverage:  {b_cov} → {i_cov} ({comparison['improvements']['coverage']:+.1f})")
        print(f"  Tools:     {b_tool} → {i_tool} ({comparison['improvements']['tools']:+.1f})")

        if 'quality' in comparison['improvements']:
            print(f"  Quality:   {b_qual} → {i_qual} ({comparison['improvements']['quality']:+.1f})")

        comparisons.append(comparison)

    # Generate aggregate comparison
    aggregate = {
        'total_comparisons': len(comparisons),
        'average_improvements': {}
    }

    for metric in ['diversity', 'coverage', 'tools', 'quality']:
        improvements = [c['improvements'][metric] for c in comparisons if metric in c['improvements']]
        if improvements:
            aggregate['average_improvements'][metric] = round(sum(improvements) / len(improvements), 2)

    # Calculate overall improvement percentage
    all_improvements = []
    for c in comparisons:
        all_improvements.extend(c['improvements'].values())

    if all_improvements:
        aggregate['average_improvement_absolute'] = round(sum(all_improvements) / len(all_improvements), 2)
        # Rough estimate of percentage (assuming baseline ~3/10 average)
        aggregate['average_improvement_percent'] = round((aggregate['average_improvement_absolute'] / 3.0) * 100, 1)

    print("\n" + "="*60)
    print("AGGREGATE COMPARISON")
    print("="*60)
    print(f"\nComparisons: {aggregate['total_comparisons']}")
    print(f"\nAverage Improvements:")
    for metric, improvement in aggregate['average_improvements'].items():
        print(f"  {metric.capitalize()}: {improvement:+.2f}")

    if 'average_improvement_absolute' in aggregate:
        print(f"\nOverall Improvement: {aggregate['average_improvement_absolute']:+.2f}")
        print(f"Estimated % Improvement: {aggregate['average_improvement_percent']:+.1f}%")

    print("\n" + "="*60 + "\n")

    return {
        'comparisons': comparisons,
        'aggregate': aggregate
    }


def main():
    parser = argparse.ArgumentParser(description='Run linsenkasten benchmark evaluation')
    parser.add_argument('--results', help='Results directory to evaluate')
    parser.add_argument('--compare', nargs=2, metavar=('BASELINE', 'IMPROVED'),
                        help='Compare two result directories')
    parser.add_argument('--sample', type=int, metavar='N',
                        help='Evaluate random sample of N files')
    parser.add_argument('--no-llm-judge', action='store_true',
                        help='Skip LLM-as-judge evaluation (Tier 2)')
    parser.add_argument('--output', default='benchmark/results/report.json',
                        help='Output file for results JSON')

    args = parser.parse_args()

    use_llm_judge = not args.no_llm_judge

    if args.compare:
        # Comparison mode
        baseline_dir, improved_dir = args.compare
        comparison = compare_conditions(baseline_dir, improved_dir, use_llm_judge)

        # Save comparison results
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(comparison, f, indent=2)
            print(f"✅ Comparison saved to: {args.output}")

    elif args.results:
        # Single directory evaluation
        runner = BenchmarkRunner(args.results, use_llm_judge)

        if args.sample:
            # Random sample
            all_files = runner.find_response_files()
            sampled = random.sample(list(all_files), min(args.sample, len(all_files)))
            results = [runner.evaluate_single_response(f) for f in sampled]
        else:
            # All files
            results = runner.evaluate_all_responses()

        # Generate and print summary
        summary = runner.generate_summary_report(results)
        runner.print_summary_report(summary)

        # Save results
        runner.save_results(results, args.output)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
