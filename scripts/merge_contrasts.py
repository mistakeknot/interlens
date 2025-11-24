#!/usr/bin/env python3
"""
Merge approved contrast relationships into main connections file.

This script:
1. Reads new contrasts from review file
2. Loads existing connections
3. Appends new contrasts
4. Backs up original file
5. Writes updated connections
"""

import json
import logging
import sys
import shutil
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

CONNECTIONS_FILE = 'claude_lens_connections_analysis.json'


def merge_contrasts(new_contrasts_file: str):
    """Merge new contrasts into main connections file"""

    # Load new contrasts
    logger.info(f"Loading new contrasts from: {new_contrasts_file}")
    with open(new_contrasts_file, 'r') as f:
        new_data = json.load(f)

    new_contrasts = new_data.get('new_contrasts', [])
    logger.info(f"Found {len(new_contrasts)} new contrasts to merge")

    if len(new_contrasts) == 0:
        logger.warning("No contrasts to merge!")
        return 1

    # Load existing connections
    logger.info(f"Loading existing connections from: {CONNECTIONS_FILE}")
    with open(CONNECTIONS_FILE, 'r') as f:
        connections_data = json.load(f)

    existing_connections = connections_data.get('connections', [])
    logger.info(f"Found {len(existing_connections)} existing connections")

    # Count existing contrasts
    existing_contrasts = [c for c in existing_connections if c.get('type') == 'contrast']
    logger.info(f"  ({len(existing_contrasts)} are contrasts)")

    # Backup original file
    backup_file = f"{CONNECTIONS_FILE}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    logger.info(f"Creating backup: {backup_file}")
    shutil.copy2(CONNECTIONS_FILE, backup_file)

    # Merge new contrasts
    for contrast in new_contrasts:
        # Clean up metadata before adding (optional - keeps file cleaner)
        if 'metadata' in contrast:
            del contrast['metadata']

        existing_connections.append(contrast)

    # Update connections data
    connections_data['connections'] = existing_connections

    # Update metadata
    if 'metadata' not in connections_data:
        connections_data['metadata'] = {}

    connections_data['metadata']['last_updated'] = datetime.now().isoformat()
    connections_data['metadata']['total_connections'] = len(existing_connections)
    connections_data['metadata']['contrast_count'] = len(existing_contrasts) + len(new_contrasts)

    # Write updated connections
    logger.info(f"Writing updated connections to: {CONNECTIONS_FILE}")
    with open(CONNECTIONS_FILE, 'w') as f:
        json.dump(connections_data, f, indent=2)

    # Summary
    new_total = len(existing_connections)
    new_contrast_count = len(existing_contrasts) + len(new_contrasts)

    logger.info(f"\n✅ Successfully merged {len(new_contrasts)} new contrasts")
    logger.info(f"📊 Total connections: {len(existing_connections)} → {new_total}")
    logger.info(f"🔄 Total contrasts: {len(existing_contrasts)} → {new_contrast_count}")
    logger.info(f"💾 Backup saved: {backup_file}")
    logger.info(f"\n🚀 Next step: Restart API to load new contrasts into graph")

    return 0


def main():
    if len(sys.argv) < 2:
        print("Usage: python merge_contrasts.py <new_contrasts_file>")
        print("Example: python merge_contrasts.py new_contrasts.json")
        return 1

    new_contrasts_file = sys.argv[1]

    try:
        return merge_contrasts(new_contrasts_file)
    except Exception as e:
        logger.error(f"Failed to merge contrasts: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    exit(main())
