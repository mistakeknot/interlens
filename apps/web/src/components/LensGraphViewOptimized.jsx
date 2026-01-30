import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import debounce from 'lodash.debounce';
import cacheService from '../services/cacheService';
import './LensGraphView.css';

const LensGraphViewOptimized = ({ onNodeClick, semantic = true, entityType = 'lenses' }) => {
  const canvasRef = useRef(null);
  const simulationRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const transformRef = useRef(d3.zoomIdentity);
  const animationIdRef = useRef(null);
  const hoveredNodeRef = useRef(null);
  const frameColorsRef = useRef(new Map());
  const frameNamesRef = useRef(new Map());
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
    minCount: 1,
    maxTagNodes: 9999,
    selectedFrames: new Set(),
    highlightSharedFrames: false
  });
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_LENS_API_URL || 'http://localhost:5003/api/v1';

  // Pre-calculate node connections for fast hover lookups
  const nodeConnections = useMemo(() => {
    if (!graphData) return new Map();
    
    const connections = new Map();
    graphData.nodes.forEach(node => {
      connections.set(node.id, new Set());
    });
    
    const links = controls.showWeakLinks 
      ? graphData.links 
      : graphData.links.filter(l => l.type !== 'weak');
    
    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      connections.get(sourceId)?.add(targetId);
      connections.get(targetId)?.add(sourceId);
    });
    
    return connections;
  }, [graphData, controls.showWeakLinks]);

  // Fetch frames data and generate colors
  useEffect(() => {
    if (!graphData || entityType !== 'lenses') return;
    
    // Fetch frames data with cache
    const fetchFrames = async () => {
      const cacheKey = 'frames_all';
      
      // Check cache first
      const cachedData = cacheService.get(cacheKey);
      if (cachedData && cachedData.success && cachedData.frames) {
        const frameNames = new Map();
        cachedData.frames.forEach(frame => {
          frameNames.set(frame.id, frame.name);
        });
        frameNamesRef.current = frameNames;
        return;
      }
      
      // Fetch from API
      try {
        const res = await fetch(`${API_BASE_URL}/frames`);
        const data = await res.json();
        
        if (data.success && data.frames) {
          // Cache the response
          cacheService.set(cacheKey, data);
          
          // Store frame names
          const frameNames = new Map();
          data.frames.forEach(frame => {
            frameNames.set(frame.id, frame.name);
          });
          frameNamesRef.current = frameNames;
        }
      } catch (err) {
        console.error('Failed to fetch frames:', err);
      }
    };
    
    fetchFrames();
    
    // Collect all unique frame IDs
    const allFrameIds = new Set();
    let nodesWithFrames = 0;
    graphData.nodes.forEach(node => {
      if (node.frame_ids && node.frame_ids.length > 0) {
        nodesWithFrames++;
        node.frame_ids.forEach(frameId => allFrameIds.add(frameId));
      }
    });
    
    console.log('Nodes with frames:', nodesWithFrames, 'Total frames:', allFrameIds.size);
    console.log('Sample nodes with frames:', graphData.nodes.filter(n => n.frame_ids && n.frame_ids.length > 0).slice(0, 3));
    
    // Generate colors for each frame
    const frameColors = new Map();
    const colorPalette = [
      '#e74c3c', '#e67e22', '#f39c12', '#f1c40f', '#2ecc71',
      '#27ae60', '#16a085', '#3498db', '#2980b9', '#9b59b6',
      '#8e44ad', '#34495e', '#e91e63', '#00bcd4', '#009688',
      '#4caf50', '#ff9800', '#795548', '#607d8b', '#ff5722'
    ];
    
    let colorIndex = 0;
    allFrameIds.forEach(frameId => {
      frameColors.set(frameId, colorPalette[colorIndex % colorPalette.length]);
      colorIndex++;
    });
    
    frameColorsRef.current = frameColors;
    console.log('Frame colors:', frameColors);
  }, [graphData, entityType, API_BASE_URL]);

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

  // Initialize or update force simulation and rendering
  useEffect(() => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    context.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Filter links based on controls
    const filteredLinks = controls.showWeakLinks 
      ? graphData.links 
      : graphData.links.filter(l => l.type !== 'weak');

    // Store refs for access in render function
    nodesRef.current = graphData.nodes;
    linksRef.current = filteredLinks;

    // Create or update simulation
    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation(graphData.nodes)
        .alphaDecay(0.028)
        .velocityDecay(0.4)
        .alphaMin(0.001);
    } else {
      simulationRef.current.nodes(graphData.nodes);
    }

    // Update forces
    simulationRef.current
      .force('link', d3.forceLink(filteredLinks)
        .id(d => d.id)
        .strength(d => d.weight * controls.linkStrength)
        .distance(d => controls.linkDistance * (2 - d.weight)))
      .force('charge', d3.forceManyBody()
        .strength(controls.repelForce)
        .distanceMax(200))
      .force('center', d3.forceCenter(width / 2 / window.devicePixelRatio, height / 2 / window.devicePixelRatio).strength(controls.centerForce))
      .force('collision', d3.forceCollide().radius(d => d.radius + 2))
      .force('x', d3.forceX(width / 2 / window.devicePixelRatio).strength(0.05))
      .force('y', d3.forceY(height / 2 / window.devicePixelRatio).strength(0.05));

    if (simulationRef.current.alpha() < 0.01) {
      simulationRef.current.alpha(0.3).restart();
    }

    // Render function using canvas
    const render = () => {
      context.save();
      context.clearRect(0, 0, width / window.devicePixelRatio, height / window.devicePixelRatio);
      
      // Apply zoom transform
      const transform = transformRef.current;
      context.translate(transform.x, transform.y);
      context.scale(transform.k, transform.k);

      // Set styles based on dark mode
      const bgColor = controls.darkMode ? '#0a0a0a' : '#ffffff';
      const linkColor = controls.darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
      const nodeColor = controls.darkMode ? '#ffffff' : '#000000';
      const textColor = controls.darkMode ? '#ffffff' : '#000000';

      // Draw links
      linksRef.current.forEach(link => {
        const hovered = hoveredNodeRef.current;
        let opacity = hovered 
          ? (link.source.id === hovered.id || link.target.id === hovered.id ? 1 : 0.1)
          : (semantic ? (link.type === 'strong' ? 0.8 : link.type === 'medium' ? 0.5 : 0.3) : link.weight);
        
        // Check if both nodes match frame filter
        if (controls.selectedFrames.size > 0) {
          const sourceHasFrame = link.source.frame_ids?.some(fid => controls.selectedFrames.has(fid));
          const targetHasFrame = link.target.frame_ids?.some(fid => controls.selectedFrames.has(fid));
          
          if (!sourceHasFrame || !targetHasFrame) {
            opacity *= 0.1;
          } else if (controls.highlightSharedFrames) {
            // Highlight links between nodes that share selected frames
            const sharedFrames = link.source.frame_ids.filter(fid => 
              controls.selectedFrames.has(fid) && link.target.frame_ids.includes(fid)
            );
            if (sharedFrames.length > 0) {
              opacity = 1;
              context.strokeStyle = frameColorsRef.current.get(sharedFrames[0]) || linkColor;
            }
          }
        }
        
        context.beginPath();
        context.moveTo(link.source.x, link.source.y);
        context.lineTo(link.target.x, link.target.y);
        if (!controls.highlightSharedFrames || controls.selectedFrames.size === 0) {
          context.strokeStyle = linkColor;
        }
        context.globalAlpha = opacity;
        context.lineWidth = semantic ? 1 + (link.weight - 0.7) * 10 : Math.sqrt(link.weight * 4);
        context.stroke();
      });

      // Reset alpha
      context.globalAlpha = 1;

      // Draw nodes
      nodesRef.current.forEach(node => {
        const hovered = hoveredNodeRef.current;
        const isHovered = hovered && node.id === hovered.id;
        const isConnected = hovered && (nodeConnections.get(hovered.id)?.has(node.id) || node.id === hovered.id);
        
        // Check if node matches selected frames
        const hasSelectedFrame = controls.selectedFrames.size === 0 || 
          (node.frame_ids && node.frame_ids.some(fid => controls.selectedFrames.has(fid)));
        
        // Base opacity logic
        let opacity = hovered ? (isConnected ? 1 : 0.2) : 1;
        
        // Apply frame filter opacity
        if (controls.selectedFrames.size > 0 && !hasSelectedFrame) {
          opacity *= 0.2;
        }

        // Draw node with improved frame visualization for lenses
        if (entityType === 'lenses' && node.frame_ids && node.frame_ids.length > 0) {
          // Use primary frame color for base node
          const primaryFrameId = node.frame_ids[0];
          const primaryColor = frameColorsRef.current.get(primaryFrameId) || '#6b7280';
          
          // Draw base node
          context.beginPath();
          context.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
          context.fillStyle = primaryColor;
          context.globalAlpha = opacity;
          context.fill();
          
          // Draw border based on frame count
          const frameCount = node.frame_ids.length;
          context.beginPath();
          context.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
          context.strokeStyle = nodeColor;
          context.globalAlpha = opacity;
          
          if (frameCount === 2) {
            // Double border for 2 frames
            context.lineWidth = isHovered ? 3 : 1;
            context.stroke();
            context.beginPath();
            context.arc(node.x, node.y, node.radius + 3, 0, 2 * Math.PI);
            context.lineWidth = isHovered ? 2 : 0.5;
            context.stroke();
          } else if (frameCount >= 3) {
            // Dotted border for 3+ frames
            context.lineWidth = isHovered ? 3 : 2;
            context.setLineDash([3, 3]);
            context.stroke();
            context.setLineDash([]);
          } else {
            // Single border for 1 frame
            context.lineWidth = isHovered ? 3 : 1;
            context.stroke();
          }
          
          // Draw frame count badge for 3+ frames
          if (frameCount >= 3) {
            const badgeRadius = 8;
            const badgeX = node.x + node.radius * 0.7;
            const badgeY = node.y - node.radius * 0.7;
            
            // Badge background
            context.beginPath();
            context.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
            context.fillStyle = controls.darkMode ? '#1f2937' : '#ffffff';
            context.fill();
            context.strokeStyle = nodeColor;
            context.lineWidth = 1;
            context.stroke();
            
            // Badge text
            context.fillStyle = controls.darkMode ? '#ffffff' : '#000000';
            context.font = '10px sans-serif';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(frameCount.toString(), badgeX, badgeY);
          }
        } else if (entityType === 'lenses' && node.type) {
          // Fallback to type-based colors if no frames
          context.beginPath();
          context.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
          
          const lensColors = {
            headline: controls.darkMode ? '#e74c3c' : '#c0392b',  // Red
            weekly: controls.darkMode ? '#3498db' : '#2980b9'      // Blue
          };
          context.fillStyle = lensColors[node.type] || getNodeColor(node, controls.darkMode);
          context.globalAlpha = opacity;
          context.fill();
          
          // Draw border
          context.strokeStyle = nodeColor;
          context.lineWidth = isHovered ? 3 : 1;
          context.stroke();
        } else {
          // Default node rendering for other entity types
          context.beginPath();
          context.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
          context.fillStyle = getNodeColor(node, controls.darkMode);
          context.globalAlpha = opacity;
          context.fill();
          
          // Draw border
          context.strokeStyle = nodeColor;
          context.lineWidth = isHovered ? 3 : 1;
          context.stroke();
        }

        // Draw labels if enabled and zoomed in enough
        if (controls.showLabels && transform.k > 0.5) {
          context.fillStyle = textColor;
          context.font = `${10 / transform.k}px sans-serif`;
          context.textAlign = 'center';
          context.textBaseline = 'bottom';
          context.fillText(node.name, node.x, node.y - node.radius - 5);
        }
      });

      context.restore();
    };

    // Animation loop
    const animate = () => {
      render();
      animationIdRef.current = requestAnimationFrame(animate);
    };

    if (!animationIdRef.current) {
      animate();
    }
    
    simulationRef.current.on('tick', () => {
      // Animation already running
    });

    // Setup zoom and interactions
    const selection = d3.select(canvas);
    
    // Track dragging state
    let draggedNode = null;
    let isDragging = false;
    
    // Custom zoom that respects dragging
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .filter((event) => {
        // Allow wheel events for zooming
        if (event.type === 'wheel') return true;
        // Block zoom during node dragging
        if (isDragging) return false;
        // Check if starting on a node
        const [x, y] = d3.pointer(event, canvas);
        const transform = transformRef.current;
        const scaledX = (x - transform.x) / transform.k;
        const scaledY = (y - transform.y) / transform.k;
        const node = nodesRef.current.find(n => {
          const dx = scaledX - n.x;
          const dy = scaledY - n.y;
          return Math.sqrt(dx * dx + dy * dy) <= n.radius;
        });
        // Allow zoom only if not on a node
        return !node;
      })
      .on('zoom', (event) => {
        transformRef.current = event.transform;
      });

    selection.call(zoom);

    // Handle all mouse interactions
    let mouseDownPos = null;
    let hasMoved = false;
    
    const handleMouseDown = (event) => {
      const [x, y] = d3.pointer(event, canvas);
      const transform = transformRef.current;
      const scaledX = (x - transform.x) / transform.k;
      const scaledY = (y - transform.y) / transform.k;
      
      draggedNode = nodesRef.current.find(node => {
        const dx = scaledX - node.x;
        const dy = scaledY - node.y;
        return Math.sqrt(dx * dx + dy * dy) <= node.radius;
      });
      
      if (draggedNode) {
        mouseDownPos = { x, y };
        hasMoved = false;
        draggedNode.fx = draggedNode.x;
        draggedNode.fy = draggedNode.y;
        event.stopPropagation();
      }
    };

    const handleMouseMove = (event) => {
      const [x, y] = d3.pointer(event, canvas);
      const transform = transformRef.current;
      const scaledX = (x - transform.x) / transform.k;
      const scaledY = (y - transform.y) / transform.k;
      
      if (draggedNode && mouseDownPos) {
        // Check if we've moved enough to start dragging
        const dx = x - mouseDownPos.x;
        const dy = y - mouseDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 3 || hasMoved) {
          if (!hasMoved) {
            hasMoved = true;
            isDragging = true;
            // Only restart simulation when we actually start dragging
            simulationRef.current.alphaTarget(0.1).restart();
          }
          draggedNode.fx = scaledX;
          draggedNode.fy = scaledY;
        }
      } else {
        const node = nodesRef.current.find(node => {
          const dx = scaledX - node.x;
          const dy = scaledY - node.y;
          return Math.sqrt(dx * dx + dy * dy) <= node.radius;
        });
        
        if (node !== hoveredNodeRef.current) {
          hoveredNodeRef.current = node || null;
          setHoveredNode(node || null);
        }
      }
    };

    const handleMouseUp = (event) => {
      if (draggedNode && !hasMoved) {
        // This was a click
        setSelectedNode(draggedNode);
        if (onNodeClick) onNodeClick(draggedNode);
      }
      
      if (draggedNode) {
        draggedNode.fx = null;
        draggedNode.fy = null;
        if (hasMoved) {
          simulationRef.current.alphaTarget(0);
        }
      }
      
      draggedNode = null;
      isDragging = false;
      mouseDownPos = null;
      hasMoved = false;
    };

    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [graphData, controls, nodeConnections, onNodeClick]);

  // Debounced control change handler
  const handleControlChange = useCallback(
    debounce((key, value) => {
      setControls(prev => ({ ...prev, [key]: value }));
    }, 100),
    []
  );

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
      <canvas ref={canvasRef} className="graph-canvas" />
      
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
              defaultValue={controls.centerForce}
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
              defaultValue={controls.repelForce}
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
              defaultValue={controls.linkDistance}
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
              onChange={(e) => setControls(prev => ({ ...prev, showLabels: e.target.checked }))}
            />
            Show Labels
          </label>
        </div>

        <div className="control-group">
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={controls.showWeakLinks}
              onChange={(e) => setControls(prev => ({ ...prev, showWeakLinks: e.target.checked }))}
            />
            Show Weak Links
          </label>
        </div>

        <div className="control-group">
          <label className="checkbox">
            <input 
              type="checkbox" 
              checked={controls.darkMode}
              onChange={(e) => setControls(prev => ({ ...prev, darkMode: e.target.checked }))}
            />
            Dark Mode
          </label>
        </div>

        {graphData && graphData.stats && (
          <div className="graph-stats">
            <h4>Statistics</h4>
            <p>{graphData.stats.total_nodes} nodes</p>
            <p>{graphData.stats.total_links} connections</p>
            {semantic && graphData.stats.avg_similarity !== undefined && (
              <p>Avg similarity: {graphData.stats.avg_similarity}</p>
            )}
            {entityType === 'lenses' && (
              <>
                <p>{nodesRef.current.filter(n => n.frame_ids?.length === 2).length} lenses with 2 frames</p>
                <p>{nodesRef.current.filter(n => n.frame_ids?.length >= 3).length} lenses with 3+ frames</p>
              </>
            )}
          </div>
        )}
        
        {entityType === 'lenses' && (
          <div className="graph-legend" style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '12px', marginBottom: '8px' }}>Node Indicators</h4>
            <div style={{ fontSize: '11px', color: '#8b949e' }}>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '1px solid #8b949e', borderRadius: '50%', verticalAlign: 'middle', marginRight: '8px' }}></span>
                Single frame
              </div>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '1px solid #8b949e', borderRadius: '50%', verticalAlign: 'middle', marginRight: '8px', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: '-3px', left: '-3px', width: '20px', height: '20px', border: '0.5px solid #8b949e', borderRadius: '50%' }}></span>
                </span>
                Two frames
              </div>
              <div>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px dotted #8b949e', borderRadius: '50%', verticalAlign: 'middle', marginRight: '8px' }}></span>
                Three+ frames (with count)
              </div>
            </div>
          </div>
        )}
        
        {entityType === 'lenses' && frameColorsRef.current.size > 0 && (
          <div className="graph-legend">
            <h4>Frames</h4>
            <div className="control-group">
              <label className="checkbox" style={{ fontSize: '12px', marginBottom: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={controls.highlightSharedFrames}
                  onChange={(e) => setControls(prev => ({ ...prev, highlightSharedFrames: e.target.checked }))}
                />
                Highlight shared frames
              </label>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {Array.from(frameColorsRef.current.entries()).map(([frameId, color]) => {
                const frameName = frameNamesRef.current.get(frameId) || frameId;
                const isSelected = controls.selectedFrames.has(frameId);
                const lensCount = nodesRef.current.filter(n => n.frame_ids?.includes(frameId)).length;
                return (
                  <div 
                    key={frameId} 
                    className="legend-item clickable"
                    onClick={() => {
                      const newSelected = new Set(controls.selectedFrames);
                      if (isSelected) {
                        newSelected.delete(frameId);
                      } else {
                        newSelected.add(frameId);
                      }
                      setControls(prev => ({ ...prev, selectedFrames: newSelected }));
                    }}
                    style={{ 
                      cursor: 'pointer',
                      opacity: controls.selectedFrames.size > 0 && !isSelected ? 0.5 : 1,
                      backgroundColor: isSelected ? (controls.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                      padding: '4px 8px',
                      marginLeft: '-8px',
                      marginRight: '-8px',
                      borderRadius: '4px'
                    }}
                  >
                    <span className="legend-color" style={{ 
                      backgroundColor: color,
                      border: isSelected ? '2px solid white' : 'none',
                      width: isSelected ? '12px' : '16px',
                      height: isSelected ? '12px' : '3px'
                    }}></span>
                    <span style={{ fontSize: '11px', flex: 1 }}>{frameName}</span>
                    <span style={{ fontSize: '10px', color: '#8b949e' }}>{lensCount}</span>
                  </div>
                );
              })}
            </div>
            {controls.selectedFrames.size > 0 && (
              <button 
                onClick={() => setControls(prev => ({ ...prev, selectedFrames: new Set() }))}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '4px',
                  fontSize: '11px',
                  background: controls.darkMode ? '#30363d' : '#e2e8f0',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: controls.darkMode ? '#c9d1d9' : '#2d3748'
                }}
              >
                Clear selection ({controls.selectedFrames.size})
              </button>
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
              {semantic && hoveredNode.definition && (
                <p className="definition">{hoveredNode.definition}</p>
              )}
              <p className="connections">
                {nodeConnections.get(hoveredNode.id)?.size || 0} connections
              </p>
              {hoveredNode.frame_ids && hoveredNode.frame_ids.length > 0 && (
                <div className="lens-frames" style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>
                    {hoveredNode.frame_ids.length} Frame{hoveredNode.frame_ids.length > 1 ? 's' : ''}:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {hoveredNode.frame_ids.map((frameId, index) => {
                      const frameName = frameNamesRef.current.get(frameId) || frameId;
                      const frameColor = frameColorsRef.current.get(frameId) || '#6b7280';
                      const isPrimary = index === 0;
                      return (
                        <span key={frameId} style={{
                          fontSize: '10px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: frameColor + (isPrimary ? '66' : '33'),
                          border: `1px solid ${frameColor}`,
                          color: controls.darkMode ? '#fff' : '#000',
                          fontWeight: isPrimary ? '600' : '400',
                          position: 'relative'
                        }}>
                          {isPrimary && (
                            <span style={{
                              position: 'absolute',
                              top: '-2px',
                              right: '-2px',
                              width: '6px',
                              height: '6px',
                              backgroundColor: frameColor,
                              borderRadius: '50%',
                              border: '1px solid ' + (controls.darkMode ? '#161b22' : '#fff')
                            }} />
                          )}
                          {frameName}
                        </span>
                      );
                    })}
                  </div>
                  {hoveredNode.frame_ids.length > 1 && (
                    <p style={{ fontSize: '10px', color: '#6e7681', marginTop: '4px', fontStyle: 'italic' }}>
                      Primary frame: {frameNamesRef.current.get(hoveredNode.frame_ids[0]) || hoveredNode.frame_ids[0]}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : entityType === 'frames' ? (
            <>
              <p className="type">Frame • {hoveredNode.lens_count} lenses</p>
              {hoveredNode.description && (
                <p className="definition">{hoveredNode.description}</p>
              )}
              <p className="connections">
                {nodeConnections.get(hoveredNode.id)?.size || 0} connections
              </p>
            </>
          ) : entityType === 'tags' ? (
            <>
              <p className="type">Tag • {hoveredNode.lens_count} lenses</p>
              <p className="connections">
                {nodeConnections.get(hoveredNode.id)?.size || 0} connections
              </p>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

// Helper functions
function getNodeColor(node, darkMode) {
  const colors = {
    lens: darkMode ? '#60a5fa' : '#3b82f6',
    concept: darkMode ? '#34d399' : '#10b981',
    principle: darkMode ? '#f59e0b' : '#f97316',
    practice: darkMode ? '#a78bfa' : '#8b5cf6',
    default: darkMode ? '#6b7280' : '#9ca3af'
  };
  return colors[node.type] || colors.default;
}

// Get frame category based on frame ID patterns
function getFrameCategory(frameId) {
  if (frameId.includes('communication') || frameId.includes('dialogue')) return 'communication';
  if (frameId.includes('systems') || frameId.includes('dynamics') || frameId.includes('emergence')) return 'systems';
  if (frameId.includes('creative') || frameId.includes('innovation')) return 'innovation';
  if (frameId.includes('leadership') || frameId.includes('power') || frameId.includes('influence')) return 'leadership';
  if (frameId.includes('transformation') || frameId.includes('change') || frameId.includes('adaptation')) return 'change';
  if (frameId.includes('perception') || frameId.includes('reality') || frameId.includes('information')) return 'perception';
  return 'other';
}

export default LensGraphViewOptimized;