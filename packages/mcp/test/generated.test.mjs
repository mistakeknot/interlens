import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = await mkdtemp(path.join(os.tmpdir(), 'linsenkasten-generated-'));
const requests = { embed: 0, tags: 0 };
const ollama = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/tags') {
    requests.tags += 1;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      models: [{ name: 'nomic-embed-text:latest', digest: 'sha256:fixture' }],
    }));
    return;
  }
  if (req.method === 'POST' && req.url === '/api/embed') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { input } = JSON.parse(body);
    requests.embed += 1;
    if (input.some(text => text.includes('LEXICAL OFFLINE'))) {
      res.statusCode = 503;
      res.end();
      return;
    }
    const embeddings = input.map(() => {
      const vector = Array(768).fill(0);
      vector[0] = 1;
      return vector;
    });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ embeddings }));
    return;
  }
  res.statusCode = 404;
  res.end();
});
ollama.listen(0, '127.0.0.1');
await once(ollama, 'listening');
const ollamaUrl = `http://127.0.0.1:${ollama.address().port}`;

process.env.LINSENKASTEN_DATA_ROOT = dataRoot;
process.env.LINSENKASTEN_OLLAMA_URL = ollamaUrl;
process.env.LINSENKASTEN_OLLAMA_FALLBACK_URL = ollamaUrl;

const records = [
  {
    id: 'gen:fd-embedding@old',
    name: 'fd-embedding',
    summary: 'older candidate',
    corrupt: false,
    sightings: 2,
    stats: { hit_rate: 0.2, smoothed_hit_rate: 0.3, adjudicated: 2 },
    cluster: { id: 'clu:embedding', head: false, head_selected_by: 'hit_rate' },
    embodies: [{ id: 'curated-systems', score: 0.7 }],
  },
  {
    id: 'gen:fd-embedding@head',
    name: 'fd-embedding',
    summary: 'canonical embedding candidate',
    corrupt: false,
    sightings: 4,
    stats: { hit_rate: 0.75, smoothed_hit_rate: 0.7, adjudicated: 4 },
    cluster: { id: 'clu:embedding', head: true, head_selected_by: 'hit_rate' },
    embodies: [{ id: 'curated-systems', score: 0.91 }],
    cohort: { siblings: ['fd-peer'] },
  },
  {
    id: 'gen:fd-corrupt@bad',
    name: 'fd-corrupt',
    summary: 'canonical embedding candidate',
    corrupt: true,
    sightings: 1,
    stats: { hit_rate: null, smoothed_hit_rate: null, adjudicated: 0 },
    cluster: { id: null, head: true },
    embodies: [],
  },
  {
    id: 'gen:fd-lexical@one',
    name: 'fd-lexical',
    summary: 'identity platform migration',
    corrupt: false,
    sightings: 3,
    stats: { hit_rate: 0.5, smoothed_hit_rate: 0.55, adjudicated: 2 },
    cluster: { id: null, head: true },
    embodies: [],
  },
];

await Promise.all([
  mkdir(path.join(dataRoot, 'curated'), { recursive: true }),
  mkdir(path.join(dataRoot, 'generated'), { recursive: true }),
  mkdir(path.join(dataRoot, 'embeddings'), { recursive: true }),
]);
await Promise.all([
  writeFile(path.join(dataRoot, 'curated', 'lenses.json'), JSON.stringify([
    { id: 'curated-systems', name: 'Systems Lens', definition: 'Trace the whole system.' },
  ])),
  writeFile(path.join(dataRoot, 'curated', 'connections.json'), '{"connections":[]}'),
  writeFile(path.join(dataRoot, 'curated', 'frames.json'), '{"frames":[]}'),
  writeFile(path.join(dataRoot, 'generated', 'index.jsonl'), `${records.map(JSON.stringify).join('\n')}\n`),
  writeFile(path.join(dataRoot, 'generated', 'edges.jsonl'), [
    { source: records[0].id, target: records[1].id, type: 'variant-of', score: 1 },
    { source: records[1].id, target: 'curated-systems', type: 'embodies', score: 0.91 },
    { source: records[1].id, target: records[3].id, type: 'fused-from' },
  ].map(JSON.stringify).join('\n')),
  writeFile(path.join(dataRoot, 'generated', 'reuse-log.jsonl'), [
    { registry_id: records[1].id },
    { registry_id: records[1].id },
    { registry_id: records[3].id },
  ].map(JSON.stringify).join('\n') + '\n'),
]);
const ids = records.map(record => record.id);
const matrix = new Float32Array(ids.length * 768);
matrix[0] = 1;
matrix[768] = 1;
matrix[768 * 2] = 1;
matrix[(768 * 3) + 1] = 1;
await Promise.all([
  writeFile(path.join(dataRoot, 'embeddings', 'generated.f32'), Buffer.from(matrix.buffer)),
  writeFile(path.join(dataRoot, 'embeddings', 'generated.ids.json'), JSON.stringify(ids)),
  writeFile(path.join(dataRoot, 'embeddings', 'meta.json'), JSON.stringify({
    model_digest: 'sha256:fixture',
  })),
]);

const {
  getAllLenses,
  getLens,
  getStats,
  recordReuse,
  resolveLens,
  searchLenses,
} = await import('../lib/store.js');
const { __resetEmbeddingStateForTests } = await import('../lib/embed.js');

after(async () => {
  ollama.closeAllConnections();
  ollama.close();
  await rm(dataRoot, { recursive: true, force: true });
});

test('generated lenses participate in all-layer and generated-only search', async () => {
  assert.equal((await getAllLenses('all')).length, 5);
  const generated = await searchLenses('identity migration', 10, { layer: 'generated' });
  assert.equal(generated.lenses[0].name, 'fd-lexical');
  assert.ok(generated.lenses.every(lens => lens.layer === 'generated'));
  const curated = await searchLenses('Systems Lens', 10, { layer: 'curated' });
  assert.ok(curated.lenses.every(lens => lens.layer === 'curated'));
});

test('generated name lookup resolves the cluster head and exposes serving metadata', async () => {
  const lens = await getLens('fd-embedding');
  assert.equal(lens.id, 'gen:fd-embedding@head');
  assert.equal(lens.hit_rate, 0.75);
  assert.equal(lens.smoothed_hit_rate, 0.7);
  assert.equal(lens.adjudicated, 4);
  assert.equal(lens.sightings, 4);
  assert.deepEqual(lens.embodies, [{ id: 'curated-systems', score: 0.91 }]);
  assert.deepEqual(lens.cohort_siblings, ['fd-peer']);
});

test('resolveLens ranks generated heads and excludes non-head and corrupt records', async () => {
  __resetEmbeddingStateForTests();
  const result = await resolveLens({ text: 'embedding query', k: 3 });
  assert.equal(result.matched, true);
  assert.equal(result.method, 'embedding');
  assert.equal(result.embed_tier, 'local');
  assert.equal(result.model_match, true);
  assert.equal(result.matches[0].id, 'gen:fd-embedding@head');
  assert.equal(result.matches[0].hit_rate, 0.75);
  assert.deepEqual(result.matches[0].cohort_siblings, ['fd-peer']);
  assert.ok(result.matches.every(match => match.id !== 'gen:fd-embedding@old'));
  assert.ok(result.matches.every(match => match.id !== 'gen:fd-corrupt@bad'));
});

test('resolveLens falls back to exact-name and focus-summary lexical matches', async () => {
  __resetEmbeddingStateForTests();
  const exact = await resolveLens({
    spec: { name: 'fd-lexical', persona: 'LEXICAL OFFLINE' },
  });
  assert.equal(exact.matched, true);
  assert.equal(exact.method, 'lexical');
  assert.equal(exact.embed_tier, 'lexical');
  assert.equal(exact.matches[0].id, 'gen:fd-lexical@one');

  const overlap = await resolveLens({
    spec: { persona: 'LEXICAL OFFLINE', focus: 'identity platform migration' },
  });
  assert.equal(overlap.matched, true);
  assert.equal(overlap.matches[0].score, 1);

  const miss = await resolveLens({
    spec: { persona: 'LEXICAL OFFLINE', focus: 'unrelated financial accounting' },
  });
  assert.equal(miss.matched, false);
  assert.deepEqual(miss.matches, []);
});

test('recordReuse is reflected in registry stats with generated graph health', async () => {
  await recordReuse({
    registry_id: 'gen:fd-embedding@head',
    consumer: 'test',
    target: '/tmp/fd-embedding.md',
    project: 'fixture',
  });
  const stats = await getStats();
  assert.deepEqual(stats.edge_counts, { 'variant-of': 1, embodies: 1, 'fused-from': 1 });
  assert.equal(stats.clusters, 1);
  assert.deepEqual(stats.clusters_by_head_selected_by, { hit_rate: 1 });
  assert.equal(stats.corrupt, 1);
  assert.equal(stats.reuse_counts['gen:fd-embedding@head'], 3);
  assert.equal(typeof stats.embed_counters.lexical, 'number');
});

async function callTool(tool, args) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(here, '..', 'index.js')],
    env: {
      ...process.env,
      LINSENKASTEN_DATA_ROOT: dataRoot,
      LINSENKASTEN_OLLAMA_URL: 'http://127.0.0.1:1',
      LINSENKASTEN_OLLAMA_FALLBACK_URL: 'http://127.0.0.1:1',
    },
  });
  const client = new Client(
    { name: 'generated-layer-test', version: '1.0.0' },
    { capabilities: {} },
  );
  try {
    await client.connect(transport);
    const result = await client.callTool({ name: tool, arguments: args });
    return result.content.find(item => item.type === 'text')?.text || '';
  } finally {
    await client.close();
  }
}

test('MCP exposes generated-layer tools and layer-labelled search results', async () => {
  const stats = JSON.parse(await callTool('registry_stats', {}));
  assert.equal(stats.generated_lenses, 4);

  const search = await callTool('search_lenses', { query: 'identity migration', layer: 'generated' });
  assert.match(search, /\[generated\] fd-lexical/);

  const lens = JSON.parse(await callTool('get_lens', { name: 'fd-embedding' }));
  assert.equal(lens.hit_rate, 0.75);

  const reuse = JSON.parse(await callTool('record_reuse', {
    registry_id: 'gen:fd-lexical@one',
    consumer: 'mcp-test',
    target: '/tmp/fd-lexical.md',
    project: 'fixture',
  }));
  assert.equal(reuse.success, true);
});
