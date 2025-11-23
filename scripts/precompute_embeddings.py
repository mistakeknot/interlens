#!/usr/bin/env python3
"""
Pre-compute OpenAI embeddings for all lenses.

This script:
1. Fetches all lenses from Supabase
2. Generates OpenAI text-embedding-3-small (384-dim) embeddings
3. Updates Supabase with the embeddings

Run this ONCE to embed all lenses, then users get free search via sentence-transformers!

Usage:
    python scripts/precompute_embeddings.py
    python scripts/precompute_embeddings.py --limit 10  # Test with 10 lenses first
"""

import os
import sys
import argparse
from typing import List, Dict
import time

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_store import SupabaseLensStore

def precompute_embeddings(limit: int = None, dry_run: bool = False):
    """Pre-compute embeddings for all lenses."""

    # Check for OpenAI API key
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ OPENAI_API_KEY not set. Cannot generate embeddings.")
        print("Set it with: export OPENAI_API_KEY='your-key-here'")
        sys.exit(1)

    print("🔧 Initializing Supabase connection...")
    store = SupabaseLensStore()

    print("📦 Fetching all lenses...")
    # Fetch all lenses
    result = store.client.table('lenses').select('id, name, definition, lens_type').execute()
    lenses = result.data

    if limit:
        lenses = lenses[:limit]
        print(f"ℹ️  Limited to {limit} lenses for testing")

    print(f"📊 Found {len(lenses)} lenses")

    if dry_run:
        print("\n🏃 DRY RUN - No changes will be made")
        print("\nSample lenses to be embedded:")
        for lens in lenses[:5]:
            print(f"  - {lens['name']}")
        return

    # Generate embeddings
    updated = 0
    errors = 0

    print("\n🚀 Generating OpenAI embeddings...")
    for i, lens in enumerate(lenses):
        try:
            # Create text for embedding
            text = f"{lens['name']}: {lens.get('definition', '')}"

            # Generate embedding using OpenAI
            embedding = store.generate_embedding_openai(text)

            # Update lens in Supabase
            store.client.table('lenses').update({
                'embedding': embedding
            }).eq('id', lens['id']).execute()

            updated += 1

            # Progress indicator
            if (i + 1) % 10 == 0:
                print(f"  ✅ Processed {i + 1}/{len(lenses)} lenses...")

            # Rate limiting (OpenAI: ~3000 requests/min)
            time.sleep(0.02)  # 50 requests/second = well under limit

        except Exception as e:
            errors += 1
            print(f"  ❌ Error embedding '{lens['name']}': {e}")
            continue

    print(f"\n✨ Complete!")
    print(f"  ✅ Successfully embedded: {updated} lenses")
    print(f"  ❌ Errors: {errors}")

    if errors == 0:
        print(f"\n🎉 All lenses now have OpenAI embeddings!")
        print(f"💰 Users can now search for FREE using sentence-transformers")
        print(f"📝 Next: Deploy to Railway and search will work without OpenAI costs")

def main():
    parser = argparse.ArgumentParser(description='Pre-compute OpenAI embeddings for all lenses')
    parser.add_argument('--limit', type=int, help='Limit number of lenses (for testing)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    args = parser.parse_args()

    precompute_embeddings(limit=args.limit, dry_run=args.dry_run)

if __name__ == '__main__':
    main()
