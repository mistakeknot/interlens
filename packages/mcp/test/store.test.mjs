import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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
test('lexical search treats hyphens as word separators', async () => {
  const r = await searchLenses('existing-structures', 10);
  assert.ok(r.lenses.some(l => l.name === "Chesterton's Fence"));
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
test('related lenses include readable names when corpus edges only contain ids', async () => {
  const rel = await getRelatedLenses('Situation-Behavior-Impact', 5);
  assert.ok(rel.connections.length > 0);
  assert.equal(rel.connections[0].source_name, 'Situation-Behavior-Impact');
  assert.equal(rel.connections[0].target_name, 'The Everything Bagel');
});
test('store accessors do not expose mutable cached frame or lens data', async () => {
  const first = await getFrames();
  const originalCount = first.count;
  first.frames.pop();
  const frame = first.frames[0];
  assert.ok(Object.isFrozen(frame));
  assert.ok(Object.isFrozen(frame.lens_ids));
  assert.throws(() => frame.lens_ids.push('test-mutated-lens-id'), TypeError);

  const lens = await getLens('Founder Mode');
  assert.ok(Object.isFrozen(lens));
  assert.ok(Object.isFrozen(lens.examples));
  assert.throws(() => lens.examples.push('test-mutated-example'), TypeError);

  const second = await getFrames();
  assert.equal(second.frames.length, originalCount);
  assert.equal(second.count, originalCount);
});
test('recordReuse creates a missing generated directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'interlens-store-'));
  try {
    const storeUrl = new URL('../lib/store.js', import.meta.url).href;
    const script = `import { recordReuse } from ${JSON.stringify(storeUrl)}; await recordReuse({ lens_id: 'test-lens' });`;
    const child = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
      encoding: 'utf8',
      env: { ...process.env, LINSENKASTEN_DATA_ROOT: root },
    });
    assert.equal(child.status, 0, child.stderr);
    const entry = JSON.parse(await readFile(path.join(root, 'generated', 'reuse-log.jsonl'), 'utf8'));
    assert.equal(entry.lens_id, 'test-lens');
    assert.ok(entry.recorded_at);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
