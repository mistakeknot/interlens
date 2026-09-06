import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const dataRoot = await mkdtemp(path.join(os.tmpdir(), 'linsenkasten-embed-'));
process.env.LINSENKASTEN_DATA_ROOT = dataRoot;
after(() => rm(dataRoot, { recursive: true, force: true }));

const {
  EMBED_DIM,
  cosineTopK,
  embedCounters,
  embedTexts,
  getModelDigest,
  loadMatrix,
  toolEmbeddingMetadata,
} = await import('../lib/embed.js');

async function startFakeOllama({
  models = [{ name: 'nomic-embed-text:latest', digest: 'sha256:fake' }],
  tagsStatus = 200,
} = {}) {
  const requests = { embed: 0, tags: 0 };
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/api/tags') {
      requests.tags += 1;
      res.statusCode = tagsStatus;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ models }));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/embed') {
      requests.embed += 1;
      let body = '';
      for await (const chunk of req) body += chunk;
      const { input: texts } = JSON.parse(body);
      const embeddings = texts.map((text) => Array.from(
        { length: EMBED_DIM },
        (_, i) => (i === texts.indexOf(text) ? 1 : 0),
      ));
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ embeddings }));
      return;
    }

    res.statusCode = 404;
    res.end();
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return { requests, server, url: `http://127.0.0.1:${port}` };
}

test('embedTexts returns deterministic float32 vectors and model metadata', async (t) => {
  const { server, url } = await startFakeOllama();
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });

  const result = await embedTexts(['a', 'b'], { urls: [url] });

  assert.equal(result.tier, 'local');
  assert.equal(result.model_digest, 'sha256:fake');
  assert.equal(result.vectors.length, 2);
  for (const vector of result.vectors) {
    assert.ok(vector instanceof Float32Array);
    assert.equal(vector.length, EMBED_DIM);
  }
  assert.equal(result.vectors[0][0], 1);
  assert.equal(result.vectors[1][1], 1);
});

test('embedTexts preserves successful vectors when model digest lookup fails', async (t) => {
  const { requests, server, url } = await startFakeOllama({ tagsStatus: 500 });
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });

  const result = await embedTexts(['a'], { urls: [url] });

  assert.ok(result);
  assert.equal(result.tier, 'local');
  assert.equal(result.model_digest, null);
  assert.equal(result.vectors.length, 1);
  assert.deepEqual(requests, { embed: 1, tags: 1 });
});

test('embedTexts caches the model digest lookup per URL', async (t) => {
  const { requests, server, url } = await startFakeOllama();
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });

  await embedTexts(['a'], { urls: [url] });
  await embedTexts(['b'], { urls: [url] });

  assert.deepEqual(requests, { embed: 2, tags: 1 });
});

test('getModelDigest returns null when the embedding model is absent', async (t) => {
  const { server, url } = await startFakeOllama({ models: [] });
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });

  assert.equal(await getModelDigest(url), null);
});

test('embedTexts labels and counts use of the fallback URL', async (t) => {
  const { requests, server, url } = await startFakeOllama();
  const localBefore = embedCounters.local;
  const fallbackBefore = embedCounters.fallback;
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });

  const result = await embedTexts(['a'], {
    urls: ['http://127.0.0.1:1', url],
    timeoutMs: 100,
  });

  assert.equal(result.tier, 'fallback');
  assert.equal(embedCounters.local, localBefore);
  assert.equal(embedCounters.fallback, fallbackBefore + 1);
  assert.deepEqual(requests, { embed: 1, tags: 1 });
});

test('embedTexts returns null when every Ollama URL fails', async () => {
  const lexicalBefore = embedCounters.lexical;
  const result = await embedTexts(['a'], {
    urls: ['http://127.0.0.1:1'],
    timeoutMs: 100,
  });

  assert.equal(result, null);
  assert.equal(embedCounters.lexical, lexicalBefore);
});

test('toolEmbeddingMetadata labels and counts a served lexical fallback', () => {
  const lexicalBefore = embedCounters.lexical;

  assert.deepEqual(toolEmbeddingMetadata(null, {}), { embed_tier: 'lexical' });
  assert.equal(embedCounters.lexical, lexicalBefore + 1);
});

test('toolEmbeddingMetadata reports model matches and counts mismatches', () => {
  const mismatchBefore = embedCounters.mismatch;
  const meta = { model_digest: 'sha256:expected' };

  assert.deepEqual(
    toolEmbeddingMetadata({ tier: 'local', model_digest: 'sha256:expected' }, meta),
    { embed_tier: 'local', model_match: true },
  );
  assert.deepEqual(
    toolEmbeddingMetadata({ tier: 'fallback', model_digest: 'sha256:other' }, meta),
    { embed_tier: 'fallback', model_match: false },
  );
  assert.equal(embedCounters.mismatch, mismatchBefore + 1);
});

test('loadMatrix reads float32 rows and cosineTopK ranks deterministically', async () => {
  const embeddingsDir = path.join(dataRoot, 'embeddings');
  await mkdir(embeddingsDir, { recursive: true });

  const ids = ['z', 'a', 'b'];
  const matrix = new Float32Array(ids.length * EMBED_DIM);
  matrix[0] = 3;
  matrix[EMBED_DIM + 1] = 4;
  matrix[(2 * EMBED_DIM) + 2] = 5;

  await writeFile(path.join(embeddingsDir, 'generated.f32'), Buffer.from(matrix.buffer));
  await writeFile(path.join(embeddingsDir, 'generated.ids.json'), JSON.stringify(ids));
  await writeFile(path.join(embeddingsDir, 'meta.json'), JSON.stringify({ model_digest: 'sha256:fake' }));

  const loaded = await loadMatrix('generated');
  assert.deepEqual(loaded.ids, ids);
  assert.deepEqual(loaded.meta, { model_digest: 'sha256:fake' });
  assert.equal(loaded.matrix.length, ids.length * EMBED_DIM);
  assert.equal(loaded.matrix[0], 1);
  assert.equal(loaded.matrix[EMBED_DIM + 1], 1);
  assert.equal(loaded.matrix[(2 * EMBED_DIM) + 2], 1);

  const e0 = new Float32Array(EMBED_DIM);
  e0[0] = 1;
  assert.equal(cosineTopK(e0, loaded.matrix, loaded.ids, 1)[0].id, ids[0]);
  const zero = new Float32Array(EMBED_DIM);
  assert.deepEqual(
    cosineTopK(zero, loaded.matrix, loaded.ids, 2).map(({ id }) => id),
    ['a', 'b'],
  );
});

test('loadMatrix returns null when byte length does not match the IDs', async () => {
  const embeddingsDir = path.join(dataRoot, 'embeddings');
  await mkdir(embeddingsDir, { recursive: true });
  await writeFile(path.join(embeddingsDir, 'broken.f32'), Buffer.alloc(4));
  await writeFile(path.join(embeddingsDir, 'broken.ids.json'), JSON.stringify(['only-row']));
  await writeFile(path.join(embeddingsDir, 'meta.json'), JSON.stringify({ model_digest: 'sha256:fake' }));

  assert.equal(await loadMatrix('broken'), null);
});

test('cosineTopK breaks score ties by codepoint order', () => {
  const ids = ['a', 'A'];
  const matrix = new Float32Array(ids.length * EMBED_DIM);
  const zero = new Float32Array(EMBED_DIM);

  assert.deepEqual(
    cosineTopK(zero, matrix, ids, ids.length).map(({ id }) => id),
    ['A', 'a'],
  );
});
