#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as api from './api-client.js';

// Phase 0 Modules: Enhanced thinking capabilities
import { matchThinkingMode, getWorkflowForMode } from './lib/thinking-modes.js';
import { generateBeliefStatements } from './lib/belief-statements.js';
import { evaluateWithOverall } from './lib/quality-evaluation.js';
import { synthesizeSolution } from './lib/synthesis.js';
import { refineApplication, getRefinementSummary } from './lib/refinement.js';

class LinsenkastenMCP {
  constructor() {
    this.server = new Server(
      {
        name: 'linsenkasten-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_lenses',
          description: 'Search for FLUX lenses by query string. Optionally provide problem context to generate specific belief statements and quality scores for each result.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for finding lenses',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return (default: 10)',
                default: 10,
              },
              problem_context: {
                type: 'string',
                description: 'Optional: Problem description to generate specific insights for each lens',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_lens',
          description: 'Get detailed information about a specific FLUX lens. Optionally provide problem context to generate problem-specific insights, belief statements, and quality evaluation.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the lens to retrieve',
              },
              problem_context: {
                type: 'string',
                description: 'Optional: Problem description to generate specific insights and belief statements',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_lenses_by_episode',
          description: 'Get all lenses from a specific FLUX episode',
          inputSchema: {
            type: 'object',
            properties: {
              episode: {
                type: 'number',
                description: 'Episode number',
              },
            },
            required: ['episode'],
          },
        },
        {
          name: 'get_related_lenses',
          description: 'Find lenses related to a given lens',
          inputSchema: {
            type: 'object',
            properties: {
              lens_name: {
                type: 'string',
                description: 'Name of the lens to find relations for',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of related lenses (default: 5)',
                default: 5,
              },
            },
            required: ['lens_name'],
          },
        },
        {
          name: 'analyze_with_lens',
          description: 'Analyze a text or concept through a specific FLUX lens. Returns lens definition with problem-specific belief statements and quality scores.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Text or concept to analyze',
              },
              lens_name: {
                type: 'string',
                description: 'Name of the lens to apply',
              },
            },
            required: ['text', 'lens_name'],
          },
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
                description: 'Array of lens names to combine (2-3 recommended)',
              },
              context: {
                type: 'string',
                description: 'Optional context for the combination',
              },
            },
            required: ['lenses'],
          },
        },
        {
          name: 'get_lens_frames',
          description: 'Get thematic frames that group related lenses',
          inputSchema: {
            type: 'object',
            properties: {
              frame_id: {
                type: 'string',
                description: 'Optional specific frame ID to retrieve',
              },
            },
          },
        },
        // Creative Thinking & Exploration Tools
        {
          name: 'find_lens_journey',
          description: 'Find conceptual path between two lenses - discover how ideas connect through intermediate concepts',
          inputSchema: {
            type: 'object',
            properties: {
              source: {
                type: 'string',
                description: 'Starting lens name (e.g., "Pace Layering")',
              },
              target: {
                type: 'string',
                description: 'Target lens name (e.g., "Innovation Cascade")',
              },
            },
            required: ['source', 'target'],
          },
        },
        {
          name: 'find_bridge_lenses',
          description: 'Find lenses that bridge between disparate concepts - perfect for lateral thinking and making unexpected connections',
          inputSchema: {
            type: 'object',
            properties: {
              lenses: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of lens names to find bridges between (2+ lenses)',
              },
            },
            required: ['lenses'],
          },
        },
        {
          name: 'find_contrasting_lenses',
          description: 'Find paradoxical/contrasting lenses for dialectic thinking - 96 high-quality contrasts available across diverse domains. Use when exploring tensions, avoiding one-sided thinking, or examining complex problems that benefit from holding contradictions. Each contrast includes insight explaining the dialectic relationship.',
          inputSchema: {
            type: 'object',
            properties: {
              lens: {
                type: 'string',
                description: 'Lens name to find contrasts for (semantic search will find closest match)',
              },
            },
            required: ['lens'],
          },
        },
        {
          name: 'get_central_lenses',
          description: 'Get most central/important lenses in the network - these are hub concepts that connect many ideas',
          inputSchema: {
            type: 'object',
            properties: {
              measure: {
                type: 'string',
                enum: ['betweenness', 'pagerank', 'eigenvector'],
                description: 'Centrality measure (betweenness=bridges, pagerank=importance, eigenvector=influence)',
                default: 'betweenness',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of central lenses to return',
                default: 10,
              },
            },
          },
        },
        {
          name: 'get_lens_neighborhood',
          description: 'Explore the conceptual neighborhood around a lens - discover related ideas and connections',
          inputSchema: {
            type: 'object',
            properties: {
              lens: {
                type: 'string',
                description: 'Lens name to explore neighborhood of',
              },
              radius: {
                type: 'number',
                description: 'How far to explore (1=direct connections, 2=connections of connections)',
                default: 2,
              },
            },
            required: ['lens'],
          },
        },
        {
          name: 'random_lens_provocation',
          description: 'Get a random lens for creative provocation - break out of habitual thinking patterns. Optionally provide context for gap-aware selection.',
          inputSchema: {
            type: 'object',
            properties: {
              context: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: List of lens names already explored (enables gap-aware biased selection toward unexplored conceptual dimensions)',
              },
            },
          },
        },
        {
          name: 'detect_thinking_gaps',
          description: 'Analyze conceptual coverage to identify blind spots in thinking - reveals which FLUX frames have been explored vs neglected',
          inputSchema: {
            type: 'object',
            properties: {
              context: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of lens names that have been explored (e.g., lenses used in recent conversation)',
              },
            },
            required: ['context'],
          },
        },
        // Phase 0 Tools: Enhanced thinking workflows
        {
          name: 'suggest_thinking_mode',
          description: 'Recommend the best thinking mode for your problem. Returns mode + relevant lenses + workflow guidance. Simplifies discovery by grouping 256+ lenses into 6 hierarchical modes.',
          inputSchema: {
            type: 'object',
            properties: {
              problem_description: {
                type: 'string',
                description: 'Description of the problem or challenge you are facing',
              },
            },
            required: ['problem_description'],
          },
        },
        {
          name: 'synthesize_solution',
          description: 'Synthesize insights from multiple lens applications into a structured solution report with problem reframe, root cause, and sequenced actions. Use after applying multiple lenses to tie insights together.',
          inputSchema: {
            type: 'object',
            properties: {
              problem: {
                type: 'string',
                description: 'Original problem description',
              },
              lenses_applied: {
                type: 'array',
                items: { type: 'object' },
                description: 'Array of lens applications with beliefs (from enhanced get_lens or analyze_with_lens)',
              },
              thinking_mode: {
                type: 'string',
                description: 'Thinking mode used (optional, from suggest_thinking_mode)',
              },
            },
            required: ['problem', 'lenses_applied'],
          },
        },
        {
          name: 'refine_lens_application',
          description: 'Iteratively improve a lens application until quality threshold met (max 3 iterations). Returns refined beliefs with quality scores. Use when initial lens application feels too vague or generic.',
          inputSchema: {
            type: 'object',
            properties: {
              lens: {
                type: 'string',
                description: 'Lens name to refine application of',
              },
              problem_context: {
                type: 'string',
                description: 'Problem description to apply lens to',
              },
              quality_threshold: {
                type: 'number',
                description: 'Minimum quality score (0-1, default: 0.7)',
                default: 0.7,
              },
            },
            required: ['lens', 'problem_context'],
          },
        },
        {
          name: 'get_dialectic_triads',
          description: 'Get thesis/antithesis/synthesis triads for a lens. Returns combinations of contrasting lenses with a synthesizing third lens, including insights about each triad. Use for dialectical thinking and creative synthesis.',
          inputSchema: {
            type: 'object',
            properties: {
              lens: {
                type: 'string',
                description: 'Name of the lens to find triads for',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of triads to return (default: 3)',
                default: 3,
              },
            },
            required: ['lens'],
          },
        },
        {
          name: 'get_lens_progressions',
          description: 'Get learning progressions between two lenses. Returns a sequence of lenses that build conceptually from start to target, with insights about each step. Use for structured learning paths or gradual concept exploration.',
          inputSchema: {
            type: 'object',
            properties: {
              start: {
                type: 'string',
                description: 'Starting lens name',
              },
              target: {
                type: 'string',
                description: 'Target lens name',
              },
              max_steps: {
                type: 'number',
                description: 'Maximum steps in progression (default: 5)',
                default: 5,
              },
            },
            required: ['start', 'target'],
          },
        },
      ],
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'lens://all',
          name: 'All FLUX Lenses',
          description: 'Complete list of all available FLUX lenses',
          mimeType: 'application/json',
        },
        {
          uri: 'lens://frames',
          name: 'Lens Thematic Frames',
          description: 'Thematic groupings of related lenses',
          mimeType: 'application/json',
        },
        {
          uri: 'lens://episodes',
          name: 'Lenses by Episode',
          description: 'All lenses organized by FLUX episode',
          mimeType: 'application/json',
        },
        {
          uri: 'lens://graph',
          name: 'Lens Relationship Graph',
          description: 'Network of lens connections and relationships',
          mimeType: 'application/json',
        },
      ],
    }));

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case 'lens://all': {
            const lenses = await api.getAllLenses();
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(lenses, null, 2),
                },
              ],
            };
          }

          case 'lens://frames': {
            const frames = await api.getFrames();
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(frames, null, 2),
                },
              ],
            };
          }

          case 'lens://episodes': {
            let episodes = await api.getCachedData('episodes');
            if (!episodes) {
              const lenses = await api.fetchFromAPI('/lenses?limit=500');
              // Group by episode
              episodes = {};
              lenses.lenses.forEach(lens => {
                const ep = lens.episode || 'Unknown';
                if (!episodes[ep]) episodes[ep] = [];
                episodes[ep].push(lens);
              });
              await api.setCachedData('episodes', episodes);
            }
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(episodes, null, 2),
                },
              ],
            };
          }

          case 'lens://graph': {
            let graph = await api.getCachedData('graph');
            if (!graph) {
              graph = await api.fetchFromAPI('/connections');
              await api.setCachedData('graph', graph);
            }
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(graph, null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Unknown resource: ${uri}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read resource: ${error.message}`
        );
      }
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_lenses': {
            const { query, limit = 10, problem_context } = args;
            const results = await api.searchLenses(query, limit);

            // If problem context provided, enrich each result with beliefs
            if (problem_context && results.lenses) {
              results.lenses = results.lenses.map(lens => {
                const beliefs = generateBeliefStatements(lens.name, problem_context, lens);
                const quality = evaluateWithOverall({
                  lens: lens.name,
                  belief_statements: beliefs,
                  problem_context
                });

                return {
                  ...lens,
                  belief_statements: beliefs,
                  quality_scores: quality
                };
              });
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(results, null, 2),
                },
              ],
            };
          }

          case 'get_lens': {
            const { name: lensName, problem_context } = args;
            const lens = await api.getLens(lensName);

            if (lens) {
              // If problem context provided, generate beliefs and quality scores
              if (problem_context) {
                const beliefs = generateBeliefStatements(lensName, problem_context, lens);
                const quality = evaluateWithOverall({
                  lens: lensName,
                  belief_statements: beliefs,
                  problem_context
                });

                lens.belief_statements = beliefs;
                lens.quality_scores = quality;
              }

              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(lens, null, 2),
                  },
                ],
              };
            } else {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Lens "${lensName}" not found.`,
                  },
                ],
              };
            }
          }

          case 'get_lenses_by_episode': {
            const { episode } = args;
            const results = await api.getLensesByEpisode(episode);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(results, null, 2),
                },
              ],
            };
          }

          case 'get_related_lenses': {
            const { lens_name, limit = 5 } = args;
            const connections = await api.getRelatedLenses(lens_name, limit);

            if (!connections) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Lens "${lens_name}" not found.`,
                  },
                ],
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(connections, null, 2),
                },
              ],
            };
          }

          case 'analyze_with_lens': {
            const { text, lens_name } = args;

            // Get lens details first
            const lens = await api.getLens(lens_name);

            if (!lens) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Lens "${lens_name}" not found.`,
                  },
                ],
              };
            }

            // Generate belief statements for this analysis
            const beliefs = generateBeliefStatements(lens_name, text, lens);
            const quality = evaluateWithOverall({
              lens: lens_name,
              belief_statements: beliefs,
              problem_context: text
            });

            // Add beliefs and quality to lens object
            lens.belief_statements = beliefs;
            lens.quality_scores = quality;

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(lens, null, 2),
                },
              ],
            };
          }

          case 'combine_lenses': {
            const { lenses, context = '' } = args;

            if (!Array.isArray(lenses) || lenses.length < 2) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Please provide at least 2 lens names to combine.',
                  },
                ],
              };
            }

            // Fetch details for each lens
            const lensDetails = await Promise.all(
              lenses.map(async (lensName) => {
                return await api.getLens(lensName);
              })
            );

            const validLenses = lensDetails.filter(l => l !== null);
            
            if (validLenses.length < 2) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Could not find enough valid lenses to combine.',
                  },
                ],
              };
            }

            const combination = `Lens Combination Analysis:

Combining: ${validLenses.map(l => l.name).join(' + ')}
${context ? `Context: ${context}` : ''}

Synthesis:
The combination of these lenses creates a multi-dimensional view where:
- ${validLenses[0].name} provides the foundation of ${validLenses[0].definition || 'systemic understanding'}
- ${validLenses[1].name} adds the dimension of ${validLenses[1].definition || 'complementary perspective'}
${validLenses[2] ? `- ${validLenses[2].name} introduces ${validLenses[2].definition || 'additional complexity'}` : ''}

Emergent Insights:
This lens combination reveals new patterns and possibilities that weren't visible through any single lens alone. The intersection creates a richer understanding of the system dynamics at play.

Applications:
1. Use this combination when facing complex, multi-faceted challenges
2. Apply when single-lens analysis feels incomplete
3. Leverage for innovative problem-solving approaches`;

            return {
              content: [
                {
                  type: 'text',
                  text: combination,
                },
              ],
            };
          }

          case 'get_lens_frames': {
            const { frame_id } = args;

            if (frame_id) {
              const frames = await api.getFrames();
              const frame = frames.frames?.find(f => f.id === frame_id);

              if (frame) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(frame, null, 2),
                    },
                  ],
                };
              } else {
                return {
                  content: [
                    {
                      type: 'text',
                      text: `Frame "${frame_id}" not found.`,
                    },
                  ],
                };
              }
            } else {
              const frames = await api.getFrames();
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(frames, null, 2),
                  },
                ],
              };
            }
          }

          // Creative Thinking Tools
          case 'find_lens_journey': {
            const { source, target } = args;
            const results = await api.findLensJourney(source, target);

            if (results.success && results.paths && results.paths.length > 0) {
              // Format the journey nicely
              let response = `# Conceptual Journey: ${source} → ${target}\n\n`;

              results.paths.forEach((path, idx) => {
                response += `## Path ${idx + 1} (${path.length} steps)\n\n`;
                path.forEach((lens, i) => {
                  response += `${i + 1}. **${lens.name}** (Episode ${lens.episode})\n`;
                  response += `   ${lens.definition}\n\n`;

                  if (i < path.length - 1) {
                    response += `   ↓\n\n`;
                  }
                });
                response += `\n`;
              });

              return {
                content: [
                  {
                    type: 'text',
                    text: response,
                  },
                ],
              };
            } else {
              return {
                content: [
                  {
                    type: 'text',
                    text: results.error || 'No path found between these lenses.',
                  },
                ],
              };
            }
          }

          case 'find_bridge_lenses': {
            const { lenses } = args;
            const results = await api.findBridgeLenses(lenses);

            if (results.success && results.bridges && results.bridges.length > 0) {
              let response = `# Bridge Lenses\n\n`;
              response += `Connecting: ${lenses.join(', ')}\n\n`;
              response += `Found ${results.count} bridge lens${results.count > 1 ? 'es' : ''}:\n\n`;

              results.bridges.forEach((bridge, idx) => {
                response += `${idx + 1}. **${bridge.name}** (Episode ${bridge.episode})\n`;
                response += `   ${bridge.definition}\n`;
                response += `   Related concepts: ${bridge.related_concepts.join(', ')}\n\n`;
              });

              response += `\n💡 ${results.insight}`;

              return {
                content: [
                  {
                    type: 'text',
                    text: response,
                  },
                ],
              };
            } else {
              return {
                content: [
                  {
                    type: 'text',
                    text: results.error || 'No bridges found between these lenses.',
                  },
                ],
              };
            }
          }

          case 'find_contrasting_lenses': {
            const { lens } = args;
            const results = await api.findContrastingLenses(lens);

            if (results.success && results.contrasts && results.contrasts.length > 0) {
              let response = `# Contrasting Lenses for "${lens}"\n\n`;
              response += `Source lens: **${results.source_lens.name}** (Episode ${results.source_lens.episode})\n`;
              response += `${results.source_lens.definition}\n\n`;
              response += `## Paradoxical Pairs (${results.count})\n\n`;

              results.contrasts.forEach((contrast, idx) => {
                response += `${idx + 1}. **${contrast.name}** (Episode ${contrast.episode})\n`;
                response += `   ${contrast.definition}\n`;
                response += `   💭 Insight: ${contrast.insight}\n\n`;
              });

              return {
                content: [
                  {
                    type: 'text',
                    text: response,
                  },
                ],
              };
            } else {
              return {
                content: [
                  {
                    type: 'text',
                    text: results.error || 'No contrasts found for this lens.',
                  },
                ],
              };
            }
          }

          case 'get_central_lenses': {
            const { measure = 'betweenness', limit = 10 } = args;
            const results = await api.getCentralLenses(measure, limit);

            if (results.success && results.central_lenses) {
              let response = `# Central Lenses (${measure})\n\n`;
              response += `${results.insight}\n\n`;

              results.central_lenses.forEach((lens, idx) => {
                response += `${idx + 1}. **${lens.name}** (Episode ${lens.episode})\n`;
                response += `   Centrality: ${lens.centrality_score}\n`;
                response += `   ${lens.definition}\n`;
                response += `   Concepts: ${lens.related_concepts.slice(0, 5).join(', ')}\n\n`;
              });

              return {
                content: [
                  {
                    type: 'text',
                    text: response,
                  },
                ],
              };
            } else {
              return {
                content: [
                  {
                    type: 'text',
                    text: results.error || 'Could not retrieve central lenses.',
                  },
                ],
              };
            }
          }

          case 'get_lens_neighborhood': {
            const { lens, radius = 2 } = args;
            const results = await api.getLensNeighborhood(lens, radius);

            if (results.success && results.neighborhood) {
              let response = `# Neighborhood of "${lens}"\n\n`;
              response += `Source: **${results.source_lens.name}** (Episode ${results.source_lens.episode})\n`;
              response += `${results.source_lens.definition}\n\n`;
              response += `Exploring radius: ${radius}\n\n`;

              Object.entries(results.neighborhood).forEach(([edge_type, lenses]) => {
                if (lenses.length > 0) {
                  response += `## ${edge_type} connections (${lenses.length})\n\n`;
                  lenses.forEach(l => {
                    response += `- **${l.name}** (Ep. ${l.episode}): ${l.definition.substring(0, 100)}...\n`;
                  });
                  response += `\n`;
                }
              });

              return {
                content: [
                  {
                    type: 'text',
                    text: response,
                  },
                ],
              };
            } else {
              return {
                content: [
                  {
                    type: 'text',
                    text: results.error || 'Could not explore neighborhood.',
                  },
                ],
              };
            }
          }

          case 'random_lens_provocation': {
            const { context } = request.params.arguments || {};
            const results = await api.getRandomProvocation(context);

            if (results.success && results.provocation) {
              const lens = results.provocation;
              let response = `# 🎲 Random Lens Provocation\n\n`;

              // Show gap analysis if context was provided
              if (results.gap_analysis) {
                const gap = results.gap_analysis;
                response += `## 🎯 Gap Analysis\n`;
                response += `Coverage: ${gap.coverage.explored}/${gap.coverage.total} frames explored (${Math.round((gap.coverage.explored / gap.coverage.total) * 100)}%)\n`;
                if (gap.was_gap_biased) {
                  response += `✨ This suggestion targets an unexplored area: **${gap.suggested_from_frame}**\n`;
                }
                response += `\n`;
              }

              response += `## ${lens.name} (Episode ${lens.episode})\n\n`;
              response += `${lens.definition}\n\n`;

              if (lens.examples && lens.examples.length > 0) {
                response += `### Examples\n`;
                lens.examples.forEach(ex => {
                  response += `- ${ex}\n`;
                });
                response += `\n`;
              }

              response += `### Related Concepts\n`;
              response += `${lens.related_concepts.join(', ')}\n\n`;

              response += `💡 **${results.suggestion}**\n\n`;

              if (results.related && results.related.length > 0) {
                response += `### Related Lenses for Follow-up\n`;
                results.related.forEach(r => {
                  response += `- **${r.name}** (Ep. ${r.episode})\n`;
                });
              }

              return {
                content: [
                  {
                    type: 'text',
                    text: response,
                  },
                ],
              };
            } else {
              return {
                content: [
                  {
                    type: 'text',
                    text: results.error || 'Could not generate provocation.',
                  },
                ],
              };
            }
          }

          case 'detect_thinking_gaps': {
            const { context } = request.params.arguments || {};

            if (!context || context.length === 0) {
              return {
                content: [{
                  type: 'text',
                  text: 'Error: context parameter required (list of explored lens names)',
                }],
              };
            }

            const results = await api.detectThinkingGaps(context);

            if (results.success) {
              const cov = results.coverage;
              let response = `# 🔍 Thinking Gap Analysis\n\n`;
              response += `## Coverage Summary\n`;
              response += `- **Explored**: ${cov.coverage_percentage}% (${Object.keys(cov.explored_frames).length}/${cov.total_frames} frames)\n`;
              response += `- **Unexplored**: ${cov.unexplored_frames.length} frames\n`;
              response += `- **Underexplored**: ${cov.underexplored_frames.length} frames (only 1 lens)\n\n`;

              if (Object.keys(cov.explored_frames).length > 0) {
                response += `## ✅ Explored Frames\n`;
                Object.entries(cov.explored_frames).forEach(([frame, count]) => {
                  response += `- **${frame}**: ${count} lens${count > 1 ? 'es' : ''}\n`;
                });
                response += `\n`;
              }

              if (cov.unexplored_frames.length > 0) {
                response += `## ⚠️  Unexplored Frames (Blind Spots)\n`;
                cov.unexplored_frames.slice(0, 10).forEach(frame => {
                  response += `- ${frame}\n`;
                });
                if (cov.unexplored_frames.length > 10) {
                  response += `\n_...and ${cov.unexplored_frames.length - 10} more_\n`;
                }
                response += `\n`;
              }

              if (results.suggestions && results.suggestions.length > 0) {
                response += `## 💡 Suggested Lenses to Explore\n\n`;
                results.suggestions.forEach(sugg => {
                  response += `### ${sugg.frame}\n`;
                  sugg.sample_lenses.forEach(lens => {
                    response += `- **${lens.name}** (Ep. ${lens.episode}): ${lens.definition.substring(0, 100)}...\n`;
                  });
                  response += `\n`;
                });
              }

              response += `\n${results.insight}`;

              return {
                content: [{
                  type: 'text',
                  text: response,
                }],
              };
            } else {
              return {
                content: [{
                  type: 'text',
                  text: results.error || 'Could not analyze thinking gaps.',
                }],
              };
            }
          }

          case 'suggest_thinking_mode': {
            const { problem_description } = args;
            const matches = matchThinkingMode(problem_description);

            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  recommended_modes: matches,
                  top_mode: matches[0],
                  workflow: getWorkflowForMode(matches[0].id),
                  next_steps: [
                    `Apply ${matches[0].lenses.slice(0, 3).join(', ')} lenses`,
                    `Use tools: ${getWorkflowForMode(matches[0].id).tools.join(', ')}`
                  ]
                }, null, 2)
              }]
            };
          }

          case 'synthesize_solution': {
            const { problem, lenses_applied, thinking_mode } = args;

            const report = synthesizeSolution({
              problem,
              lenses_applied,
              thinking_mode
            });

            return {
              content: [{
                type: 'text',
                text: report // Already formatted markdown
              }]
            };
          }

          case 'refine_lens_application': {
            const { lens, problem_context, quality_threshold = 0.7 } = args;

            // Get lens definition from API
            const lensData = await api.getLens(lens);

            if (!lensData) {
              return {
                content: [{
                  type: 'text',
                  text: `Lens "${lens}" not found. Please check the lens name and try again.`
                }]
              };
            }

            const result = refineApplication({
              lens,
              problem_context,
              lens_definition: lensData,
              quality_threshold
            });

            const summary = getRefinementSummary(result);

            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  ...summary,
                  refined_beliefs: result.belief_statements
                }, null, 2)
              }]
            };
          }

          case 'get_dialectic_triads': {
            const { lens, limit = 3 } = args;
            const results = await api.getDialecticTriads(lens, limit);

            if (results.success && results.triads && results.triads.length > 0) {
              let response = `# ⚖️ Dialectic Triads for "${results.thesis.name}"\n\n`;
              response += `**Thesis**: ${results.thesis.name}\n`;
              response += `> ${results.thesis.definition}\n\n`;

              response += `---\n\n`;

              results.triads.forEach((triad, idx) => {
                response += `## Triad ${idx + 1}\n\n`;
                response += `### ↔️ Antithesis: ${triad.antithesis.name}\n`;
                response += `> ${triad.antithesis.definition}\n\n`;
                if (triad.contrast_insight) {
                  response += `**Dialectic Tension**: ${triad.contrast_insight}\n\n`;
                }

                response += `### 🔄 Synthesis: ${triad.synthesis.name}\n`;
                response += `> ${triad.synthesis.definition}\n\n`;
                if (triad.synthesis_insight) {
                  response += `**How it integrates**: ${triad.synthesis_insight}\n\n`;
                }
                response += `---\n\n`;
              });

              return {
                content: [{ type: 'text', text: response }]
              };
            } else {
              return {
                content: [{
                  type: 'text',
                  text: results.error || `No triads found for "${lens}". The lens may not have contrasting relationships or may not exist.`
                }]
              };
            }
          }

          case 'get_lens_progressions': {
            const { start, target, max_steps = 5 } = args;
            const results = await api.getLensProgressions(start, target, max_steps);

            if (results.success && results.progression && results.progression.length > 0) {
              let response = `# 📚 Learning Progression\n\n`;
              response += `**From**: ${results.start_lens.name}\n`;
              response += `**To**: ${results.target_lens.name}\n`;
              response += `**Steps**: ${results.progression.length}\n\n`;

              response += `---\n\n`;

              results.progression.forEach((step, idx) => {
                const marker = idx === 0 ? '🏁' : idx === results.progression.length - 1 ? '🎯' : `${idx + 1}.`;
                response += `## ${marker} ${step.lens.name}\n`;
                response += `> ${step.lens.definition}\n\n`;
                if (step.insight) {
                  response += `**Step insight**: ${step.insight}\n\n`;
                }
              });

              if (results.overall_insight) {
                response += `---\n\n`;
                response += `## 💡 Journey Insight\n${results.overall_insight}\n`;
              }

              return {
                content: [{ type: 'text', text: response }]
              };
            } else {
              return {
                content: [{
                  type: 'text',
                  text: results.error || `No progression found between "${start}" and "${target}". One or both lenses may not exist, or there may be no path between them.`
                }]
              };
            }
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Linsenkasten MCP server running on stdio');
  }
}

// Create and run the server
const mcp = new LinsenkastenMCP();
mcp.run().catch(console.error);