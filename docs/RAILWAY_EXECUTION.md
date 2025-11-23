# Running Contrast Generation on Railway

**Date:** 2025-11-22
**Task:** Generate dialectic contrast relationships for 280 uncovered lenses

## Current Status

- **Total lenses:** 288
- **With contrasts:** 8 (AI-curated)
- **Without contrasts:** 280 (97%)

## Railway Execution Steps

### 1. Connect to Railway

```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link
```

### 2. Run Contrast Generation Script

**Test run (first 10 lenses):**
```bash
railway run python scripts/generate_contrasts.py --limit 10 --dry-run
```

Expected output:
- `generated_contrasts.json` with 10-30 contrast relationships
- Confidence scores: 0.75-0.90
- Processing time: ~2-3 minutes

### 3. Full Generation (all 280 lenses)

```bash
railway run python scripts/generate_contrasts.py --all --confidence-threshold 0.75
```

Expected output:
- `generated_contrasts.json` with 150-300 contrast relationships
- Processing time: 10-20 minutes
- Each lens gets up to 3 contrast candidates
- Only contrasts with confidence >= 0.75 are included

### 4. Review Generated Contrasts

Download the generated file:
```bash
# The file will be in the Railway container
# You may need to copy it or view it via Railway logs
```

**Quality checklist:**
- Does the contrast create productive tension?
- Is the insight text clear and accurate?
- Are the lenses in the same conceptual domain?
- Is confidence score reasonable (0.75-0.90)?

**Edit locally:**
- Remove low-quality contrasts
- Keep high-quality ones
- Expected: ~100-150 approved contrasts after review

### 5. Insert Approved Contrasts

Upload the reviewed file back to Railway, then:

```bash
railway run python scripts/generate_contrasts.py --insert generated_contrasts.json
```

This inserts contrasts into Supabase `lens_connections` table.

### 6. Verify in API

```bash
# Test a lens that previously had no contrasts
curl "https://lens-api.up.railway.app/api/v1/creative/contrasts?lens=Pace+Layering" | jq
```

Expected: JSON response with newly generated contrasts

## Alternative: Local Execution with Production Credentials

If Railway CLI doesn't work, you can run locally:

### 1. Get Environment Variables from Railway Dashboard

From Railway dashboard, copy:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `OPENAI_API_KEY`

### 2. Create .env file

```bash
# In linsenkasten-api directory
cat > .env << EOF
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
EOF
```

### 3. Run Script Locally

```bash
# Load environment
export $(cat .env | xargs)

# Test run
python scripts/generate_contrasts.py --limit 10 --dry-run

# Full run
python scripts/generate_contrasts.py --all

# Review generated_contrasts.json locally

# Insert
python scripts/generate_contrasts.py --insert generated_contrasts.json
```

## Script Details

**File:** `scripts/generate_contrasts.py` (436 lines)

**Algorithm:**
1. Query all lenses from Supabase
2. Identify lenses without existing contrasts
3. For each uncovered lens:
   - Generate embedding for lens definition (OpenAI)
   - Find candidates with distance > 0.7 AND shared frame/concepts
   - Validate as genuine dialectic opposition
   - Generate insight text explaining the tension
   - Calculate confidence score (0.75-0.90)
4. Output `generated_contrasts.json`
5. Human reviews and edits
6. Insert approved contrasts

**Example Output:**
```json
{
  "source": "Move Fast and Break Things",
  "source_id": "lens_123",
  "target": "Cathedral Thinking",
  "target_id": "lens_456",
  "weight": 0.85,
  "type": "contrast",
  "insight": "Move Fast prioritizes rapid iteration. Cathedral Thinking emphasizes patient building. Tension: velocity vs longevity.",
  "confidence": 0.85,
  "generated_by": "claude-code-phase0",
  "generated_at": "2025-11-22T10:30:00Z",
  "reasoning": "Both address temporal strategy but from opposite ends.",
  "embedding_distance": 0.82,
  "shared_frames": ["frame_temporal_dynamics"],
  "shared_concepts": ["strategy", "time"]
}
```

## Expected Results

**Before:**
- 8 lenses with contrasts (3%)
- Limited dialectic thinking capabilities
- Creative Grade: A-

**After:**
- 100-150 approved contrasts
- 80-90% of lenses have at least 1 contrast
- Comprehensive dialectic coverage
- **Creative Grade: A**

## Troubleshooting

**If script fails with "SUPABASE_URL not set":**
- Railway environment variables not loaded
- Try: `railway run --env production python scripts/generate_contrasts.py ...`

**If embedding generation is slow:**
- OpenAI API rate limits
- Reduce batch size: Use `--limit 50` instead of `--all`
- Run multiple batches

**If validation finds too few contrasts:**
- Validation logic is conservative (better too strict than too loose)
- Lower confidence threshold: `--confidence-threshold 0.70`
- Review algorithm in lines 200-250 of generate_contrasts.py

**If insertion fails:**
- Check Supabase `lens_connections` table schema
- Verify lens IDs exist in `lenses` table
- Check for duplicate constraints

## Time Estimates

- Test run (10 lenses): 2-3 minutes
- Full generation (280 lenses): 10-20 minutes (OpenAI API calls)
- Human review: 20-30 minutes
- Insertion: 2-5 minutes
- Verification: 2-3 minutes

**Total: ~40-60 minutes**

## Success Metrics

After completion:
- [ ] `generated_contrasts.json` created with 150-300 candidates
- [ ] Human review reduces to ~100-150 approved contrasts
- [ ] All approved contrasts inserted into Supabase
- [ ] API `/creative/contrasts` endpoint returns new relationships
- [ ] 80%+ lens coverage achieved
- [ ] PROJECT_EVALUATION.md updated: Creative Grade A- → A

---

**Next:** Run `railway run python scripts/generate_contrasts.py --limit 10 --dry-run`
