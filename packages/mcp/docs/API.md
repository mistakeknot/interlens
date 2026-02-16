# Interlens API Documentation

## Overview

Interlens provides REST API endpoints for lens exploration and graph-based navigation. All endpoints return JSON and are optimized for AI agent consumption.

**Base URL**: `https://xulfbot-lens-api.up.railway.app/api/v1`

## Core Endpoints

### Search Lenses
```http
GET /search?q={query}&limit={limit}
```

Semantic search across all lenses using vector embeddings.

**Parameters:**
- `q` (required) - Search query
- `limit` (optional) - Max results (default: 10)

**Example:**
```bash
curl "https://xulfbot-lens-api.up.railway.app/api/v1/search?q=innovation&limit=5"
```

### Get Lenses
```http
GET /lenses?episode={ep}&type={type}&limit={limit}
```

Retrieve lenses with optional filtering.

**Parameters:**
- `episode` (optional) - Filter by episode number
- `type` (optional) - Filter by lens_type (headline, weekly)
- `limit` (optional) - Max results (default: 500)

### Get Frames
```http
GET /frames?id={frame_id}
```

Get thematic frames that group related lenses.

**Parameters:**
- `id` (optional) - Specific frame ID

## Creative Thinking Endpoints

### Find Lens Journey
```http
GET /creative/journey?source={lens1}&target={lens2}
```

Find conceptual paths between two lenses.

**Parameters:**
- `source` (required) - Starting lens name
- `target` (required) - Target lens name

**Response:**
```json
{
  "success": true,
  "source": {...},
  "target": {...},
  "paths": [
    [
      {"id": "...", "name": "Lens 1", "definition": "..."},
      {"id": "...", "name": "Bridge Lens", "definition": "..."},
      {"id": "...", "name": "Lens 2", "definition": "..."}
    ]
  ],
  "count": 3
}
```

### Find Bridge Lenses
```http
GET /creative/bridges?lenses={lens1}&lenses={lens2}&lenses={lens3}
```

Discover lenses that bridge between disparate concepts.

**Parameters:**
- `lenses` (required, multiple) - Array of lens names (2+ required)

**Response:**
```json
{
  "success": true,
  "input_lenses": [...],
  "bridges": [
    {
      "id": "...",
      "name": "Bridge Lens",
      "definition": "...",
      "episode": 123,
      "related_concepts": ["concept1", "concept2"]
    }
  ],
  "count": 5,
  "insight": "These lenses connect X and Y"
}
```

### Find Contrasting Lenses
```http
GET /creative/contrasts?lens={lens_name}
```

Find paradoxical/contrasting lenses for dialectic thinking.

**Parameters:**
- `lens` (required) - Lens name

**Response:**
```json
{
  "success": true,
  "source_lens": {...},
  "contrasts": [
    {
      "id": "...",
      "name": "Opposing Lens",
      "definition": "...",
      "episode": 123,
      "insight": "Paradox description"
    }
  ],
  "count": 3
}
```

### Get Central Lenses
```http
GET /creative/central?measure={measure}&limit={limit}
```

Get most central/important lenses in the network.

**Parameters:**
- `measure` (optional) - Centrality measure: `betweenness`, `pagerank`, `eigenvector` (default: `betweenness`)
- `limit` (optional) - Max results (default: 10)

**Response:**
```json
{
  "success": true,
  "measure": "betweenness",
  "central_lenses": [
    {
      "id": "...",
      "name": "Hub Lens",
      "definition": "...",
      "episode": 123,
      "centrality_score": 0.234,
      "related_concepts": ["concept1", "concept2"]
    }
  ],
  "count": 10,
  "insight": "These lenses are hubs in the betweenness network"
}
```

### Get Lens Neighborhood
```http
GET /creative/neighborhood?lens={lens_name}&radius={radius}
```

Explore conceptual neighborhood around a lens.

**Parameters:**
- `lens` (required) - Lens name
- `radius` (optional) - Exploration depth (1 or 2, default: 2)

**Response:**
```json
{
  "success": true,
  "source_lens": {...},
  "radius": 2,
  "neighborhood": {
    "frame": [
      {"id": "...", "name": "Related Lens 1", "definition": "...", "episode": 123}
    ],
    "concept": [
      {"id": "...", "name": "Related Lens 2", "definition": "...", "episode": 124}
    ],
    "temporal": [...]
  }
}
```

### Random Lens Provocation
```http
GET /creative/random
```

Get a random lens for creative provocation.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "provocation": {
    "id": "...",
    "name": "Random Lens",
    "definition": "...",
    "examples": ["example 1", "example 2"],
    "episode": 123,
    "related_concepts": ["concept1", "concept2"]
  },
  "related": [...],
  "suggestion": "Try viewing your problem through the 'Random Lens' lens"
}
```

## Graph Data Endpoints

### Get Graph Structure
```http
GET /lenses/graph
```

Get full graph data for visualization (nodes and edges).

### Get Semantic Graph
```http
GET /lenses/graph/semantic?min_similarity={min}&max_nodes={max}
```

Get semantic similarity graph based on embeddings.

## Rate Limits

- No authentication required for read operations
- Rate limits may apply for heavy usage
- Cached responses (1 hour TTL)

## Error Responses

All errors return appropriate HTTP status codes:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common status codes:
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found (lens doesn't exist)
- `503` - Service Unavailable (graph functionality disabled)

## Best Practices

1. **Use caching**: Responses are cached for 1 hour
2. **Batch requests**: Use graph endpoints for multiple operations
3. **Handle 404s**: Some lenses may not have relationships
4. **Specify limits**: Keep responses manageable with limit parameters
5. **Check success field**: Always check `success: true` before processing

## Example Workflows

### Creative Problem Solving
```bash
# 1. Get random provocation
curl "https://.../api/v1/creative/random"

# 2. Bridge back to your domain
curl "https://.../api/v1/creative/bridges?lenses=Random+Lens&lenses=Your+Domain"

# 3. Explore the bridge
curl "https://.../api/v1/creative/neighborhood?lens=Bridge+Lens"
```

### Conceptual Exploration
```bash
# 1. Find journey between concepts
curl "https://.../api/v1/creative/journey?source=Start&target=End"

# 2. Get contrasts for intermediate lens
curl "https://.../api/v1/creative/contrasts?lens=Intermediate+Lens"

# 3. Explore central hubs
curl "https://.../api/v1/creative/central?measure=betweenness&limit=5"
```

## Support

- **Issues**: GitHub Issues
- **API Status**: Check `/api/v1/cache/stats` for health
- **Documentation**: This file and main README
