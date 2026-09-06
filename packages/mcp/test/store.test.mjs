import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadStore, getAllLenses, searchLenses, getLens, getLensesByEpisode, getFrames, getRelatedLenses, getStats } from '../lib/store.js';

async function writeStoreFixture(root, generated = []) {
  await mkdir(path.join(root, 'curated'), { recursive: true });
  await mkdir(path.join(root, 'generated'), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, 'curated', 'lenses.json'), '[]'),
    writeFile(path.join(root, 'curated', 'connections.json'), '{"connections":[]}'),
    writeFile(path.join(root, 'curated', 'frames.json'), '{"frames":[]}'),
    writeFile(path.join(root, 'generated', 'index.jsonl'), generated.map(record => JSON.stringify(record)).join('\n')),
  ]);
}

function runStoreScript(root, script) {
  return spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    encoding: 'utf8',
    env: { ...process.env, LINSENKASTEN_DATA_ROOT: root },
  });
}

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
test('lexical search finds exact names made only of short words', async () => {
  const r = await searchLenses('To Be or to Do', 5);
  assert.equal(r.lenses[0].name, 'To Be or to Do');
  assert.equal(r.lenses[0].score, 100);
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
test('getAllLenses returns mutable array copies for every layer', async () => {
  for (const layer of ['curated', 'generated', 'all']) {
    const lenses = await getAllLenses(layer);
    const originalCount = lenses.length;
    assert.equal(Object.isFrozen(lenses), false);
    assert.doesNotThrow(() => lenses.sort((a, b) => a.name.localeCompare(b.name)));
    lenses.pop();
    assert.equal((await getAllLenses(layer)).length, originalCount);
  }
});
test('store indexes cannot be mutated through the cached store', async () => {
  const store = await loadStore();
  let forEachMap;
  store.byId.forEach((_lens, _id, map) => { forEachMap = map; });

  assert.equal(forEachMap, store.byId);
  assert.throws(() => store.byId.set('test-mutated-lens-id', null), TypeError);
  assert.throws(() => store.byName.delete('founder mode'), TypeError);
  assert.throws(() => store.frameOfLens.clear(), TypeError);
  assert.equal(store.byId.has('test-mutated-lens-id'), false);
  assert.equal((await getLens('Founder Mode')).id, 'lens_161_headline_founder_mode');
});
test('search result aliases are independent arrays', async () => {
  const result = await searchLenses('Founder Mode', 5);
  const lensCount = result.lenses.length;
  assert.notEqual(result.lenses, result.results);
  result.results.pop();
  assert.equal(result.lenses.length, lensCount);
});
test('generated layer maps fields and lets a cluster head win name resolution', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'interlens-store-'));
  try {
    await writeStoreFixture(root, [
      { id: 'generated-first', name: 'Duplicate Lens', summary: 'first summary', domains: ['strategy', 'uncategorized'] },
      { id: 'generated-head', lens_name: 'Duplicate Lens', summary: 'head summary', domains: ['operations'], cluster: { head: true } },
    ]);
    const storeUrl = new URL('../lib/store.js', import.meta.url).href;
    const script = `
      import { loadStore, getLens } from ${JSON.stringify(storeUrl)};
      const store = await loadStore();
      const resolved = await getLens('Duplicate Lens');
      console.log(JSON.stringify({ generated: store.generated, resolved_id: resolved.id }));
    `;
    const child = runStoreScript(root, script);
    assert.equal(child.status, 0, child.stderr);
    const result = JSON.parse(child.stdout);
    assert.equal(result.generated.length, 2);
    assert.equal(result.generated[0].definition, 'first summary');
    assert.deepEqual(result.generated[0].related_concepts, ['strategy']);
    assert.equal(result.generated[1].name, 'Duplicate Lens');
    assert.equal(result.resolved_id, 'generated-head');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('generated records without a name fail with a descriptive error', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'interlens-store-'));
  try {
    await writeStoreFixture(root, [{ id: 'generated-missing-name', summary: 'missing name' }]);
    const storeUrl = new URL('../lib/store.js', import.meta.url).href;
    const script = `import { loadStore } from ${JSON.stringify(storeUrl)}; await loadStore();`;
    const child = runStoreScript(root, script);
    assert.notEqual(child.status, 0);
    assert.match(child.stderr, /Generated lens generated-missing-name is missing a name/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('recordReuse creates a missing generated directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'interlens-store-'));
  try {
    const storeUrl = new URL('../lib/store.js', import.meta.url).href;
    const script = `import { recordReuse } from ${JSON.stringify(storeUrl)}; await recordReuse({ lens_id: 'test-lens' });`;
    const child = runStoreScript(root, script);
    assert.equal(child.status, 0, child.stderr);
    const entry = JSON.parse(await readFile(path.join(root, 'generated', 'reuse-log.jsonl'), 'utf8'));
    assert.equal(entry.lens_id, 'test-lens');
    assert.ok(entry.recorded_at);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
