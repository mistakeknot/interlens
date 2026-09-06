import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  DATA_ROOT,
  EMBED_DIM,
  EMBED_MODEL,
  OLLAMA_FALLBACK_URL,
  OLLAMA_TIMEOUT_MS,
  OLLAMA_URL,
} from './constants.js';

export { EMBED_DIM, EMBED_MODEL };

export const embedCounters = {
  local: 0,
  fallback: 0,
  lexical: 0,
  mismatch: 0,
};

const loggedFailures = new Set();

function endpoint(url, pathname) {
  return `${url.replace(/\/$/, '')}${pathname}`;
}

async function fetchJson(url, options = {}, timeoutMs = OLLAMA_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function logFailureOnce(url, error) {
  if (loggedFailures.has(url)) return;
  loggedFailures.add(url);
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[linsenkasten] embedding failed at ${url}: ${message}`);
}

export async function getModelDigest(url, timeoutMs = OLLAMA_TIMEOUT_MS) {
  const payload = await fetchJson(endpoint(url, '/api/tags'), {}, timeoutMs);
  const model = Array.isArray(payload.models)
    ? payload.models.find(({ name }) => name === `${EMBED_MODEL}:latest`)
    : null;
  return model?.digest ?? null;
}

function toVectors(payload, expectedCount) {
  if (!Array.isArray(payload.embeddings) || payload.embeddings.length !== expectedCount) {
    throw new Error(`expected ${expectedCount} embeddings`);
  }

  return payload.embeddings.map((embedding) => {
    if (!Array.isArray(embedding) || embedding.length !== EMBED_DIM) {
      throw new Error(`expected embedding dimension ${EMBED_DIM}`);
    }
    if (embedding.some((value) => !Number.isFinite(value))) {
      throw new Error('embedding contains a non-finite value');
    }
    return Float32Array.from(embedding);
  });
}

export async function embedTexts(
  texts,
  {
    urls = [OLLAMA_URL, OLLAMA_FALLBACK_URL],
    timeoutMs = OLLAMA_TIMEOUT_MS,
  } = {},
) {
  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    try {
      const payload = await fetchJson(endpoint(url, '/api/embed'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
      }, timeoutMs);
      const vectors = toVectors(payload, texts.length);
      const modelDigest = await getModelDigest(url, timeoutMs);
      const tier = index === 0 ? 'local' : 'fallback';
      embedCounters[tier] += 1;
      return { vectors, tier, model_digest: modelDigest };
    } catch (error) {
      logFailureOnce(url, error);
    }
  }

  embedCounters.lexical += 1;
  return null;
}

export async function loadMatrix(layer) {
  try {
    const root = path.join(DATA_ROOT, 'embeddings');
    const [buffer, idsText, metaText] = await Promise.all([
      readFile(path.join(root, `${layer}.f32`)),
      readFile(path.join(root, `${layer}.ids.json`), 'utf8'),
      readFile(path.join(root, 'meta.json'), 'utf8'),
    ]);
    const ids = JSON.parse(idsText);
    const meta = JSON.parse(metaText);
    if (!Array.isArray(ids)) return null;
    const expectedBytes = ids.length * EMBED_DIM * Float32Array.BYTES_PER_ELEMENT;
    if (buffer.byteLength !== expectedBytes) return null;

    const matrix = new Float32Array(ids.length * EMBED_DIM);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    for (let i = 0; i < matrix.length; i += 1) {
      matrix[i] = view.getFloat32(i * Float32Array.BYTES_PER_ELEMENT, true);
    }
    return { matrix, ids, meta };
  } catch {
    return null;
  }
}

export function cosineTopK(vec, matrix, ids, k) {
  if (k <= 0 || vec.length !== EMBED_DIM) return [];

  let vecNormSquared = 0;
  for (let i = 0; i < EMBED_DIM; i += 1) vecNormSquared += vec[i] * vec[i];
  const vecNorm = Math.sqrt(vecNormSquared);

  const scores = ids.map((id, row) => {
    const offset = row * EMBED_DIM;
    let dot = 0;
    let rowNormSquared = 0;
    for (let col = 0; col < EMBED_DIM; col += 1) {
      const value = matrix[offset + col];
      dot += vec[col] * value;
      rowNormSquared += value * value;
    }
    const denominator = vecNorm * Math.sqrt(rowNormSquared);
    return { id, score: denominator === 0 ? 0 : dot / denominator };
  });

  return scores
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, k);
}
