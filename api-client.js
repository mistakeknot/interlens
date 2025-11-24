import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = process.env.LINSENKASTEN_API_URL || 'https://linsenkasten-api-production.up.railway.app/api/v1';
const CACHE_DIR = path.join(__dirname, '.cache');
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Ensure cache directory exists
await fs.mkdir(CACHE_DIR, { recursive: true });

/**
 * Get cached data if it exists and is not expired
 */
export async function getCachedData(key) {
  const cacheFile = path.join(CACHE_DIR, `${key}.json`);
  try {
    const stat = await fs.stat(cacheFile);
    if (Date.now() - stat.mtime.getTime() < CACHE_TTL) {
      const data = await fs.readFile(cacheFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    // Cache miss or expired
  }
  return null;
}

/**
 * Set cached data
 */
export async function setCachedData(key, data) {
  const cacheFile = path.join(CACHE_DIR, `${key}.json`);
  await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
}

/**
 * Fetch data from the Linsenkasten API
 */
export async function fetchFromAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Error fetching from API: ${error.message}`);
  }
}

/**
 * Search for lenses
 */
export async function searchLenses(query, limit = 10) {
  return fetchFromAPI(`/lenses/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

/**
 * Get a specific lens by name
 */
export async function getLens(name) {
  const results = await fetchFromAPI(`/lenses/search?q=${encodeURIComponent(name)}&limit=1`);
  if (results.results && results.results.length > 0) {
    return results.results[0];
  }
  return null;
}

/**
 * Get lenses by episode
 */
export async function getLensesByEpisode(episode) {
  return fetchFromAPI(`/lenses/episodes/${episode}`);
}

/**
 * Get related lenses
 */
export async function getRelatedLenses(lensName, limit = 5) {
  const searchResults = await fetchFromAPI(`/lenses/search?q=${encodeURIComponent(lensName)}&limit=1`);
  if (!searchResults.results || searchResults.results.length === 0) {
    return null;
  }
  const lensId = searchResults.results[0].id;
  return fetchFromAPI(`/lenses/connections?lens_id=${lensId}&limit=${limit}`);
}

/**
 * Find conceptual journey between two lenses
 */
export async function findLensJourney(source, target) {
  return fetchFromAPI(`/creative/journey?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`);
}

/**
 * Find bridge lenses between multiple lenses
 */
export async function findBridgeLenses(lenses) {
  const params = lenses.map(l => `lenses=${encodeURIComponent(l)}`).join('&');
  return fetchFromAPI(`/creative/bridges?${params}`);
}

/**
 * Find contrasting lenses
 */
export async function findContrastingLenses(lens) {
  return fetchFromAPI(`/creative/contrasts?lens=${encodeURIComponent(lens)}`);
}

/**
 * Get central lenses
 */
export async function getCentralLenses(measure = 'betweenness', limit = 10) {
  return fetchFromAPI(`/creative/central?measure=${measure}&limit=${limit}`);
}

/**
 * Get lens neighborhood
 */
export async function getLensNeighborhood(lens, radius = 2) {
  return fetchFromAPI(`/creative/neighborhood?lens=${encodeURIComponent(lens)}&radius=${radius}`);
}

/**
 * Get random lens provocation
 * @param {string[]} context - Optional array of lens names for gap-aware selection
 */
export async function getRandomProvocation(context = null) {
  if (context && context.length > 0) {
    const contextParams = context.map(name => `context=${encodeURIComponent(name)}`).join('&');
    return fetchFromAPI(`/creative/random?${contextParams}`);
  }
  return fetchFromAPI('/creative/random');
}

/**
 * Detect thinking gaps - analyze conceptual coverage
 * @param {string[]} context - Array of explored lens names
 */
export async function detectThinkingGaps(context) {
  if (!context || context.length === 0) {
    throw new Error('Context parameter required (list of explored lens names)');
  }
  const contextParams = context.map(name => `context=${encodeURIComponent(name)}`).join('&');
  return fetchFromAPI(`/creative/gaps?${contextParams}`);
}

/**
 * Get dialectic triads (thesis/antithesis/synthesis)
 * @param {string} lens - Source lens name
 * @param {number} limit - Maximum triads to return (default: 3)
 */
export async function getDialecticTriads(lens, limit = 3) {
  return fetchFromAPI(`/creative/triads?lens=${encodeURIComponent(lens)}&limit=${limit}`);
}

/**
 * Get learning progressions between two lenses
 * @param {string} start - Starting lens name
 * @param {string} target - Target lens name
 * @param {number} maxSteps - Maximum steps in progression (default: 5)
 */
export async function getLensProgressions(start, target, maxSteps = 5) {
  return fetchFromAPI(`/creative/progressions?start=${encodeURIComponent(start)}&target=${encodeURIComponent(target)}&max_steps=${maxSteps}`);
}

/**
 * Get all lenses (cached)
 */
export async function getAllLenses() {
  let lenses = await getCachedData('all-lenses');
  if (!lenses) {
    lenses = await fetchFromAPI('/lenses?limit=500');
    await setCachedData('all-lenses', lenses);
  }
  return lenses;
}

/**
 * Get frames (cached)
 */
export async function getFrames() {
  let frames = await getCachedData('frames');
  if (!frames) {
    frames = await fetchFromAPI('/frames');
    await setCachedData('frames', frames);
  }
  return frames;
}
