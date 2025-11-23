#!/usr/bin/env python3
"""
Simple Contrast Generation Using Linsenkasten API

Uses the public linsenkasten API to fetch lenses and generates contrast candidates
that Claude Code (the user) can review and evaluate.

This version doesn't require credentials - just uses the public API.
"""

import requests
import json
import argparse
from typing import List, Dict

API_BASE = "https://lens-api.up.railway.app/api/v1"

def get_all_lenses() -> List[Dict]:
    """Fetch all lenses from public API"""
    response = requests.get(f"{API_BASE}/lenses")
    data = response.json()

    if not data.get('success'):
        raise Exception(f"API error: {data.get('error')}")

    # API returns lenses in 'lenses' field
    return data.get('lenses', [])

def get_contrasts_for_lens(lens_name: str) -> List[Dict]:
    """Get existing contrasts for a lens"""
    try:
        response = requests.get(f"{API_BASE}/creative/contrasts", params={'lens': lens_name}, timeout=10)
        data = response.json()

        if not data.get('success'):
            return []

        contrasts = data.get('contrasts', [])
        return contrasts if contrasts else []
    except Exception as e:
        print(f"  Error checking {lens_name}: {e}")
        return []

def main():
    parser = argparse.ArgumentParser(description='Generate contrast candidate list using public API')
    parser.add_argument('--output', default='contrast_candidates.json', help='Output file')
    args = parser.parse_args()

    print("Fetching all lenses from API...")
    lenses = get_all_lenses()
    print(f"Found {len(lenses)} lenses")

    print("\nChecking which lenses have contrasts...")
    uncovered = []

    for i, lens in enumerate(lenses):
        lens_name = lens.get('lens_name') or lens.get('name')  # Try both fields
        if not lens_name:
            continue

        if (i + 1) % 10 == 0:
            print(f"  Checked {i + 1}/{len(lenses)} lenses...")

        contrasts = get_contrasts_for_lens(lens_name)

        # Check if contrasts list is empty
        if len(contrasts) == 0:
            uncovered.append({
                'id': lens.get('id'),
                'name': lens_name,
                'definition': lens.get('definition', ''),
                'frame_ids': lens.get('frame_ids', []),
                'related_concepts': lens.get('related_concepts', [])
            })

    print(f"\nFound {len(uncovered)} lenses without contrasts")

    # Write output
    output = {
        'total_lenses': len(lenses),
        'lenses_with_contrasts': len(lenses) - len(uncovered),
        'uncovered_count': len(uncovered),
        'uncovered_lenses': uncovered
    }

    with open(args.output, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nWrote {args.output}")
    print(f"\nSummary:")
    print(f"  Total lenses: {len(lenses)}")
    print(f"  With contrasts: {len(lenses) - len(uncovered)}")
    print(f"  Without contrasts: {len(uncovered)}")
    print(f"\nSample lenses without contrasts:")
    for lens in uncovered[:10]:
        print(f"  - {lens['name']}")

if __name__ == '__main__':
    main()
