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
  embedTexts,
  loadMatrix,
} = await import('../lib/embed.js');

async function startFakeOllama() {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/api/tags') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        models: [{ name: 'nomic-embed-text:latest', digest: 'sha256:fake' }],
      }));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/embed') {
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
  return { server, url: `http://127.0.0.1:${port}` };
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

test('embedTexts returns null when every Ollama URL fails', async () => {
  const result = await embedTexts(['a'], {
    urls: ['http://127.0.0.1:1'],
    timeoutMs: 100,
  });

  assert.equal(result, null);
});

test('loadMatrix reads float32 rows and cosineTopK ranks deterministically', async () => {
  const embeddingsDir = path.join(dataRoot, 'embeddings');
  await mkdir(embeddingsDir, { recursive: true });

  const ids = ['z', 'a', 'b'];
  const matrix = new Float32Array(ids.length * EMBED_DIM);
  matrix[0] = 1;
  matrix[EMBED_DIM + 1] = 1;
  matrix[(2 * EMBED_DIM) + 2] = 1;

  await writeFile(path.join(embeddingsDir, 'generated.f32'), Buffer.from(matrix.buffer));
  await writeFile(path.join(embeddingsDir, 'generated.ids.json'), JSON.stringify(ids));
  await writeFile(path.join(embeddingsDir, 'meta.json'), JSON.stringify({ model_digest: 'sha256:fake' }));

  const loaded = await loadMatrix('generated');
  assert.deepEqual(loaded.ids, ids);
  assert.deepEqual(loaded.meta, { model_digest: 'sha256:fake' });
  assert.equal(loaded.matrix.length, ids.length * EMBED_DIM);

  const e0 = new Float32Array(EMBED_DIM);
  e0[0] = 1;
  assert.equal(cosineTopK(e0, loaded.matrix, loaded.ids, 1)[0].id, ids[0]);
  const zero = new Float32Array(EMBED_DIM);
  assert.deepEqual(
    cosineTopK(zero, loaded.matrix, loaded.ids, 2).map(({ id }) => id),
    ['a', 'b'],
  );
});
