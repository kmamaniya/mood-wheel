import assert from 'node:assert/strict';
import test from 'node:test';

import { handleRequest } from '../src/worker.js';

test('the Worker dispatches only supported API methods', async () => {
  const response = await handleRequest(
    new Request('https://mood.example/api/auth/logout'),
    {},
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'POST');
});

test('the Worker forwards non-API requests to static assets', async () => {
  const request = new Request('https://mood.example/styles.css');
  const response = await handleRequest(request, {
    ASSETS: {
      fetch: async (assetRequest) => new Response(assetRequest.url, { status: 200 }),
    },
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), request.url);
});

test('the Worker returns a JSON 404 for unknown API paths', async () => {
  const response = await handleRequest(new Request('https://mood.example/api/missing'), {});

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Not found.' });
});
