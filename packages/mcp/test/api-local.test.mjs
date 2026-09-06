import test from 'node:test';
import assert from 'node:assert/strict';

import * as api from '../lib/api-local.js';

const expectedExports = [
  'detectThinkingGaps',
  'fetchFromAPI',
  'findBridgeLenses',
  'findContrastingLenses',
  'findLensJourney',
  'getAllLenses',
  'getCachedData',
  'getCentralLenses',
  'getDialecticTriads',
  'getFrames',
  'getGraph',
  'getLens',
  'getLensNeighborhood',
  'getLensProgressions',
  'getLensesByEpisode',
  'getRandomProvocation',
  'getRelatedLenses',
  'searchLenses',
  'setCachedData',
];

test('local API exposes the complete facade contract', () => {
  assert.deepEqual(Object.keys(api).sort(), expectedExports.sort());
  for (const name of expectedExports) assert.equal(typeof api[name], 'function', name);
});

test('retired cache and remote API compatibility exports are inert', async () => {
  assert.equal(await api.getCachedData('anything'), null);
  assert.equal(await api.setCachedData('anything', {}), undefined);
  await assert.rejects(
    api.fetchFromAPI('/x'),
    /linsenkasten: remote API retired; use the local store/,
  );
});

test('store-backed lookup exports preserve handler result shapes', async () => {
  const search = await api.searchLenses('feedback', 10);
  assert.ok(search.lenses.some(lens => lens.name === 'Situation-Behavior-Impact'));
  assert.ok(Array.isArray(search.results));
  assert.equal(typeof search.count, 'number');

  assert.equal((await api.getLens('Eye of Sauron')).name, 'Eye of Sauron');
  assert.equal(await api.getLens('no-such-lens-xyz'), null);

  const episode = await api.getLensesByEpisode(161);
  assert.equal(episode.success, true);
  assert.equal(typeof episode.count, 'number');
  assert.ok(Array.isArray(episode.lenses));

  const related = await api.getRelatedLenses('Eye of Sauron', 5);
  assert.equal(related.success, true);
  assert.ok(Array.isArray(related.connections));

  const all = await api.getAllLenses();
  assert.equal(all.success, true);
  assert.equal(all.lenses.length, 258);

  const frames = await api.getFrames();
  assert.equal(frames.success, true);
  assert.equal(frames.count, 28);

  const graph = await api.getGraph();
  assert.equal(graph.success, true);
  assert.ok(Array.isArray(graph.connections));
  assert.ok(Array.isArray(graph.edges));
});

test('journey paths are bare lens arrays matching the MCP handler dereferences', async () => {
  const result = await api.findLensJourney('Eye of Sauron', 'Founder Mode');
  assert.equal(result.success, true);
  assert.ok(result.paths.length >= 1);
  assert.ok(Array.isArray(result.paths[0]));
  assert.ok(result.paths[0].length >= 2);
  assert.equal(typeof result.paths[0][0].name, 'string');
  assert.equal(result.path_weights.length, result.paths.length);
  assert.ok(result.path_weights.every(weight => typeof weight === 'number'));
});

test('creative graph queries return handler-compatible lens objects', async () => {
  const contrasts = await api.findContrastingLenses('Eye of Sauron');
  assert.ok(contrasts.contrasts.some(contrast => contrast.name === 'Founder Mode'));

  const bridges = await api.findBridgeLenses(['Eye of Sauron', 'Founder Mode']);
  assert.equal(bridges.success, true);
  assert.ok(Array.isArray(bridges.bridges));
  assert.ok(bridges.bridges.every(bridge => typeof bridge.connection_strength === 'number'));

  const central = await api.getCentralLenses('degree', 3);
  assert.equal(central.central_lenses.length, 3);
  for (const lens of central.central_lenses) {
    assert.equal(typeof lens.name, 'string');
    assert.ok(Array.isArray(lens.related_concepts));
  }

  const neighborhood = await api.getLensNeighborhood('Eye of Sauron', 1);
  assert.equal(neighborhood.success, true);
  assert.ok(Object.values(neighborhood.neighborhood).flat().every(lens => typeof lens.name === 'string'));
});

test('gap analysis preserves the two distinct handler-facing coverage shapes', async () => {
  const gaps = await api.detectThinkingGaps(['Eye of Sauron']);
  assert.equal(gaps.coverage.total_frames, 28);
  assert.ok(!Array.isArray(gaps.coverage.explored_frames));
  assert.ok(Object.keys(gaps.coverage.explored_frames).length >= 1);
  assert.ok(Array.isArray(gaps.coverage.unexplored_frames));
  assert.equal(typeof gaps.coverage.coverage_percentage, 'number');
  for (const suggestion of gaps.suggestions) {
    assert.ok(Array.isArray(suggestion.sample_lenses));
    assert.ok(suggestion.sample_lenses.length <= 3);
  }

  const provocation = await api.getRandomProvocation(['Eye of Sauron']);
  assert.equal(typeof provocation.gap_analysis.coverage.explored, 'number');
  assert.equal(provocation.gap_analysis.coverage.total, 28);
  assert.equal(typeof provocation.gap_analysis.was_gap_biased, 'boolean');
});

test('triads and progressions include every string the handlers dereference', async () => {
  const dialectic = await api.getDialecticTriads('Eye of Sauron', 2);
  assert.equal(typeof dialectic.triads[0].synthesis_insight, 'string');
  assert.equal(typeof dialectic.triads[0].antithesis.name, 'string');
  assert.equal(typeof dialectic.triads[0].synthesis.name, 'string');

  const journey = await api.getLensProgressions('Eye of Sauron', 'Founder Mode', 5);
  assert.equal(typeof journey.overall_insight, 'string');
  assert.ok(journey.progression.length >= 2);
  assert.equal(typeof journey.progression[0].lens.name, 'string');
});

test('graph-query misses return structured errors instead of throwing', async () => {
  for (const result of await Promise.all([
    api.findLensJourney('missing', 'Founder Mode'),
    api.findBridgeLenses(['missing', 'Founder Mode']),
    api.findContrastingLenses('missing'),
    api.getLensNeighborhood('missing', 1),
    api.detectThinkingGaps([]),
    api.getDialecticTriads('missing', 2),
    api.getLensProgressions('missing', 'Founder Mode', 5),
  ])) {
    assert.equal(result.success, false);
    assert.equal(typeof result.error, 'string');
  }
});
