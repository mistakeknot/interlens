import { readFile, appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DATA_ROOT } from './constants.js';

let _store = null;

function tokens(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

async function readJsonl(p) {
  try { return (await readFile(p, 'utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l)); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}

export async function loadStore(force = false) {
  if (_store && !force) return _store;
  const curated = JSON.parse(await readFile(path.join(DATA_ROOT, 'curated', 'lenses.json'), 'utf8'))
    .map(l => ({ ...l, name: l.name || l.lens_name, layer: 'curated' }));
  const connections = JSON.parse(await readFile(path.join(DATA_ROOT, 'curated', 'connections.json'), 'utf8')).connections;
  const frames = JSON.parse(await readFile(path.join(DATA_ROOT, 'curated', 'frames.json'), 'utf8')).frames;
  const generated = (await readJsonl(path.join(DATA_ROOT, 'generated', 'index.jsonl')))
    .map(r => ({ ...r, layer: 'generated', definition: r.summary, examples: [], related_concepts: (r.domains || []).filter(d => d !== 'uncategorized'), episode: null }));
  const edges = await readJsonl(path.join(DATA_ROOT, 'generated', 'edges.jsonl'));
  const byId = new Map(); const byName = new Map();
  for (const l of curated) { byId.set(l.id, l); byName.set(l.name.toLowerCase(), l); }
  for (const g of generated) {
    byId.set(g.id, g);
    const key = g.name.toLowerCase();
    // cluster head wins name resolution; first-seen otherwise
    if (!byName.has(key) || (g.cluster && g.cluster.head)) byName.set(key, g);
  }
  const frameOfLens = new Map();
  for (const f of frames) for (const id of f.lens_ids || []) { if (!frameOfLens.has(id)) frameOfLens.set(id, []); frameOfLens.get(id).push(f.id); }
  _store = { curated, generated, connections, frames, edges, byId, byName, frameOfLens };
  return _store;
}

export async function getAllLenses(layer = 'all') {
  const s = await loadStore();
  return layer === 'curated' ? s.curated : layer === 'generated' ? s.generated : [...s.curated, ...s.generated];
}

export async function getLens(nameOrId) {
  const s = await loadStore();
  if (!nameOrId) return null;
  return s.byId.get(nameOrId) || s.byName.get(String(nameOrId).toLowerCase()) || null;
}

function lexicalScore(q, lens) {
  const qt = tokens(q); if (qt.length === 0) return 0;
  const name = lens.name.toLowerCase();
  if (name === q.toLowerCase()) return 100;
  let score = 0;
  const nt = new Set(tokens(lens.name));
  const dt = new Set(tokens([lens.definition, ...(lens.examples || []), ...(lens.related_concepts || [])].join(' ')));
  for (const t of qt) { if (nt.has(t)) score += 10; else if (dt.has(t)) score += 2; }
  if (name.includes(q.toLowerCase())) score += 20;
  return score;
}

export async function searchLenses(query, limit = 10, { layer = 'all' } = {}) {
  const all = await getAllLenses(layer);
  const scored = all.map(l => ({ l, s: lexicalScore(query, l) })).filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.l.name.localeCompare(b.l.name)).slice(0, limit);
  return { success: true, query, count: scored.length,
    lenses: scored.map(({ l, s }) => ({ ...l, score: s })), results: scored.map(({ l, s }) => ({ ...l, score: s })) };
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
  return { success: true, total_lenses: s.curated.length, generated_lenses: s.generated.length,
    connections: s.connections.length, frames: s.frames.length, by_type: byType };
}

export async function recordReuse(entry) {
  const line = JSON.stringify({ ...entry, recorded_at: new Date().toISOString() }) + '\n';
  const p = path.join(DATA_ROOT, 'generated', 'reuse-log.jsonl');
  await mkdir(path.dirname(p), { recursive: true });
  await appendFile(p, line);
  return { success: true };
}
// resolveLens is added in Task 13 (needs embed.js)
