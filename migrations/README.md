# Database Migrations

This directory contains SQL migrations for the Linsenkasten API Supabase database.

## How to Run Migrations

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `cnoiajawbnxqxvsbxris`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Open the migration file (e.g., `001_fix_embedding_vector_type.sql`)
   - Copy the entire contents

4. **Run Migration**
   - Paste the SQL into the Supabase SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - Wait for completion (should take ~10-30 seconds for 288 lenses)

5. **Verify Success**
   - Check the output shows 288 migrated rows
   - Verify the final schema check shows `data_type: USER-DEFINED, udt_name: vector`

## Current Migrations

### 001_fix_embedding_vector_type.sql (2025-11-23)

**Problem**: Embedding column was TEXT (JSON string), not VECTOR type
**Solution**: Migrate to VECTOR(384) for proper pgvector similarity search
**Impact**: Enables free local search with sentence-transformers

**Status**: ⏳ Needs to be run manually in Supabase

**What it does**:
1. Enables pgvector extension
2. Creates new VECTOR(384) column
3. Migrates all 288 embeddings from TEXT → VECTOR
4. Drops old TEXT column
5. Creates IVFFlat index for fast cosine similarity search
6. Verifies schema

**After running**: Search will work with zero OpenAI costs!

## Troubleshooting

**"permission denied for extension vector"**
- You need database owner permissions
- Contact Supabase support or use the service role key

**"invalid input syntax for type vector"**
- The TEXT embeddings might not be valid JSON
- Run: `SELECT id, name FROM lenses WHERE embedding IS NULL OR embedding = ''`
- Re-run the precompute_embeddings.py script

**"lists must be positive"**
- Reduce `lists` parameter in index creation from 100 to 50
- Or skip index creation (slower queries but still works)

**Migration fails mid-way**
- Run the cleanup SQL below, then retry:

```sql
-- Cleanup partial migration
ALTER TABLE lenses DROP COLUMN IF EXISTS embedding_vector;
-- Then re-run the full migration
```
