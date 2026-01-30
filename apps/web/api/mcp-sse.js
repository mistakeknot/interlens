// MCP SSE endpoint for Vercel - connects to lens API
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // API base URL - use your Railway API
  const API_BASE_URL = 'https://xulfbot-lens-api.up.railway.app/api/v1';

  // Helper to fetch from lens API
  async function fetchFromAPI(endpoint) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API fetch error:', error);
      return null;
    }
  }

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    jsonrpc: "2.0",
    method: "connection.init",
    params: {
      name: "linsenkasten",
      version: "1.0.0"
    }
  })}\n\n`);

  // Handle incoming messages
  const handleMessage = async (message) => {
    try {
      const request = JSON.parse(message);
      
      // Initialize
      if (request.method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '0.1.0',
            capabilities: {
              tools: {},
              resources: {}
            },
            serverInfo: {
              name: 'linsenkasten',
              version: '1.0.0'
            }
          }
        };
      }
      
      // List tools
      if (request.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [
              {
                name: 'search_lenses',
                description: 'Search for FLUX lenses by query',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search query' },
                    limit: { type: 'number', description: 'Maximum results', default: 10 }
                  },
                  required: ['query']
                }
              },
              {
                name: 'get_lens',
                description: 'Get detailed information about a specific lens',
                inputSchema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Exact lens name' }
                  },
                  required: ['name']
                }
              },
              {
                name: 'get_lenses_by_episode',
                description: 'Get all lenses from a specific FLUX episode',
                inputSchema: {
                  type: 'object',
                  properties: {
                    episode: { type: 'number', description: 'Episode number' }
                  },
                  required: ['episode']
                }
              },
              {
                name: 'analyze_with_lens',
                description: 'Analyze text or situation through a specific lens',
                inputSchema: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', description: 'Text to analyze' },
                    lens_name: { type: 'string', description: 'Lens to apply' }
                  },
                  required: ['text', 'lens_name']
                }
              },
              {
                name: 'get_related_lenses',
                description: 'Find lenses related to a given lens',
                inputSchema: {
                  type: 'object',
                  properties: {
                    lens_name: { type: 'string', description: 'Lens name' },
                    limit: { type: 'number', description: 'Maximum results', default: 5 }
                  },
                  required: ['lens_name']
                }
              },
              {
                name: 'combine_lenses',
                description: 'Combine multiple lenses for novel insights',
                inputSchema: {
                  type: 'object',
                  properties: {
                    lenses: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'List of lens names to combine'
                    },
                    context: { type: 'string', description: 'Context for combination' }
                  },
                  required: ['lenses', 'context']
                }
              },
              {
                name: 'get_lens_frames',
                description: 'Get thematic frames that group related lenses',
                inputSchema: {
                  type: 'object',
                  properties: {
                    frame_id: { type: 'string', description: 'Optional specific frame ID' }
                  }
                }
              }
            ]
          }
        };
      }

      // List resources
      if (request.method === 'resources/list') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            resources: [
              {
                uri: 'lens://all',
                name: 'All FLUX Lenses',
                description: 'Complete list of all FLUX lenses with definitions',
                mimeType: 'text/plain'
              },
              {
                uri: 'lens://frames',
                name: 'Lens Frames',
                description: 'Thematic frames that group related lenses',
                mimeType: 'text/plain'
              },
              {
                uri: 'lens://episodes',
                name: 'Lenses by Episode',
                description: 'FLUX lenses organized by episode',
                mimeType: 'text/plain'
              },
              {
                uri: 'lens://graph',
                name: 'Lens Relationship Graph',
                description: 'Network of relationships between lenses',
                mimeType: 'application/json'
              }
            ]
          }
        };
      }

      // Read resource
      if (request.method === 'resources/read') {
        const { uri } = request.params;
        
        if (uri === 'lens://all') {
          const lenses = await fetchFromAPI('/lenses');
          if (lenses) {
            const content = lenses.map(lens => 
              `${lens.name}\n${lens.definition || 'No definition available'}\n---`
            ).join('\n\n');
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                contents: [{
                  uri,
                  mimeType: 'text/plain',
                  text: content
                }]
              }
            };
          }
        }
        
        if (uri === 'lens://frames') {
          const frames = await fetchFromAPI('/lens-frames');
          if (frames) {
            const content = Object.entries(frames).map(([id, frame]) =>
              `${frame.name}\n${frame.description}\nLenses: ${frame.lenses.join(', ')}\n---`
            ).join('\n\n');
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                contents: [{
                  uri,
                  mimeType: 'text/plain',
                  text: content
                }]
              }
            };
          }
        }
        
        if (uri === 'lens://episodes') {
          const lenses = await fetchFromAPI('/lenses');
          if (lenses) {
            const byEpisode = {};
            lenses.forEach(lens => {
              const ep = lens.episode || 'Unknown';
              if (!byEpisode[ep]) byEpisode[ep] = [];
              byEpisode[ep].push(lens.name);
            });
            const content = Object.entries(byEpisode)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([ep, names]) => `Episode ${ep}: ${names.join(', ')}`)
              .join('\n');
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                contents: [{
                  uri,
                  mimeType: 'text/plain',
                  text: content
                }]
              }
            };
          }
        }
        
        if (uri === 'lens://graph') {
          const graph = await fetchFromAPI('/lens-graph');
          if (graph) {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                contents: [{
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(graph, null, 2)
                }]
              }
            };
          }
        }
      }

      // Call tool
      if (request.method === 'tools/call') {
        const { name, arguments: args } = request.params;
        
        if (name === 'search_lenses') {
          const results = await fetchFromAPI(`/search?q=${encodeURIComponent(args.query)}&limit=${args.limit || 10}`);
          if (results) {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify(results, null, 2)
                }]
              }
            };
          }
        }
        
        if (name === 'get_lens') {
          const lenses = await fetchFromAPI('/lenses');
          if (lenses) {
            const lens = lenses.find(l => l.name.toLowerCase() === args.name.toLowerCase());
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: lens ? JSON.stringify(lens, null, 2) : `Lens "${args.name}" not found`
                }]
              }
            };
          }
        }
        
        if (name === 'get_lenses_by_episode') {
          const lenses = await fetchFromAPI(`/lenses?episode=${args.episode}`);
          if (lenses) {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify(lenses, null, 2)
                }]
              }
            };
          }
        }
        
        if (name === 'analyze_with_lens') {
          const lenses = await fetchFromAPI('/lenses');
          if (lenses) {
            const lens = lenses.find(l => l.name.toLowerCase() === args.lens_name.toLowerCase());
            if (lens) {
              const analysis = `Analyzing through the lens of ${lens.name}:

${lens.definition || 'No definition available'}

Application to your text:
"${args.text}"

Key insights:
- Consider how ${lens.name} applies to this situation
- Look for patterns that align with this lens
- Think about what this lens reveals that might otherwise be hidden`;
              
              return {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  content: [{
                    type: 'text',
                    text: analysis
                  }]
                }
              };
            }
          }
        }
        
        if (name === 'get_related_lenses') {
          const related = await fetchFromAPI(`/related?lens=${encodeURIComponent(args.lens_name)}&limit=${args.limit || 5}`);
          if (related) {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify(related, null, 2)
                }]
              }
            };
          }
        }
        
        if (name === 'combine_lenses') {
          const lenses = await fetchFromAPI('/lenses');
          if (lenses) {
            const selectedLenses = args.lenses.map(name => 
              lenses.find(l => l.name.toLowerCase() === name.toLowerCase())
            ).filter(Boolean);
            
            if (selectedLenses.length === 0) {
              return {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  content: [{
                    type: 'text',
                    text: 'No valid lenses found'
                  }]
                }
              };
            }
            
            const combination = `Combining lenses for "${args.context}":

${selectedLenses.map(lens => `${lens.name}: ${lens.definition || 'No definition'}`).join('\n\n')}

Synthesis:
- Look for intersections between these perspectives
- Consider how they might amplify or contradict each other
- Explore emergent insights from their combination`;
            
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: combination
                }]
              }
            };
          }
        }
        
        if (name === 'get_lens_frames') {
          const frames = await fetchFromAPI('/lens-frames');
          if (frames) {
            if (args.frame_id) {
              const frame = frames[args.frame_id];
              return {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  content: [{
                    type: 'text',
                    text: frame ? JSON.stringify(frame, null, 2) : `Frame "${args.frame_id}" not found`
                  }]
                }
              };
            }
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify(frames, null, 2)
                }]
              }
            };
          }
        }
      }

      // Default error response
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error'
        }
      };
    }
  };

  // For GET requests, just keep the connection alive
  if (req.method === 'GET') {
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
    });
    return;
  }

  // For POST requests, handle the incoming data
  let buffer = '';
  req.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        handleMessage(line).then(response => {
          if (response) {
            res.write(`data: ${JSON.stringify(response)}\n\n`);
          }
        });
      }
    }
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);

  // Clean up on close
  req.on('close', () => {
    clearInterval(keepAlive);
  });
}