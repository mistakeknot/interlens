import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { embeddingText } from '../lib/store.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, '..', '..', '..', 'tests', 'fixtures', 'embedding_text');

test('embedding text matches every shared fixture byte for byte', async () => {
  const names = (await readdir(fixtures))
    .filter(name => name.endsWith('.expected.txt'))
    .sort();
  assert.ok(names.length >= 3);

  for (const expectedName of names) {
    const caseName = expectedName.slice(0, -'.expected.txt'.length);
    let spec = null;
    let body = '';
    try {
      spec = JSON.parse(await readFile(path.join(fixtures, `${caseName}.spec.json`), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    try {
      body = await readFile(path.join(fixtures, `${caseName}.body.md`), 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const expected = (await readFile(path.join(fixtures, expectedName), 'utf8')).replace(/\n$/, '');
    const actual = embeddingText(spec, body);
    assert.deepEqual(Buffer.from(actual), Buffer.from(expected), caseName);
  }
});
