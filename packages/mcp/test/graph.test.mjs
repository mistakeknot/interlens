import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadStore } from '../lib/store.js';
import {
  buildGraph,
  centralLenses,
  findBridges,
  findContrasts,
  findPaths,
  frameCoverage,
  neighborhood,
  progression,
  triads,
} from '../lib/graph.js';

const EYE = 'lens_161_weekly_eye_of_sauron';
const FOUNDER = 'lens_161_headline_founder_mode';
const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, '..', '..', '..', 'tests', 'fixtures', 'graph-py');

async function readFixture(name) {
  return JSON.parse(await readFile(path.join(fixtureRoot, `${name}.json`), 'utf8'));
}

test('graph has the curated connection edges', async () => {
  const g = buildGraph(await loadStore());
  assert.equal(g.ids.filter(id => !id.startsWith('gen:')).length, 258);   // curated ids; the generated layer joins once data/generated exists
  assert.equal(g.adj.get(EYE).get(FOUNDER).type, 'contrast');
});

test('paths, contrasts, neighborhood, bridges', async () => {
  const s = await loadStore(); const g = buildGraph(s);
  assert.ok(findPaths(g, EYE, FOUNDER).length >= 1);
  assert.ok(findContrasts(g, EYE).map(c => c.id).includes(FOUNDER));
  const n = neighborhood(g, EYE, 1); assert.ok((n.contrast || []).includes(FOUNDER));
  assert.ok((neighborhood(g, FOUNDER, 1).contrast || []).includes(EYE)); // undirected by design
  assert.ok(Array.isArray(findBridges(g, [EYE, FOUNDER])));
});

test('centrality and coverage are deterministic', async () => {
  const s = await loadStore(); const g = buildGraph(s);
  const a = centralLenses(g, 'betweenness', 3), b = centralLenses(g, 'betweenness', 3);
  assert.deepEqual(a, b); assert.equal(a.length, 3);
  for (const m of ['pagerank', 'eigenvector', 'degree']) assert.equal(centralLenses(g, m, 3).length, 3);
  const cov = frameCoverage(s, ['Eye of Sauron']);
  assert.equal(cov.total_frames, 28); assert.ok(!Array.isArray(cov.explored) && Object.keys(cov.explored).length >= 1);
  assert.ok(Array.isArray(cov.unexplored) && typeof cov.coverage_percentage === 'number');
  assert.ok(triads(g, s, EYE, 2).length >= 1);
  const journey = progression(g, s, EYE, FOUNDER, 5);
  assert.ok(journey.progression.length >= 2);
  assert.equal(journey.progression[0].lens.id, EYE);
  assert.equal(journey.progression.at(-1).lens.id, FOUNDER);
  assert.equal(typeof journey.overall_insight, 'string');
});

test('documented undirected divergences stay within the Python reference envelope', async () => {
  const s = await loadStore(); const g = buildGraph(s);
  const [pyContrasts, pyNeighborhood] = await Promise.all([
    readFixture('contrasts_eye'),
    readFixture('neighborhood_eye_r2'),
  ]);

  assert.deepEqual(
    findContrasts(g, EYE).map(({ id }) => id).sort(),
    pyContrasts.map(([id]) => id).sort(),
  );

  const jsNeighborhoodIds = new Set(Object.values(neighborhood(g, EYE, 2)).flat());
  const pyNeighborhoodIds = Object.values(pyNeighborhood).flat();
  assert.ok(pyNeighborhoodIds.every(id => jsNeighborhoodIds.has(id)));

  for (const m of ['betweenness', 'pagerank', 'eigenvector', 'degree']) {
    const ref = new Set((await readFixture(`central_${m}_undirected`)).map(([id]) => id));
    const shared = centralLenses(g, m, 10).filter(({ id }) => ref.has(id)).length;
    assert.ok(shared >= 8, `${m}: only ${shared}/10 ids shared with the undirected Python reference`);
  }
});

test('betweenness on a synthetic 2,000-node graph stays under 3 s', () => {
  const ids = Array.from({ length: 2000 }, (_, i) => `n${i}`);
  const adj = new Map(ids.map(id => [id, new Map()]));
  for (let i = 0; i < 2000; i++) for (const j of [i + 1, i + 7, i * 3 % 2000]) if (j < 2000 && j !== i) { adj.get(ids[i]).set(ids[j], { weight: 0.5, type: 'synthetic' }); adj.get(ids[j]).set(ids[i], { weight: 0.5, type: 'synthetic' }); }
  const t0 = Date.now(); centralLenses({ adj, ids }, 'betweenness', 5, { layer: 'all' });
  assert.ok(Date.now() - t0 < 3000);
});
