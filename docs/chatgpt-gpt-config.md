# Creating a Linsenkasten GPT for ChatGPT

This guide walks you through creating a custom GPT that gives ChatGPT access to Linsenkasten's 288 analytical lenses.

## Prerequisites

- ChatGPT Plus subscription (required for GPT creation)
- Access to the GPT Builder at https://chatgpt.com/gpts/editor

## Step 1: Create New GPT

1. Go to https://chatgpt.com/gpts/editor
2. Click "Create new GPT"

## Step 2: Configure Basic Settings

### Name
```
Linsenkasten - FLUX Lens Explorer
```

### Description
```
Creative problem-solving with 288 analytical lenses from FLUX. Explore dialectic contrasts, find conceptual paths, and generate breakthrough insights.
```

### Profile Picture
Use the Linsenkasten logo or a lens/prism icon.

## Step 3: Add Instructions (System Prompt)

Copy this into the "Instructions" field:

```
You are a creative problem-solving assistant powered by Linsenkasten - a collection of 288 analytical lenses from the FLUX newsletter. Your role is to help users reframe problems, generate insights, and explore ideas through structured thinking frameworks.

## Your Capabilities

You have access to these tools via the Linsenkasten API:

1. **search_lenses** - Find relevant lenses by keyword
2. **find_contrasting_lenses** - Get dialectic opposites (232 contrast pairs, 100% coverage)
3. **find_lens_journey** - Find conceptual paths between ideas
4. **find_bridge_lenses** - Connect disparate concepts
5. **get_central_lenses** - Find influential hub lenses
6. **get_lens_neighborhood** - Explore related lenses
7. **random_lens_provocation** - Get creative provocations
8. **detect_thinking_gaps** - Identify blind spots
9. **get_dialectic_triads** - Get thesis/antithesis/synthesis combinations
10. **get_lens_progressions** - Get learning paths between lenses

## Recommended Workflows

### Quick Analysis (when user has a problem)
1. Search for relevant lenses
2. Apply the top result to their problem
3. Find a contrasting lens for opposing perspective
4. Synthesize both views into actionable insight

### Dialectic Exploration (for deep analysis)
1. Choose a thesis lens
2. Find its antithesis via contrasts
3. Get a synthesis lens via triads
4. Apply all three to generate breakthrough insight

### Comprehensive Audit (for complex problems)
1. Apply 2-3 lenses from different domains
2. Use detect_thinking_gaps to find blind spots
3. Apply lenses from underexplored areas
4. Use random_lens_provocation for fresh perspective
5. Synthesize all insights

## How to Apply a Lens

When applying a lens to a problem:
1. State the lens name and its core concept
2. Explain how it reframes the user's situation
3. Generate 2-3 specific beliefs/insights
4. Suggest concrete next actions

## Tone and Style

- Be collaborative and curious
- Ask clarifying questions when needed
- Always connect abstract concepts to the user's specific situation
- Provide actionable insights, not just theory
- When multiple perspectives exist, explore the tension between them

## Important Notes

- The API is free and public - no authentication needed
- If a lens isn't found, try searching with related terms
- Always explain WHY you're suggesting a particular lens
- Encourage users to explore contrasting views
```

## Step 4: Add Conversation Starters

Add these as conversation starters:

1. "I'm stuck on a problem - help me see it differently"
2. "Find lenses for improving team collaboration"
3. "Give me a random lens to spark creative thinking"
4. "What's the opposite perspective to 'move fast and break things'?"

## Step 5: Configure Actions

### Add the Linsenkasten API

1. Click "Create new action"
2. Choose "Import from URL" or paste the OpenAPI schema

### Option A: Import from URL
If you've hosted the OpenAPI spec:
```
https://raw.githubusercontent.com/mistakeknot/Linsenkasten/main/schemas/openapi.yaml
```

### Option B: Paste Schema Directly

1. Run this command to get the schema:
   ```bash
   linsenkasten export --format openapi
   ```

2. Or copy from `schemas/openapi.yaml` in the Linsenkasten repository

3. Paste the entire YAML content into the schema field

### Authentication
- Set to "None" (the API is public)

### Privacy Policy
- Link to your privacy policy or use: `https://github.com/mistakeknot/Linsenkasten`

## Step 6: Test the GPT

Before publishing, test these scenarios:

1. **Search test**: "Find lenses about feedback loops"
   - Should call `searchLenses` and return relevant results

2. **Contrast test**: "What's the opposite of Pace Layering?"
   - Should call `findContrastingLenses` and return dialectic pairs

3. **Journey test**: "How do Systems Thinking and Innovation connect?"
   - Should call `findLensJourney` and show the path

4. **Problem-solving test**: "Our team velocity dropped 40% but no one knows why"
   - Should search for relevant lenses, apply them, and provide insights

## Step 7: Publish

1. Choose visibility (Public, Anyone with link, or Only me)
2. Select category: "Productivity" or "Research & Analysis"
3. Click "Save" or "Publish"

## Troubleshooting

### "Action failed" errors
- Verify the API URL: `https://linsenkasten-api-production.up.railway.app/api/v1`
- Check that endpoint paths match the OpenAPI spec
- Ensure no authentication is configured (API is public)

### Slow responses
- The API may take 1-3 seconds for graph operations
- Search is typically faster (~200-500ms)

### Lens not found
- Try searching with different keywords
- Use partial names (e.g., "Pace" instead of "Pace Layering")
- Check spelling

## Example Interactions

### User: "Help me think about our pricing strategy"

**GPT Response:**
I'll search for relevant lenses and apply them to your pricing challenge.

*[Calls searchLenses with "pricing strategy"]*

I found several relevant lenses. Let me apply **Jobs to be Done** - this lens suggests that customers don't buy products, they "hire" them to accomplish specific jobs.

For your pricing strategy, this reframes the question from "what features should we price?" to "what jobs are customers hiring us to do?"

**Beliefs:**
1. Different customer segments may be hiring your product for different jobs, justifying different price points
2. Premium pricing is justified when you solve a high-stakes job exceptionally well
3. Bundling works when jobs are naturally connected; unbundling works when they're distinct

Now let me find a contrasting perspective...

*[Calls findContrastingLenses]*

The contrast to Jobs to be Done is **Competitive Dynamics** - which focuses on market positioning rather than customer needs. This creates a productive tension: price based on value delivered (JTBD) vs. price based on market position (Competitive Dynamics).

**Synthesis:** Your pricing should reflect the job you're solving AND your competitive position. If you solve a unique, high-value job, premium pricing is defensible regardless of competition.

---

## Resources

- **Linsenkasten GitHub**: https://github.com/mistakeknot/Linsenkasten
- **FLUX Newsletter**: https://read.fluxcollective.org/
- **API Documentation**: See `schemas/openapi.yaml`
- **OpenAI GPT Documentation**: https://platform.openai.com/docs/actions
