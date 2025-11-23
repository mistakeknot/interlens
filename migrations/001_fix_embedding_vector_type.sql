-- Migration: Fix embedding column type from TEXT to VECTOR
-- Date: 2025-11-23
-- Purpose: Enable proper pgvector similarity search for free local embeddings
--
-- This migration converts the embedding column from TEXT (JSON string)
-- to VECTOR(384) for proper vector similarity search using pgvector.

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add new VECTOR column
ALTER TABLE lenses ADD COLUMN embedding_vector VECTOR(384);

-- Step 3: Migrate data from TEXT to VECTOR
-- Parse JSON string "[0.1, 0.2, ...]" and convert to VECTOR type
UPDATE lenses
SET embedding_vector = embedding::text::vector
WHERE embedding IS NOT NULL;

-- Step 4: Verify migration (should show 288 rows updated)
SELECT COUNT(*) as migrated_count
FROM lenses
WHERE embedding_vector IS NOT NULL;

-- Step 5: Drop old TEXT column and rename new VECTOR column
ALTER TABLE lenses DROP COLUMN embedding;
ALTER TABLE lenses RENAME COLUMN embedding_vector TO embedding;

-- Step 6: Create index for fast similarity search (IVFFlat)
-- This dramatically speeds up cosine similarity queries
CREATE INDEX lenses_embedding_idx ON lenses
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 7: Verify schema
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'lenses' AND column_name = 'embedding';

-- Expected output:
-- column_name | data_type | udt_name
-- embedding   | USER-DEFINED | vector

-- Done! The search_lenses RPC function should now work properly with vector similarity.
