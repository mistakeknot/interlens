import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './LensGraphView.css';

const LensGraphViewSimple = ({ onNodeClick, semantic = true, entityType = 'lenses' }) => {
  const canvasRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const simulationRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  
  const API_BASE_URL = process.env.REACT_APP_LENS_API_URL || 'http://localhost:5003/api/v1';

  // Fetch graph data
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        let endpoint;
        if (semantic) {
          if (entityType === 'frames') {
            endpoint = `/frames/graph/semantic?min_similarity=0.4`;
          } else if (entityType === 'tags') {
            endpoint = `/tags/graph/semantic?min_similarity=0.1&min_count=1&max_nodes=200`;
          } else {
            endpoint = `/lenses/graph/semantic?min_similarity=0.5&max_nodes=258`;
          }
        } else {
          endpoint = '/lenses/graph';
        }
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
  }, [API_BASE_URL, semantic, entityType]);

  // Initialize graph
  useEffect(() => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;

    // Store refs
    nodesRef.current = graphData.nodes;
    linksRef.current = graphData.links;

    // Create simulation
    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id(d => d.id).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.radius + 2));

    simulationRef.current = simulation;

    // Setup zoom
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        context.save();
        context.clearRect(0, 0, width, height);
        context.translate(event.transform.x, event.transform.y);
        context.scale(event.transform.k, event.transform.k);
        render();
        context.restore();
      });

    d3.select(canvas).call(zoom);

    // Render function
    const render = () => {
      // Clear canvas
      context.clearRect(0, 0, width, height);

      // Draw links
      context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      linksRef.current.forEach(link => {
        context.beginPath();
        context.moveTo(link.source.x, link.source.y);
        context.lineTo(link.target.x, link.target.y);
        context.stroke();
      });

      // Draw nodes
      nodesRef.current.forEach(node => {
        context.beginPath();
        context.arc(node.x, node.y, node.radius || 8, 0, 2 * Math.PI);
        context.fillStyle = '#60a5fa';
        context.fill();
        context.strokeStyle = '#ffffff';
        context.stroke();
      });
    };

    // Animation loop
    simulation.on('tick', () => {
      render();
    });

    // Handle clicks
    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Find clicked node
      const clickedNode = nodesRef.current.find(node => {
        const dx = x - node.x;
        const dy = y - node.y;
        return Math.sqrt(dx * dx + dy * dy) <= (node.radius || 8);
      });
      
      if (clickedNode && onNodeClick) {
        onNodeClick(clickedNode);
      }
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, onNodeClick]);

  if (loading) {
    return (
      <div className="graph-loading">
        <div className="spinner"></div>
        <p>Building lens connections...</p>
      </div>
    );
  }

  return (
    <div className="graph-container dark">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default LensGraphViewSimple;