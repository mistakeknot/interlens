import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import cacheService from '../services/cacheService';
import './LensGraphView.css';

const LensGraphView = ({ onNodeClick, semantic = true, entityType = 'lenses' }) => {
  const svgRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [controls, setControls] = useState({
    centerForce: 0.05,
    repelForce: -800,
    linkDistance: 50,
    linkStrength: 0.8,
    showLabels: true,
    showWeakLinks: true,
    darkMode: true,
    minSimilarity: entityType === 'tags' ? 0.1 : entityType === 'frames' ? 0.4 : 0.5,
    maxNodes: entityType === 'frames' ? 50 : entityType === 'tags' ? 100 : 258,
    minCount: 1, // For tags - include all tags
    maxTagNodes: 9999 // Show all available tags by default
  });
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_LENS_API_URL || 'http://localhost:5003/api/v1';

  // Fetch graph data
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        let endpoint;
        let cacheKey;
        
        if (semantic) {
          if (entityType === 'frames') {
            endpoint = `/frames/graph/semantic?min_similarity=${controls.minSimilarity}`;
            cacheKey = cacheService.getGraphCacheKey('frames', { min_similarity: controls.minSimilarity });
          } else if (entityType === 'tags') {
            endpoint = `/tags/graph/semantic?min_similarity=${controls.minSimilarity}&min_count=${controls.minCount}&max_nodes=${controls.maxTagNodes}`;
            cacheKey = cacheService.getGraphCacheKey('tags', { 
              min_similarity: controls.minSimilarity, 
              min_count: controls.minCount, 
              max_nodes: controls.maxTagNodes 
            });
          } else {
            endpoint = `/lenses/graph/semantic?min_similarity=${controls.minSimilarity}&max_nodes=${controls.maxNodes}`;
            cacheKey = cacheService.getGraphCacheKey('lenses', { 
              min_similarity: controls.minSimilarity, 
              max_nodes: controls.maxNodes 
            });
          }
        } else {
          endpoint = '/lenses/graph';
          cacheKey = 'lenses_graph_concept';
        }

        // Check cache first
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
          console.log('Using cached graph data:', cacheKey);
          setGraphData(cachedData);
          setLoading(false);
          return;
        }

        // Fetch from API if not in cache
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        const data = await response.json();
        
        // Cache the response
        cacheService.set(cacheKey, data);
        
        setGraphData(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch graph data:', error);
        setLoading(false);
      }
    };
    fetchGraphData();
  }, [API_BASE_URL, semantic, entityType, controls.minSimilarity, controls.maxNodes, controls.minCount, controls.maxTagNodes]);

  // Initialize D3 force simulation
  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;

    // Clear previous content
    svg.selectAll('*').remove();

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create container for zoom/pan
    const container = svg.append('g');

    // Filter links based on controls
    const filteredLinks = controls.showWeakLinks 
      ? graphData.links 
      : graphData.links.filter(l => l.type !== 'weak');

    // Create force simulation
    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(filteredLinks)
        .id(d => d.id)
        .strength(d => {
          // For semantic similarity, use weight directly
          if (semantic) return d.weight * controls.linkStrength;
          // For concept-based, use the original calculation
          return d.weight * controls.linkStrength * 2;
        })
        .distance(d => {
          // For semantic similarity, closer = more similar
          if (semantic) return controls.linkDistance * (2 - d.weight);
          // For concept-based, use the original calculation
          return controls.linkDistance / (d.weight + 0.5);
        }))
      .force('charge', d3.forceManyBody()
        .strength(controls.repelForce)
        .distanceMax(200)) // Limit repulsion range
      .force('center', d3.forceCenter(width / 2, height / 2).strength(controls.centerForce))
      .force('collision', d3.forceCollide().radius(d => d.radius + 2))
      .force('x', d3.forceX(width / 2).strength(0.05)) // Gentle centering forces
      .force('y', d3.forceY(height / 2).strength(0.05));

    // Create links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(filteredLinks)
      .enter().append('line')
      .attr('class', d => `link ${d.type}`)
      .attr('stroke-width', d => {
        // For semantic similarity, use weight to determine thickness
        if (semantic) return 1 + (d.weight - 0.7) * 10; // Scale from 1-4 pixels
        return Math.sqrt(d.weight * 4);
      })
      .attr('opacity', d => {
        // For semantic similarity, vary opacity by strength
        if (semantic) {
          if (d.type === 'strong') return 0.8;
          if (d.type === 'medium') return 0.5;
          return 0.3;
        }
        return d.weight;
      });

    // Create nodes
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphData.nodes)
      .enter().append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('class', d => `node-circle ${d.type}`)
      .on('mouseover', function(event, d) {
        setHoveredNode(d);
        // Highlight connected nodes
        link.style('opacity', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1
        );
        node.style('opacity', n => {
          const isConnected = filteredLinks.some(l => 
            (l.source.id === d.id && l.target.id === n.id) ||
            (l.target.id === d.id && l.source.id === n.id) ||
            n.id === d.id
          );
          return isConnected ? 1 : 0.2;
        });
      })
      .on('mouseout', function() {
        setHoveredNode(null);
        link.style('opacity', d => d.weight);
        node.style('opacity', 1);
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        setSelectedNode(d);
        if (onNodeClick) onNodeClick(d);
      });

    // Add labels
    if (controls.showLabels) {
      node.append('text')
        .text(d => d.name)
        .attr('x', 0)
        .attr('y', d => -(d.radius + 5))
        .attr('text-anchor', 'middle')
        .attr('class', 'node-label')
        .style('font-size', '10px')
        .style('pointer-events', 'none');
    }

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [graphData, controls, onNodeClick]);

  const handleControlChange = (key, value) => {
    setControls(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="graph-loading">
        <div className="spinner"></div>
        <p>Building lens connections...</p>
      </div>
    );
  }

  return (
    <div className={`graph-container ${controls.darkMode ? 'dark' : 'light'}`}>
      <svg ref={svgRef} className="graph-svg" />
      
      {/* Mobile Controls Toggle Button */}
      <button 
        className="graph-controls-toggle"
        onClick={() => setMobileControlsOpen(!mobileControlsOpen)}
        aria-label="Toggle graph controls"
      >
        ⚙️
      </button>

      {/* Controls Panel */}
      <div className={`graph-controls ${mobileControlsOpen ? 'open' : ''}`}>
        <h3>Graph Controls</h3>
        
        <div className="control-group">
          <label>
            <span>Center Force</span>
            <input 
              type="range" 
              min="0" 
              max="0.5" 
              step="0.01" 
              value={controls.centerForce}
              onChange={(e) => handleControlChange('centerForce', parseFloat(e.target.value))}
            />
            <span className="value">{controls.centerForce.toFixed(2)}</span>
          </label>
        </div>

        <div className="control-group">
          <label>
            <span>Repulsion</span>
            <input 
              type="range" 
              min="-2000" 
              max="-100" 
              step="50" 
              value={controls.repelForce}
              onChange={(e) => handleControlChange('repelForce', parseFloat(e.target.value))}
            />
            <span className="value">{controls.repelForce}</span>
          </label>
        </div>

        <div className="control-group">
          <label>
            <span>Link Distance</span>
            <input 
              type="range" 
              min="10" 
              max="200" 
              step="5" 
              value={controls.linkDistance}
              onChange={(e) => handleControlChange('linkDistance', parseFloat(e.target.value))}
            />
            <span className="value">{controls.linkDistance}</span>
          </label>
        </div>

        <div className="control-group">
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={controls.showLabels}
              onChange={(e) => handleControlChange('showLabels', e.target.checked)}
            />
            Show Labels
          </label>
        </div>

        <div className="control-group">
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={controls.showWeakLinks}
              onChange={(e) => handleControlChange('showWeakLinks', e.target.checked)}
            />
            Show Weak Links
          </label>
        </div>

        <div className="control-group">
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={controls.darkMode}
              onChange={(e) => handleControlChange('darkMode', e.target.checked)}
            />
            Dark Mode
          </label>
        </div>

        {semantic && (
          <>
            <div className="control-group">
              <label>
                <span>Min Similarity</span>
                <input 
                  type="range" 
                  min={entityType === 'tags' ? "0.1" : entityType === 'frames' ? "0.3" : "0.5"} 
                  max="0.9" 
                  step="0.05" 
                  value={controls.minSimilarity}
                  onChange={(e) => handleControlChange('minSimilarity', parseFloat(e.target.value))}
                />
                <span className="value">{controls.minSimilarity.toFixed(2)}</span>
              </label>
            </div>
            {entityType === 'lenses' && (
              <div className="control-group">
                <label>
                  <span>Max Nodes</span>
                  <input 
                    type="range" 
                    min="20" 
                    max="300" 
                    step="10" 
                    value={controls.maxNodes}
                    onChange={(e) => handleControlChange('maxNodes', parseInt(e.target.value))}
                  />
                  <span className="value">{controls.maxNodes}</span>
                </label>
              </div>
            )}
            {entityType === 'tags' && (
              <>
                <div className="control-group">
                  <label>
                    <span>Min Lens Count</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1" 
                      value={controls.minCount}
                      onChange={(e) => handleControlChange('minCount', parseInt(e.target.value))}
                    />
                    <span className="value">{controls.minCount}</span>
                  </label>
                </div>
                <div className="control-group">
                  <label>
                    <span>Max Tags</span>
                    <input 
                      type="range" 
                      min="10" 
                      max="9999" 
                      step="10" 
                      value={controls.maxTagNodes}
                      onChange={(e) => handleControlChange('maxTagNodes', parseInt(e.target.value))}
                    />
                    <span className="value">{controls.maxTagNodes}</span>
                  </label>
                </div>
              </>
            )}
          </>
        )}

        {graphData && graphData.stats && (
          <div className="graph-stats">
            <h4>Statistics</h4>
            <p>{graphData.stats.total_nodes} nodes</p>
            <p>{graphData.stats.total_links} connections</p>
            {semantic ? (
              <>
                {graphData.stats.strong_links !== undefined && (
                  <p>{graphData.stats.strong_links} strong links</p>
                )}
                {graphData.stats.medium_links !== undefined && (
                  <p>{graphData.stats.medium_links} medium links</p>
                )}
                {graphData.stats.weak_links !== undefined && (
                  <p>{graphData.stats.weak_links} weak links</p>
                )}
                {graphData.stats.avg_similarity !== undefined && (
                  <p>Avg similarity: {graphData.stats.avg_similarity}</p>
                )}
                {entityType === 'tags' && graphData.stats.total_tags !== undefined && (
                  <p>Total tags: {graphData.stats.total_tags}</p>
                )}
                {entityType === 'tags' && graphData.stats.filtered_tags !== undefined && (
                  <p>Filtered out: {graphData.stats.filtered_tags}</p>
                )}
              </>
            ) : (
              <>
                {graphData.stats.concept_links !== undefined && (
                  <p>{graphData.stats.concept_links} concept links</p>
                )}
                {graphData.stats.episode_links !== undefined && (
                  <p>{graphData.stats.episode_links} episode links</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Hover Info */}
      {hoveredNode && (
        <div className="node-tooltip">
          <h4>{hoveredNode.name}</h4>
          {entityType === 'lenses' ? (
            <>
              <p className="type">{hoveredNode.type} • Episode {hoveredNode.episode}</p>
              {semantic && (
                <>
                  <p className="definition">{hoveredNode.definition}</p>
                  {hoveredNode.concepts && hoveredNode.concepts.length > 0 && (
                    <p className="concepts">Related: {hoveredNode.concepts.join(', ')}</p>
                  )}
                  <p className="strength">Centrality: {hoveredNode.strength}</p>
                </>
              )}
            </>
          ) : entityType === 'frames' ? (
            <>
              <p className="type">Frame • {hoveredNode.lens_count} lenses</p>
              {hoveredNode.description && (
                <p className="definition">{hoveredNode.description}</p>
              )}
            </>
          ) : entityType === 'tags' ? (
            <>
              <p className="type">Tag • {hoveredNode.lens_count} lenses</p>
            </>
          ) : null}
          {!semantic && hoveredNode.connectionCount !== undefined && (
            <p className="connections">{hoveredNode.connectionCount} connections</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LensGraphView;