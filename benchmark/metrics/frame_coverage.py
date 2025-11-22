#!/usr/bin/env python3
"""
Frame Coverage Tracker

Measures how many FLUX analytical lenses/frames an agent applies in their response.

Metrics:
1. Lens Mentions - Which specific FLUX lenses are mentioned by name
2. Frame Coverage - % of expected high-relevance lenses covered
3. Frame Diversity - How many distinct conceptual frames explored
4. Application Depth - Are lenses just mentioned or actually applied?

Scoring:
- 0-2/10: No lenses mentioned, generic advice
- 3-5/10: 1-2 lenses mentioned superficially
- 6-8/10: Multiple lenses mentioned and applied
- 9-10/10: Deep multi-lens application with synthesis
"""

import os
import re
import json
from typing import List, Dict, Set, Tuple
from pathlib import Path

# Load FLUX lens vocabulary from benchmark problems or API
# For now, use curated list of most common lenses
FLUX_LENSES = {
    'Pace Layering': ['pace layer', 'fast layer', 'slow layer', 'temporal layer', 'pace-layer'],
    'Explore vs Exploit': ['explore vs exploit', 'exploration', 'exploitation', 'explore/exploit'],
    'Zone of Proximal Development': ['zpd', 'zone of proximal', 'proximal development', 'capability zone'],
    'System Boundaries': ['system boundary', 'system boundaries', 'boundary', 'inside/outside control'],
    'Feedback Loops': ['feedback loop', 'reinforcing loop', 'balancing loop', 'vicious cycle', 'virtuous cycle'],
    'Leverage Points': ['leverage point', 'high leverage', 'low leverage', 'intervention point'],
    'Bottleneck Theory': ['bottleneck', 'constraint', 'theory of constraints', 'limiting factor'],
    'Innovation Cascade': ['innovation cascade', 'cascading innovation', 'innovation diffusion'],
    'Strategic Choice': ['strategic choice', 'strategic decision', 'strategy choice'],
    'Time Horizons': ['time horizon', 'short-term', 'long-term', 'temporal horizon'],
    'Competitive Dynamics': ['competitive dynamic', 'competition', 'competitive advantage'],
    'Differentiation': ['differentiation', 'differentiate', 'competitive differentiation'],
    'Jobs to be Done': ['jobs to be done', 'jtbd', 'job to be done', 'customer job'],
    'Progressive Disclosure': ['progressive disclosure', 'progressive revelation', 'reveal progressively'],
    'User Journey': ['user journey', 'customer journey', 'user path'],
    'Accessibility': ['accessibility', 'wcag', 'accessible design', 'a11y'],
    'Feature Fatigue': ['feature fatigue', 'feature bloat', 'feature overload'],
    'Value-Based Pricing': ['value-based pricing', 'value pricing', 'price by value'],
    'Innovation Portfolio': ['innovation portfolio', 'portfolio approach', 'portfolio strategy'],
    'Conway\'s Law': ['conway', 'conway\'s law', 'organization structure determines architecture'],
    'Communication Bandwidth': ['communication bandwidth', 'bandwidth', 'synchronous', 'asynchronous'],
    'Root Cause Analysis': ['root cause', 'root cause analysis', 'underlying cause', 'systemic cause'],
}

# Conceptual frames (groupings of related lenses)
CONCEPTUAL_FRAMES = {
    'Temporal': ['Pace Layering', 'Time Horizons'],
    'Learning': ['Zone of Proximal Development', 'Progressive Disclosure'],
    'Systems Thinking': ['System Boundaries', 'Feedback Loops', 'Leverage Points', 'Bottleneck Theory'],
    'Strategy': ['Explore vs Exploit', 'Strategic Choice', 'Competitive Dynamics', 'Differentiation'],
    'Product': ['Jobs to be Done', 'Value-Based Pricing', 'Feature Fatigue', 'Innovation Portfolio'],
    'Organization': ['Conway\'s Law', 'Communication Bandwidth'],
    'Analysis': ['Root Cause Analysis'],
}

# Application patterns (signals of deep vs superficial usage)
APPLICATION_PATTERNS = {
    'deep': [
        r'through\s+([A-Z][A-Za-z\s]+?)[\s:,]',  # "Through Pace Layering:"
        r'using\s+([A-Z][A-Za-z\s]+?)\s+lens',  # "Using the X lens"
        r'via\s+([A-Z][A-Za-z\s]+?)[\s:,]',     # "Via Pace Layering,"
        r'applying\s+([A-Z][A-Za-z\s]+?)[\s:,]', # "Applying Pace Layering,"
    ],
    'surface': [
        r'consider\s+([A-Z][A-Za-z\s]+)',        # "Consider Pace Layering"
        r'look at\s+([A-Z][A-Za-z\s]+)',         # "Look at Pace Layering"
        r'like\s+([A-Z][A-Za-z\s]+)',            # "Like Pace Layering"
    ]
}


def normalize_text(text: str) -> str:
    """Normalize text for matching (lowercase, strip extra whitespace)."""
    return re.sub(r'\s+', ' ', text.lower().strip())


def find_lens_mentions(text: str) -> Dict[str, List[str]]:
    """
    Find all FLUX lens mentions in text.

    Returns:
        Dictionary mapping lens names to list of matched phrases
    """
    normalized = normalize_text(text)
    mentions = {}

    for lens_name, patterns in FLUX_LENSES.items():
        found = []
        for pattern in patterns:
            if pattern.lower() in normalized:
                found.append(pattern)
        if found:
            mentions[lens_name] = found

    return mentions


def analyze_application_depth(text: str, lens_mentions: Dict[str, List[str]]) -> Dict[str, str]:
    """
    Determine if lenses are deeply applied or just mentioned.

    Returns:
        Dictionary mapping lens names to 'deep' or 'surface'
    """
    depths = {}

    for lens_name in lens_mentions.keys():
        # Check for deep application patterns
        deep_found = False
        for pattern in APPLICATION_PATTERNS['deep']:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if any(lens_name.lower() in match.lower() for match in matches):
                deep_found = True
                break

        depths[lens_name] = 'deep' if deep_found else 'surface'

    return depths


def identify_frames_covered(lens_mentions: Dict[str, List[str]]) -> Set[str]:
    """
    Identify which conceptual frames were covered.

    Returns:
        Set of frame names
    """
    frames = set()

    for lens_name in lens_mentions.keys():
        for frame, lenses in CONCEPTUAL_FRAMES.items():
            if lens_name in lenses:
                frames.add(frame)

    return frames


def load_expected_lenses(problem_file: str) -> Tuple[List[str], List[str]]:
    """
    Parse problem file to extract expected high/medium relevance lenses.

    Returns:
        Tuple of (high_relevance_lenses, medium_relevance_lenses)
    """
    if not os.path.exists(problem_file):
        return [], []

    with open(problem_file, 'r') as f:
        content = f.read()

    high = []
    medium = []

    # Find "## Expected Lens Relevance" section
    relevance_section = re.search(
        r'## Expected Lens Relevance\s+\*\*High:\*\*\s+([^\n]+)\s+\*\*Medium:\*\*\s+([^\n]+)',
        content,
        re.IGNORECASE
    )

    if relevance_section:
        high_text = relevance_section.group(1)
        medium_text = relevance_section.group(2)

        # Split on commas and clean up
        high = [l.strip() for l in high_text.split(',')]
        medium = [l.strip() for l in medium_text.split(',')]

    return high, medium


def calculate_coverage_score(
    lens_mentions: Dict[str, List[str]],
    depths: Dict[str, str],
    expected_high: List[str],
    expected_medium: List[str]
) -> Tuple[float, Dict]:
    """
    Calculate overall frame coverage score (0-10).

    Scoring:
    - Base: % of expected high-relevance lenses covered (0-6 points)
    - Bonus: Medium-relevance lenses (+0-2 points)
    - Bonus: Deep application vs surface (+0-2 points)

    Returns:
        Tuple of (score, breakdown_dict)
    """
    # Base score: coverage of high-relevance lenses
    high_covered = [l for l in expected_high if l in lens_mentions]
    high_coverage_pct = len(high_covered) / len(expected_high) if expected_high else 0
    base_score = high_coverage_pct * 6  # Up to 6 points

    # Bonus 1: medium-relevance lenses
    medium_covered = [l for l in expected_medium if l in lens_mentions]
    medium_bonus = min(2.0, len(medium_covered) * 0.5)  # Up to 2 points

    # Bonus 2: deep application
    deep_count = sum(1 for d in depths.values() if d == 'deep')
    deep_bonus = min(2.0, deep_count * 0.4)  # Up to 2 points

    total = base_score + medium_bonus + deep_bonus
    total = min(10.0, total)  # Cap at 10

    breakdown = {
        'base_score': round(base_score, 1),
        'medium_bonus': round(medium_bonus, 1),
        'deep_bonus': round(deep_bonus, 1),
        'total': round(total, 1),
        'high_coverage_pct': round(high_coverage_pct * 100, 1),
        'high_expected': len(expected_high),
        'high_covered': len(high_covered),
        'medium_covered': len(medium_covered),
        'deep_applications': deep_count,
        'surface_mentions': len(depths) - deep_count
    }

    return round(total, 1), breakdown


def analyze_response(response_text: str, problem_file: str = None) -> Dict:
    """
    Analyze a response for frame coverage.

    Args:
        response_text: Agent's response text
        problem_file: Optional path to problem.md to load expected lenses

    Returns:
        Dictionary with coverage metrics
    """
    # Find lens mentions
    lens_mentions = find_lens_mentions(response_text)

    # Analyze application depth
    depths = analyze_application_depth(response_text, lens_mentions)

    # Identify frames covered
    frames = identify_frames_covered(lens_mentions)

    # Load expected lenses if problem file provided
    expected_high, expected_medium = [], []
    if problem_file:
        expected_high, expected_medium = load_expected_lenses(problem_file)

    # Calculate coverage score
    score, breakdown = calculate_coverage_score(
        lens_mentions, depths, expected_high, expected_medium
    )

    return {
        'coverage_score': score,
        'lens_mentions': lens_mentions,
        'application_depths': depths,
        'frames_covered': list(frames),
        'num_lenses': len(lens_mentions),
        'num_frames': len(frames),
        'expected_high': expected_high,
        'expected_medium': expected_medium,
        'breakdown': breakdown
    }


def analyze_file(response_file: str, problem_file: str = None) -> Dict:
    """
    Analyze a response file for frame coverage.

    Args:
        response_file: Path to agent response markdown
        problem_file: Optional path to corresponding problem.md

    Returns:
        Dictionary with coverage metrics
    """
    with open(response_file, 'r') as f:
        content = f.read()

    # Auto-detect problem file if not provided
    if not problem_file:
        # Try to infer from filename
        # E.g., "results/baseline/performance-stuck_with-linsenkasten.md"
        #    → "problems/code/performance-stuck.md"
        basename = os.path.basename(response_file)
        problem_id = basename.split('_')[0]  # Get "performance-stuck"

        # Search for problem file
        benchmark_dir = Path(__file__).parent.parent
        for domain in ['code', 'design', 'strategy', 'product', 'team']:
            candidate = benchmark_dir / 'problems' / domain / f'{problem_id}.md'
            if candidate.exists():
                problem_file = str(candidate)
                break

    result = analyze_response(content, problem_file)
    result['response_file'] = response_file
    result['problem_file'] = problem_file

    return result


def compare_responses(baseline_file: str, improved_file: str, problem_file: str = None) -> Dict:
    """
    Compare frame coverage between baseline and improved responses.

    Returns:
        Comparison metrics
    """
    baseline = analyze_file(baseline_file, problem_file)
    improved = analyze_file(improved_file, problem_file)

    improvement = improved['coverage_score'] - baseline['coverage_score']
    improvement_pct = (improvement / baseline['coverage_score'] * 100) if baseline['coverage_score'] > 0 else 0

    return {
        'baseline': baseline,
        'improved': improved,
        'improvement': round(improvement, 1),
        'improvement_pct': round(improvement_pct, 1)
    }


def print_report(result: Dict):
    """Pretty-print a coverage analysis report."""
    print("\n" + "="*60)
    print("FRAME COVERAGE ANALYSIS")
    print("="*60)

    print(f"\n📊 Coverage Score: {result['coverage_score']}/10")
    print(f"   Lenses mentioned: {result['num_lenses']}")
    print(f"   Frames covered: {result['num_frames']}")

    if result.get('breakdown'):
        b = result['breakdown']
        print(f"\n📈 Score Breakdown:")
        print(f"   Base (high-relevance): {b['base_score']}/6 ({b['high_coverage_pct']}% coverage)")
        print(f"   Medium-relevance bonus: +{b['medium_bonus']}")
        print(f"   Deep application bonus: +{b['deep_bonus']}")
        print(f"   Total: {b['total']}/10")

    print(f"\n🎯 Lenses Applied:")
    for lens, depth in result['application_depths'].items():
        indicator = "🔍" if depth == 'deep' else "💬"
        print(f"   {indicator} {lens} ({depth})")

    if result['frames_covered']:
        print(f"\n🗂️  Conceptual Frames:")
        for frame in sorted(result['frames_covered']):
            print(f"   • {frame}")

    if result.get('expected_high'):
        print(f"\n✅ Expected High-Relevance Lenses:")
        for lens in result['expected_high']:
            covered = "✓" if lens in result['lens_mentions'] else "✗"
            print(f"   {covered} {lens}")

    print("\n" + "="*60 + "\n")


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python frame_coverage.py <response_file.md> [problem_file.md]")
        print("   or: python frame_coverage.py <baseline.md> <improved.md> [problem.md]")
        sys.exit(1)

    if len(sys.argv) == 2:
        # Single file analysis
        result = analyze_file(sys.argv[1])
        print_report(result)

    elif len(sys.argv) == 3:
        # Check if second arg is problem file or comparison file
        if 'problem' in sys.argv[2]:
            # Single file with explicit problem
            result = analyze_file(sys.argv[1], sys.argv[2])
            print_report(result)
        else:
            # Comparison mode
            comparison = compare_responses(sys.argv[1], sys.argv[2])

            print("\n" + "="*60)
            print("FRAME COVERAGE COMPARISON")
            print("="*60)

            print("\n📋 BASELINE:")
            print(f"   Score: {comparison['baseline']['coverage_score']}/10")
            print(f"   Lenses: {comparison['baseline']['num_lenses']}")
            print(f"   Frames: {comparison['baseline']['num_frames']}")

            print("\n✨ IMPROVED:")
            print(f"   Score: {comparison['improved']['coverage_score']}/10")
            print(f"   Lenses: {comparison['improved']['num_lenses']}")
            print(f"   Frames: {comparison['improved']['num_frames']}")

            print("\n📈 IMPROVEMENT:")
            print(f"   Absolute: +{comparison['improvement']}")
            print(f"   Relative: +{comparison['improvement_pct']}%")

            print("\n" + "="*60 + "\n")

    elif len(sys.argv) == 4:
        # Comparison mode with explicit problem file
        comparison = compare_responses(sys.argv[1], sys.argv[2], sys.argv[3])
        # (same output as above)
