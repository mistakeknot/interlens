# Creative Enhancements: Cluster Detection + Auto-Generated Contrasts

**Date:** 2025-11-22
**Status:** Design Complete
**Priority:** High Value Creative Enhancements (Option B from PROJECT_EVALUATION.md)

## Overview

This design implements two high-value creative enhancements identified in the project evaluation:

1. **Cluster Detection Endpoint** - Expose existing `get_lens_clusters()` functionality via API
2. **Auto-Generated Contrasts** - Use Claude Code + Phase 0 to generate dialectic relationships for uncovered lenses

**Estimated Implementation Time:**
- Cluster endpoint: 1 day
- Contrast generation: 2 days
- **Total: 3 days**

## Motivation

From PROJECT_EVALUATION.md:

> **Creative Grade: A- (Excellent)**
> The creative design is outstanding, but the technical implementation needs hardening. The core mission is better served than the technical infrastructure supports.

**Current State:**
- 258 lenses in corpus
- 50 AI-curated contrast relationships (high quality)
- ~200+ lenses lack dialectic opposites
- Cluster detection implemented but not exposed

**Impact:**
- Cluster detection reveals lens communities for deeper exploration
- Auto-contrasts expand dialectic thinking from 50 to potentially 200+ relationships
- Strengthens the A- creative grade toward A/A+

## 1. Cluster Detection Endpoint

### Implementation

**New Endpoint:** `GET /api/v1/creative/clusters`

**Location:** `lens_search_api.py` (add after other `/creative/*` endpoints)

**Function:** Exposes existing `graph.py:279 get_lens_clusters()` method

```python
@app.route('/api/v1/creative/clusters', methods=['GET'])
def get_lens_clusters():
    """Get lens clusters/communities using Louvain or connected components"""
    try:
        G = build_lens_graph()
        clusters = G.get_lens_clusters()

        # Enrich clusters with metadata
        enriched_clusters = []
        for cluster_id, lens_ids in clusters.items():
            # Get lens names and metadata from graph nodes
            lenses = [G.graph.nodes[lid] for lid in lens_ids]

            # Extract shared characteristics
            frames = list(set(l.get("frame", "unknown") for l in lenses))
            concepts = list(set(c for l in lenses for c in l.get("related_concepts", [])))

            enriched_clusters.append({
                "cluster_id": cluster_id,
                "size": len(lens_ids),
                "lenses": [{"id": l["id"], "name": l["name"]} for l in lenses],
                "shared_frames": frames,
                "shared_concepts": concepts[:10]  # Top 10 shared concepts
            })

        # Sort by cluster size (largest first)
        enriched_clusters.sort(key=lambda x: x["size"], reverse=True)

        return jsonify({
            "success": True,
            "total_clusters": len(enriched_clusters),
            "clusters": enriched_clusters,
            "algorithm": "louvain" if has_community_module() else "connected_components"
        })
    except Exception as e:
        logger.error(f"Error getting clusters: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

def has_community_module():
    """Check if python-louvain is available"""
    try:
        import community
        return True
    except ImportError:
        return False
```

### Response Format

```json
{
  "success": true,
  "total_clusters": 8,
  "algorithm": "louvain",
  "clusters": [
    {
      "cluster_id": 0,
      "size": 45,
      "lenses": [
        {"id": "systems_thinking", "name": "Systems Thinking"},
        {"id": "feedback_loops", "name": "Feedback Loops"},
        ...
      ],
      "shared_frames": ["Emergence & Complexity", "Systems & Networks"],
      "shared_concepts": ["feedback", "emergence", "complexity", "interconnection"]
    },
    {
      "cluster_id": 1,
      "size": 32,
      "lenses": [...],
      "shared_frames": ["Leadership Dynamics"],
      "shared_concepts": ["leadership", "influence", "power"]
    }
  ]
}
```

### Use Cases

1. **Discover lens communities** - "What lenses cluster around systems thinking?"
2. **Identify conceptual territories** - "What are the major conceptual domains in FLUX?"
3. **Guide learning paths** - "Learn a cluster of related lenses together"
4. **Gap analysis** - "Which clusters are under-explored in my thinking?"

### Dependencies

**Check:** Does `requirements.txt` include `python-louvain`?
- If YES: Louvain community detection (higher quality)
- If NO: Falls back to NetworkX connected components (still useful)

**Recommendation:** Add `python-louvain` for better clustering

### Testing

```bash
# Local test
curl "http://localhost:5002/api/v1/creative/clusters"

# Production test (after deployment)
curl "https://lens-api.up.railway.app/api/v1/creative/clusters"
```

---

## 2. Auto-Generated Contrasts

### Architecture

**Approach:** Hybrid AI + Generated System
- Keep 50 high-quality AI-curated contrasts (weight: 0.91)
- Generate additional contrasts for uncovered lenses (weight: 0.75-0.85)
- Use Claude Code + Phase 0 for generation (not external LLM calls)

### Batch Generation Script

**File:** `scripts/generate_contrasts.py`

**Purpose:** One-time batch generation of contrast relationships for all lenses without curated contrasts

**Workflow:**
1. Query Supabase for all lenses (258 total)
2. Query existing AI-curated contrasts (50 relationships)
3. Identify lenses without contrasts (~200+ lenses)
4. For each uncovered lens:
   - Get lens definition from API
   - Find contrast candidates using embedding distance + frame overlap
   - Validate candidates as genuine dialectics
   - Generate insight text explaining the tension
   - Assign confidence score (0.75-0.90)
5. Output `generated_contrasts.json` for review
6. Human review and approval
7. Batch insert to Supabase `lens_connections` table
8. Deploy API (graph auto-rebuilds with new contrasts)

### Contrast Identification Algorithm

**Phase 1: Candidate Discovery**

For each lens without contrasts:

1. **Get lens metadata:**
   ```python
   lens = api_client.get(f"/api/v1/lenses?name={lens_name}")
   definition = lens['definition']
   concepts = lens['related_concepts']
   frame = lens['frame']
   ```

2. **Identify primary dimension:**
   - What axis does this lens operate on?
   - Example: "Pace Layering" → temporal/speed dimension
   - Example: "Explore vs Exploit" → risk/learning dimension

3. **Find candidates with opposing positions:**
   - Use embedding distance (low cosine similarity)
   - Filter by shared frame or concepts (same domain)
   - Example: "Move Fast and Break Things" vs "Cathedral Thinking"
     - Both in temporal/strategy domain
     - Opposite positions on velocity axis

4. **Search strategy:**
   ```python
   # Get all lenses
   all_lenses = api_client.get("/api/v1/lenses")

   # Calculate embedding distances
   lens_embedding = get_embedding(lens_definition)

   candidates = []
   for other in all_lenses:
       if other.id == lens.id:
           continue

       other_embedding = get_embedding(other.definition)
       distance = 1 - cosine_similarity(lens_embedding, other_embedding)

       # Low similarity but shared territory
       shared_frame = other.frame == lens.frame
       shared_concepts = len(set(other.concepts) & set(lens.concepts)) > 0

       if distance > 0.7 and (shared_frame or shared_concepts):
           candidates.append({
               "lens": other,
               "distance": distance,
               "shared_frame": shared_frame,
               "shared_concepts": list(set(other.concepts) & set(lens.concepts))
           })

   # Sort by distance (most distant first)
   candidates.sort(key=lambda x: x["distance"], reverse=True)
   return candidates[:10]  # Top 10 candidates
   ```

**Phase 2: Validation & Insight Generation**

For each candidate pair:

1. **Validate as genuine dialectic:**
   ```python
   def is_genuine_contrast(lens_a, lens_b):
       """
       Check if two lenses form a genuine dialectic opposition.

       Criteria:
       - Operate on same conceptual dimension
       - Hold opposing positions
       - Create productive tension (not just unrelated)
       """

       # Use Claude Code reasoning here
       prompt = f"""
       Are these two lenses genuine dialectic opposites?

       Lens A: {lens_a.name}
       Definition: {lens_a.definition}

       Lens B: {lens_b.name}
       Definition: {lens_b.definition}

       Criteria:
       1. Do they operate on the same conceptual dimension?
       2. Do they hold opposing positions on that dimension?
       3. Does the tension between them reveal insight?

       Answer: YES or NO
       If YES, explain the dimension and opposition in 1-2 sentences.
       """

       # This is where Claude Code (me) evaluates
       # Returns: (is_contrast: bool, reasoning: str)
   ```

2. **Generate insight text:**
   ```python
   def generate_contrast_insight(lens_a, lens_b, reasoning):
       """
       Generate explanatory text for the contrast relationship.

       Format: "Lens A emphasizes X. Lens B emphasizes Y. Tension: Z."
       """

       prompt = f"""
       Generate a concise insight explaining the dialectic tension between:

       {lens_a.name}: {lens_a.definition}
       {lens_b.name}: {lens_b.definition}

       Reasoning: {reasoning}

       Format (2-3 sentences max):
       - What does Lens A prioritize?
       - What does Lens B prioritize?
       - What is the productive tension?

       Example: "Move Fast prioritizes rapid iteration and accepts breakage as learning cost. Cathedral Thinking emphasizes patient, multi-generational building. Tension: velocity vs longevity."
       """

       # Claude Code generates insight
       # Returns: insight_text (str)
   ```

3. **Assign confidence score:**
   ```python
   def calculate_confidence(lens_a, lens_b, embedding_distance, shared_attrs):
       """
       Confidence = weighted combination of:
       - Embedding distance (0.3 weight) - higher is better for contrasts
       - Shared frame (0.3 weight) - same domain increases confidence
       - Shared concepts (0.2 weight) - some overlap is good
       - Validation reasoning quality (0.2 weight) - subjective assessment
       """

       score = 0.0

       # Embedding distance (0.7-1.0 maps to 0.3 confidence)
       if embedding_distance > 0.7:
           score += 0.3 * ((embedding_distance - 0.7) / 0.3)

       # Shared frame (0.3 confidence)
       if shared_attrs["frame"]:
           score += 0.3

       # Shared concepts (0.2 confidence)
       if len(shared_attrs["concepts"]) > 0:
           score += 0.2

       # Validation quality (0.2 confidence) - based on reasoning length/specificity
       score += 0.2  # Baseline for validated contrasts

       return min(0.9, score)  # Cap at 0.9 (curated contrasts are 0.91)
   ```

### Output Format

**File:** `generated_contrasts.json`

```json
[
  {
    "source": "Move Fast and Break Things",
    "target": "Cathedral Thinking",
    "weight": 0.85,
    "type": "contrast",
    "insight": "Move Fast prioritizes rapid iteration and accepts breakage as learning cost. Cathedral Thinking emphasizes patient, multi-generational building. Tension: velocity vs longevity.",
    "confidence": 0.85,
    "generated_by": "claude-code-phase0",
    "generated_at": "2025-11-22T10:30:00Z",
    "reasoning": "Both lenses address temporal strategy in building/innovation but from opposite ends of the speed spectrum. Move Fast values quick learning through failure; Cathedral values enduring quality through patience.",
    "embedding_distance": 0.82,
    "shared_frame": "Temporal Dynamics",
    "shared_concepts": ["strategy", "building", "time"]
  },
  {
    "source": "Explore vs Exploit",
    "target": "Double Down",
    "weight": 0.78,
    "type": "contrast",
    "insight": "Explore vs Exploit balances learning new things with optimizing known things. Double Down commits fully to one path. Tension: optionality vs conviction.",
    "confidence": 0.78,
    "generated_by": "claude-code-phase0",
    "generated_at": "2025-11-22T10:32:00Z",
    "reasoning": "Explore/Exploit maintains balance and keeps options open. Double Down eliminates optionality for focused execution. Genuine dialectic on commitment strategy.",
    "embedding_distance": 0.75,
    "shared_frame": "Strategic Thinking",
    "shared_concepts": ["strategy", "decision-making"]
  }
]
```

### Script Implementation

**File:** `scripts/generate_contrasts.py`

**Command-line Interface:**
```bash
# Generate contrasts for first 50 uncovered lenses (preview)
python scripts/generate_contrasts.py --limit 50 --dry-run

# Generate for all uncovered lenses
python scripts/generate_contrasts.py --all --confidence-threshold 0.75

# Insert reviewed contrasts into database
python scripts/generate_contrasts.py --insert generated_contrasts.json
```

**Main Functions:**

```python
import os
import json
import argparse
import logging
from typing import List, Dict, Tuple
from supabase import create_client
import openai
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)

def get_uncovered_lenses() -> List[Dict]:
    """Query Supabase for lenses without contrast relationships"""
    supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

    # Get all lenses
    all_lenses = supabase.table('lenses').select('*').execute()

    # Get all existing contrasts
    contrasts = supabase.table('lens_connections').select('*').eq('type', 'contrast').execute()

    # Find lenses without contrasts
    lenses_with_contrasts = set()
    for c in contrasts.data:
        lenses_with_contrasts.add(c['source_lens_id'])
        lenses_with_contrasts.add(c['target_lens_id'])

    uncovered = [l for l in all_lenses.data if l['id'] not in lenses_with_contrasts]

    logger.info(f"Found {len(uncovered)} lenses without contrast relationships")
    return uncovered

def find_contrast_candidates(lens: Dict, all_lenses: List[Dict]) -> List[Dict]:
    """Find potential contrast lenses using embedding distance + frame overlap"""
    # Implementation from Phase 1 above
    pass

def validate_contrast(lens_a: Dict, lens_b: Dict) -> Tuple[bool, str]:
    """Use Claude Code reasoning to validate if genuine dialectic"""
    # Implementation from Phase 2 above
    # This is where I (Claude Code) do the validation
    pass

def generate_insight(lens_a: Dict, lens_b: Dict, reasoning: str) -> str:
    """Generate explanatory insight text"""
    # Implementation from Phase 2 above
    pass

def calculate_confidence(lens_a: Dict, lens_b: Dict,
                        embedding_distance: float,
                        shared_attrs: Dict) -> float:
    """Calculate confidence score for generated contrast"""
    # Implementation from Phase 2 above
    pass

def batch_insert_contrasts(contrasts: List[Dict]):
    """Insert approved contrasts into Supabase"""
    supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

    for contrast in contrasts:
        # Format for lens_connections table
        record = {
            'source_lens_id': contrast['source'],
            'target_lens_id': contrast['target'],
            'relationship_type': contrast['type'],
            'weight': contrast['weight'],
            'insight': contrast['insight'],
            'metadata': {
                'confidence': contrast['confidence'],
                'generated_by': contrast['generated_by'],
                'generated_at': contrast['generated_at'],
                'reasoning': contrast['reasoning']
            }
        }

        supabase.table('lens_connections').insert(record).execute()

    logger.info(f"Inserted {len(contrasts)} contrast relationships")

def main():
    parser = argparse.ArgumentParser(description='Generate contrast relationships for lenses')
    parser.add_argument('--limit', type=int, help='Process first N uncovered lenses')
    parser.add_argument('--all', action='store_true', help='Process all uncovered lenses')
    parser.add_argument('--confidence-threshold', type=float, default=0.75)
    parser.add_argument('--output', default='generated_contrasts.json')
    parser.add_argument('--dry-run', action='store_true', help='Preview without inserting')
    parser.add_argument('--insert', help='Insert contrasts from JSON file')

    args = parser.parse_args()

    if args.insert:
        # Load and insert reviewed contrasts
        with open(args.insert) as f:
            contrasts = json.load(f)

        print(f"Inserting {len(contrasts)} contrasts from {args.insert}")
        if input("Confirm insertion (y/n): ").lower() == 'y':
            batch_insert_contrasts(contrasts)
        return

    # Generate new contrasts
    uncovered = get_uncovered_lenses()

    if args.limit:
        uncovered = uncovered[:args.limit]

    all_lenses = # Load all lenses
    generated = []

    for i, lens in enumerate(uncovered):
        logger.info(f"Processing {i+1}/{len(uncovered)}: {lens['name']}")

        candidates = find_contrast_candidates(lens, all_lenses)

        for candidate in candidates[:3]:  # Top 3 candidates per lens
            is_contrast, reasoning = validate_contrast(lens, candidate['lens'])

            if is_contrast:
                insight = generate_insight(lens, candidate['lens'], reasoning)
                confidence = calculate_confidence(
                    lens, candidate['lens'],
                    candidate['distance'],
                    {
                        'frame': candidate['shared_frame'],
                        'concepts': candidate['shared_concepts']
                    }
                )

                if confidence >= args.confidence_threshold:
                    generated.append({
                        'source': lens['name'],
                        'target': candidate['lens']['name'],
                        'weight': confidence,
                        'type': 'contrast',
                        'insight': insight,
                        'confidence': confidence,
                        'generated_by': 'claude-code-phase0',
                        'generated_at': datetime.utcnow().isoformat(),
                        'reasoning': reasoning,
                        'embedding_distance': candidate['distance'],
                        'shared_frame': lens.get('frame', 'unknown'),
                        'shared_concepts': candidate['shared_concepts']
                    })

    # Write output
    with open(args.output, 'w') as f:
        json.dump(generated, f, indent=2)

    print(f"Generated {len(generated)} contrasts")
    print(f"Output: {args.output}")

    if not args.dry_run:
        print(f"Review {args.output} then run with --insert to load into database")

if __name__ == '__main__':
    main()
```

### Review Process

1. **Generate:** `python scripts/generate_contrasts.py --all`
2. **Review:** Open `generated_contrasts.json`, remove low-quality contrasts
3. **Insert:** `python scripts/generate_contrasts.py --insert generated_contrasts.json`
4. **Deploy:** Push to GitHub, Railway auto-deploys with new contrasts

### Quality Control

**Thresholds:**
- Minimum confidence: 0.75
- Maximum contrasts per lens: 3
- Embedding distance minimum: 0.7 (ensure sufficient opposition)

**Manual Review Checklist:**
- Does the contrast create productive tension?
- Is the insight text clear and accurate?
- Are the lenses in the same conceptual domain?
- Does this add value beyond existing 50 curated contrasts?

---

## Dependencies

### Cluster Detection

**Check `requirements.txt` for:**
- `networkx==3.1` ✅ (already present)
- `python-louvain` ❌ (needs to be added)

**Add to requirements.txt:**
```
python-louvain==0.16  # For community detection in cluster endpoint
```

### Contrast Generation Script

**New script dependencies:**
- `supabase>=2.24.0` ✅ (already present)
- `openai==1.55.3` ✅ (already present)
- `numpy==1.26.4` ✅ (already present)

**No new dependencies needed for script.**

---

## Testing Strategy

### Cluster Endpoint Testing

**Local:**
```bash
# Start API
cd interlens-api
python lens_search_api.py

# Test endpoint
curl http://localhost:5002/api/v1/creative/clusters | jq '.total_clusters'
```

**Production:**
```bash
# After deployment
curl https://lens-api.up.railway.app/api/v1/creative/clusters | jq '.clusters[0]'
```

**Validation:**
- Verify clusters are returned
- Check cluster sizes are reasonable (not all in one cluster)
- Verify shared_frames and shared_concepts are populated

### Contrast Generation Testing

**Dry-run test:**
```bash
cd interlens-api
python scripts/generate_contrasts.py --limit 5 --dry-run
```

**Expected output:**
- `generated_contrasts.json` with 5-15 contrast relationships
- Each contrast has confidence >= 0.75
- Insight text is clear and specific

**Full generation:**
```bash
python scripts/generate_contrasts.py --all --confidence-threshold 0.75
```

**Expected output:**
- 200+ potential contrasts generated
- Human review reduces to ~100-150 high-quality contrasts
- Manual edit of JSON file

**Insertion test:**
```bash
python scripts/generate_contrasts.py --insert generated_contrasts.json
```

**Verification:**
```bash
# Check Supabase lens_connections table
# Should see new rows with type='contrast'

# Test API
curl "https://lens-api.up.railway.app/api/v1/creative/contrasts?lens=Move+Fast+and+Break+Things"
```

---

## Deployment Checklist

### Pre-deployment

- [ ] Add `python-louvain==0.16` to `requirements.txt`
- [ ] Create `scripts/` directory
- [ ] Implement cluster endpoint in `lens_search_api.py`
- [ ] Implement `generate_contrasts.py` script
- [ ] Test cluster endpoint locally
- [ ] Test contrast script with `--limit 5 --dry-run`

### Deployment (Cluster Endpoint)

- [ ] Commit cluster endpoint code
- [ ] Push to GitHub main branch
- [ ] Railway auto-deploys
- [ ] Test production endpoint
- [ ] Update CLAUDE.md with new endpoint documentation

### Deployment (Contrasts)

- [ ] Run full contrast generation: `--all`
- [ ] Review `generated_contrasts.json`
- [ ] Edit to remove low-quality contrasts
- [ ] Insert into Supabase: `--insert generated_contrasts.json`
- [ ] Verify contrasts appear in database
- [ ] Test `/creative/contrasts` endpoint returns new relationships
- [ ] No code deployment needed (data-only change)

---

## Success Metrics

### Cluster Endpoint

**Quantitative:**
- Endpoint returns 200 status
- Clusters identified: 5-15 clusters expected
- Largest cluster size: 30-50 lenses
- Response time: <500ms

**Qualitative:**
- Clusters make conceptual sense (not random groupings)
- Shared frames/concepts align with cluster membership
- Useful for exploration and learning paths

### Auto-Generated Contrasts

**Quantitative:**
- Initial generation: 200+ candidates
- After review: 100-150 approved contrasts
- Confidence scores: 75-90% range
- Coverage: 80%+ of lenses have at least 1 contrast

**Qualitative:**
- Contrasts create genuine dialectic tension
- Insight text is clear and valuable
- Comparable quality to curated contrasts (subjective assessment)
- Enhances creative thinking and paradox navigation

**Impact on Creative Grade:**
- Current: A- (limited contrast relationships)
- Target: A (comprehensive dialectic coverage)

---

## Future Enhancements

### Cluster Endpoint

- Add `?min_size=N` parameter to filter small clusters
- Add `?frame=X` to find clusters within specific frame
- Visualize clusters in web UI (interlens-web)

### Auto-Generated Contrasts

- Periodic re-generation (quarterly) as new lenses are added
- Feedback loop: Track which contrasts users find valuable
- Adjust confidence scores based on usage
- Generate synthesis suggestions (not just contrasts)

---

## Appendix: Example Outputs

### Example Cluster Response

```json
{
  "success": true,
  "total_clusters": 8,
  "algorithm": "louvain",
  "clusters": [
    {
      "cluster_id": 0,
      "size": 45,
      "lenses": [
        {"id": "systems_thinking", "name": "Systems Thinking"},
        {"id": "feedback_loops", "name": "Feedback Loops"},
        {"id": "emergence", "name": "Emergence"},
        {"id": "leverage_points", "name": "Leverage Points"}
      ],
      "shared_frames": ["Emergence & Complexity", "Systems & Networks"],
      "shared_concepts": ["feedback", "emergence", "complexity", "interconnection", "systems"]
    },
    {
      "cluster_id": 1,
      "size": 32,
      "lenses": [
        {"id": "cathedral_thinking", "name": "Cathedral Thinking"},
        {"id": "pace_layering", "name": "Pace Layering"},
        {"id": "long_now", "name": "The Long Now"}
      ],
      "shared_frames": ["Temporal Dynamics & Evolution"],
      "shared_concepts": ["time", "temporal", "long-term", "patience"]
    }
  ]
}
```

### Example Generated Contrasts

```json
[
  {
    "source": "Move Fast and Break Things",
    "target": "Cathedral Thinking",
    "weight": 0.85,
    "type": "contrast",
    "insight": "Move Fast prioritizes rapid iteration and accepts breakage as learning cost. Cathedral Thinking emphasizes patient, multi-generational building. Tension: velocity vs longevity.",
    "confidence": 0.85,
    "generated_by": "claude-code-phase0",
    "generated_at": "2025-11-22T10:30:00Z",
    "reasoning": "Both lenses address temporal strategy but from opposite ends. Move Fast values quick learning through failure; Cathedral values enduring quality through patience.",
    "embedding_distance": 0.82,
    "shared_frame": "Temporal Dynamics",
    "shared_concepts": ["strategy", "building", "time"]
  },
  {
    "source": "First Principles Thinking",
    "target": "Standing on Shoulders of Giants",
    "weight": 0.82,
    "type": "contrast",
    "insight": "First Principles rebuilds from fundamental truths, questioning all assumptions. Standing on Shoulders builds upon existing knowledge. Tension: reinvention vs inheritance.",
    "confidence": 0.82,
    "generated_by": "claude-code-phase0",
    "generated_at": "2025-11-22T10:31:00Z",
    "reasoning": "Both address knowledge-building methodology but with opposite approaches. First Principles discards prior work to rebuild; Shoulders leverages accumulated wisdom.",
    "embedding_distance": 0.79,
    "shared_frame": "Knowledge & Sensemaking",
    "shared_concepts": ["knowledge", "learning", "understanding"]
  }
]
```

---

**End of Design Document**
