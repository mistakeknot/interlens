import { readFile, appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DATA_ROOT, RESOLVE_MIN_COSINE } from './constants.js';
import {
  cosineTopK,
  embedCounters,
  embedTexts,
  loadMatrix,
  markLexicalFallback,
  toolEmbeddingMetadata,
} from './embed.js';

let _store = null;

function tokens(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

export function embeddingText(spec, body = '') {
  if (spec) {
    const parts = [
      spec.persona || '',
      spec.focus || '',
      spec.decision_lens || '',
      ...(spec.review_areas || []),
    ];
    return parts.filter(Boolean).map(String).join('\n').trim();
  }
  const source = String(body || '');
  const perspective = source.match(/^Apply the perspective.*?(?=\n\n)/ms)?.[0] || '';
  const headings = [...source.matchAll(/^### \d+\. (.+)$/gm)].map(match => match[1]);
  const lead = Array.from(source.replace(/\s+/g, ' ').trim()).slice(0, 1200).join('');   // code points, like Python's [:1200]
  return [perspective, ...headings, lead].filter(Boolean).join('\n').trim();
}

async function readJsonl(p) {
  try { return (await readFile(p, 'utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l)); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}

function normalizeGeneratedLens(record, index) {
  const name = record.name || record.lens_name;
  if (typeof name !== 'string' || name.trim() === '') {
    throw new TypeError(`Generated lens ${record.id || `at index ${index}`} is missing a name`);
  }
  return {
    ...record,
    name: name.trim(),
    layer: 'generated',
    definition: record.summary,
    examples: [],
    related_concepts: (record.domains || []).filter(domain => domain !== 'uncategorized'),
    episode: null,
    hit_rate: record.stats?.hit_rate ?? null,
    smoothed_hit_rate: record.stats?.smoothed_hit_rate ?? null,
    adjudicated: record.stats?.adjudicated ?? 0,
    cohort_siblings: record.cohort?.siblings || record.cohort_siblings || [],
  };
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function readOnlyMap(map) {
  let proxy;
  proxy = new Proxy(map, {
    get(target, property, receiver) {
      if (property === 'set' || property === 'delete' || property === 'clear') {
        return () => { throw new TypeError('Cannot modify read-only Map'); };
      }
      if (property === 'size') return target.size;
      if (property === 'get' || property === 'has' || property === 'keys'
          || property === 'values' || property === 'entries' || property === Symbol.iterator) {
        return target[property].bind(target);
      }
      if (property === 'forEach') {
        return (callback, thisArg) => target.forEach(
          (value, key) => callback.call(thisArg, value, key, proxy),
        );
      }
      return Reflect.get(target, property, receiver);
    },
  });
  return Object.freeze(proxy);
}

export async function loadStore(force = false) {
  if (_store && !force) return _store;
  const curated = JSON.parse(await readFile(path.join(DATA_ROOT, 'curated', 'lenses.json'), 'utf8'))
    .map(l => ({ ...l, name: l.name || l.lens_name, layer: 'curated' }));
  const connections = JSON.parse(await readFile(path.join(DATA_ROOT, 'curated', 'connections.json'), 'utf8')).connections;
  const frames = JSON.parse(await readFile(path.join(DATA_ROOT, 'curated', 'frames.json'), 'utf8')).frames;
  const generated = (await readJsonl(path.join(DATA_ROOT, 'generated', 'index.jsonl')))
    .map(normalizeGeneratedLens);
  const edges = await readJsonl(path.join(DATA_ROOT, 'generated', 'edges.jsonl'));
  const mutableById = new Map(); const mutableByName = new Map();
  for (const l of curated) { mutableById.set(l.id, l); mutableByName.set(l.name.toLowerCase(), l); }
  for (const g of generated) {
    mutableById.set(g.id, g);
    const key = g.name.toLowerCase();
    // cluster head wins name resolution; first-seen otherwise
    if (!mutableByName.has(key) || (g.cluster && g.cluster.head)) mutableByName.set(key, g);
  }
  const mutableFrameOfLens = new Map();
  for (const f of frames) for (const id of f.lens_ids || []) { if (!mutableFrameOfLens.has(id)) mutableFrameOfLens.set(id, []); mutableFrameOfLens.get(id).push(f.id); }
  for (const collection of [curated, generated, connections, frames, edges]) deepFreeze(collection);
  for (const frameIds of mutableFrameOfLens.values()) deepFreeze(frameIds);
  const byId = readOnlyMap(mutableById);
  const byName = readOnlyMap(mutableByName);
  const frameOfLens = readOnlyMap(mutableFrameOfLens);
  _store = Object.freeze({ curated, generated, connections, frames, edges, byId, byName, frameOfLens });
  return _store;
}

export async function getAllLenses(layer = 'all') {
  const s = await loadStore();
  return layer === 'curated' ? [...s.curated] : layer === 'generated' ? [...s.generated] : [...s.curated, ...s.generated];
}

export async function getLens(nameOrId) {
  const s = await loadStore();
  if (!nameOrId) return null;
  const hit = s.byId.get(nameOrId) || s.byName.get(String(nameOrId).toLowerCase());
  return hit ? { ...hit } : null;   // shallow copy: the cache is frozen, callers decorate
}

function lexicalScore(q, lens) {
  const query = String(q ?? '').toLowerCase();
  const name = lens.name.toLowerCase();
  if (name === query) return 100;
  const qt = tokens(query); if (qt.length === 0) return 0;   // no tokens → no result; the exact-name check above is the one exception
  let score = name.includes(query) ? 20 : 0;
  const nt = new Set(tokens(lens.name));
  const dt = new Set(tokens([lens.definition, ...(lens.examples || []), ...(lens.related_concepts || [])].join(' ')));
  for (const t of qt) { if (nt.has(t)) score += 10; else if (dt.has(t)) score += 2; }
  return score;
}

export async function searchLenses(query, limit = 10, { layer = 'all' } = {}) {
  const all = await getAllLenses(layer);
  const byScore = (a, b) => b.s - a.s || a.l.name.localeCompare(b.l.name);
  const ranked = all.map(l => ({ l, s: lexicalScore(query, l) })).filter(x => x.s > 0).sort(byScore);
  let scored;
  if (layer === 'all') {
    // Both layers must stay visible: generated names carry the query term far more often than curated names do
    // (first real harvest, 2026-09-06: 'feedback' returned nine fd-*-feedback lenses and no curated lens), so
    // ranks alternate between the two layers' own orderings, the better-scored of each pair first.
    const cur = ranked.filter(x => x.l.layer === 'curated'), gen = ranked.filter(x => x.l.layer !== 'curated');
    scored = [];
    for (let i = 0; scored.length < limit && (i < cur.length || i < gen.length); i++) {
      for (const x of [cur[i], gen[i]].filter(Boolean).sort(byScore)) if (scored.length < limit) scored.push(x);
    }
  } else {
    scored = ranked.slice(0, limit);
  }
  const items = scored.map(({ l, s }) => ({ ...l, score: s }));
  return { success: true, query, count: scored.length,
    lenses: items, results: items.map(item => ({ ...item })) };
}

export async function getLensesByEpisode(episode) {
  const s = await loadStore();
  const lenses = s.curated.filter(l => String(l.episode) === String(episode));
  return { success: true, episode, count: lenses.length, lenses };
}

export async function getFrames() {
  const s = await loadStore();
  return { success: true, frames: [...s.frames], count: s.frames.length };
}

export async function getRelatedLenses(nameOrId, limit = 5) {
  const s = await loadStore(); const lens = await getLens(nameOrId);
  if (!lens) return null;
  const conns = s.connections.filter(c => c.source_id === lens.id || c.target_id === lens.id)
    .sort((a, b) => b.weight - a.weight).slice(0, limit)
    .map(c => ({
      ...c,
      source_name: c.source_name ?? s.byId.get(c.source_id)?.name,
      target_name: c.target_name ?? s.byId.get(c.target_id)?.name,
    }));
  return { success: true, lens: { id: lens.id, name: lens.name }, count: conns.length, connections: conns };
}

export async function getStats() {
  const s = await loadStore();
  const byType = {}; for (const l of s.curated) byType[l.type] = (byType[l.type] || 0) + 1;
  const edgeCounts = {};
  for (const edge of s.edges) edgeCounts[edge.type] = (edgeCounts[edge.type] || 0) + 1;
  const clusterIds = new Set();
  const clustersByHeadSelectedBy = {};
  let corrupt = 0;
  for (const lens of s.generated) {
    if (lens.corrupt) corrupt += 1;
    if (!lens.cluster?.id) continue;
    clusterIds.add(lens.cluster.id);
    if (lens.cluster.head && lens.cluster.head_selected_by) {
      const method = lens.cluster.head_selected_by;
      clustersByHeadSelectedBy[method] = (clustersByHeadSelectedBy[method] || 0) + 1;
    }
  }
  const reuseCounts = {};
  for (const entry of await readJsonl(path.join(DATA_ROOT, 'generated', 'reuse-log.jsonl'))) {
    const lensId = entry.registry_id || entry.lens_id;
    if (lensId) reuseCounts[lensId] = (reuseCounts[lensId] || 0) + 1;
  }
  return { success: true, total_lenses: s.curated.length, generated_lenses: s.generated.length,
    connections: s.connections.length, frames: s.frames.length, by_type: byType,
    edge_counts: edgeCounts, clusters: clusterIds.size,
    clusters_by_head_selected_by: clustersByHeadSelectedBy, corrupt,
    embed_counters: { ...embedCounters }, reuse_counts: reuseCounts };
}

export async function recordReuse(entry) {
  const line = JSON.stringify({ ...entry, recorded_at: new Date().toISOString() }) + '\n';
  const p = path.join(DATA_ROOT, 'generated', 'reuse-log.jsonl');
  await mkdir(path.dirname(p), { recursive: true });
  await appendFile(p, line);
  return { success: true };
}

function isGeneratedHead(lens) {
  // A corrupt body with a spec is still reusable: consumers re-render from the spec, never copy the body.
  return lens?.layer === 'generated' && lens.cluster?.head === true && !(lens.corrupt && !lens.spec_path);
}

function resolutionMatch(lens, score) {
  return {
    id: lens.id,
    name: lens.name,
    score,
    hit_rate: lens.hit_rate,
    smoothed_hit_rate: lens.smoothed_hit_rate,
    adjudicated: lens.adjudicated,
    embodies: lens.embodies || [],
    cluster: lens.cluster || null,
    cohort_siblings: lens.cohort_siblings || [],
  };
}

function jaccard(left, right) {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / new Set([...left, ...right]).size;
}

function lexicalResolution(candidates, { text, spec, k }) {
  const exactName = String(spec?.name || text || '').trim().toLowerCase();
  const exact = exactName
    ? candidates.find(lens => lens.name.toLowerCase() === exactName)
    : null;
  if (exact) {
    return markLexicalFallback({
      matched: true,
      method: 'lexical',
      matches: [resolutionMatch(exact, 1)],
    });
  }

  const focusTokens = new Set(tokens(spec?.focus || ''));
  const matches = candidates
    .map(lens => ({ lens, score: jaccard(focusTokens, new Set(tokens(lens.summary))) }))
    .filter(({ score }) => score >= 0.6)
    .sort((a, b) => b.score - a.score || a.lens.id.localeCompare(b.lens.id))
    .slice(0, k)
    .map(({ lens, score }) => resolutionMatch(lens, score));
  return markLexicalFallback({
    matched: matches.length > 0,
    method: 'lexical',
    matches,
  });
}

export async function resolveLens({ text = '', spec = null, k = 3 } = {}) {
  const query = spec ? embeddingText(spec) : String(text || '');
  const limit = Number.isFinite(k) ? Math.max(0, Math.floor(k)) : 3;
  const s = await loadStore();
  const candidates = s.generated.filter(isGeneratedHead);
  const embedding = await embedTexts([query]);
  if (!embedding) return lexicalResolution(candidates, { text, spec, k: limit });

  const loaded = await loadMatrix('generated');
  const metadata = toolEmbeddingMetadata(embedding, loaded?.meta);
  if (!loaded || limit === 0) {
    return { matched: false, method: 'embedding', matches: [], ...metadata };
  }

  const candidateIds = new Set(candidates.map(lens => lens.id));
  const matches = cosineTopK(
    embedding.vectors[0],
    loaded.matrix,
    loaded.ids,
    loaded.ids.length,
  )
    .filter(({ id }) => candidateIds.has(id))
    .slice(0, limit)
    .map(({ id, score }) => resolutionMatch(s.byId.get(id), score));
  return {
    matched: Boolean(matches[0] && matches[0].score >= RESOLVE_MIN_COSINE),
    method: 'embedding',
    matches,
    ...metadata,
  };
}
