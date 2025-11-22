#!/usr/bin/env python3
"""
Semantic Diversity Scorer

Measures the conceptual diversity of an agent's response by:
1. Extracting key concepts/phrases from the text
2. Computing embeddings for each concept
3. Measuring pairwise cosine distances
4. Scoring based on average diversity

High diversity = explores multiple distinct conceptual areas
Low diversity = clusters around similar ideas

Inspired by: Divergent benchmark (Vafa et al., 2024)
"""

import os
import re
import json
import numpy as np
from typing import List, Dict, Tuple
from openai import OpenAI

# Use OpenAI for embeddings (text-embedding-3-small, 384 dimensions)
# Cost: ~$0.00002 per 1K tokens (very cheap)
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

EMBEDDING_MODEL = 'text-embedding-3-small'
EMBEDDING_DIMENSIONS = 384


def extract_concepts(text: str, min_length: int = 3) -> List[str]:
    """
    Extract key concepts from text using simple heuristics.

    Strategy:
    - Extract noun phrases (simple pattern matching)
    - Extract sentences containing 'lens' mentions
    - Extract bullet points and list items
    - Filter for meaningful length

    Args:
        text: Agent response text
        min_length: Minimum character length for concepts

    Returns:
        List of concept strings
    """
    concepts = []

    # Extract bullet points and list items (common in agent responses)
    bullet_pattern = r'^[\s]*[-•*]\s+(.+)$'
    for line in text.split('\n'):
        match = re.match(bullet_pattern, line)
        if match:
            concepts.append(match.group(1).strip())

    # Extract lens mentions (e.g., "Pace Layering", "Explore vs Exploit")
    lens_pattern = r'(?:through|using|via|with|applying)\s+([A-Z][A-Za-z\s&]+?)(?:\s*:|,|\.|$)'
    lens_matches = re.findall(lens_pattern, text, re.IGNORECASE)
    concepts.extend([m.strip() for m in lens_matches])

    # Extract quoted concepts (often key insights)
    quote_pattern = r'"([^"]{10,100})"'
    quote_matches = re.findall(quote_pattern, text)
    concepts.extend(quote_matches)

    # Extract sentences with key strategic words
    strategy_keywords = [
        'solution', 'approach', 'strategy', 'breakthrough', 'insight',
        'pattern', 'problem', 'cause', 'layer', 'system', 'loop'
    ]
    sentences = re.split(r'[.!?]+', text)
    for sentence in sentences:
        if any(kw in sentence.lower() for kw in strategy_keywords):
            if len(sentence.strip()) > min_length:
                concepts.append(sentence.strip())

    # Deduplicate and filter by length
    unique_concepts = list(set(concepts))
    filtered = [c for c in unique_concepts if len(c) >= min_length]

    return filtered


def get_embeddings(texts: List[str]) -> np.ndarray:
    """
    Get OpenAI embeddings for a list of texts.

    Args:
        texts: List of text strings to embed

    Returns:
        numpy array of shape (len(texts), EMBEDDING_DIMENSIONS)
    """
    if not texts:
        return np.array([])

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
        dimensions=EMBEDDING_DIMENSIONS
    )

    embeddings = [item.embedding for item in response.data]
    return np.array(embeddings)


def cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute cosine distance between two vectors.

    Cosine distance = 1 - cosine similarity
    Range: [0, 2] where 0 = identical, 2 = opposite
    """
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a == 0 or norm_b == 0:
        return 1.0  # Undefined, return neutral value

    cosine_sim = dot_product / (norm_a * norm_b)
    return 1 - cosine_sim


def compute_pairwise_distances(embeddings: np.ndarray) -> List[float]:
    """
    Compute all pairwise cosine distances between embeddings.

    Args:
        embeddings: numpy array of shape (n, dimensions)

    Returns:
        List of pairwise distances
    """
    n = len(embeddings)
    distances = []

    for i in range(n):
        for j in range(i + 1, n):
            dist = cosine_distance(embeddings[i], embeddings[j])
            distances.append(dist)

    return distances


def score_diversity(distances: List[float]) -> float:
    """
    Convert pairwise distances to a diversity score (0-10).

    Scoring logic:
    - Average distance < 0.2 → score 0-3 (clustered, low diversity)
    - Average distance 0.2-0.5 → score 3-7 (moderate diversity)
    - Average distance > 0.5 → score 7-10 (high diversity)

    Args:
        distances: List of pairwise cosine distances

    Returns:
        Diversity score from 0-10
    """
    if not distances:
        return 0.0

    avg_distance = np.mean(distances)
    std_distance = np.std(distances)

    # Map average distance to 0-10 scale
    # Empirically: average distances typically range 0.1-0.7 for text
    # 0.1 = very clustered, 0.7 = very diverse

    base_score = (avg_distance - 0.1) / (0.7 - 0.1) * 10
    base_score = max(0, min(10, base_score))  # Clamp to [0, 10]

    # Bonus for high variance (exploring distant concept spaces)
    variance_bonus = min(1.0, std_distance * 2)  # Up to +1 point

    final_score = min(10, base_score + variance_bonus)

    return round(final_score, 1)


def analyze_response(response_text: str) -> Dict:
    """
    Analyze a single agent response for semantic diversity.

    Args:
        response_text: The agent's full response text

    Returns:
        Dictionary with diversity metrics
    """
    # Extract concepts
    concepts = extract_concepts(response_text)

    if len(concepts) < 2:
        return {
            'diversity_score': 0.0,
            'num_concepts': len(concepts),
            'avg_distance': 0.0,
            'std_distance': 0.0,
            'concepts': concepts,
            'error': 'Insufficient concepts extracted (need at least 2)'
        }

    # Get embeddings
    embeddings = get_embeddings(concepts)

    # Compute pairwise distances
    distances = compute_pairwise_distances(embeddings)

    # Score diversity
    diversity_score = score_diversity(distances)

    return {
        'diversity_score': diversity_score,
        'num_concepts': len(concepts),
        'avg_distance': round(float(np.mean(distances)), 3),
        'std_distance': round(float(np.std(distances)), 3),
        'min_distance': round(float(np.min(distances)), 3),
        'max_distance': round(float(np.max(distances)), 3),
        'concepts': concepts[:10],  # Show first 10 for inspection
        'total_pairs': len(distances)
    }


def analyze_file(filepath: str) -> Dict:
    """
    Analyze a response file and return diversity metrics.

    Args:
        filepath: Path to markdown file containing agent response

    Returns:
        Dictionary with diversity metrics and metadata
    """
    with open(filepath, 'r') as f:
        content = f.read()

    result = analyze_response(content)
    result['filepath'] = filepath
    result['filename'] = os.path.basename(filepath)

    return result


def compare_responses(baseline_file: str, improved_file: str) -> Dict:
    """
    Compare diversity between baseline and improved responses.

    Args:
        baseline_file: Path to baseline response
        improved_file: Path to improved response

    Returns:
        Comparison metrics
    """
    baseline = analyze_file(baseline_file)
    improved = analyze_file(improved_file)

    improvement = improved['diversity_score'] - baseline['diversity_score']
    improvement_pct = (improvement / baseline['diversity_score'] * 100) if baseline['diversity_score'] > 0 else 0

    return {
        'baseline': baseline,
        'improved': improved,
        'improvement': round(improvement, 1),
        'improvement_pct': round(improvement_pct, 1)
    }


def print_report(result: Dict):
    """Pretty-print a diversity analysis report."""
    print("\n" + "="*60)
    print("SEMANTIC DIVERSITY ANALYSIS")
    print("="*60)

    if 'error' in result:
        print(f"\n❌ Error: {result['error']}")
        print(f"Concepts found: {result['num_concepts']}")
        return

    print(f"\n📊 Diversity Score: {result['diversity_score']}/10")
    print(f"   Concepts analyzed: {result['num_concepts']}")
    print(f"   Pairwise comparisons: {result['total_pairs']}")
    print(f"\n📏 Distance Metrics:")
    print(f"   Average: {result['avg_distance']}")
    print(f"   Std Dev: {result['std_distance']}")
    print(f"   Range: [{result['min_distance']}, {result['max_distance']}]")

    print(f"\n🔍 Sample Concepts:")
    for i, concept in enumerate(result['concepts'][:5], 1):
        preview = concept[:80] + "..." if len(concept) > 80 else concept
        print(f"   {i}. {preview}")

    print("\n" + "="*60 + "\n")


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python semantic_diversity.py <response_file.md>")
        print("   or: python semantic_diversity.py <baseline.md> <improved.md>")
        sys.exit(1)

    if len(sys.argv) == 2:
        # Single file analysis
        result = analyze_file(sys.argv[1])
        print_report(result)

    elif len(sys.argv) == 3:
        # Comparison mode
        comparison = compare_responses(sys.argv[1], sys.argv[2])

        print("\n" + "="*60)
        print("SEMANTIC DIVERSITY COMPARISON")
        print("="*60)

        print("\n📋 BASELINE:")
        print(f"   Score: {comparison['baseline']['diversity_score']}/10")
        print(f"   Concepts: {comparison['baseline']['num_concepts']}")
        print(f"   Avg Distance: {comparison['baseline']['avg_distance']}")

        print("\n✨ IMPROVED:")
        print(f"   Score: {comparison['improved']['diversity_score']}/10")
        print(f"   Concepts: {comparison['improved']['num_concepts']}")
        print(f"   Avg Distance: {comparison['improved']['avg_distance']}")

        print("\n📈 IMPROVEMENT:")
        print(f"   Absolute: +{comparison['improvement']}")
        print(f"   Relative: +{comparison['improvement_pct']}%")

        print("\n" + "="*60 + "\n")
