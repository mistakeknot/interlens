#!/usr/bin/env python3
"""
Tool Usage Pattern Analyzer

Analyzes how an agent uses linsenkasten MCP/CLI tools during problem-solving.

Metrics:
1. Tool Diversity - How many different tools used
2. Tool Appropriateness - Did they use right tools for the task?
3. Tool Sequence - Did they follow effective patterns (search → journey → bridge)?
4. Creative Tool Usage - Did they use advanced creative tools (journey, bridge, contrasts)?

Scoring:
- 0-2/10: No tools used (baseline condition)
- 3-5/10: Basic tools only (search, get)
- 6-8/10: Mix of basic + creative tools
- 9-10/10: Strategic tool sequences, deep exploration

Note: This requires parsing conversation logs where tool calls are visible.
For manual testing, we can extract tool usage from response text or use simplified patterns.
"""

import os
import re
import json
from typing import List, Dict, Set, Tuple
from collections import Counter

# Linsenkasten tool inventory
BASIC_TOOLS = {
    'search_lenses': ['search', 'searching for', 'searched for'],
    'get_lens': ['get lens', 'retrieved', 'fetched lens'],
    'get_related_lenses': ['related lenses', 'connections', 'connected to'],
}

CREATIVE_TOOLS = {
    'find_lens_journey': ['journey', 'path from', 'conceptual path', 'bridge between'],
    'find_bridge_lenses': ['bridge lens', 'bridging', 'bridges'],
    'find_contrasting_lenses': ['contrast', 'paradox', 'opposing', 'tension'],
    'get_central_lenses': ['central lens', 'hub', 'betweenness', 'pagerank'],
    'get_lens_neighborhood': ['neighborhood', 'nearby lenses', 'surrounding'],
    'random_lens_provocation': ['random lens', 'provocation', 'random provocation'],
}

# Effective tool sequences (patterns that indicate strategic exploration)
EFFECTIVE_SEQUENCES = [
    ['search_lenses', 'find_lens_journey'],      # Search → explore path
    ['search_lenses', 'find_bridge_lenses'],     # Search → find bridges
    ['search_lenses', 'find_contrasting_lenses'], # Search → find paradoxes
    ['get_lens', 'get_lens_neighborhood'],       # Get lens → explore neighbors
    ['random_lens_provocation', 'get_related_lenses'], # Random → explore connections
]

# Anti-patterns (ineffective usage)
ANTI_PATTERNS = [
    'repeated_search',  # Same search multiple times
    'no_followup',      # Search without exploration
    'random_only',      # Only using random without integration
]


def extract_tool_calls_from_text(text: str) -> List[str]:
    """
    Extract tool usage from response text using pattern matching.

    This is a heuristic for manual testing when we don't have conversation logs.
    Looks for phrases like "I'll search for...", "Let me find the journey between..."

    Args:
        text: Agent response text

    Returns:
        List of tool names (in order of usage)
    """
    tools_used = []

    # Normalize text
    normalized = text.lower()

    # Pattern: "I searched for X" → search_lenses
    if any(p in normalized for p in ['i searched', 'searching for', 'i\'ll search']):
        tools_used.append('search_lenses')

    # Pattern: "journey from X to Y" → find_lens_journey
    if any(p in normalized for p in ['journey from', 'journey between', 'path from', 'conceptual path']):
        tools_used.append('find_lens_journey')

    # Pattern: "bridge between X and Y" → find_bridge_lenses
    if any(p in normalized for p in ['bridge between', 'bridging', 'bridge lens']):
        tools_used.append('find_bridge_lenses')

    # Pattern: "contrasting lenses" → find_contrasting_lenses
    if any(p in normalized for p in ['contrasting lens', 'paradox', 'opposing lens', 'tension between']):
        tools_used.append('find_contrasting_lenses')

    # Pattern: "central lenses" or "hubs" → get_central_lenses
    if any(p in normalized for p in ['central lens', 'most central', 'hub', 'betweenness']):
        tools_used.append('get_central_lenses')

    # Pattern: "neighborhood" → get_lens_neighborhood
    if any(p in normalized for p in ['neighborhood', 'nearby lens', 'surrounding lens']):
        tools_used.append('get_lens_neighborhood')

    # Pattern: "random lens" → random_lens_provocation
    if any(p in normalized for p in ['random lens', 'random provocation']):
        tools_used.append('random_lens_provocation')

    return tools_used


def extract_tool_calls_from_log(log_file: str) -> List[Dict]:
    """
    Extract tool calls from a conversation log file (JSON format).

    Expected format:
    [
      {"role": "assistant", "tool_calls": [{"name": "search_lenses", "args": {...}}]},
      ...
    ]

    Args:
        log_file: Path to conversation log JSON

    Returns:
        List of tool call dicts with name, args, timestamp
    """
    if not os.path.exists(log_file):
        return []

    with open(log_file, 'r') as f:
        try:
            log_data = json.load(f)
        except json.JSONDecodeError:
            return []

    tool_calls = []

    for i, message in enumerate(log_data):
        if message.get('role') == 'assistant' and 'tool_calls' in message:
            for call in message['tool_calls']:
                tool_calls.append({
                    'name': call.get('name'),
                    'args': call.get('args', {}),
                    'index': i,
                })

    return tool_calls


def categorize_tools(tool_names: List[str]) -> Dict[str, List[str]]:
    """
    Categorize tools into basic vs creative.

    Returns:
        Dict with 'basic' and 'creative' lists
    """
    categorized = {'basic': [], 'creative': []}

    for tool in tool_names:
        if tool in BASIC_TOOLS:
            categorized['basic'].append(tool)
        elif tool in CREATIVE_TOOLS:
            categorized['creative'].append(tool)

    return categorized


def detect_sequences(tool_names: List[str]) -> List[Tuple[str, str]]:
    """
    Detect effective tool sequences in usage pattern.

    Returns:
        List of (sequence_type, tools) tuples
    """
    detected = []

    for i in range(len(tool_names) - 1):
        current = tool_names[i]
        next_tool = tool_names[i + 1]

        for seq in EFFECTIVE_SEQUENCES:
            if len(seq) >= 2 and current == seq[0] and next_tool == seq[1]:
                detected.append((f"{seq[0]} → {seq[1]}", [current, next_tool]))

    return detected


def detect_anti_patterns(tool_names: List[str]) -> List[str]:
    """
    Detect anti-patterns in tool usage.

    Returns:
        List of anti-pattern names detected
    """
    anti = []

    # Repeated search (same tool 3+ times in a row)
    if len(tool_names) >= 3:
        for i in range(len(tool_names) - 2):
            if tool_names[i] == tool_names[i+1] == tool_names[i+2] == 'search_lenses':
                anti.append('repeated_search')
                break

    # No followup (search without any exploration)
    has_search = 'search_lenses' in tool_names
    has_exploration = any(t in CREATIVE_TOOLS for t in tool_names)
    if has_search and not has_exploration and len(tool_names) <= 2:
        anti.append('no_followup')

    # Random only (only using random provocation without integration)
    if tool_names == ['random_lens_provocation'] or (
        len(tool_names) == 2 and tool_names[0] == 'random_lens_provocation' and tool_names[1] == 'random_lens_provocation'
    ):
        anti.append('random_only')

    return list(set(anti))


def calculate_tool_score(
    tool_names: List[str],
    categorized: Dict[str, List[str]],
    sequences: List[Tuple],
    anti_patterns: List[str]
) -> Tuple[float, Dict]:
    """
    Calculate overall tool usage score (0-10).

    Scoring:
    - Base: Tool diversity (0-4 points)
    - Bonus: Creative tool usage (0-3 points)
    - Bonus: Effective sequences (0-3 points)
    - Penalty: Anti-patterns (-1 point each)

    Returns:
        Tuple of (score, breakdown_dict)
    """
    # Base score: diversity
    unique_tools = len(set(tool_names))
    diversity_score = min(4.0, unique_tools * 0.8)  # Up to 4 points

    # Creative tool bonus
    creative_count = len(categorized['creative'])
    creative_bonus = min(3.0, creative_count * 0.75)  # Up to 3 points

    # Sequence bonus
    sequence_bonus = min(3.0, len(sequences) * 1.0)  # Up to 3 points

    # Anti-pattern penalty
    penalty = len(anti_patterns) * 1.0

    total = diversity_score + creative_bonus + sequence_bonus - penalty
    total = max(0, min(10, total))  # Clamp to [0, 10]

    breakdown = {
        'diversity_score': round(diversity_score, 1),
        'creative_bonus': round(creative_bonus, 1),
        'sequence_bonus': round(sequence_bonus, 1),
        'penalty': round(penalty, 1),
        'total': round(total, 1),
        'unique_tools': unique_tools,
        'basic_count': len(categorized['basic']),
        'creative_count': creative_count,
        'sequences_detected': len(sequences),
        'anti_patterns': len(anti_patterns)
    }

    return round(total, 1), breakdown


def analyze_response_text(text: str) -> Dict:
    """
    Analyze tool usage from response text (for manual testing).

    Args:
        text: Agent response text

    Returns:
        Dictionary with tool usage metrics
    """
    tool_calls = extract_tool_calls_from_text(text)

    if not tool_calls:
        return {
            'tool_score': 0.0,
            'tools_used': [],
            'tool_count': 0,
            'message': 'No linsenkasten tools detected in response'
        }

    categorized = categorize_tools(tool_calls)
    sequences = detect_sequences(tool_calls)
    anti = detect_anti_patterns(tool_calls)

    score, breakdown = calculate_tool_score(tool_calls, categorized, sequences, anti)

    return {
        'tool_score': score,
        'tools_used': tool_calls,
        'tool_count': len(tool_calls),
        'categorized': categorized,
        'sequences': sequences,
        'anti_patterns': anti,
        'breakdown': breakdown
    }


def analyze_log_file(log_file: str) -> Dict:
    """
    Analyze tool usage from conversation log file.

    Args:
        log_file: Path to JSON conversation log

    Returns:
        Dictionary with tool usage metrics
    """
    tool_calls = extract_tool_calls_from_log(log_file)

    if not tool_calls:
        return {
            'tool_score': 0.0,
            'tools_used': [],
            'tool_count': 0,
            'message': 'No tool calls found in log file'
        }

    tool_names = [call['name'] for call in tool_calls]

    categorized = categorize_tools(tool_names)
    sequences = detect_sequences(tool_names)
    anti = detect_anti_patterns(tool_names)

    score, breakdown = calculate_tool_score(tool_names, categorized, sequences, anti)

    return {
        'tool_score': score,
        'tools_used': tool_names,
        'tool_calls': tool_calls,
        'tool_count': len(tool_names),
        'categorized': categorized,
        'sequences': sequences,
        'anti_patterns': anti,
        'breakdown': breakdown
    }


def analyze_file(filepath: str) -> Dict:
    """
    Analyze tool usage from either response text (.md) or log file (.json).

    Args:
        filepath: Path to response markdown or conversation log JSON

    Returns:
        Dictionary with tool usage metrics
    """
    ext = os.path.splitext(filepath)[1].lower()

    if ext == '.json':
        result = analyze_log_file(filepath)
    else:
        # Assume markdown response file
        with open(filepath, 'r') as f:
            content = f.read()
        result = analyze_response_text(content)

    result['filepath'] = filepath
    return result


def compare_responses(baseline_file: str, improved_file: str) -> Dict:
    """
    Compare tool usage between baseline and improved responses.

    Returns:
        Comparison metrics
    """
    baseline = analyze_file(baseline_file)
    improved = analyze_file(improved_file)

    improvement = improved['tool_score'] - baseline['tool_score']
    improvement_pct = (improvement / baseline['tool_score'] * 100) if baseline['tool_score'] > 0 else 0

    return {
        'baseline': baseline,
        'improved': improved,
        'improvement': round(improvement, 1),
        'improvement_pct': round(improvement_pct, 1) if baseline['tool_score'] > 0 else float('inf')
    }


def print_report(result: Dict):
    """Pretty-print a tool usage analysis report."""
    print("\n" + "="*60)
    print("TOOL USAGE PATTERN ANALYSIS")
    print("="*60)

    if 'message' in result and result['tool_count'] == 0:
        print(f"\n⚠️  {result['message']}")
        print("   (This might be baseline condition - no linsenkasten tools used)")
        print("\n" + "="*60 + "\n")
        return

    print(f"\n📊 Tool Usage Score: {result['tool_score']}/10")
    print(f"   Total tool calls: {result['tool_count']}")

    if result.get('breakdown'):
        b = result['breakdown']
        print(f"\n📈 Score Breakdown:")
        print(f"   Diversity: {b['diversity_score']}/4 ({b['unique_tools']} unique tools)")
        print(f"   Creative bonus: +{b['creative_bonus']} ({b['creative_count']} creative tools)")
        print(f"   Sequence bonus: +{b['sequence_bonus']} ({b['sequences_detected']} patterns)")
        if b['penalty'] > 0:
            print(f"   Penalty: -{b['penalty']} ({b['anti_patterns']} anti-patterns)")
        print(f"   Total: {b['total']}/10")

    print(f"\n🔧 Tools Used:")
    for tool in result['tools_used']:
        category = "🎨" if tool in CREATIVE_TOOLS else "📝"
        print(f"   {category} {tool}")

    if result.get('sequences'):
        print(f"\n✨ Effective Sequences Detected:")
        for seq_name, tools in result['sequences']:
            print(f"   ✓ {seq_name}")

    if result.get('anti_patterns'):
        print(f"\n⚠️  Anti-Patterns Detected:")
        for anti in result['anti_patterns']:
            print(f"   ✗ {anti}")

    print("\n" + "="*60 + "\n")


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python tool_patterns.py <response_file.md|log.json>")
        print("   or: python tool_patterns.py <baseline.md> <improved.md>")
        sys.exit(1)

    if len(sys.argv) == 2:
        # Single file analysis
        result = analyze_file(sys.argv[1])
        print_report(result)

    elif len(sys.argv) == 3:
        # Comparison mode
        comparison = compare_responses(sys.argv[1], sys.argv[2])

        print("\n" + "="*60)
        print("TOOL USAGE COMPARISON")
        print("="*60)

        print("\n📋 BASELINE:")
        print(f"   Score: {comparison['baseline']['tool_score']}/10")
        print(f"   Tools: {comparison['baseline']['tool_count']}")

        print("\n✨ IMPROVED:")
        print(f"   Score: {comparison['improved']['tool_score']}/10")
        print(f"   Tools: {comparison['improved']['tool_count']}")

        print("\n📈 IMPROVEMENT:")
        if comparison['baseline']['tool_score'] == 0:
            print(f"   Baseline used no tools (expected)")
            print(f"   Improved: {comparison['improved']['tool_score']}/10")
        else:
            print(f"   Absolute: +{comparison['improvement']}")
            print(f"   Relative: +{comparison['improvement_pct']}%")

        print("\n" + "="*60 + "\n")
