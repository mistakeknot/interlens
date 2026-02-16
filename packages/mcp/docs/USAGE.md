# Usage Guide

## Getting Started

Once you've added Interlens to Claude Desktop, you can start using it immediately. Here are practical examples of how to leverage its creative thinking tools.

## Basic Exploration

### Search for Lenses
```
Search for lenses related to "systems thinking"
```

Claude will use `search_lenses` to find relevant analytical frameworks.

### Get Lens Details
```
Tell me about the "Pace Layering" lens
```

Claude will use `get_lens` to retrieve full definition, examples, and metadata.

### Browse by Theme
```
Show me lenses in the "Innovation & Creativity" frame
```

Claude will use `get_lens_frames` to retrieve thematically grouped lenses.

## Creative Thinking Patterns

### Pattern 1: Lateral Thinking

**Goal**: Break out of habitual thinking patterns

**Workflow**:
```
1. Give me a random lens provocation
2. Find bridges between that lens and "product design"
3. Explore the neighborhood of the bridge lens
```

**What happens**:
- Random lens introduces unexpected perspective
- Bridge lenses connect it back to your domain
- Neighborhood exploration reveals related concepts

**Use when**:
- Stuck on a problem
- Need fresh perspective
- Breaking creative blocks

### Pattern 2: Conceptual Navigation

**Goal**: Understand how concepts relate

**Workflow**:
```
Find the conceptual journey from "Systems Thinking" to "Innovation"
```

**What happens**:
- Returns 1-3 paths showing intermediate concepts
- Each step shows how ideas connect
- Reveals the "conceptual landscape"

**Use when**:
- Learning new domains
- Understanding relationships
- Building knowledge maps

### Pattern 3: Dialectic Exploration

**Goal**: Explore tensions and paradoxes

**Workflow**:
```
1. Find contrasting lenses for "Explore vs Exploit"
2. Show me the central lenses in the network
3. Combine these contrasting lenses for my situation
```

**What happens**:
- Identifies paradoxical pairs
- Maps conceptual tensions
- Synthesizes new insights

**Use when**:
- Facing trade-offs
- Dealing with complexity
- Need nuanced thinking

### Pattern 4: Strategic Mapping

**Goal**: Understand the conceptual landscape

**Workflow**:
```
1. Show me the most central lenses (betweenness)
2. Explore the neighborhood of the top hub lens
3. Find bridges between the top 3 hubs
```

**What happens**:
- Identifies key conceptual hubs
- Maps surrounding territory
- Reveals structural patterns

**Use when**:
- Strategic planning
- System design
- Knowledge architecture

### Pattern 5: Serendipitous Discovery

**Goal**: Follow interesting connections

**Workflow**:
```
1. Random lens provocation
2. Explore its neighborhood
3. Find journey to something specific
4. Bridge back to original topic
```

**What happens**:
- Meandering exploration
- Unexpected connections
- Creative insights emerge

**Use when**:
- Research mode
- Exploration phase
- Need inspiration

## Advanced Techniques

### Chaining Tools

Combine multiple tools for powerful workflows:

```
1. Search "innovation"
   → Get top 3 results
2. Find bridges between those 3
   → Discover connecting concepts
3. Explore neighborhood of bridges
   → Map conceptual territory
4. Get contrasts for key lens
   → Identify tensions
5. Find journey to target concept
   → Build knowledge path
```

### Centrality Analysis

Different centrality measures reveal different insights:

**Betweenness**: Concepts that bridge disparate areas
```
Get central lenses with measure="betweenness"
```
Use for: Finding versatile frameworks, connecting domains

**PageRank**: Most "important" concepts in the network
```
Get central lenses with measure="pagerank"
```
Use for: Identifying foundational concepts, core frameworks

**Eigenvector**: Concepts connected to other important concepts
```
Get central lenses with measure="eigenvector"
```
Use for: Finding influential ideas, clustering patterns

### Radius Exploration

Control exploration depth with radius parameter:

**Radius 1**: Direct connections only
```
Explore neighborhood of "Systems Thinking" with radius 1
```
Use for: Immediate related concepts, focused exploration

**Radius 2**: Connections of connections
```
Explore neighborhood of "Systems Thinking" with radius 2
```
Use for: Broader exploration, discovering distant concepts

## Integration Patterns

### Research Workflow

```
Topic: Understanding organizational change

1. Search "organizational change"
   → Get relevant lenses
2. Get central lenses in network
   → Identify key frameworks
3. Find journeys between key concepts
   → Build knowledge map
4. Explore neighborhoods of hubs
   → Deep dive into areas
5. Find contrasts
   → Understand tensions
```

### Problem-Solving Workflow

```
Problem: Team collaboration breakdown

1. Search "collaboration" and "communication"
   → Find relevant frameworks
2. Find bridges between them
   → Discover connecting concepts
3. Get contrasts for top lens
   → Explore tensions
4. Random provocation
   → Introduce fresh perspective
5. Bridge provocation to problem
   → Creative solutions
```

### Learning Workflow

```
Learning: Systems thinking fundamentals

1. Search "systems thinking"
   → Starting point
2. Explore neighborhood (radius 2)
   → Related concepts
3. Get central lenses
   → Core frameworks
4. Find journeys between concepts
   → Learning paths
5. Get contrasts
   → Nuanced understanding
```

### Ideation Workflow

```
Goal: Generate novel product ideas

1. Random provocation (repeat 3x)
   → Diverse perspectives
2. Find bridges to "product design"
   → Connect back
3. Explore bridge neighborhoods
   → Expand territory
4. Combine provocations
   → Synthesis
5. Find contrasts
   → Tension-based creativity
```

## Tips and Best Practices

### 1. Start Broad, Then Focus
- Begin with searches or random provocations
- Narrow down with specific tools
- Deep dive with neighborhoods

### 2. Use Bridges for Creativity
- Bridge disparate concepts for innovation
- Bridge random to specific for lateral thinking
- Bridge multiple domains for cross-pollination

### 3. Contrasts Reveal Depth
- Always check contrasts for key concepts
- Paradoxes often hold insights
- Tensions drive creative synthesis

### 4. Centrality for Strategy
- Map the landscape first
- Focus on high-centrality concepts
- Build from hubs outward

### 5. Random for Breaking Patterns
- Use when stuck
- Combine with bridges
- Follow unexpected connections

### 6. Journeys for Learning
- Trace paths between concepts
- Understand intermediate steps
- Build knowledge systematically

### 7. Neighborhoods for Exploration
- Start with radius 1
- Expand to radius 2 if needed
- Look for edge types (frame, concept, temporal)

## Common Questions

**Q: How many lenses are there?**
A: 256+ lenses from FLUX episodes 11-200

**Q: What's the graph structure?**
A: Weighted edges of 4 types: AI-discovered, frame-based, temporal, conceptual

**Q: How are bridges calculated?**
A: NetworkX graph analysis finding shortest paths between concepts

**Q: What's the difference between tools?**
A:
- Searches: Semantic similarity
- Journeys: Graph paths
- Bridges: Connecting nodes
- Contrasts: Paradoxical relationships
- Central: Network analysis
- Neighborhood: BFS exploration
- Random: Serendipity

**Q: Can I use multiple tools at once?**
A: Yes! Chain them together for powerful workflows

**Q: How often is data updated?**
A: New FLUX episodes added weekly (Thursday 9pm Pacific)

## Examples from Real Usage

### Example 1: Product Strategy

**Request**: "Help me think about product positioning"

**Workflow**:
```
1. Search "strategy" and "positioning"
2. Find bridges between them
3. Explore neighborhood of "Strategic Positioning" lens
4. Get contrasts to understand trade-offs
5. Find journey to "Innovation" for growth perspective
```

**Outcome**: Multi-dimensional strategic framework

### Example 2: Team Dynamics

**Request**: "Team is struggling with decisions"

**Workflow**:
```
1. Search "decision making" and "team"
2. Find central lenses in network
3. Get contrasts for "Decision Making" lens
4. Random provocation for fresh perspective
5. Bridge random lens to "team dynamics"
```

**Outcome**: Unexpected insights about decision processes

### Example 3: Learning Systems Thinking

**Request**: "Teach me systems thinking"

**Workflow**:
```
1. Search "systems thinking"
2. Explore neighborhood (radius 2)
3. Find journeys between core concepts
4. Get central lenses (betweenness)
5. Study each lens in order of centrality
```

**Outcome**: Structured learning path through the domain

## Going Deeper

For API-level integration, see [API.md](API.md)

For contributing, see [CONTRIBUTING.md](../CONTRIBUTING.md)

For issues and discussion, see [GitHub Issues](https://github.com/yourusername/interlens/issues)
