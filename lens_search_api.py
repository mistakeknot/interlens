#!/usr/bin/env python3
"""
FLUX Lens Search API - RESTful API for lens exploration
Updated: 2025-11-21 - Added gap detection endpoints
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from supabase_store import SupabaseLensStore
from datetime import datetime, timedelta
import json
from typing import List, Dict, Optional
from collections import Counter
import numpy as np
# OpenAI import removed - embeddings handled by Supabase store
import hashlib
from functools import lru_cache
import time

load_dotenv()

# Global cache version - increment this when database changes
CACHE_VERSION = int(time.time())  # Initialize with current timestamp

def increment_cache_version():
    """Increment the cache version to invalidate client caches"""
    global CACHE_VERSION
    CACHE_VERSION = int(time.time())
    return CACHE_VERSION

# Simple in-memory cache with TTL
class QueryCache:
    def __init__(self, ttl_seconds=3600):  # 1 hour default
        self.cache = {}
        self.ttl = ttl_seconds
    
    def _make_key(self, endpoint, params):
        """Create a cache key from endpoint and parameters"""
        # Sort params for consistent keys
        sorted_params = sorted(params.items()) if params else []
        key_str = f"{endpoint}:{sorted_params}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, endpoint, params):
        """Get cached result if valid"""
        key = self._make_key(endpoint, params)
        if key in self.cache:
            result, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return result
            else:
                # Expired, remove it
                del self.cache[key]
        return None
    
    def set(self, endpoint, params, result):
        """Cache a result"""
        key = self._make_key(endpoint, params)
        self.cache[key] = (result, time.time())
    
    def clear(self):
        """Clear all cache"""
        self.cache.clear()
    
    def stats(self):
        """Get cache statistics"""
        total = len(self.cache)
        expired = sum(1 for _, (_, ts) in self.cache.items() 
                     if time.time() - ts >= self.ttl)
        return {
            'total_entries': total,
            'active_entries': total - expired,
            'expired_entries': expired
        }

# Initialize cache with 1 hour TTL
query_cache = QueryCache(ttl_seconds=3600)

app = Flask(__name__)
# Configure CORS to allow requests from your domains
CORS(app, origins=[
    "http://localhost:3000",
    "http://localhost:3001", 
    "https://linsenkasten.com",  # Your main domain
    "https://www.linsenkasten.com",  # www subdomain
    "http://linsenkasten.com",  # HTTP version
    "http://www.linsenkasten.com",  # HTTP www
    "https://linsenkasten.vercel.app",  # Your Vercel app
    "https://linsenkasten-*.vercel.app",  # Vercel preview deployments
    "https://*.vercel.app",  # Allow all Vercel deployments
    "https://*.netlify.app",  # Allow Netlify deployments
    "https://*.surge.sh",  # Allow Surge deployments
    "https://*.github.io",  # Allow GitHub Pages
    "https://*.railway.app",  # Allow Railway deployments
    "https://*.up.railway.app"  # Allow Railway preview deployments
])

# Initialize Supabase store
supabase_store = SupabaseLensStore()

# Load AI-discovered connections if available
AI_CONNECTIONS = []
try:
    with open('claude_lens_connections_analysis.json', 'r') as f:
        data = json.load(f)
        AI_CONNECTIONS = data.get('connections', [])
        print(f"Loaded {len(AI_CONNECTIONS)} AI connections")
except Exception as e:
    print(f"Failed to load AI connections: {e}")

# Load thematic frames
FRAMES = []
LENS_TO_FRAMES = {}  # Map of lens_id to list of frame_ids
try:
    with open('lens_frames_thematic.json', 'r') as f:
        data = json.load(f)
        FRAMES = data.get('frames', [])
        # Build reverse mapping
        for frame in FRAMES:
            for lens_id in frame.get('lens_ids', []):
                if lens_id not in LENS_TO_FRAMES:
                    LENS_TO_FRAMES[lens_id] = []
                LENS_TO_FRAMES[lens_id].append(frame['id'])
        print(f"Loaded {len(FRAMES)} thematic frames")
except Exception as e:
    print(f"Failed to load frames: {e}")


# ============================================================================
# Gap Detection Helper Functions
# ============================================================================

def get_frame_name_from_id(frame_id: str) -> str:
    """Convert frame_id to human-readable frame name."""
    for frame in FRAMES:
        if frame['id'] == frame_id:
            return frame.get('name', frame_id)
    return frame_id  # Fallback to ID if name not found


def get_all_frame_names() -> List[str]:
    """Get list of all frame names."""
    return [frame.get('name', frame['id']) for frame in FRAMES]


def calculate_frame_coverage(context_lens_names: List[str]) -> Dict:
    """
    Analyze which frames have been explored vs. unexplored.

    Args:
        context_lens_names: List of recently explored lens names

    Returns:
        Dictionary with explored/unexplored/underexplored frame lists (using frame names)
    """
    try:
        # Get all available frame names from loaded FRAMES
        all_frame_names = get_all_frame_names()

        # Get frame_ids for context lenses from Supabase + LENS_TO_FRAMES mapping
        # Note: frame_ids is not in Supabase, comes from lens_frames_thematic.json
        lens_frame_map = supabase_store.get_frame_ids_for_lenses(context_lens_names, LENS_TO_FRAMES)

        # Count frame usage (converting frame_ids to names)
        explored_frames = {}
        for lens, frame_ids in lens_frame_map.items():
            for frame_id in frame_ids:
                frame_name = get_frame_name_from_id(frame_id)
                explored_frames[frame_name] = explored_frames.get(frame_name, 0) + 1

        # Categorize frames
        unexplored = [f for f in all_frame_names if f not in explored_frames]
        underexplored = [f for f, count in explored_frames.items() if count == 1]

        return {
            'explored': explored_frames,
            'unexplored': unexplored,
            'underexplored': underexplored,
            'total_frames': len(all_frame_names)
        }
    except Exception as e:
        print(f"Error calculating frame coverage: {e}")
        import traceback
        traceback.print_exc()
        return {
            'explored': {},
            'unexplored': [],
            'underexplored': [],
            'total_frames': 0
        }


def bias_lens_selection(all_lenses: List[Dict], coverage_data: Dict) -> Optional[Dict]:
    """
    Apply 80/15/5 weighted random selection toward gaps.

    Args:
        all_lenses: Full lens catalog
        coverage_data: Output from calculate_frame_coverage()

    Returns:
        Selected lens dictionary, or None if no lenses available
    """
    import random

    if not all_lenses:
        return None

    # Categorize lenses by frame coverage (convert frame_ids to names for comparison)
    unexplored_lenses = []
    underexplored_lenses = []

    for lens in all_lenses:
        lens_frame_ids = lens.get('frame_ids', [])
        # Handle frame_ids as string or list
        if isinstance(lens_frame_ids, str):
            lens_frame_ids = [lens_frame_ids]
        elif not isinstance(lens_frame_ids, list):
            lens_frame_ids = []

        # Convert frame_ids to frame_names
        lens_frame_names = [get_frame_name_from_id(fid) for fid in lens_frame_ids]

        # Check if lens belongs to unexplored or underexplored frames
        if any(f in coverage_data['unexplored'] for f in lens_frame_names):
            unexplored_lenses.append(lens)
        elif any(f in coverage_data['underexplored'] for f in lens_frame_names):
            underexplored_lenses.append(lens)

    # Apply weighted random selection (80/15/5)
    rand = random.random()

    if rand < 0.80 and unexplored_lenses:
        return random.choice(unexplored_lenses)
    elif rand < 0.95 and underexplored_lenses:
        return random.choice(underexplored_lenses)
    else:
        return random.choice(all_lenses)


def generate_gap_report(coverage_data: Dict, selected_lens: Dict) -> Dict:
    """
    Format gap analysis for API response.

    Args:
        coverage_data: Output from calculate_frame_coverage()
        selected_lens: The lens that was selected

    Returns:
        Gap analysis dictionary for response
    """
    # Get frame_ids of selected lens and convert to names
    lens_frame_ids = selected_lens.get('frame_ids', [])
    if isinstance(lens_frame_ids, str):
        lens_frame_ids = [lens_frame_ids]
    elif not isinstance(lens_frame_ids, list):
        lens_frame_ids = []

    lens_frame_names = [get_frame_name_from_id(fid) for fid in lens_frame_ids]
    lens_frame = lens_frame_names[0] if lens_frame_names else 'Unknown'

    # Determine if suggestion was gap-biased
    was_gap_biased = lens_frame in coverage_data['unexplored']

    return {
        'explored_frames': list(coverage_data['explored'].keys()),
        'unexplored_count': len(coverage_data['unexplored']),
        'suggested_from_frame': lens_frame,
        'was_gap_biased': was_gap_biased,
        'coverage': {
            'explored': len(coverage_data['explored']),
            'unexplored': len(coverage_data['unexplored']),
            'total': coverage_data['total_frames']
        }
    }


# ============================================================================
# API Routes
# ============================================================================

@app.route('/api/v1/lenses', methods=['GET'])
def get_lenses():
    """Get all lenses with optional filtering"""
    lens_type = request.args.get('type')  # headline, weekly, or all
    episode = request.args.get('episode')
    frame_id = request.args.get('frame')  # filter by frame
    limit = int(request.args.get('limit', 500))
    
    # Try cache first
    cache_params = {
        'lens_type': lens_type,
        'episode': episode,
        'frame_id': frame_id,
        'limit': limit
    }
    cached_result = query_cache.get('get_lenses', cache_params)
    if cached_result:
        return jsonify(cached_result)
    
    # Get all lenses from Supabase with limit
    all_lenses = supabase_store.get_all_lenses(limit=limit)
    
    # Apply filters
    filtered_lenses = []
    for lens in all_lenses:
        # Filter by lens type
        if lens_type and lens_type != 'all' and lens.get('lens_type') != lens_type:
            continue
        # Filter by episode
        if episode and str(lens.get('episode')) != str(episode):
            continue
        # Filter by frame
        if frame_id:
            frame = next((f for f in FRAMES if f['id'] == frame_id), None)
            if frame and lens['id'] not in frame.get('lens_ids', []):
                continue
        filtered_lenses.append(lens)
    
    lenses = []
    lens_connections = {}
    
    # Build connection map from AI discoveries
    for conn in AI_CONNECTIONS:
        if conn['source_id'] not in lens_connections:
            lens_connections[conn['source_id']] = []
        if conn['target_id'] not in lens_connections:
            lens_connections[conn['target_id']] = []
        
        lens_connections[conn['source_id']].append({
            'target_id': conn['target_id'],
            'target_name': conn.get('target_name', ''),
            'type': conn['type'],
            'weight': conn['weight'],
            'insight': conn['insight']
        })
        lens_connections[conn['target_id']].append({
            'target_id': conn['source_id'],
            'target_name': conn.get('source_name', ''),
            'type': conn['type'],
            'weight': conn['weight'],
            'insight': conn['insight']
        })
    
    for lens in filtered_lenses:
        lenses.append({
            'id': lens['id'],
            'episode': lens.get('episode'),
            'lens_type': lens.get('lens_type'),
            'lens_name': lens.get('name'),  # Note: 'name' not 'lens_name' in Supabase
            'definition': lens.get('definition'),
            'examples': lens.get('examples', []),
            'related_concepts': lens.get('related_concepts', []),
            'source_url': lens.get('source_url'),
            'extracted_at': lens.get('extracted_at'),
            'ai_connections': lens_connections.get(lens['id'], []),
            'frame_ids': LENS_TO_FRAMES.get(lens['id'], [])
        })
    
    # Sort by episode
    lenses.sort(key=lambda x: int(x['episode']) if x['episode'] else 0)
    
    result = {
        'success': True,
        'count': len(lenses),
        'lenses': lenses
    }
    
    # Cache the result
    query_cache.set('get_lenses', cache_params, result)
    
    return jsonify(result)

@app.route('/api/v1/lenses/search', methods=['GET'])
def search_lenses():
    """Search lenses by semantic similarity using embeddings"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({'success': False, 'error': 'Query parameter required'}), 400

    # Try cache first
    cache_params = {'query': query}
    cached_result = query_cache.get('search_lenses', cache_params)
    if cached_result:
        return jsonify(cached_result)

    # Use semantic search with embeddings (returns results sorted by similarity)
    search_results = supabase_store.search_lenses(query, k=20)

    # Format results for consistent API response
    formatted_results = []
    for lens in search_results:
        formatted_results.append({
            'id': lens['id'],
            'episode': lens.get('episode'),
            'lens_type': lens.get('lens_type'),
            'lens_name': lens.get('name'),
            'definition': lens.get('definition'),
            'examples': lens.get('examples', []),
            'related_concepts': lens.get('related_concepts', []),
            'similarity': lens.get('similarity', 0),
            'relevance_score': lens.get('similarity', 0) * 10  # Scale for backwards compatibility
        })

    result = {
        'success': True,
        'query': query,
        'count': len(formatted_results),
        'results': formatted_results,
        'search_type': 'semantic'
    }
    
    # Cache the result
    query_cache.set('search_lenses', cache_params, result)
    
    return jsonify(result)

@app.route('/api/v1/lenses/stats', methods=['GET'])
def get_statistics():
    """Get lens statistics"""
    # Try cache first (stats don't change often)
    cached_result = query_cache.get('get_statistics', {})
    if cached_result:
        return jsonify(cached_result)
    
    # Get statistics from Supabase
    stats = supabase_store.get_stats()
    all_lenses = supabase_store.get_all_lenses(limit=500)
    
    # Calculate detailed statistics
    total_lenses = len(all_lenses)
    headline_count = sum(1 for lens in all_lenses if lens.get('lens_type') == 'headline')
    weekly_count = sum(1 for lens in all_lenses if lens.get('lens_type') == 'weekly')
    
    # Episode coverage
    episodes = set()
    episode_types = {}
    for lens in all_lenses:
        ep = lens.get('episode')
        if ep:
            episodes.add(int(ep))
            if ep not in episode_types:
                episode_types[ep] = set()
            episode_types[ep].add(lens.get('lens_type'))
    
    episodes_with_both = sum(1 for types in episode_types.values() if len(types) == 2)
    
    # Concept frequency (now using consolidated tags)
    all_concepts = []
    for lens in all_lenses:
        all_concepts.extend(lens.get('related_concepts', []))
    
    concept_counts = Counter(all_concepts).most_common(20)
    
    result = {
        'success': True,
        'statistics': {
            'total_lenses': total_lenses,
            'headline_lenses': headline_count,
            'weekly_lenses': weekly_count,
            'total_episodes': 196,
            'episodes_with_lenses': len(episodes),
            'episode_coverage_percent': round(len(episodes) / 196 * 100, 1),
            'episodes_with_both_types': episodes_with_both,
            'top_concepts': [{'concept': c[0], 'count': c[1]} for c in concept_counts]
        }
    }
    
    # Cache the result (stats don't change often)
    query_cache.set('get_statistics', {}, result)
    
    return jsonify(result)

@app.route('/api/v1/lenses/episodes/<int:episode_num>', methods=['GET'])
def get_episode_lenses(episode_num):
    """Get all lenses from a specific episode"""
    results = index.query(
        vector=[0.0] * 384,
        top_k=10,
        include_metadata=True,
        filter={
            'type': 'lens',
            'episode': str(episode_num)
        }
    )
    
    if not results.matches:
        return jsonify({
            'success': True,
            'episode': episode_num,
            'lenses': []
        })
    
    lenses = []
    for match in results.matches:
        meta = match.metadata
        lenses.append({
            'id': match.id,
            'lens_type': meta.get('lens_type'),
            'lens_name': meta.get('lens_name'),
            'definition': meta.get('definition'),
            'examples': meta.get('examples', []),
            'related_concepts': meta.get('related_concepts', []),
            'source_url': meta.get('source_url'),
            'frame_ids': LENS_TO_FRAMES.get(match.id, [])
        })
    
    # Sort headline first, then weekly
    lenses.sort(key=lambda x: 0 if x['lens_type'] == 'headline' else 1)
    
    return jsonify({
        'success': True,
        'episode': episode_num,
        'count': len(lenses),
        'lenses': lenses
    })

@app.route('/api/v1/lenses/concepts', methods=['GET'])
def get_concepts():
    """Get all unique concepts with their frequencies"""
    # Try cache first
    cached_result = query_cache.get('get_concepts', {})
    if cached_result:
        return jsonify(cached_result)
    
    results = index.query(
        vector=[0.0] * 384,
        top_k=256,  # We only have ~256 lenses total
        include_metadata=True,
        filter={'type': 'lens'}
    )
    
    # Collect all concepts
    concept_lenses = {}
    for match in results.matches:
        meta = match.metadata
        for concept in meta.get('related_concepts', []):
            if concept not in concept_lenses:
                concept_lenses[concept] = []
            concept_lenses[concept].append({
                'episode': meta.get('episode'),
                'lens_name': meta.get('lens_name'),
                'lens_type': meta.get('lens_type')
            })
    
    # Format response
    concepts = []
    for concept, lenses in concept_lenses.items():
        concepts.append({
            'concept': concept,
            'frequency': len(lenses),
            'lenses': lenses
        })
    
    # Sort by frequency
    concepts.sort(key=lambda x: x['frequency'], reverse=True)
    
    result = {
        'success': True,
        'total_concepts': len(concepts),
        'concepts': concepts
    }
    
    # Cache the result
    query_cache.set('get_concepts', {}, result)
    
    return jsonify(result)

@app.route('/api/v1/lenses/timeline', methods=['GET'])
def get_timeline():
    """Get lens timeline data for visualization"""
    # Try cache first
    cached_result = query_cache.get('get_timeline', {})
    if cached_result:
        return jsonify(cached_result)
    
    results = index.query(
        vector=[0.0] * 384,
        top_k=256,  # We only have ~256 lenses total
        include_metadata=True,
        filter={'type': 'lens'}
    )
    
    # Organize by episode
    timeline = {}
    for match in results.matches:
        meta = match.metadata
        episode = meta.get('episode')
        if episode:
            if episode not in timeline:
                timeline[episode] = {
                    'episode': int(episode),
                    'headline': None,
                    'weekly': None
                }
            
            lens_type = meta.get('lens_type')
            if lens_type == 'headline':
                timeline[episode]['headline'] = meta.get('lens_name')
            elif lens_type == 'weekly':
                timeline[episode]['weekly'] = meta.get('lens_name')
    
    # Convert to list and sort
    timeline_list = list(timeline.values())
    timeline_list.sort(key=lambda x: x['episode'])
    
    result = {
        'success': True,
        'timeline': timeline_list
    }
    
    # Cache the result
    query_cache.set('get_timeline', {}, result)
    
    return jsonify(result)

@app.route('/api/v1/lenses/graph', methods=['GET'])
def get_graph_data():
    """Get graph data for force-directed visualization"""
    # Try cache first
    cached_result = query_cache.get('get_graph_data', {})
    if cached_result:
        return jsonify(cached_result)
    
    results = index.query(
        vector=[0.0] * 384,
        top_k=256,  # We only have ~256 lenses total
        include_metadata=True,
        filter={'type': 'lens'}
    )
    
    # Build nodes
    nodes = []
    lens_by_id = {}
    concept_map = {}  # Track which lenses share concepts
    
    for lens in all_lenses:
        node = {
            'id': lens['id'],
            'name': lens.get('name'),
            'type': lens.get('lens_type'),
            'episode': int(lens.get('episode', 0)),
            'definition': lens.get('definition'),
            'concepts': lens.get('related_concepts', [])
        }
        nodes.append(node)
        lens_by_id[lens['id']] = node
        
        # Track concept associations
        for concept in lens.get('related_concepts', []):
            if concept not in concept_map:
                concept_map[concept] = []
            concept_map[concept].append(lens['id'])
    
    # Build links based on relationships
    links = []
    processed_pairs = set()
    
    # Links based on shared concepts
    for concept, lens_ids in concept_map.items():
        if len(lens_ids) > 1:
            # Create links between all lenses sharing this concept
            for i, id1 in enumerate(lens_ids):
                for id2 in lens_ids[i+1:]:
                    pair = tuple(sorted([id1, id2]))
                    if pair not in processed_pairs:
                        processed_pairs.add(pair)
                        
                        # Calculate weight based on number of shared concepts
                        shared_concepts = set(lens_by_id[id1]['concepts']) & set(lens_by_id[id2]['concepts'])
                        weight = min(len(shared_concepts) * 0.2, 1.0)
                        
                        links.append({
                            'source': id1,
                            'target': id2,
                            'weight': weight,
                            'type': 'concept',
                            'shared_concepts': list(shared_concepts)
                        })
    
    # Links based on same episode
    episode_map = {}
    for node in nodes:
        ep = node['episode']
        if ep not in episode_map:
            episode_map[ep] = []
        episode_map[ep].append(node['id'])
    
    for episode, lens_ids in episode_map.items():
        if len(lens_ids) > 1:
            for i, id1 in enumerate(lens_ids):
                for id2 in lens_ids[i+1:]:
                    pair = tuple(sorted([id1, id2]))
                    if pair not in processed_pairs:
                        processed_pairs.add(pair)
                        links.append({
                            'source': id1,
                            'target': id2,
                            'weight': 0.5,
                            'type': 'episode',
                            'episode': episode
                        })
    
    # Links based on sequential episodes (weaker connection)
    for node in nodes:
        current_ep = node['episode']
        for other_node in nodes:
            if other_node['episode'] == current_ep + 1 or other_node['episode'] == current_ep - 1:
                pair = tuple(sorted([node['id'], other_node['id']]))
                if pair not in processed_pairs:
                    processed_pairs.add(pair)
                    links.append({
                        'source': node['id'],
                        'target': other_node['id'],
                        'weight': 0.1,
                        'type': 'sequential'
                    })
    
    # Calculate node sizes based on connection count
    connection_count = {}
    for link in links:
        connection_count[link['source']] = connection_count.get(link['source'], 0) + 1
        connection_count[link['target']] = connection_count.get(link['target'], 0) + 1
    
    for node in nodes:
        node['connectionCount'] = connection_count.get(node['id'], 0)
        node['radius'] = 5 + min(node['connectionCount'] * 2, 20)
    
    result = {
        'success': True,
        'nodes': nodes,
        'links': links,
        'stats': {
            'total_nodes': len(nodes),
            'total_links': len(links),
            'concept_links': len([l for l in links if l['type'] == 'concept']),
            'episode_links': len([l for l in links if l['type'] == 'episode']),
            'sequential_links': len([l for l in links if l['type'] == 'sequential'])
        }
    }
    
    # Cache the result
    query_cache.set('get_graph_data', {}, result)
    
    return jsonify(result)

@app.route('/api/v1/lenses/graph/semantic', methods=['GET'])
def get_semantic_graph():
    """Get semantic similarity graph based on embedding distances"""
    # Get parameters
    min_similarity = float(request.args.get('min_similarity', 0.5))
    max_nodes = int(request.args.get('max_nodes', 300))
    
    # Try cache first
    cache_params = {
        'min_similarity': min_similarity,
        'max_nodes': max_nodes
    }
    cached_result = query_cache.get('get_semantic_graph', cache_params)
    if cached_result:
        return jsonify(cached_result)
    
    # Get all lenses from Supabase
    all_lenses = supabase_store.get_all_lenses(limit=max_nodes)
    
    if not all_lenses:
        return jsonify({'success': False, 'error': 'No lenses found'}), 404
    
    # Build nodes
    nodes = []
    lens_ids = []
    
    for lens in all_lenses:
        node_id = lens['id']
        lens_ids.append(node_id)
        
        # Get frame IDs for this lens from the mapping
        lens_frame_ids = LENS_TO_FRAMES.get(node_id, [])
        
        nodes.append({
            'id': node_id,
            'name': lens.get('name'),
            'type': lens.get('lens_type'),
            'episode': lens.get('episode'),
            'definition': lens.get('definition', '')[:100] + '...' if lens.get('definition') else '',
            'concepts': lens.get('related_concepts', [])[:3],  # Show top 3 concepts
            'frame_ids': lens_frame_ids  # Include frame IDs from mapping
        })
    
    # For semantic similarity, we need to use vector search
    # This is a simplified approach - getting related lenses for each lens
    
    # Calculate semantic similarities using related lenses
    links = []
    processed_pairs = set()
    
    # For each lens, get related lenses (which gives us semantic similarity)
    for node in nodes[:100]:  # Limit to prevent too many API calls
        id1 = node['id']
        
        # Get related lenses based on tags (semantic similarity)
        related = supabase_store.get_related_lenses(id1, k=10)
        
        for i, related_lens in enumerate(related):
            id2 = related_lens['id']
            pair = tuple(sorted([id1, id2]))
            
            if pair not in processed_pairs:
                processed_pairs.add(pair)
                
                # Calculate similarity based on tag overlap
                tag_overlap = related_lens.get('tag_overlap', 0)
                # Normalize similarity (more shared tags = higher similarity)
                similarity = min(tag_overlap / 5.0, 1.0)  # Cap at 1.0
                
                if similarity >= min_similarity:
                    # Determine link type based on similarity strength
                    link_type = 'strong' if similarity >= 0.8 else 'medium' if similarity >= 0.6 else 'weak'
                    
                    links.append({
                        'source': id1,
                        'target': id2,
                        'weight': float(similarity),
                        'type': link_type,
                        'similarity': round(float(similarity), 3),
                        'shared_tags': related_lens.get('shared_tags', [])
                    })
    
    # Calculate node sizes based on centrality (number of strong connections)
    connection_strength = {}
    for link in links:
        weight = link['weight']
        connection_strength[link['source']] = connection_strength.get(link['source'], 0) + weight
        connection_strength[link['target']] = connection_strength.get(link['target'], 0) + weight
    
    # Normalize node sizes
    max_strength = max(connection_strength.values()) if connection_strength else 1
    
    for node in nodes:
        strength = connection_strength.get(node['id'], 0)
        node['strength'] = round(strength, 2)
        node['radius'] = 8 + (strength / max_strength) * 15  # Size between 8 and 23
    
    result = {
        'success': True,
        'nodes': nodes,
        'links': links,
        'stats': {
            'total_nodes': len(nodes),
            'total_links': len(links),
            'strong_links': len([l for l in links if l['type'] == 'strong']),
            'medium_links': len([l for l in links if l['type'] == 'medium']),
            'weak_links': len([l for l in links if l['type'] == 'weak']),
            'avg_similarity': round(sum(l['weight'] for l in links) / len(links), 3) if links else 0
        }
    }
    
    # Cache the result
    query_cache.set('get_semantic_graph', cache_params, result)
    
    return jsonify(result)

@app.route('/api/v1/frames/graph/semantic', methods=['GET'])
def get_frames_semantic_graph():
    """Get semantic similarity graph for frames based on their descriptions and insights"""
    min_similarity = float(request.args.get('min_similarity', 0.4))
    
    # Get frames data
    frames_file = 'lens_frames_thematic.json'
    if not os.path.exists(frames_file):
        return jsonify({'success': False, 'error': 'Frames data not found'}), 404
    
    with open(frames_file, 'r') as f:
        frames_data = json.load(f)
    
    frames = frames_data.get('frames', [])
    if not frames:
        return jsonify({'success': False, 'error': 'No frames found'}), 404
    
    # Build nodes and compute embeddings for frame content
    nodes = []
    frame_texts = []
    
    for frame in frames:
        # Combine frame text for embedding
        frame_text = f"{frame['name']} {frame['description']} {frame.get('insights', '')} {' '.join(frame.get('applications', []))}"
        frame_texts.append(frame_text)
        
        nodes.append({
            'id': frame['id'],
            'name': frame['name'],
            'description': frame['description'][:100] + '...' if len(frame['description']) > 100 else frame['description'],
            'lens_count': frame.get('lens_count', len(frame.get('lens_ids', []))),
            'type': 'frame'
        })
    
    # Generate embeddings for frames using Supabase store
    try:
        embeddings = {}
        for i, frame_text in enumerate(frame_texts):
            embedding = supabase_store.generate_embedding(frame_text)
            embeddings[nodes[i]['id']] = embedding
    except Exception as e:
        print(f"Error generating frame embeddings: {e}")
        return jsonify({'success': False, 'error': 'Failed to generate embeddings'}), 500
    
    # Calculate similarities
    links = []
    processed_pairs = set()
    
    for i, node1 in enumerate(nodes):
        id1 = node1['id']
        embedding1 = np.array(embeddings[id1])
        
        similarities = []
        
        for j, node2 in enumerate(nodes):
            if i >= j:  # Skip self and already processed pairs
                continue
                
            id2 = node2['id']
            embedding2 = np.array(embeddings[id2])
            
            # Cosine similarity
            similarity = np.dot(embedding1, embedding2) / (np.linalg.norm(embedding1) * np.linalg.norm(embedding2))
            
            if similarity >= min_similarity:
                similarities.append((id2, similarity))
        
        # Add top connections
        similarities.sort(key=lambda x: x[1], reverse=True)
        for id2, similarity in similarities[:3]:  # Top 3 connections per frame
            pair = tuple(sorted([id1, id2]))
            if pair not in processed_pairs:
                processed_pairs.add(pair)
                
                link_type = 'strong' if similarity >= 0.7 else 'medium' if similarity >= 0.5 else 'weak'
                
                links.append({
                    'source': id1,
                    'target': id2,
                    'weight': float(similarity),
                    'type': link_type,
                    'similarity': round(float(similarity), 3)
                })
    
    # Calculate node sizes based on lens count and connections
    for node in nodes:
        node['radius'] = 10 + min(node['lens_count'] * 0.5, 20)
    
    return jsonify({
        'success': True,
        'nodes': nodes,
        'links': links,
        'stats': {
            'total_nodes': len(nodes),
            'total_links': len(links),
            'avg_similarity': round(sum(l['weight'] for l in links) / len(links), 3) if links else 0
        }
    })

@app.route('/api/v1/tags/graph/semantic', methods=['GET'])
def get_tags_semantic_graph():
    """Get semantic similarity graph for tags based on the lenses they appear in"""
    min_similarity = float(request.args.get('min_similarity', 0.3))
    min_count = int(request.args.get('min_count', 2))  # Minimum lens count for a tag
    max_nodes = int(request.args.get('max_nodes', 50))  # Maximum tags to display
    
    # Get all lenses to build tag co-occurrence
    all_lenses = supabase_store.get_all_lenses(limit=500)
    
    # Build tag data
    tag_lenses = {}  # tag -> list of lens IDs
    tag_contexts = {}  # tag -> combined text from all lenses
    
    for lens in all_lenses:
        lens_id = lens['id']
        concepts = lens.get('related_concepts', [])
        
        for concept in concepts:
            if concept not in tag_lenses:
                tag_lenses[concept] = []
                tag_contexts[concept] = []
            
            tag_lenses[concept].append(lens_id)
            # Add lens definition to tag context
            tag_contexts[concept].append(lens.get('definition', ''))
    
    # Filter tags by minimum count and sort by frequency
    filtered_tags = {tag: lenses for tag, lenses in tag_lenses.items() 
                     if len(lenses) >= min_count}
    
    # Sort tags by count and take top N
    sorted_tags = sorted(filtered_tags.items(), key=lambda x: len(x[1]), reverse=True)
    top_tags = dict(sorted_tags[:max_nodes])
    
    # Build nodes
    nodes = []
    tag_list = list(top_tags.keys())
    
    for tag in tag_list:
        nodes.append({
            'id': tag,
            'name': tag,
            'lens_count': len(top_tags[tag]),
            'type': 'tag',
            'radius': 5 + min(len(top_tags[tag]) * 0.8, 15)
        })
    
    # Calculate tag similarity based on lens overlap (Jaccard similarity)
    links = []
    
    for i, tag1 in enumerate(tag_list):
        lenses1 = set(top_tags[tag1])
        
        for j, tag2 in enumerate(tag_list[i+1:], i+1):
            lenses2 = set(top_tags[tag2])
            
            # Jaccard similarity
            intersection = len(lenses1 & lenses2)
            union = len(lenses1 | lenses2)
            
            if union > 0:
                similarity = intersection / union
                
                if similarity >= min_similarity:
                    link_type = 'strong' if similarity >= 0.6 else 'medium' if similarity >= 0.4 else 'weak'
                    
                    links.append({
                        'source': tag1,
                        'target': tag2,
                        'weight': float(similarity),
                        'type': link_type,
                        'similarity': round(float(similarity), 3),
                        'shared_lenses': intersection
                    })
    
    return jsonify({
        'success': True,
        'nodes': nodes,
        'links': links,
        'stats': {
            'total_nodes': len(nodes),
            'total_links': len(links),
            'avg_similarity': round(sum(l['weight'] for l in links) / len(links), 3) if links else 0,
            'filtered_tags': len(tag_lenses) - len(top_tags),
            'total_tags': len(tag_lenses)
        }
    })

@app.route('/api/v1/lenses/export', methods=['GET'])
def export_lenses():
    """Export lenses in various formats"""
    format_type = request.args.get('format', 'json')  # json, csv, markdown
    
    all_lenses = supabase_store.get_all_lenses(limit=500)
    
    lenses = []
    for lens in all_lenses:
        lenses.append({
            'id': lens['id'],
            'episode': lens.get('episode'),
            'lens_type': lens.get('lens_type'),
            'lens_name': lens.get('name'),
            'definition': lens.get('definition'),
            'examples': lens.get('examples', []),
            'related_concepts': lens.get('related_concepts', []),
            'source_url': lens.get('source_url'),
            'frame_ids': LENS_TO_FRAMES.get(match.id, [])
        })
    
    # Sort by episode
    lenses.sort(key=lambda x: int(x['episode']) if x['episode'] else 0)
    
    if format_type == 'csv':
        import csv
        import io
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            'episode', 'lens_type', 'lens_name', 'definition', 
            'examples', 'related_concepts', 'source_url'
        ])
        writer.writeheader()
        
        for lens in lenses:
            lens_copy = lens.copy()
            lens_copy['examples'] = ' | '.join(lens['examples'])
            lens_copy['related_concepts'] = ', '.join(lens['related_concepts'])
            writer.writerow(lens_copy)
        
        return output.getvalue(), 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=flux_lenses.csv'
        }
    
    elif format_type == 'markdown':
        md_content = "# FLUX Lenses\n\n"
        current_episode = None
        
        for lens in lenses:
            if lens['episode'] != current_episode:
                current_episode = lens['episode']
                md_content += f"\n## Episode {current_episode}\n\n"
            
            md_content += f"### {lens['lens_name']} ({lens['lens_type']})\n\n"
            md_content += f"{lens['definition']}\n\n"
            
            if lens['examples']:
                md_content += "**Examples:**\n"
                for ex in lens['examples']:
                    md_content += f"- {ex}\n"
                md_content += "\n"
            
            if lens['related_concepts']:
                md_content += f"**Related Concepts:** {', '.join(lens['related_concepts'])}\n\n"
        
        return md_content, 200, {
            'Content-Type': 'text/markdown',
            'Content-Disposition': 'attachment; filename=flux_lenses.md'
        }
    
    else:  # JSON
        return jsonify({
            'success': True,
            'export_date': datetime.now().isoformat(),
            'total_lenses': len(lenses),
            'lenses': lenses
        })

@app.route('/api/v1/frames', methods=['GET'])
def get_frames():
    """Get all thematic frames"""
    frame_id = request.args.get('id')
    
    if frame_id:
        # Get specific frame
        frame = next((f for f in FRAMES if f['id'] == frame_id), None)
        if not frame:
            return jsonify({
                'success': False,
                'error': 'Frame not found'
            }), 404
        
        # Get lens details for this frame
        frame_lenses = []
        for lens_id in frame.get('lens_ids', []):
            # Get lens from Supabase
            try:
                lens = supabase_store.get_lens_by_id(lens_id)
                if lens:
                    frame_lenses.append({
                        'id': lens_id,
                        'episode': lens.get('episode'),
                        'lens_type': lens.get('lens_type'),
                        'lens_name': lens.get('name'),
                        'definition': lens.get('definition'),
                        'examples': lens.get('examples', []),
                        'related_concepts': lens.get('related_concepts', [])
                    })
            except:
                pass
        
        return jsonify({
            'success': True,
            'frame': {
                **frame,
                'lenses': frame_lenses
            }
        })
    
    # Return all frames with basic info
    frames_with_counts = []
    for frame in FRAMES:
        frames_with_counts.append({
            'id': frame['id'],
            'name': frame['name'],
            'description': frame['description'],
            'lens_count': len(frame.get('lens_ids', [])),
            'insights': frame.get('insights', ''),
            'applications': frame.get('applications', []),
            'metaphor': frame.get('metaphor', '')
        })
    
    return jsonify({
        'success': True,
        'count': len(frames_with_counts),
        'frames': frames_with_counts
    })

@app.route('/api/v1/cache/stats', methods=['GET'])
def get_cache_stats():
    """Get cache statistics"""
    return jsonify({
        'success': True,
        'cache_stats': query_cache.stats()
    })

@app.route('/api/v1/cache/version', methods=['GET'])
def get_cache_version():
    """Get current cache version for client cache invalidation"""
    return jsonify({
        'success': True,
        'version': CACHE_VERSION,
        'timestamp': CACHE_VERSION
    })

@app.route('/api/v1/cache/clear', methods=['POST'])
def clear_cache():
    """Clear the query cache and increment version"""
    query_cache.clear()
    new_version = increment_cache_version()
    return jsonify({
        'success': True,
        'message': 'Cache cleared successfully',
        'new_version': new_version
    })

# Add cache control headers for Cloudflare and browser caching
@app.after_request
def after_request(response):
    """Add cache headers to API responses for Cloudflare optimization"""
    
    # Skip caching for non-200 responses
    if response.status_code != 200:
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response
    
    # Cache lens data for 24 hours (will be invalidated after Thursday updates)
    if '/api/v1/lenses' in request.path:
        response.headers['Cache-Control'] = 'public, max-age=86400, s-maxage=86400'
        response.headers['CDN-Cache-Control'] = 'max-age=86400'
        response.headers['Cloudflare-CDN-Cache-Control'] = 'max-age=86400'
    
    # Cache frame data for 24 hours
    elif '/api/v1/frames' in request.path:
        response.headers['Cache-Control'] = 'public, max-age=86400, s-maxage=86400'
        response.headers['CDN-Cache-Control'] = 'max-age=86400'
        response.headers['Cloudflare-CDN-Cache-Control'] = 'max-age=86400'
    
    # Cache graph data for 24 hours
    elif '/graph/' in request.path:
        response.headers['Cache-Control'] = 'public, max-age=86400, s-maxage=86400'
        response.headers['CDN-Cache-Control'] = 'max-age=86400'
        response.headers['Cloudflare-CDN-Cache-Control'] = 'max-age=86400'
    
    # Cache stats for 1 hour (more dynamic)
    elif '/stats' in request.path:
        response.headers['Cache-Control'] = 'public, max-age=3600, s-maxage=3600'
        response.headers['CDN-Cache-Control'] = 'max-age=3600'
        response.headers['Cloudflare-CDN-Cache-Control'] = 'max-age=3600'
    
    # Cache concept/tag data for 24 hours
    elif '/concepts' in request.path or '/tags' in request.path:
        response.headers['Cache-Control'] = 'public, max-age=86400, s-maxage=86400'
        response.headers['CDN-Cache-Control'] = 'max-age=86400'
        response.headers['Cloudflare-CDN-Cache-Control'] = 'max-age=86400'
    
    # Cache search results for 4 hours (may vary more)
    elif '/search' in request.path:
        response.headers['Cache-Control'] = 'public, max-age=14400, s-maxage=14400'
        response.headers['CDN-Cache-Control'] = 'max-age=14400'
        response.headers['Cloudflare-CDN-Cache-Control'] = 'max-age=14400'
    
    # Default cache for other endpoints - 2 hours
    else:
        response.headers['Cache-Control'] = 'public, max-age=7200, s-maxage=7200'
    
    # Add CORS preflight caching
    if request.method == 'OPTIONS':
        response.headers['Access-Control-Max-Age'] = '86400'  # 24 hours
    
    # Add ETag support for conditional requests
    if response.get_json():
        import hashlib
        content = response.get_data(as_text=True)
        etag = hashlib.md5(content.encode()).hexdigest()
        response.headers['ETag'] = f'"{etag}"'
    
    return response

## Creative Thinking & Graph-Based Navigation Endpoints

# Initialize graph module for creative navigation
try:
    from src.lens.graph import LensGraph, GraphEnhancedRetrieval
    lens_graph = LensGraph()
    graph_enhancer = GraphEnhancedRetrieval()
    HAS_GRAPH = True
    print("Graph enhancement enabled")
except Exception as e:
    print(f"Graph enhancement not available: {e}")
    HAS_GRAPH = False
    lens_graph = None
    graph_enhancer = None

@app.route('/api/v1/creative/journey', methods=['GET'])
def find_lens_journey():
    """Find conceptual path between two lenses"""
    if not HAS_GRAPH:
        return jsonify({
            'success': False,
            'error': 'Graph functionality not available'
        }), 503

    source = request.args.get('source')
    target = request.args.get('target')

    if not source or not target:
        return jsonify({
            'success': False,
            'error': 'Both source and target lens names required'
        }), 400

    # Find lens IDs from names
    source_lens = supabase_store.search_lenses(source, k=1)
    target_lens = supabase_store.search_lenses(target, k=1)

    if not source_lens or not target_lens:
        return jsonify({
            'success': False,
            'error': 'Could not find one or both lenses'
        }), 404

    source_id = source_lens[0]['id']
    target_id = target_lens[0]['id']

    # Find paths
    paths = lens_graph.find_path(source_id, target_id)

    # Enrich with lens details
    enriched_paths = []
    for path in paths:
        enriched_path = []
        for lens_id in path:
            lens = supabase_store.get_lens_by_id(lens_id)
            if lens:
                enriched_path.append({
                    'id': lens_id,
                    'name': lens.get('name'),
                    'definition': lens.get('definition'),
                    'episode': lens.get('episode')
                })
        enriched_paths.append(enriched_path)

    return jsonify({
        'success': True,
        'source': source_lens[0],
        'target': target_lens[0],
        'paths': enriched_paths,
        'count': len(enriched_paths)
    })

@app.route('/api/v1/creative/bridges', methods=['GET'])
def find_bridge_lenses():
    """Find lenses that bridge between disparate concepts"""
    if not HAS_GRAPH:
        return jsonify({
            'success': False,
            'error': 'Graph functionality not available'
        }), 503

    lens_names = request.args.getlist('lenses')

    if len(lens_names) < 2:
        return jsonify({
            'success': False,
            'error': 'At least 2 lens names required'
        }), 400

    # Find lens IDs
    lens_ids = []
    lens_details = []
    for name in lens_names:
        results = supabase_store.search_lenses(name, k=1)
        if results:
            lens_ids.append(results[0]['id'])
            lens_details.append(results[0])

    if len(lens_ids) < 2:
        return jsonify({
            'success': False,
            'error': 'Could not find enough lenses'
        }), 404

    # Find bridges
    bridge_ids = lens_graph.find_bridges(lens_ids)

    # Enrich with details
    bridges = []
    for bridge_id in bridge_ids:
        lens = supabase_store.get_lens_by_id(bridge_id)
        if lens:
            bridges.append({
                'id': bridge_id,
                'name': lens.get('name'),
                'definition': lens.get('definition'),
                'episode': lens.get('episode'),
                'related_concepts': lens.get('related_concepts', [])
            })

    return jsonify({
        'success': True,
        'input_lenses': lens_details,
        'bridges': bridges,
        'count': len(bridges),
        'insight': f"These {len(bridges)} lenses connect {' and '.join(lens_names)}"
    })

@app.route('/api/v1/creative/contrasts', methods=['GET'])
def find_contrasting_lenses():
    """Find paradoxical/contrasting lenses for dialectic thinking"""
    if not HAS_GRAPH:
        return jsonify({
            'success': False,
            'error': 'Graph functionality not available'
        }), 503

    lens_name = request.args.get('lens')

    if not lens_name:
        return jsonify({
            'success': False,
            'error': 'Lens name required'
        }), 400

    # Find lens ID
    results = supabase_store.search_lenses(lens_name, k=1)
    if not results:
        return jsonify({
            'success': False,
            'error': 'Lens not found'
        }), 404

    lens_id = results[0]['id']

    # Find contrasts
    contrasts = lens_graph.find_contrasts(lens_id)

    # Enrich with details
    enriched_contrasts = []
    for contrast_id, insight in contrasts:
        lens = supabase_store.get_lens_by_id(contrast_id)
        if lens:
            enriched_contrasts.append({
                'id': contrast_id,
                'name': lens.get('name'),
                'definition': lens.get('definition'),
                'episode': lens.get('episode'),
                'insight': insight
            })

    return jsonify({
        'success': True,
        'source_lens': results[0],
        'contrasts': enriched_contrasts,
        'count': len(enriched_contrasts)
    })

@app.route('/api/v1/creative/central', methods=['GET'])
def get_central_lenses():
    """Get most central/important lenses for creative exploration"""
    try:
        if not HAS_GRAPH:
            return jsonify({
                'success': False,
                'error': 'Graph functionality not available'
            }), 503

        measure = request.args.get('measure', 'betweenness')  # betweenness, pagerank, eigenvector
        limit = int(request.args.get('limit', 10))
        fallback_note = None

        # Try to get central lenses, with fallback for PageRank issues
        try:
            central = lens_graph.get_central_lenses(measure=measure)[:limit]
        except Exception as e:
            # If PageRank fails, fall back to betweenness
            if measure.lower() == 'pagerank':
                print(f"PageRank failed, falling back to betweenness: {e}")
                central = lens_graph.get_central_lenses(measure='betweenness')[:limit]
                fallback_note = "Note: Using betweenness centrality (PageRank temporarily unavailable)"
                measure = 'betweenness (pagerank fallback)'
            else:
                raise

        # Enrich with details
        enriched = []
        for lens_id, score, name in central:
            lens = supabase_store.get_lens_by_id(lens_id)
            if lens:
                enriched.append({
                    'id': lens_id,
                    'name': name,
                    'definition': lens.get('definition'),
                    'episode': lens.get('episode'),
                    'centrality_score': round(score, 4),
                    'related_concepts': lens.get('related_concepts', [])
                })

        response = {
            'success': True,
            'measure': measure,
            'central_lenses': enriched,
            'count': len(enriched),
            'insight': f"These lenses are hubs in the {measure} network - they connect many other concepts"
        }

        if fallback_note:
            response['note'] = fallback_note

        return jsonify(response)
    except Exception as e:
        import traceback
        print(f"Error in get_central_lenses: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': f'Failed to get central lenses: {str(e)}'
        }), 500

@app.route('/api/v1/creative/neighborhood', methods=['GET'])
def get_lens_neighborhood():
    """Get neighborhood of related lenses for exploration"""
    if not HAS_GRAPH:
        return jsonify({
            'success': False,
            'error': 'Graph functionality not available'
        }), 503

    lens_name = request.args.get('lens')
    radius = int(request.args.get('radius', 2))

    if not lens_name:
        return jsonify({
            'success': False,
            'error': 'Lens name required'
        }), 400

    # Find lens ID
    results = supabase_store.search_lenses(lens_name, k=1)
    if not results:
        return jsonify({
            'success': False,
            'error': 'Lens not found'
        }), 404

    lens_id = results[0]['id']

    # Get neighborhood
    neighborhood = lens_graph.get_lens_neighborhood(lens_id, radius=radius)

    # Enrich with details
    enriched_neighborhood = {}
    for edge_type, lens_ids in neighborhood.items():
        enriched_neighborhood[edge_type] = []
        for lid in lens_ids:
            lens = supabase_store.get_lens_by_id(lid)
            if lens:
                enriched_neighborhood[edge_type].append({
                    'id': lid,
                    'name': lens.get('name'),
                    'definition': lens.get('definition'),
                    'episode': lens.get('episode')
                })

    return jsonify({
        'success': True,
        'source_lens': results[0],
        'radius': radius,
        'neighborhood': enriched_neighborhood
    })

@app.route('/api/v1/creative/random', methods=['GET'])
def random_lens_provocation():
    """
    Get a random lens for creative provocation.
    Optionally provide context to bias toward unexplored conceptual dimensions.
    """
    # Get optional context parameter
    context = request.args.getlist('context')

    all_lenses = supabase_store.get_all_lenses(limit=500)

    if not all_lenses:
        return jsonify({
            'success': False,
            'error': 'No lenses found'
        }), 404

    # Determine selection strategy
    gap_analysis = None
    if context:
        # Gap-biased mode
        coverage = calculate_frame_coverage(context)
        random_lens = bias_lens_selection(all_lenses, coverage)

        if random_lens is None:
            # Fallback to pure random if bias fails
            import random
            random_lens = random.choice(all_lenses)
        else:
            gap_analysis = generate_gap_report(coverage, random_lens)
    else:
        # Original behavior: pure randomness
        import random
        random_lens = random.choice(all_lenses)

    # Get related lenses for follow-up exploration
    related = supabase_store.get_related_lenses(random_lens['id'], k=3)

    response = {
        'success': True,
        'provocation': {
            'id': random_lens['id'],
            'name': random_lens.get('name'),
            'definition': random_lens.get('definition'),
            'examples': random_lens.get('examples', []),
            'episode': random_lens.get('episode'),
            'related_concepts': random_lens.get('related_concepts', [])
        },
        'related': related,
        'suggestion': f"Try viewing your problem through the '{random_lens.get('name')}' lens"
    }

    # Include gap analysis if context was provided
    if gap_analysis:
        response['gap_analysis'] = gap_analysis

    return jsonify(response)


@app.route('/api/v1/creative/gaps', methods=['GET'])
def detect_thinking_gaps():
    """
    Analyze exploration coverage and identify unexplored conceptual dimensions.
    Requires context parameter with list of explored lens names.
    """
    # Get required context parameter
    context = request.args.getlist('context')

    if not context:
        return jsonify({
            'success': False,
            'error': 'context parameter required (list of explored lens names)'
        }), 400

    # Calculate coverage
    coverage = calculate_frame_coverage(context)

    # Get all lenses for sampling
    all_lenses = supabase_store.get_all_lenses(limit=500)

    if not all_lenses:
        return jsonify({
            'success': False,
            'error': 'No lenses found'
        }), 404

    # Generate suggestions from unexplored frames (top 5)
    import random
    suggestions = []

    for frame_name in coverage['unexplored'][:5]:
        # Find lenses belonging to this frame (convert frame_name to frame_id for matching)
        frame_lenses = []
        for lens in all_lenses:
            lens_frame_ids = lens.get('frame_ids', [])
            if isinstance(lens_frame_ids, str):
                lens_frame_ids = [lens_frame_ids]
            elif not isinstance(lens_frame_ids, list):
                lens_frame_ids = []

            # Convert frame_ids to names and check if this lens belongs to the frame
            lens_frame_names = [get_frame_name_from_id(fid) for fid in lens_frame_ids]
            if frame_name in lens_frame_names:
                frame_lenses.append(lens)

        # Sample up to 3 lenses from this frame
        if frame_lenses:
            sample_count = min(3, len(frame_lenses))
            sampled = random.sample(frame_lenses, sample_count)

            suggestions.append({
                'frame': frame_name,
                'sample_lenses': [
                    {
                        'id': l['id'],
                        'name': l.get('lens_name'),
                        'definition': l.get('definition'),
                        'episode': l.get('episode')
                    }
                    for l in sampled
                ]
            })

    # Calculate coverage percentage
    coverage_percentage = 0
    if coverage['total_frames'] > 0:
        coverage_percentage = (len(coverage['explored']) / coverage['total_frames']) * 100

    return jsonify({
        'success': True,
        'coverage': {
            'explored_frames': coverage['explored'],
            'unexplored_frames': coverage['unexplored'],
            'underexplored_frames': coverage['underexplored'],
            'total_frames': coverage['total_frames'],
            'coverage_percentage': round(coverage_percentage, 1)
        },
        'suggestions': suggestions,
        'insight': f"You've explored {len(coverage['explored'])} of {coverage['total_frames']} conceptual dimensions. Consider these unexplored areas for fresh perspectives."
    })


@app.route('/api/v1/creative/clusters', methods=['GET'])
def get_lens_clusters():
    """
    Get lens clusters/communities using Louvain community detection or connected components.
    Reveals groups of highly interconnected lenses for deeper exploration.
    """
    if not HAS_GRAPH:
        return jsonify({
            'success': False,
            'error': 'Graph functionality not available'
        }), 503

    try:
        # Get clusters from graph
        clusters = lens_graph.get_lens_clusters()

        # Enrich clusters with lens metadata
        enriched_clusters = []
        for cluster_id, lens_ids in clusters.items():
            # Get lens details from Supabase
            lenses = []
            for lens_id in lens_ids:
                lens = supabase_store.get_lens_by_id(lens_id)
                if lens:
                    lenses.append(lens)

            if not lenses:
                continue

            # Extract shared characteristics
            frames = set()
            concepts = []
            for l in lenses:
                # Get frame names
                frame_ids = l.get('frame_ids', [])
                if isinstance(frame_ids, str):
                    frame_ids = [frame_ids]
                elif not isinstance(frame_ids, list):
                    frame_ids = []

                for fid in frame_ids:
                    frame_name = get_frame_name_from_id(fid)
                    if frame_name:
                        frames.add(frame_name)

                # Get concepts
                related_concepts = l.get('related_concepts', [])
                if isinstance(related_concepts, list):
                    concepts.extend(related_concepts)

            # Count concept frequency
            from collections import Counter
            concept_counts = Counter(concepts)
            top_concepts = [c for c, count in concept_counts.most_common(10)]

            enriched_clusters.append({
                'cluster_id': cluster_id,
                'size': len(lenses),
                'lenses': [
                    {
                        'id': l['id'],
                        'name': l.get('name'),
                        'definition': l.get('definition', '')[:100] + '...' if l.get('definition', '') else ''
                    }
                    for l in lenses
                ],
                'shared_frames': list(frames),
                'shared_concepts': top_concepts
            })

        # Sort by cluster size (largest first)
        enriched_clusters.sort(key=lambda x: x['size'], reverse=True)

        # Check which algorithm was used
        algorithm = "unknown"
        try:
            import community
            algorithm = "louvain"
        except ImportError:
            algorithm = "connected_components"

        return jsonify({
            'success': True,
            'total_clusters': len(enriched_clusters),
            'algorithm': algorithm,
            'clusters': enriched_clusters
        })

    except Exception as e:
        logger.error(f"Error getting clusters: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/v1/creative/triads', methods=['GET'])
def get_dialectic_triads():
    """
    Get thesis/antithesis/synthesis triads for a lens.

    Finds a contrasting lens (antithesis) and then identifies a synthesis lens
    that bridges or transcends the tension between them.

    Parameters:
        lens: Source lens name (required)
        limit: Maximum triads to return (default: 3)

    Returns:
        List of triads, each containing:
        - thesis: The source lens
        - antithesis: A contrasting lens
        - synthesis: A lens that bridges/transcends the contrast
        - insight: Explanation of how the synthesis resolves or transcends the tension
    """
    if not HAS_GRAPH:
        return jsonify({
            'success': False,
            'error': 'Graph functionality not available'
        }), 503

    lens_name = request.args.get('lens')
    limit = int(request.args.get('limit', 3))

    if not lens_name:
        return jsonify({
            'success': False,
            'error': 'Lens name required'
        }), 400

    # Find thesis lens
    results = supabase_store.search_lenses(lens_name, k=1)
    if not results:
        return jsonify({
            'success': False,
            'error': 'Lens not found'
        }), 404

    thesis = results[0]
    thesis_id = thesis['id']

    # Find antithesis (contrasting) lenses
    contrasts = lens_graph.find_contrasts(thesis_id)

    if not contrasts:
        return jsonify({
            'success': True,
            'source_lens': thesis,
            'triads': [],
            'count': 0,
            'message': 'No contrasts found for this lens'
        })

    triads = []

    for antithesis_id, contrast_insight in contrasts[:limit * 2]:  # Get more to find valid syntheses
        if len(triads) >= limit:
            break

        antithesis = supabase_store.get_lens_by_id(antithesis_id)
        if not antithesis:
            continue

        # Find synthesis lens - a lens that bridges thesis and antithesis
        # Strategy: Find lenses connected to BOTH thesis and antithesis
        thesis_neighbors = set(lens_graph.graph.neighbors(thesis_id)) if lens_graph.graph.has_node(thesis_id) else set()
        antithesis_neighbors = set(lens_graph.graph.neighbors(antithesis_id)) if lens_graph.graph.has_node(antithesis_id) else set()

        # Common neighbors (excluding thesis and antithesis themselves)
        common = thesis_neighbors.intersection(antithesis_neighbors) - {thesis_id, antithesis_id}

        if not common:
            # Fallback: Find bridge lenses between thesis and antithesis
            try:
                path = lens_graph.find_path(thesis_id, antithesis_id)
                if path and len(path) >= 3:
                    # Middle lens is potential synthesis
                    mid_idx = len(path) // 2
                    common = {path[mid_idx]}
            except Exception:
                continue

        if not common:
            continue

        # Get the best synthesis candidate
        synthesis_id = list(common)[0]
        synthesis = supabase_store.get_lens_by_id(synthesis_id)

        if not synthesis:
            continue

        # Generate synthesis insight
        synthesis_insight = _generate_synthesis_insight(thesis, antithesis, synthesis, contrast_insight)

        triads.append({
            'thesis': {
                'id': thesis['id'],
                'name': thesis.get('name') or thesis.get('lens_name'),
                'definition': thesis.get('definition'),
                'episode': thesis.get('episode')
            },
            'antithesis': {
                'id': antithesis['id'],
                'name': antithesis.get('name') or antithesis.get('lens_name'),
                'definition': antithesis.get('definition'),
                'episode': antithesis.get('episode')
            },
            'synthesis': {
                'id': synthesis['id'],
                'name': synthesis.get('name') or synthesis.get('lens_name'),
                'definition': synthesis.get('definition'),
                'episode': synthesis.get('episode')
            },
            'contrast_insight': contrast_insight,
            'synthesis_insight': synthesis_insight
        })

    return jsonify({
        'success': True,
        'source_lens': thesis,
        'triads': triads,
        'count': len(triads)
    })


def _generate_synthesis_insight(thesis: dict, antithesis: dict, synthesis: dict, contrast_insight: str) -> str:
    """Generate insight explaining how synthesis transcends thesis/antithesis tension."""
    thesis_name = thesis.get('name') or thesis.get('lens_name', 'Unknown')
    antithesis_name = antithesis.get('name') or antithesis.get('lens_name', 'Unknown')
    synthesis_name = synthesis.get('name') or synthesis.get('lens_name', 'Unknown')

    return (
        f"The tension between {thesis_name} and {antithesis_name} "
        f"can be transcended through {synthesis_name}, which offers a higher-order "
        f"perspective that integrates both viewpoints rather than choosing between them."
    )


@app.route('/api/v1/creative/progressions', methods=['GET'])
def get_lens_progressions():
    """
    Get learning progressions - sequences of lenses that build on each other.

    Finds a logical learning path from a starting lens to a target concept,
    where each lens builds on the insights of the previous one.

    Parameters:
        start: Starting lens name (required)
        target: Target lens name OR concept (required)
        max_steps: Maximum steps in progression (default: 5)

    Returns:
        A progression sequence with rationale for each step.
    """
    if not HAS_GRAPH:
        return jsonify({
            'success': False,
            'error': 'Graph functionality not available'
        }), 503

    start_name = request.args.get('start')
    target_name = request.args.get('target')
    max_steps = int(request.args.get('max_steps', 5))

    if not start_name or not target_name:
        return jsonify({
            'success': False,
            'error': 'Both start and target lens names required'
        }), 400

    # Find start lens
    start_results = supabase_store.search_lenses(start_name, k=1)
    if not start_results:
        return jsonify({
            'success': False,
            'error': f'Start lens "{start_name}" not found'
        }), 404

    start_lens = start_results[0]
    start_id = start_lens['id']

    # Find target lens
    target_results = supabase_store.search_lenses(target_name, k=1)
    if not target_results:
        return jsonify({
            'success': False,
            'error': f'Target lens "{target_name}" not found'
        }), 404

    target_lens = target_results[0]
    target_id = target_lens['id']

    # Find path between lenses
    try:
        path = lens_graph.find_path(start_id, target_id)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'No path found between lenses: {str(e)}'
        }), 404

    if not path:
        return jsonify({
            'success': False,
            'error': 'No path found between these lenses'
        }), 404

    # Limit path length
    if len(path) > max_steps:
        # Sample evenly through the path
        step = len(path) / max_steps
        indices = [int(i * step) for i in range(max_steps)]
        indices[-1] = len(path) - 1  # Ensure we include the target
        path = [path[i] for i in indices]

    # Build progression with insights
    progression = []
    for i, lens_id in enumerate(path):
        lens = supabase_store.get_lens_by_id(lens_id)
        if not lens:
            continue

        step_insight = _generate_progression_insight(i, len(path), lens, path, progression)

        progression.append({
            'step': i + 1,
            'lens': {
                'id': lens['id'],
                'name': lens.get('name') or lens.get('lens_name'),
                'definition': lens.get('definition'),
                'episode': lens.get('episode')
            },
            'insight': step_insight
        })

    return jsonify({
        'success': True,
        'start_lens': start_lens,
        'target_lens': target_lens,
        'total_steps': len(progression),
        'progression': progression,
        'summary': f"A {len(progression)}-step journey from {start_lens.get('name') or start_lens.get('lens_name')} to {target_lens.get('name') or target_lens.get('lens_name')}"
    })


def _generate_progression_insight(step_idx: int, total_steps: int, lens: dict, path: list, previous_steps: list) -> str:
    """Generate insight explaining how this lens builds on previous ones."""
    lens_name = lens.get('name') or lens.get('lens_name', 'Unknown')

    if step_idx == 0:
        return f"Begin with {lens_name} to establish the foundation for this conceptual journey."
    elif step_idx == total_steps - 1:
        return f"Arrive at {lens_name}, integrating insights from the preceding lenses."
    else:
        prev_name = previous_steps[-1]['lens']['name'] if previous_steps else 'the previous lens'
        return f"{lens_name} builds on {prev_name}, adding a new dimension to the exploration."


@app.route('/api/v1/debug/lens-lookup', methods=['GET'])
def debug_lens_lookup():
    """Temporary debug endpoint to diagnose lens name matching issues"""
    context = request.args.getlist('context')

    if not context:
        return jsonify({'error': 'context parameter required'}), 400

    # Get all lenses from database
    all_lenses = supabase_store.get_all_lenses(limit=500)

    # NOTE: Supabase uses 'name' field, not 'lens_name'
    # Find exact matches
    exact_matches = [l for l in all_lenses if l.get('name') in context]

    # Find partial matches
    partial_matches = []
    for target in context:
        partials = [l.get('name') for l in all_lenses if target.lower() in l.get('name', '').lower()][:3]
        if partials:
            partial_matches.append({
                'target': target,
                'matches': partials
            })

    # Get sample of all lens names
    sample_names = [l.get('name') for l in all_lenses[:20]]

    return jsonify({
        'success': True,
        'debug': {
            'requested_lenses': context,
            'exact_matches_found': len(exact_matches),
            'exact_match_names': [l.get('lens_name') for l in exact_matches],
            'partial_matches': partial_matches,
            'database_sample': sample_names,
            'total_lenses_in_db': len(all_lenses)
        }
    })


if __name__ == '__main__':
    # Railway provides PORT env var
    port = int(os.getenv('PORT', os.getenv('LENS_API_PORT', 5002)))
    print(f"Starting Lens Search API on port {port}")
    print(f"API endpoints available at http://localhost:{port}/api/v1/")
    # Disable debug mode in production
    debug_mode = os.getenv('FLASK_ENV', 'production') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=port)