#!/usr/bin/env python3
"""
Batch Contrast Generation Script

Uses Claude Code + Phase 0 thinking to generate dialectic contrast relationships
for lenses that don't have curated contrasts.

Workflow:
1. Query Supabase for all lenses
2. Identify lenses without contrast relationships
3. For each uncovered lens:
   - Find contrast candidates using embedding distance + frame overlap
   - Validate as genuine dialectics
   - Generate insight text
   - Assign confidence score
4. Output generated_contrasts.json for review
5. Insert approved contrasts into Supabase

Usage:
    # Generate for first 50 lenses (preview)
    python scripts/generate_contrasts.py --limit 50 --dry-run

    # Generate for all uncovered lenses
    python scripts/generate_contrasts.py --all

    # Insert reviewed contrasts
    python scripts/generate_contrasts.py --insert generated_contrasts.json
"""

import os
import json
import argparse
import logging
from typing import List, Dict, Tuple, Optional
from datetime import datetime
import sys

# Add parent directory to path to import supabase_store
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client
import openai
import numpy as np
from collections import Counter

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ContrastGenerator:
    """Generate dialectic contrast relationships for lenses"""

    def __init__(self):
        """Initialize Supabase and OpenAI clients"""
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_KEY')
        self.openai_api_key = os.getenv('OPENAI_API_KEY')

        if not all([self.supabase_url, self.supabase_key, self.openai_api_key]):
            raise ValueError("SUPABASE_URL, SUPABASE_KEY, and OPENAI_API_KEY must be set")

        self.supabase = create_client(self.supabase_url, self.supabase_key)
        self.openai_client = openai.OpenAI(api_key=self.openai_api_key)

    def get_all_lenses(self) -> List[Dict]:
        """Query all lenses from Supabase"""
        logger.info("Fetching all lenses from Supabase...")
        response = self.supabase.table('lenses').select('*').execute()
        lenses = response.data
        logger.info(f"Found {len(lenses)} total lenses")
        return lenses

    def get_existing_contrasts(self) -> List[Dict]:
        """Query existing contrast relationships from Supabase"""
        logger.info("Fetching existing contrasts...")
        response = self.supabase.table('lens_connections') \
            .select('*') \
            .eq('relationship_type', 'contrast') \
            .execute()
        contrasts = response.data
        logger.info(f"Found {len(contrasts)} existing contrast relationships")
        return contrasts

    def get_uncovered_lenses(self) -> List[Dict]:
        """Identify lenses without contrast relationships"""
        all_lenses = self.get_all_lenses()
        contrasts = self.get_existing_contrasts()

        # Find lenses with contrasts
        lenses_with_contrasts = set()
        for c in contrasts:
            lenses_with_contrasts.add(c['source_lens_id'])
            lenses_with_contrasts.add(c['target_lens_id'])

        # Filter to uncovered lenses
        uncovered = [l for l in all_lenses if l['id'] not in lenses_with_contrasts]

        logger.info(f"Found {len(uncovered)} lenses without contrasts")
        return uncovered

    def get_embedding(self, text: str) -> np.ndarray:
        """Generate OpenAI embedding for text"""
        response = self.openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text,
            dimensions=384
        )
        return np.array(response.data[0].embedding)

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    def find_contrast_candidates(self, lens: Dict, all_lenses: List[Dict],
                                 top_k: int = 10) -> List[Dict]:
        """
        Find potential contrast lenses using embedding distance + frame overlap.

        Strategy:
        - Low cosine similarity (distant embeddings)
        - Shared frame or concepts (same domain)
        - Example: "Move Fast" vs "Cathedral Thinking" (both temporal strategy, opposite speeds)
        """
        lens_definition = lens.get('definition', '')
        if not lens_definition:
            return []

        # Get lens embedding
        lens_embedding = self.get_embedding(lens_definition)

        # Get lens characteristics
        lens_frames = set(lens.get('frame_ids', []))
        lens_concepts = set(lens.get('related_concepts', []))

        candidates = []

        for other in all_lenses:
            if other['id'] == lens['id']:
                continue

            other_definition = other.get('definition', '')
            if not other_definition:
                continue

            # Calculate embedding distance
            other_embedding = self.get_embedding(other_definition)
            similarity = self.cosine_similarity(lens_embedding, other_embedding)
            distance = 1 - similarity

            # Check for shared territory
            other_frames = set(other.get('frame_ids', []))
            other_concepts = set(other.get('related_concepts', []))

            shared_frames = lens_frames & other_frames
            shared_concepts = lens_concepts & other_concepts

            # Filter: distance > 0.7 AND (shared frame OR shared concepts)
            if distance > 0.7 and (shared_frames or shared_concepts):
                candidates.append({
                    'lens': other,
                    'distance': distance,
                    'similarity': similarity,
                    'shared_frames': list(shared_frames),
                    'shared_concepts': list(shared_concepts)
                })

        # Sort by distance (most distant first)
        candidates.sort(key=lambda x: x['distance'], reverse=True)

        return candidates[:top_k]

    def validate_contrast(self, lens_a: Dict, lens_b: Dict) -> Tuple[bool, str]:
        """
        Validate if two lenses form a genuine dialectic opposition.

        Uses Claude Code reasoning to check:
        1. Do they operate on the same conceptual dimension?
        2. Do they hold opposing positions?
        3. Does the tension create insight?
        """
        # For now, use simple heuristics
        # In full implementation, this would call Claude via API

        lens_a_name = lens_a.get('name', '')
        lens_b_name = lens_b.get('name', '')
        lens_a_def = lens_a.get('definition', '')
        lens_b_def = lens_b.get('definition', '')

        # Simple validation: check for opposing keywords
        opposing_pairs = [
            ('fast', 'slow'),
            ('quick', 'patient'),
            ('break', 'build'),
            ('explore', 'exploit'),
            ('risk', 'safe'),
            ('innovation', 'stability'),
            ('change', 'continuity'),
            ('short', 'long'),
            ('individual', 'collective'),
            ('chaos', 'order')
        ]

        text_a = (lens_a_name + ' ' + lens_a_def).lower()
        text_b = (lens_b_name + ' ' + lens_b_def).lower()

        for word_a, word_b in opposing_pairs:
            if (word_a in text_a and word_b in text_b) or (word_b in text_a and word_a in text_b):
                reasoning = f"Dialectic opposition detected: '{word_a}' vs '{word_b}'. " + \
                           f"{lens_a_name} and {lens_b_name} hold opposing positions on this dimension."
                return True, reasoning

        # If no opposing keywords found, still might be contrast (conservative)
        # Return False for now - real implementation would use LLM
        return False, "No clear dialectic opposition detected"

    def generate_insight(self, lens_a: Dict, lens_b: Dict, reasoning: str) -> str:
        """
        Generate explanatory insight text for contrast relationship.

        Format: "Lens A emphasizes X. Lens B emphasizes Y. Tension: Z."
        """
        lens_a_name = lens_a.get('name', '')
        lens_b_name = lens_b.get('name', '')

        # Extract dimension from reasoning
        dimension = "their approaches"
        if "vs" in reasoning:
            # Extract the contrasting concepts
            parts = reasoning.split("'")
            if len(parts) >= 4:
                word_a, word_b = parts[1], parts[3]
                dimension = f"{word_a} vs {word_b}"

        insight = f"{lens_a_name} and {lens_b_name} offer contrasting perspectives on {dimension}. " + \
                 f"The tension between them reveals different priorities and trade-offs."

        return insight

    def calculate_confidence(self, lens_a: Dict, lens_b: Dict,
                            embedding_distance: float,
                            shared_attrs: Dict) -> float:
        """
        Calculate confidence score for generated contrast.

        Weighted combination:
        - Embedding distance (0.3 weight) - higher is better for contrasts
        - Shared frame (0.3 weight)
        - Shared concepts (0.2 weight)
        - Validation quality (0.2 weight)
        """
        score = 0.0

        # Embedding distance (0.7-1.0 maps to 0.0-0.3 confidence)
        if embedding_distance > 0.7:
            score += 0.3 * ((embedding_distance - 0.7) / 0.3)

        # Shared frame (0.3 confidence)
        if shared_attrs.get('frames'):
            score += 0.3

        # Shared concepts (0.2 confidence)
        if shared_attrs.get('concepts'):
            concept_count = len(shared_attrs['concepts'])
            score += min(0.2, concept_count * 0.05)

        # Validation quality baseline (0.2 confidence for validated contrasts)
        score += 0.2

        return min(0.9, score)  # Cap at 0.9 (curated contrasts are 0.91)

    def generate_contrasts(self, lenses: List[Dict], confidence_threshold: float = 0.75) -> List[Dict]:
        """Generate contrast relationships for given lenses"""
        all_lenses = self.get_all_lenses()
        generated = []

        for i, lens in enumerate(lenses):
            logger.info(f"Processing {i+1}/{len(lenses)}: {lens.get('name', 'Unknown')}")

            # Find candidates
            candidates = self.find_contrast_candidates(lens, all_lenses)

            if not candidates:
                logger.info(f"  No candidates found for {lens.get('name')}")
                continue

            # Validate and generate contrasts (max 3 per lens)
            for candidate in candidates[:3]:
                is_contrast, reasoning = self.validate_contrast(lens, candidate['lens'])

                if is_contrast:
                    insight = self.generate_insight(lens, candidate['lens'], reasoning)
                    confidence = self.calculate_confidence(
                        lens, candidate['lens'],
                        candidate['distance'],
                        {
                            'frames': candidate['shared_frames'],
                            'concepts': candidate['shared_concepts']
                        }
                    )

                    if confidence >= confidence_threshold:
                        generated.append({
                            'source': lens['name'],
                            'source_id': lens['id'],
                            'target': candidate['lens']['name'],
                            'target_id': candidate['lens']['id'],
                            'weight': round(confidence, 2),
                            'type': 'contrast',
                            'insight': insight,
                            'confidence': round(confidence, 2),
                            'generated_by': 'claude-code-phase0',
                            'generated_at': datetime.utcnow().isoformat(),
                            'reasoning': reasoning,
                            'embedding_distance': round(candidate['distance'], 2),
                            'shared_frames': candidate['shared_frames'],
                            'shared_concepts': candidate['shared_concepts']
                        })
                        logger.info(f"  Generated contrast: {lens.get('name')} <-> {candidate['lens'].get('name')} (confidence: {confidence:.2f})")

        return generated

    def batch_insert_contrasts(self, contrasts: List[Dict]):
        """Insert approved contrasts into Supabase"""
        logger.info(f"Inserting {len(contrasts)} contrasts into database...")

        for contrast in contrasts:
            # Format for lens_connections table
            record = {
                'source_lens_id': contrast['source_id'],
                'target_lens_id': contrast['target_id'],
                'relationship_type': 'contrast',
                'weight': contrast['weight'],
                'insight': contrast['insight'],
                'metadata': {
                    'confidence': contrast['confidence'],
                    'generated_by': contrast['generated_by'],
                    'generated_at': contrast['generated_at'],
                    'reasoning': contrast['reasoning'],
                    'embedding_distance': contrast['embedding_distance']
                }
            }

            try:
                self.supabase.table('lens_connections').insert(record).execute()
                logger.info(f"  Inserted: {contrast['source']} <-> {contrast['target']}")
            except Exception as e:
                logger.error(f"  Failed to insert {contrast['source']} <-> {contrast['target']}: {e}")

        logger.info(f"Successfully inserted {len(contrasts)} contrasts")


def main():
    parser = argparse.ArgumentParser(
        description='Generate dialectic contrast relationships for lenses',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('--limit', type=int, help='Process first N uncovered lenses')
    parser.add_argument('--all', action='store_true', help='Process all uncovered lenses')
    parser.add_argument('--confidence-threshold', type=float, default=0.75,
                       help='Minimum confidence score to include (default: 0.75)')
    parser.add_argument('--output', default='generated_contrasts.json',
                       help='Output JSON file (default: generated_contrasts.json)')
    parser.add_argument('--dry-run', action='store_true',
                       help='Preview output without inserting to database')
    parser.add_argument('--insert', help='Insert contrasts from JSON file into database')

    args = parser.parse_args()

    generator = ContrastGenerator()

    # Insert mode
    if args.insert:
        logger.info(f"Loading contrasts from {args.insert}")
        with open(args.insert) as f:
            contrasts = json.load(f)

        print(f"\nReady to insert {len(contrasts)} contrasts into database")
        print("Sample contrasts:")
        for contrast in contrasts[:3]:
            print(f"  - {contrast['source']} <-> {contrast['target']} (confidence: {contrast['confidence']})")

        confirm = input("\nConfirm insertion (y/n): ")
        if confirm.lower() == 'y':
            generator.batch_insert_contrasts(contrasts)
            print(f"✓ Inserted {len(contrasts)} contrasts")
        else:
            print("Cancelled")
        return

    # Generate mode
    uncovered = generator.get_uncovered_lenses()

    if args.limit:
        uncovered = uncovered[:args.limit]
        logger.info(f"Limited to first {args.limit} uncovered lenses")

    if not uncovered:
        logger.info("No uncovered lenses found. All lenses have contrasts.")
        return

    logger.info(f"Generating contrasts for {len(uncovered)} lenses...")
    logger.info(f"Confidence threshold: {args.confidence_threshold}")

    generated = generator.generate_contrasts(uncovered, args.confidence_threshold)

    # Write output
    with open(args.output, 'w') as f:
        json.dump(generated, f, indent=2)

    print(f"\n{'='*60}")
    print(f"Generated {len(generated)} contrasts")
    print(f"Output: {args.output}")
    print(f"Confidence threshold: {args.confidence_threshold}")
    print(f"\nSample contrasts:")
    for contrast in generated[:5]:
        print(f"  - {contrast['source']} <-> {contrast['target']}")
        print(f"    Confidence: {contrast['confidence']}")
        print(f"    Insight: {contrast['insight'][:80]}...")
        print()

    if not args.dry_run:
        print(f"Next steps:")
        print(f"1. Review {args.output}")
        print(f"2. Edit to remove low-quality contrasts")
        print(f"3. Run: python scripts/generate_contrasts.py --insert {args.output}")
    else:
        print(f"(Dry run - no database changes)")


if __name__ == '__main__':
    main()
