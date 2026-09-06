import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

test('curated lens corpus is present and well-formed', async () => {
  const p = path.join(here, '..', '..', '..', 'data', 'curated', 'lenses.json');
  const lenses = JSON.parse(await readFile(p, 'utf8'));
  assert.equal(Array.isArray(lenses), true);
  assert.equal(lenses.length, 258);
  for (const l of lenses) assert.ok(l.id && l.name && l.definition, `bad lens ${JSON.stringify(l).slice(0, 80)}`);
});
