# Codex CLI Integration Guide

This guide shows how to integrate Linsenkasten tools with OpenAI's Codex CLI for creative problem-solving during coding sessions.

## Overview

Codex CLI supports function calling, allowing it to interact with external APIs. By adding Linsenkasten functions, Codex can access 288 analytical lenses to help reframe problems, generate insights, and explore creative solutions.

## Prerequisites

- Codex CLI installed and configured
- OpenAI API key with function calling access

## Setup

### Step 1: Export the Function Schema

Get the OpenAI-compatible function schema:

```bash
# Using Linsenkasten CLI
linsenkasten export --format openai > linsenkasten-functions.json

# Or download from GitHub
curl -O https://raw.githubusercontent.com/mistakeknot/Linsenkasten/main/schemas/openai-functions.json
```

### Step 2: Create a Wrapper Script

Create a script that Codex can call to interact with the Linsenkasten API:

```python
#!/usr/bin/env python3
# linsenkasten_tools.py

import requests
import json
import sys

API_BASE = "https://linsenkasten-api-production.up.railway.app/api/v1"

def search_lenses(q: str, limit: int = 10):
    """Search for FLUX analytical lenses."""
    response = requests.get(f"{API_BASE}/lenses/search", params={"q": q, "limit": limit})
    return response.json()

def get_lens(name: str):
    """Get a specific lens by name."""
    response = requests.get(f"{API_BASE}/lenses/search", params={"q": name, "limit": 1})
    data = response.json()
    if data.get("results"):
        return data["results"][0]
    return {"error": f"Lens '{name}' not found"}

def find_contrasting_lenses(lens: str):
    """Find dialectically contrasting lenses."""
    response = requests.get(f"{API_BASE}/creative/contrasts", params={"lens": lens})
    return response.json()

def find_lens_journey(source: str, target: str):
    """Find conceptual path between two lenses."""
    response = requests.get(f"{API_BASE}/creative/journey", params={"source": source, "target": target})
    return response.json()

def find_bridge_lenses(lenses: list):
    """Find lenses that bridge between concepts."""
    response = requests.get(f"{API_BASE}/creative/bridges", params={"lenses": lenses})
    return response.json()

def get_central_lenses(measure: str = "betweenness", limit: int = 10):
    """Get central/influential lenses in the knowledge graph."""
    response = requests.get(f"{API_BASE}/creative/central", params={"measure": measure, "limit": limit})
    return response.json()

def get_lens_neighborhood(lens: str, radius: int = 2):
    """Explore conceptual neighborhood around a lens."""
    response = requests.get(f"{API_BASE}/creative/neighborhood", params={"lens": lens, "radius": radius})
    return response.json()

def random_lens_provocation(context: list = None):
    """Get a random lens as creative provocation."""
    params = {"context": context} if context else {}
    response = requests.get(f"{API_BASE}/creative/random", params=params)
    return response.json()

def detect_thinking_gaps(context: list):
    """Identify blind spots in thinking based on lenses used."""
    response = requests.get(f"{API_BASE}/creative/gaps", params={"context": context})
    return response.json()

def get_dialectic_triads(lens: str, limit: int = 3):
    """Get thesis/antithesis/synthesis triads."""
    response = requests.get(f"{API_BASE}/creative/triads", params={"lens": lens, "limit": limit})
    return response.json()

def get_lens_progressions(start: str, target: str, max_steps: int = 5):
    """Get learning progression between lenses."""
    response = requests.get(f"{API_BASE}/creative/progressions",
                          params={"start": start, "target": target, "max_steps": max_steps})
    return response.json()

# CLI interface for testing
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python linsenkasten_tools.py <function> [args...]")
        sys.exit(1)

    func_name = sys.argv[1]
    args = sys.argv[2:]

    functions = {
        "search": lambda: search_lenses(args[0], int(args[1]) if len(args) > 1 else 10),
        "get": lambda: get_lens(args[0]),
        "contrasts": lambda: find_contrasting_lenses(args[0]),
        "journey": lambda: find_lens_journey(args[0], args[1]),
        "bridges": lambda: find_bridge_lenses(args),
        "central": lambda: get_central_lenses(args[0] if args else "betweenness"),
        "neighborhood": lambda: get_lens_neighborhood(args[0], int(args[1]) if len(args) > 1 else 2),
        "random": lambda: random_lens_provocation(args if args else None),
        "gaps": lambda: detect_thinking_gaps(args),
        "triads": lambda: get_dialectic_triads(args[0], int(args[1]) if len(args) > 1 else 3),
        "progressions": lambda: get_lens_progressions(args[0], args[1], int(args[2]) if len(args) > 2 else 5),
    }

    if func_name in functions:
        result = functions[func_name]()
        print(json.dumps(result, indent=2))
    else:
        print(f"Unknown function: {func_name}")
        print(f"Available: {', '.join(functions.keys())}")
```

### Step 3: Configure Codex CLI

Add Linsenkasten tools to your Codex configuration. The exact method depends on your Codex CLI version.

#### Option A: System Prompt Approach

Add to your Codex system prompt or configuration:

```
You have access to Linsenkasten tools for creative problem-solving. These tools connect to an API with 288 analytical lenses from the FLUX newsletter.

Available functions:
- search_lenses(q, limit) - Search for lenses by keyword
- find_contrasting_lenses(lens) - Get dialectic opposites
- find_lens_journey(source, target) - Find path between concepts
- get_dialectic_triads(lens) - Get thesis/antithesis/synthesis combinations
- detect_thinking_gaps(context) - Identify blind spots

When a user is stuck on a problem, use these tools to:
1. Search for relevant lenses
2. Apply the lens to reframe the problem
3. Find contrasting perspectives
4. Synthesize insights into actionable recommendations

To call a function, use the Python wrapper:
python linsenkasten_tools.py <function> [args...]
```

#### Option B: Function Calling Configuration

If your Codex CLI supports function definitions, use the schema from `schemas/openai-functions.json`:

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_lenses",
        "description": "Search for FLUX analytical lenses by semantic query.",
        "parameters": {
          "type": "object",
          "properties": {
            "q": {
              "type": "string",
              "description": "Search query"
            },
            "limit": {
              "type": "integer",
              "default": 10
            }
          },
          "required": ["q"]
        }
      }
    }
  ]
}
```

## Usage Examples

### Example 1: Reframing a Stuck Problem

```
User: I've optimized our API response times but users still complain it's slow. I've tried caching, query optimization, and CDN. Nothing helps.

Codex: Let me search for relevant analytical lenses...

[Calls: search_lenses("performance optimization stuck")]

Found "Pace Layering" - this lens suggests different system layers move at different speeds. Your optimizations target fast-moving layers (code, queries) but the problem might be in slower layers.

[Calls: find_contrasting_lenses("Pace Layering")]

The contrast is "Fleet of Theseus" - while Pace Layering focuses on layer speed, Fleet of Theseus asks about identity through change.

Synthesis: Your API is fast, but what if "slowness" isn't about response time? Consider:
- Perceived performance (loading states, optimistic UI)
- End-to-end user journey (not just API calls)
- The "slow layer" might be user mental model, not your code
```

### Example 2: Exploring Design Decisions

```
User: Should we use microservices or keep our monolith?

Codex: Let me find lenses for this architectural decision...

[Calls: search_lenses("microservices architecture decision")]

[Calls: get_dialectic_triads("System Boundaries")]

Found a triad:
- Thesis: System Boundaries (clear separation)
- Antithesis: Shared Mental Models (unified understanding)
- Synthesis: Conway's Law (structure follows communication)

This suggests the microservices vs monolith question isn't about technology - it's about your team's communication structure. Per Conway's Law, your architecture will mirror how your teams communicate.

Questions to consider:
1. How many autonomous teams do you have?
2. Do they need to deploy independently?
3. What's the cost of cross-team coordination?
```

### Example 3: Finding Blind Spots

```
User: We've been analyzing our product strategy using Jobs to be Done and Competitive Dynamics. What are we missing?

Codex: Let me check for thinking gaps...

[Calls: detect_thinking_gaps(["Jobs to be Done", "Competitive Dynamics"])]

Analysis shows you've covered:
- Customer perspective (JTBD)
- Market perspective (Competitive Dynamics)

Underexplored areas:
- Systems/temporal: How will this evolve over time?
- Team/execution: Can your team actually build this?
- Dialectic: What's the opposite of your current strategy?

Suggested lenses to explore:
- Time Horizons (short vs long-term optimization)
- Pace Layering (what changes fast vs slow)
- Explore vs Exploit (innovation vs optimization balance)
```

## Workflow Patterns

### Quick Analysis
```bash
# 1. Search for relevant lens
python linsenkasten_tools.py search "your problem keywords"

# 2. Get contrasting view
python linsenkasten_tools.py contrasts "Lens Name"

# 3. Apply both to your problem
```

### Deep Exploration
```bash
# 1. Get thesis lens
python linsenkasten_tools.py get "Pace Layering"

# 2. Get full triad
python linsenkasten_tools.py triads "Pace Layering"

# 3. Explore neighborhood
python linsenkasten_tools.py neighborhood "Pace Layering" 2
```

### Coverage Check
```bash
# After applying several lenses, check for gaps
python linsenkasten_tools.py gaps "Lens1" "Lens2" "Lens3"
```

## Troubleshooting

### API Connection Issues
```bash
# Test API connectivity
curl https://linsenkasten-api-production.up.railway.app/api/v1/lenses/stats
```

### Lens Not Found
- Try partial names: "Pace" instead of "Pace Layering"
- Use search instead of exact match
- Check spelling

### Slow Responses
- Graph operations (journey, bridges) may take 1-3 seconds
- Search is typically faster (~200-500ms)

## Resources

- **Full Function Schema**: `schemas/openai-functions.json`
- **OpenAPI Spec**: `schemas/openapi.yaml`
- **Web Interface**: https://linsenkasten.com
- **GitHub**: https://github.com/mistakeknot/Linsenkasten
