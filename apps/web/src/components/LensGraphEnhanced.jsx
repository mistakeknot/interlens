import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import './LensGraphView.css';

const LensGraphEnhanced = ({ onNodeClick, useEnhanced = true }) => {
  const svgRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [controls, setControls] = useState({
    centerForce: 0.1,
    repelForce: -800,
    linkDistance: 100,
    linkStrength: 0.5,
    showLabels: true,
    showWeakLinks: false,
    showAILinks: true,
    darkMode: true
  });

  const API_BASE_URL = process.env.REACT_APP_LENS_API_URL || 'http://localhost:5003/api/v1';

  // Fetch graph data
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const endpoint = useEnhanced ? '/lenses/graph/enhanced' : '/lenses/graph';
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        const data = await response.json();
        setGraphData(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch graph data:', error);
        setLoading(false);
      }
    };
    fetchGraphData();
  }, [API_BASE_URL, useEnhanced]);

  // Color scheme for different connection types
  const linkColors = {
    concept: '#667eea',
    episode: '#48bb78',
    sequential: '#ed8936',
    principle: '#9f7aea',
    contrast: '#e53e3e',
    synthesis: '#38b2ac',
    emergence: '#d69e2e',
    application: '#3182ce'
  };

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

    // Add arrow markers for directed connections
    svg.append('defs').selectAll('marker')
      .data(['end'])
      .enter().append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#999')
      .style('stroke', 'none');

    // Filter links based on controls
    let filteredLinks = graphData.links;
    if (!controls.showWeakLinks) {
      filteredLinks = filteredLinks.filter(l => l.weight > 0.2);
    }
    if (!controls.showAILinks) {
      filteredLinks = filteredLinks.filter(l => !l.ai_discovered);
    }

    // Create force simulation
    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(filteredLinks)
        .id(d => d.id)
        .strength(d => d.weight * controls.linkStrength * (d.ai_discovered ? 1.5 : 2))
        .distance(d => controls.linkDistance / (d.weight + 0.5)))
      .force('charge', d3.forceManyBody()
        .strength(controls.repelForce)
        .distanceMax(300))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(controls.centerForce))
      .force('collision', d3.forceCollide().radius(d => d.radius + 5))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    // Create links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(filteredLinks)
      .enter().append('line')
      .attr('class', d => `link ${d.type} ${d.ai_discovered ? 'ai-discovered' : ''}`)
      .attr('stroke', d => linkColors[d.type] || '#999')
      .attr('stroke-width', d => Math.sqrt(d.weight * 4))
      .attr('opacity', d => d.weight * 0.8)
      .attr('marker-end', d => d.ai_discovered ? 'url(#arrowhead)' : null)
      .on('mouseover', function(event, d) {
        setHoveredLink(d);
        d3.select(this).attr('stroke-width', d => Math.sqrt(d.weight * 8));
      })
      .on('mouseout', function(event, d) {
        setHoveredLink(null);
        d3.select(this).attr('stroke-width', d => Math.sqrt(d.weight * 4));
      });

    // Add glow effect for AI-discovered links
    link.filter(d => d.ai_discovered)
      .style('filter', 'drop-shadow(0 0 3px rgba(159, 122, 234, 0.6))');

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
        // Highlight connected nodes and links
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
        link.style('opacity', d => d.weight * 0.8);
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
        <p>Discovering lens connections...</p>
      </div>
    );
  }

  return (
    <div className={`graph-container ${controls.darkMode ? 'dark' : 'light'}`}>
      <svg ref={svgRef} className="graph-svg" />
      
      {/* Controls Panel */}
      <div className="graph-controls enhanced">
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
              checked={controls.showAILinks}
              onChange={(e) => handleControlChange('showAILinks', e.target.checked)}
            />
            Show AI Insights
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

        {graphData && (
          <div className="graph-stats">
            <h4>Statistics</h4>
            <p>{graphData.stats.total_nodes} nodes</p>
            <p>{graphData.stats.total_links} connections</p>
            {graphData.stats.ai_enhanced_links && (
              <p className="ai-stat">{graphData.stats.ai_enhanced_links} AI insights</p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="graph-legend">
          <h4>Connection Types</h4>
          <div className="legend-item">
            <span className="legend-color" style={{background: linkColors.concept}}></span>
            <span>Shared Concepts</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{background: linkColors.episode}}></span>
            <span>Same Episode</span>
          </div>
          {controls.showAILinks && (
            <>
              <div className="legend-item">
                <span className="legend-color" style={{background: linkColors.principle}}></span>
                <span>Shared Principle</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{background: linkColors.contrast}}></span>
                <span>Contrasting Ideas</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{background: linkColors.synthesis}}></span>
                <span>Synthesis</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hover Info */}
      {hoveredNode && (
        <div className="node-tooltip">
          <h4>{hoveredNode.name}</h4>
          <p className="type">{hoveredNode.type} • Episode {hoveredNode.episode}</p>
          <p className="connections">{hoveredNode.connectionCount} connections</p>
        </div>
      )}

      {/* Link Hover Info */}
      {hoveredLink && hoveredLink.insight && (
        <div className="link-tooltip">
          <p className="link-type">{hoveredLink.type.toUpperCase()}</p>
          <p className="link-insight">{hoveredLink.insight}</p>
          <p className="link-strength">Strength: {(hoveredLink.weight * 100).toFixed(0)}%</p>
        </div>
      )}
    </div>
  );
};

export default LensGraphEnhanced;