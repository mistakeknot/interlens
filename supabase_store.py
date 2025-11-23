"""
Supabase store for FLUX Lens system.
Replaces Pinecone with PostgreSQL + pgvector for vector search and storage.
Implements consolidated tag system (76 tags instead of 511).
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import numpy as np
from supabase import create_client, Client
import openai

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import sentence-transformers for free local embeddings
try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False
    logger.warning("sentence-transformers not installed. Will fall back to OpenAI for query embeddings.")

class SupabaseLensStore:
    """Supabase-based storage for FLUX lenses with vector search capabilities."""
    
    def __init__(self, supabase_url: Optional[str] = None, supabase_key: Optional[str] = None):
        """Initialize Supabase connection."""
        self.supabase_url = supabase_url or os.getenv('SUPABASE_URL')
        self.supabase_key = supabase_key or os.getenv('SUPABASE_KEY')

        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be provided")

        self.client: Client = create_client(self.supabase_url, self.supabase_key)

        # Lazy-load local embedding model (free, runs on CPU)
        # Model loads on first search request, not on startup (faster deploys!)
        self._local_model = None
        self._model_load_attempted = False

        # Initialize OpenAI for pre-computing lens embeddings (admin/batch operations only)
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if openai_api_key:
            self.openai_client = openai.OpenAI(api_key=openai_api_key)
        else:
            logger.warning("OPENAI_API_KEY not found. Admin embedding generation will not be available.")
            self.openai_client = None

    @property
    def local_model(self):
        """Lazy-load sentence-transformers model on first access (not on init)."""
        if not self._model_load_attempted and HAS_SENTENCE_TRANSFORMERS:
            self._model_load_attempted = True
            try:
                logger.info("Loading sentence-transformers model (lazy load on first search)...")
                self._local_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
                logger.info("✅ Loaded sentence-transformers model for free local embeddings")
            except Exception as e:
                logger.warning(f"Failed to load sentence-transformers model: {e}")
                self._local_model = None
        return self._local_model

    def generate_query_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for search queries using FREE local model.
        This runs on the server's CPU, no API costs!
        """
        if self.local_model:
            try:
                embedding = self.local_model.encode(text, convert_to_numpy=True)
                return embedding.tolist()
            except Exception as e:
                logger.error(f"Error generating local embedding: {e}")
                # Fall back to OpenAI if local fails

        # Fallback to OpenAI (only if local model unavailable)
        if self.openai_client:
            logger.warning("Using OpenAI for query embedding (local model unavailable)")
            return self.generate_embedding_openai(text)

        raise ValueError("No embedding model available (neither local nor OpenAI)")

    def generate_embedding_openai(self, text: str) -> List[float]:
        """
        Generate embedding using OpenAI (for admin/batch operations only).
        Use this to pre-compute lens embeddings, not for runtime queries!
        """
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized")

        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
                dimensions=384
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generating OpenAI embedding: {e}")
            raise

    # Keep old method name for backward compatibility
    def generate_embedding(self, text: str) -> List[float]:
        """Legacy method - redirects to OpenAI for admin operations."""
        return self.generate_embedding_openai(text)
    
    def search_lenses(
        self, 
        query: str, 
        k: int = 10,
        filter_tags: Optional[List[str]] = None,
        filter_frame: Optional[str] = None,
        filter_episode: Optional[int] = None,
        similarity_threshold: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Search for lenses using vector similarity.
        
        Args:
            query: Search query text
            k: Number of results to return
            filter_tags: Optional list of tags to filter by
            filter_frame: Optional frame to filter by
            filter_episode: Optional episode number to filter by
            similarity_threshold: Minimum similarity score (default 0.0)
        
        Returns:
            List of lens dictionaries with similarity scores
        """
        try:
            # Generate embedding for query using FREE local model
            query_embedding = self.generate_query_embedding(query)
            
            # Call Supabase RPC function for vector search
            params = {
                'query_embedding': query_embedding,
                'match_count': k * 2  # Request more to account for filtering
            }
            
            if filter_tags:
                params['filter_tags'] = filter_tags
            if filter_frame:
                params['filter_frame'] = filter_frame
            if filter_episode is not None:
                params['filter_episode'] = filter_episode
            
            result = self.client.rpc('search_lenses', params).execute()
            
            if result.data:
                # Format results and filter by similarity
                lenses = []
                for item in result.data:
                    similarity = item.get('similarity', 0.0)
                    if similarity >= similarity_threshold:
                        lens = {
                            'id': item['id'],
                            'name': item['name'],
                            'definition': item['definition'],
                            'episode': item['episode'],
                            'lens_type': item['lens_type'],
                            'related_concepts': item['related_concepts'],  # Consolidated tags
                            'frame': item['frame'],
                            'similarity': similarity
                        }
                        lenses.append(lens)
                        if len(lenses) >= k:
                            break
                
                if lenses:
                    logger.info(f"Found {len(lenses)} lenses for query: {query[:50]}... (similarities: {[l['similarity'] for l in lenses[:3]]})")
                else:
                    logger.warning(f"No lenses above threshold {similarity_threshold} for query: {query[:50]}...")
                    # Log the top similarities that were filtered out
                    if result.data:
                        top_similarities = [item.get('similarity', 0.0) for item in result.data[:3]]
                        logger.info(f"Top similarities found but below threshold: {top_similarities}")
                
                return lenses
            else:
                logger.warning(f"No results found for query: {query[:50]}...")
                return []
                
        except Exception as e:
            logger.error(f"Error in search_lenses: {e}")
            return []
    
    def get_lens_by_id(self, lens_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific lens by ID."""
        try:
            result = self.client.table('lenses').select("*").eq('id', lens_id).single().execute()
            if result.data:
                return result.data
            return None
        except Exception as e:
            logger.error(f"Error getting lens {lens_id}: {e}")
            return None
    
    def get_all_lenses(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Get all lenses (or up to limit)."""
        try:
            result = self.client.table('lenses').select("*").limit(limit).execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error getting all lenses: {e}")
            return []
    
    def get_lenses_by_episode(self, episode: int) -> List[Dict[str, Any]]:
        """Get all lenses from a specific episode."""
        try:
            result = self.client.table('lenses').select("*").eq('episode', episode).execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error getting lenses for episode {episode}: {e}")
            return []
    
    def get_lenses_by_tag(self, tag: str) -> List[Dict[str, Any]]:
        """Get all lenses with a specific tag."""
        try:
            result = self.client.table('lenses').select("*").contains('related_concepts', [tag]).execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error getting lenses for tag {tag}: {e}")
            return []
    
    def get_related_lenses(self, lens_id: str, k: int = 5) -> List[Dict[str, Any]]:
        """Get lenses related to a given lens based on shared tags."""
        try:
            result = self.client.rpc('get_related_lenses', {
                'lens_id': lens_id,
                'match_count': k
            }).execute()

            if result.data:
                return result.data
            return []
        except Exception as e:
            logger.error(f"Error getting related lenses for {lens_id}: {e}")
            return []

    def get_frame_ids_for_lenses(self, lens_names: List[str], lens_to_frames_map: Dict[str, List[str]] = None) -> Dict[str, List[str]]:
        """
        Get frame_id associations for a list of lens names.

        Args:
            lens_names: List of lens names to look up
            lens_to_frames_map: External mapping of lens_id -> frame_ids (e.g., from lens_frames_thematic.json)
                                 frame_ids is NOT in Supabase - it must be provided externally

        Returns:
            Dictionary mapping lens_name -> [frame_ids]
            Example: {"Systems Thinking": ["frame_systems_complexity"], ...}
        """
        try:
            if not lens_names:
                logger.warning("get_frame_ids_for_lenses: Empty lens_names provided")
                return {}

            if lens_to_frames_map is None:
                logger.error("get_frame_ids_for_lenses: lens_to_frames_map is required - frame_ids not in Supabase")
                return {}

            logger.info(f"get_frame_ids_for_lenses: Looking up {len(lens_names)} lenses: {lens_names}")

            # Strategy: Query lenses for id and name, then use lens_to_frames_map
            # NOTE: Supabase uses 'name' field, not 'lens_name'
            # NOTE: frame_ids is NOT in Supabase - it comes from lens_frames_thematic.json
            result = self.client.table('lenses') \
                .select('id, name') \
                .execute()

            logger.info(f"get_frame_ids_for_lenses: Query returned {len(result.data) if result.data else 0} total lenses")

            # Create a set of target lens names for fast lookup
            target_names = set(lens_names)
            logger.info(f"get_frame_ids_for_lenses: Filtering for {len(target_names)} target lenses")

            if result.data:
                # Debug: Log first 5 lens names from database
                db_sample = [lens.get('name') for lens in result.data[:5]]
                logger.info(f"get_frame_ids_for_lenses: Database sample (first 5): {db_sample}")

                # Build mapping of lens name to frame_ids (only for target lenses)
                # frame_ids come from lens_to_frames_map, NOT from Supabase
                lens_frame_map = {}
                for lens in result.data:
                    name = lens.get('name')  # Use 'name' not 'lens_name'
                    lens_id = lens.get('id')

                    # Debug: Log each comparison for target lenses
                    if name in ['The Thinking Hat', 'Getting over the Hump', 'Footguns']:
                        logger.info(f"get_frame_ids_for_lenses: Found target lens: '{name}' (id: {lens_id})")

                    # Only include if this lens is in our target set
                    if name in target_names:
                        # Look up frame_ids from external mapping
                        frame_ids = lens_to_frames_map.get(lens_id, [])

                        # Handle frame_ids as either list or single string
                        if isinstance(frame_ids, str):
                            frame_ids = [frame_ids]
                        elif not isinstance(frame_ids, list):
                            frame_ids = []

                        lens_frame_map[name] = frame_ids
                        logger.info(f"get_frame_ids_for_lenses: Mapped '{name}' -> {len(frame_ids)} frames")

                logger.info(f"get_frame_ids_for_lenses: Built map with {len(lens_frame_map)} entries (filtered from {len(result.data)} total)")
                if lens_frame_map:
                    logger.info(f"get_frame_ids_for_lenses: Sample match: {list(lens_frame_map.items())[0]}")
                else:
                    logger.warning(f"get_frame_ids_for_lenses: No matches found!")
                    logger.warning(f"get_frame_ids_for_lenses: Target names (repr): {[repr(n) for n in target_names]}")
                    # Log some potential matches for debugging
                    potential = [lens.get('name') for lens in result.data if 'Thinking' in lens.get('name', '')][:3]
                    logger.warning(f"get_frame_ids_for_lenses: Potential 'Thinking' matches in DB: {potential}")
                return lens_frame_map

            logger.warning("get_frame_ids_for_lenses: No results from Supabase query")
            return {}
        except Exception as e:
            logger.error(f"Error getting frame_ids for lenses {lens_names}: {e}")
            import traceback
            traceback.print_exc()
            return {}

    def text_search_lenses(self, search_query: str, k: int = 20) -> List[Dict[str, Any]]:
        """Full-text search on lens names and definitions."""
        try:
            result = self.client.rpc('text_search_lenses', {
                'search_query': search_query,
                'match_count': k
            }).execute()
            
            if result.data:
                return result.data
            return []
        except Exception as e:
            logger.error(f"Error in text search: {e}")
            return []
    
    def get_tag_statistics(self) -> List[Dict[str, Any]]:
        """Get statistics about tag usage."""
        try:
            result = self.client.table('tag_statistics').select("*").execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error getting tag statistics: {e}")
            return []
    
    def get_episode_statistics(self) -> List[Dict[str, Any]]:
        """Get statistics about lenses per episode."""
        try:
            result = self.client.table('episode_statistics').select("*").execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error getting episode statistics: {e}")
            return []
    
    def upsert_lens(self, lens_data: Dict[str, Any]) -> bool:
        """Insert or update a lens."""
        try:
            # Ensure we have required fields
            required_fields = ['id', 'name', 'episode', 'definition']
            for field in required_fields:
                if field not in lens_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Generate embedding if not provided
            if 'embedding' not in lens_data:
                text = f"{lens_data['name']} {lens_data['definition']}"
                lens_data['embedding'] = self.generate_embedding(text)
            
            # Ensure embedding is a list (not numpy array)
            if isinstance(lens_data.get('embedding'), np.ndarray):
                lens_data['embedding'] = lens_data['embedding'].tolist()
            
            # Set default values
            lens_data.setdefault('lens_type', 'unknown')
            lens_data.setdefault('examples', [])
            lens_data.setdefault('related_concepts', [])
            lens_data.setdefault('characteristics', [])
            
            result = self.client.table('lenses').upsert(lens_data).execute()
            
            if result.data:
                logger.info(f"Successfully upserted lens: {lens_data['name']}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error upserting lens: {e}")
            return False
    
    def update_lens_tags(self, lens_id: str, new_tags: List[str]) -> bool:
        """Update the tags (related_concepts) for a lens."""
        try:
            result = self.client.table('lenses').update({
                'related_concepts': new_tags,
                'updated_at': datetime.utcnow().isoformat()
            }).eq('id', lens_id).execute()
            
            if result.data:
                logger.info(f"Successfully updated tags for lens {lens_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error updating lens tags: {e}")
            return False
    
    def delete_lens(self, lens_id: str) -> bool:
        """Delete a lens."""
        try:
            result = self.client.table('lenses').delete().eq('id', lens_id).execute()
            logger.info(f"Deleted lens: {lens_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting lens {lens_id}: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get overall statistics about the lens collection."""
        try:
            # Total lenses
            total_result = self.client.table('lenses').select("id", count='exact').execute()
            total_lenses = total_result.count if total_result else 0
            
            # Unique tags
            tag_stats = self.get_tag_statistics()
            unique_tags = len(tag_stats)
            
            # Episodes with lenses
            episode_stats = self.get_episode_statistics()
            total_episodes = len(episode_stats)
            
            return {
                'total_lenses': total_lenses,
                'unique_tags': unique_tags,
                'total_episodes': total_episodes,
                'average_tags_per_lens': sum(stat['usage_count'] for stat in tag_stats) / total_lenses if total_lenses > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {
                'total_lenses': 0,
                'unique_tags': 0,
                'total_episodes': 0,
                'average_tags_per_lens': 0
            }


# Convenience functions for backward compatibility with Pinecone code
def search_similar_lenses(query: str, k: int = 10, store: Optional[SupabaseLensStore] = None) -> List[Dict[str, Any]]:
    """Backward compatible function for searching lenses."""
    if not store:
        store = SupabaseLensStore()
    return store.search_lenses(query, k)

def get_lens(lens_id: str, store: Optional[SupabaseLensStore] = None) -> Optional[Dict[str, Any]]:
    """Backward compatible function for getting a lens."""
    if not store:
        store = SupabaseLensStore()
    return store.get_lens_by_id(lens_id)