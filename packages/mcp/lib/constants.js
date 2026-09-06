import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, '..', '..', '..');
export const DATA_ROOT = process.env.LINSENKASTEN_DATA_ROOT || path.join(REPO_ROOT, 'data');
export const EMBED_MODEL = 'nomic-embed-text';
export const EMBED_DIM = 768;
export const OLLAMA_URL = process.env.LINSENKASTEN_OLLAMA_URL || 'http://127.0.0.1:11434';
export const OLLAMA_FALLBACK_URL = process.env.LINSENKASTEN_OLLAMA_FALLBACK_URL || 'http://zklw:11434';
export const OLLAMA_TIMEOUT_MS = 4000;
export const RESOLVE_MIN_COSINE = 0.86;   // registry hit threshold (mirrors harvest/thresholds.py)
