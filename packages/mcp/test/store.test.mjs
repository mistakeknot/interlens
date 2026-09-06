import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStore, searchLenses, getLens, getLensesByEpisode, getFrames, getRelatedLenses, getStats } from '../lib/store.js';

test('store loads curated layer', async () => {
  const s = await loadStore();
  assert.equal(s.curated.length, 258);
  assert.equal(s.frames.length, 28);
  assert.equal(s.connections.length, 280);
});
test('lexical search ranks exact name first', async () => {
  const r = await searchLenses('Situation-Behavior-Impact', 5);
  assert.equal(r.lenses[0].name, 'Situation-Behavior-Impact');
  assert.equal(r.lenses[0].layer, 'curated');
});
test('getLens by name and by id', async () => {
  assert.equal((await getLens('Founder Mode')).id, 'lens_161_headline_founder_mode');
  assert.equal((await getLens('lens_161_headline_founder_mode')).name, 'Founder Mode');
  assert.equal(await getLens('no-such-lens-xyz'), null);
});
test('episode, frames, related, stats', async () => {
  assert.ok((await getLensesByEpisode(11)).lenses.length >= 1);
  assert.equal((await getFrames()).frames.length, 28);
  const rel = await getRelatedLenses('Eye of Sauron', 5);
  assert.ok(rel.connections.some(c => c.target_name === 'Founder Mode' || c.source_name === 'Founder Mode'));
  const st = await getStats();
  assert.equal(st.total_lenses, 258);
});
