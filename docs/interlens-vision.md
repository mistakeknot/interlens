# interlens — Vision and Philosophy

**Version:** 0.1.0
**Last updated:** 2026-02-28

## What interlens Is

interlens is a cognitive framework library — 288 named lenses from the FLUX Collective, made composable through graph operations and semantic search. Each lens names a concept worth thinking with: Pace Layers, Kintsugi, Feedback Loops, Reality Distortion Fields. The corpus covers 28 thematic frames (Systems, Emergence, Temporal Dynamics, Crisis, Leadership, and more) with 232 dialectic contrast relationships providing full antithesis coverage for every lens.

The system exposes three surfaces: an MCP server for AI agents (TypeScript/Node, published as `interlens-mcp`), a Flask API for graph and search operations (apps/api, deployed on Railway), and a React frontend for human exploration (apps/web, interlens.com). All three draw from the same lens graph — a multi-layer weighted network combining AI-curated relationships, thematic frames, shared concepts, and temporal adjacency.

## Why This Exists

Most analytical tools either give you one framework and call it done, or surface so many options that choosing becomes the bottleneck. interlens takes a different position: name everything, make the relationships explicit, and let composition produce the insight. 288 small lenses composed through graph traversal — journeys, bridges, triads, neighborhoods — produce analysis that no single monolithic framework can reach. The system's north star is improving thinking quality without adding cognitive overhead.

## Design Principles

1. **Named lenses, not unnamed intuitions.** Every concept worth using in structured thinking is worth naming. The 288 lenses externalize the vocabulary that experienced thinkers hold implicitly — making it searchable, composable, and available to agents.

2. **Composition over monolith.** Lenses are deliberately small. Power comes from combining them: journey from one concept to another, find bridges across three, detect which thematic frames haven't been touched. The graph is where thinking happens.

3. **Surface tensions, don't resolve them.** 232 dialectic contrast pairs give every lens its antithesis. When a problem looks solved, the system can surface the opposing lens. Disagreement between perspectives is the signal — interlens makes those tensions visible rather than collapsing them.

4. **Nudge toward blind spots.** Gap detection tracks which thematic frames have been explored and steers toward unexplored territory (80% unexplored, 15% underexplored, 5% serendipity). It does not block or force — it suggests.

5. **Low overhead above all.** Cognitive tools that require cognitive overhead defeat their purpose. Stateless API design, mode-based entry points, and local semantic inference (sentence-transformers, zero ongoing cost) all minimize friction between intent and insight.

## Scope

**What interlens does:**
- Provides 288 named lenses as a composable thinking vocabulary with semantic search
- Graph operations: path finding (journey), multi-concept bridging, neighborhood exploration, cluster detection, centrality analysis
- Dialectic reasoning: contrast pairs, synthesis triads, learning progressions
- Gap detection: identifies unexplored conceptual territory in an ongoing analysis
- MCP integration: AI agents invoke lenses directly inside conversations

**What interlens does not do:**
- Does not resolve decisions — it structures inquiry, not conclusions
- Does not maintain conversation memory — stateless by design, context is an optional parameter
- Does not generate new lenses — the FLUX Collective is the authoritative corpus
- Does not replace domain expertise — frameworks for thinking, not answers to questions

## Direction

- Synthesis endpoint: given two lenses, surface what conceptual territory their combination opens
- Lens expansion pipeline to ingest new FLUX content as it is published, keeping the corpus current
- Usage feedback loop to refine relationship weights based on which combinations prove useful in practice
