"""
Lens Graph Module - Adds graph-based relationships on top of Pinecone vector search
This module enhances lens discovery by leveraging the network structure of lens relationships.
"""
import json
import logging
import os
from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict, deque
import networkx as nx

logger = logging.getLogger(__name__)

# Get the directory containing the data files (project root)
DATA_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class LensGraph:
    """Graph-based lens relationship manager"""
    
    def __init__(self):
        self.graph = nx.DiGraph()
        self._load_lenses()
        self._load_relationships()
        self._build_graph()
    
    def _load_lenses(self):
        """Load all lenses as nodes in the graph"""
        try:
            lens_file = os.path.join(DATA_DIR, 'all_lenses_for_analysis.json')
            with open(lens_file, 'r') as f:
                lenses = json.load(f)
                
            for lens in lenses:
                self.graph.add_node(
                    lens['id'],
                    name=lens['name'],
                    episode=lens['episode'],
                    type=lens['type'],
                    definition=lens.get('definition', ''),
                    related_concepts=lens.get('related_concepts', [])
                )
            
            logger.info(f"Loaded {len(lenses)} lenses into graph")
        except Exception as e:
            logger.error(f"Failed to load lenses: {e}")
    
    def _load_relationships(self):
        """Load lens relationships from various sources"""
        # Load AI-discovered connections
        try:
            connections_file = os.path.join(DATA_DIR, 'claude_lens_connections_analysis.json')
            with open(connections_file, 'r') as f:
                data = json.load(f)
                connections = data.get('connections', [])
                
            for conn in connections:
                self.graph.add_edge(
                    conn['source_id'],
                    conn['target_id'],
                    weight=conn['weight'],
                    type=conn['type'],
                    insight=conn.get('insight', '')
                )
            
            logger.info(f"Loaded {len(connections)} AI connections")
        except Exception as e:
            logger.error(f"Failed to load AI connections: {e}")
        
        # Load frame-based relationships
        try:
            frames_file = os.path.join(DATA_DIR, 'lens_frames_thematic.json')
            with open(frames_file, 'r') as f:
                data = json.load(f)
                frames = data.get('frames', [])
                
            # Connect lenses within the same frame
            for frame in frames:
                lens_ids = frame.get('lens_ids', [])
                frame_id = frame['id']
                
                # Create weaker connections between lenses in same frame
                for i, lens1 in enumerate(lens_ids):
                    for lens2 in lens_ids[i+1:]:
                        if not self.graph.has_edge(lens1, lens2):
                            self.graph.add_edge(
                                lens1,
                                lens2,
                                weight=0.3,
                                type='frame',
                                frame=frame_id
                            )
        except Exception as e:
            logger.error(f"Failed to load frame relationships: {e}")
    
    def _build_graph(self):
        """Build additional graph structures for efficient querying"""
        # Add episode-based temporal connections
        nodes_by_episode = defaultdict(list)
        for node, data in self.graph.nodes(data=True):
            if 'episode' in data:
                try:
                    ep = int(data['episode'])
                    nodes_by_episode[ep].append(node)
                except:
                    pass
        
        # Connect lenses from adjacent episodes
        for ep in sorted(nodes_by_episode.keys()):
            if ep + 1 in nodes_by_episode:
                for lens1 in nodes_by_episode[ep]:
                    for lens2 in nodes_by_episode[ep + 1]:
                        if not self.graph.has_edge(lens1, lens2):
                            self.graph.add_edge(
                                lens1,
                                lens2,
                                weight=0.1,
                                type='temporal',
                                episodes=f"{ep}->{ep+1}"
                            )
        
        # Add concept-based connections
        concept_to_lenses = defaultdict(set)
        for node, data in self.graph.nodes(data=True):
            for concept in data.get('related_concepts', []):
                concept_to_lenses[concept.lower()].add(node)
        
        # Connect lenses that share rare concepts (more valuable than common ones)
        for concept, lenses in concept_to_lenses.items():
            if 2 <= len(lenses) <= 5:  # Rare but not unique concepts
                lens_list = list(lenses)
                for i, lens1 in enumerate(lens_list):
                    for lens2 in lens_list[i+1:]:
                        if not self.graph.has_edge(lens1, lens2):
                            self.graph.add_edge(
                                lens1,
                                lens2,
                                weight=0.4,
                                type='concept',
                                shared_concept=concept
                            )
    
    def find_path(self, source_lens_id: str, target_lens_id: str, max_length: int = 4) -> List[List[str]]:
        """Find paths between two lenses"""
        try:
            # Find all simple paths up to max_length
            paths = list(nx.all_simple_paths(
                self.graph, 
                source_lens_id, 
                target_lens_id, 
                cutoff=max_length
            ))
            
            # Sort by total weight (higher is better)
            def path_weight(path):
                weight = 0
                for i in range(len(path) - 1):
                    edge_data = self.graph.get_edge_data(path[i], path[i+1])
                    if edge_data:
                        weight += edge_data.get('weight', 0)
                return weight
            
            paths.sort(key=path_weight, reverse=True)
            return paths[:3]  # Return top 3 paths
            
        except nx.NetworkXNoPath:
            return []
        except Exception as e:
            logger.error(f"Error finding path: {e}")
            return []
    
    def find_bridges(self, lens_ids: List[str]) -> List[str]:
        """Find lenses that bridge between given lenses"""
        bridges = set()
        
        for i, lens1 in enumerate(lens_ids):
            for lens2 in lens_ids[i+1:]:
                # Find nodes that connect both
                try:
                    for path in nx.all_simple_paths(self.graph, lens1, lens2, cutoff=3):
                        if len(path) == 3:  # Has exactly one bridge
                            bridges.add(path[1])
                except:
                    continue
        
        # Score bridges by how many pairs they connect
        bridge_scores = {}
        for bridge in bridges:
            score = 0
            for lens in lens_ids:
                if lens != bridge and self.graph.has_edge(lens, bridge):
                    score += self.graph[lens][bridge].get('weight', 0)
                if lens != bridge and self.graph.has_edge(bridge, lens):
                    score += self.graph[bridge][lens].get('weight', 0)
            bridge_scores[bridge] = score
        
        # Return top bridges
        sorted_bridges = sorted(bridge_scores.items(), key=lambda x: x[1], reverse=True)
        return [bridge for bridge, _ in sorted_bridges[:5]]
    
    def find_contrasts(self, lens_id: str) -> List[Tuple[str, str]]:
        """Find lenses that contrast with the given lens"""
        contrasts = []
        
        # Look for edges marked as 'contrast' or 'paradox'
        for neighbor in self.graph.neighbors(lens_id):
            edge_data = self.graph.get_edge_data(lens_id, neighbor)
            if edge_data and edge_data.get('type') in ['contrast', 'paradox']:
                contrasts.append((neighbor, edge_data.get('insight', '')))
        
        # Also check incoming edges
        for predecessor in self.graph.predecessors(lens_id):
            edge_data = self.graph.get_edge_data(predecessor, lens_id)
            if edge_data and edge_data.get('type') in ['contrast', 'paradox']:
                contrasts.append((predecessor, edge_data.get('insight', '')))
        
        return contrasts
    
    def get_lens_neighborhood(self, lens_id: str, radius: int = 2) -> Dict[str, List[str]]:
        """Get the neighborhood of related lenses"""
        neighborhood = defaultdict(list)
        
        # Use BFS to explore neighborhood
        visited = {lens_id}
        queue = deque([(lens_id, 0)])
        
        while queue:
            current, depth = queue.popleft()
            
            if depth >= radius:
                continue
            
            # Explore neighbors
            for neighbor in self.graph.neighbors(current):
                if neighbor not in visited:
                    visited.add(neighbor)
                    edge_data = self.graph.get_edge_data(current, neighbor)
                    edge_type = edge_data.get('type', 'unknown')
                    neighborhood[edge_type].append(neighbor)
                    queue.append((neighbor, depth + 1))
        
        return dict(neighborhood)
    
    def suggest_lens_journey(self, start_lens_id: str, target_concept: str) -> List[str]:
        """Suggest a journey of lenses leading toward a target concept"""
        # Find lenses related to the target concept
        target_lenses = []
        for node, data in self.graph.nodes(data=True):
            if target_concept.lower() in data.get('definition', '').lower():
                target_lenses.append(node)
            elif any(target_concept.lower() in c.lower() for c in data.get('related_concepts', [])):
                target_lenses.append(node)
        
        if not target_lenses:
            return []
        
        # Find shortest paths to any target lens
        journeys = []
        for target in target_lenses[:5]:  # Check top 5 targets
            try:
                path = nx.shortest_path(
                    self.graph, 
                    start_lens_id, 
                    target,
                    weight=lambda u, v, d: 1 / d.get('weight', 0.1)  # Invert weight for shortest path
                )
                if len(path) <= 5:  # Reasonable journey length
                    journeys.append(path)
            except nx.NetworkXNoPath:
                continue
        
        # Return the shortest journey
        if journeys:
            journeys.sort(key=len)
            return journeys[0]
        
        return []
    
    def get_lens_clusters(self) -> Dict[int, List[str]]:
        """Identify clusters of highly connected lenses"""
        # Convert to undirected for community detection
        undirected = self.graph.to_undirected()
        
        # Find communities using Louvain method
        try:
            import community as community_louvain
            partition = community_louvain.best_partition(undirected)
            
            # Group lenses by community
            clusters = defaultdict(list)
            for lens_id, cluster_id in partition.items():
                clusters[cluster_id].append(lens_id)
            
            return dict(clusters)
        except ImportError:
            # Fallback to connected components
            clusters = {}
            for i, component in enumerate(nx.connected_components(undirected)):
                if len(component) > 1:  # Ignore isolated nodes
                    clusters[i] = list(component)
            
            return clusters
    
    def get_central_lenses(self, measure: str = 'betweenness') -> List[Tuple[str, float]]:
        """Get most central/important lenses in the graph"""
        measure_lower = measure.lower()

        if measure_lower == 'betweenness':
            centrality = nx.betweenness_centrality(self.graph)
        elif measure_lower == 'eigenvector':
            try:
                centrality = nx.eigenvector_centrality(self.graph, max_iter=100)
            except:
                centrality = nx.degree_centrality(self.graph)
        elif measure_lower == 'pagerank':
            try:
                # Use default parameters for PageRank
                centrality = nx.pagerank(self.graph)
            except Exception:
                # Fall back to degree centrality if PageRank fails
                centrality = nx.degree_centrality(self.graph)
        else:
            centrality = nx.degree_centrality(self.graph)
        
        # Sort by centrality score
        sorted_lenses = sorted(centrality.items(), key=lambda x: x[1], reverse=True)
        
        # Add lens names for clarity
        result = []
        for lens_id, score in sorted_lenses[:10]:
            node_data = self.graph.nodes[lens_id]
            result.append((lens_id, score, node_data.get('name', 'Unknown')))
        
        return result


class GraphEnhancedRetrieval:
    """Combines vector search with graph traversal for enhanced retrieval"""
    
    def __init__(self):
        self.graph = LensGraph()
    
    async def enhance_retrieval(self, initial_lenses: List[Dict], query: str) -> List[Dict]:
        """Enhance initial retrieval results using graph relationships"""
        enhanced_lenses = initial_lenses.copy()
        lens_ids = {lens['id'] for lens in initial_lenses}
        
        # Find bridges between initial lenses
        bridge_ids = self.graph.find_bridges(list(lens_ids))
        
        # Find contrasting lenses for diversity
        contrast_ids = set()
        for lens_id in list(lens_ids)[:3]:  # Check top 3
            contrasts = self.graph.find_contrasts(lens_id)
            contrast_ids.update([c[0] for c in contrasts])
        
        # Get neighborhood lenses
        neighborhood_ids = set()
        for lens_id in list(lens_ids)[:2]:  # Check top 2
            neighborhood = self.graph.get_lens_neighborhood(lens_id, radius=1)
            for lens_list in neighborhood.values():
                neighborhood_ids.update(lens_list)
        
        # Combine all additional lens IDs
        additional_ids = (set(bridge_ids) | contrast_ids | neighborhood_ids) - lens_ids
        
        # Retrieve metadata for additional lenses (mock for now)
        for lens_id in additional_ids:
            if lens_id in self.graph.graph:
                node_data = self.graph.graph.nodes[lens_id]
                enhanced_lenses.append({
                    'id': lens_id,
                    'lens_name': node_data.get('name', 'Unknown'),
                    'episode': node_data.get('episode', 'Unknown'),
                    'definition': node_data.get('definition', ''),
                    'type': 'lens',
                    'source': 'graph',
                    'related_concepts': node_data.get('related_concepts', [])
                })
        
        logger.info(f"Enhanced {len(initial_lenses)} lenses to {len(enhanced_lenses)} using graph")
        return enhanced_lenses
    
    def find_lens_synthesis_path(self, lens_ids: List[str]) -> Optional[Dict]:
        """Find a synthesis path connecting multiple lenses"""
        if len(lens_ids) < 2:
            return None
        
        # Try to find paths between all pairs
        paths = []
        for i, lens1 in enumerate(lens_ids):
            for lens2 in lens_ids[i+1:]:
                lens_paths = self.graph.find_path(lens1, lens2)
                if lens_paths:
                    paths.append({
                        'from': lens1,
                        'to': lens2,
                        'path': lens_paths[0],  # Best path
                        'length': len(lens_paths[0])
                    })
        
        if not paths:
            return None
        
        # Find the most interesting synthesis
        paths.sort(key=lambda x: x['length'])
        
        synthesis = {
            'type': 'path_synthesis',
            'paths': paths[:3],
            'insight': self._generate_path_insight(paths[0])
        }
        
        return synthesis
    
    def _generate_path_insight(self, path_info: Dict) -> str:
        """Generate insight about a path between lenses"""
        path = path_info['path']
        if len(path) == 2:
            return "These lenses are directly connected"
        elif len(path) == 3:
            bridge_name = self.graph.graph.nodes[path[1]].get('name', 'Unknown')
            return f"These lenses connect through {bridge_name}"
        else:
            return f"These lenses connect through a {len(path)-1} step journey"
    
    def get_lens_recommendations(self, current_lens_ids: List[str], limit: int = 5) -> List[Dict]:
        """Recommend related lenses based on graph structure"""
        recommendations = defaultdict(float)
        
        for lens_id in current_lens_ids:
            # Get neighbors with weights
            for neighbor in self.graph.graph.neighbors(lens_id):
                if neighbor not in current_lens_ids:
                    edge_data = self.graph.graph.get_edge_data(lens_id, neighbor)
                    weight = edge_data.get('weight', 0.5)
                    recommendations[neighbor] += weight
        
        # Sort by score
        sorted_recs = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
        
        # Format recommendations
        result = []
        for lens_id, score in sorted_recs[:limit]:
            node_data = self.graph.graph.nodes[lens_id]
            result.append({
                'id': lens_id,
                'name': node_data.get('name', 'Unknown'),
                'episode': node_data.get('episode', 'Unknown'),
                'score': score,
                'reason': 'Connected through graph relationships'
            })
        
        return result


# Export classes
__all__ = ['LensGraph', 'GraphEnhancedRetrieval']