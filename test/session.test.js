import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';

import {
  allowedGitHubLogin,
  randomUrlSafeValue,
  readCookie,
  sha256Base64Url,
  signPayload,
  verifyPayload,
} from '../functions/_lib/session.js';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

test('signed session payloads verify and reject tampering', async () => {
  const secret = 'test-secret';
  const token = await signPayload(
    { login: 'karn', exp: Math.floor(Date.now() / 1000) + 60 },
    secret,
  );

  assert.equal((await verifyPayload(token, secret)).login, 'karn');
  assert.equal(await verifyPayload(token + 'x', secret), null);
  assert.equal(await verifyPayload(token, 'another-secret'), null);
});

test('OAuth helpers produce URL-safe values and parse cookies', async () => {
  assert.match(randomUrlSafeValue(), /^[A-Za-z0-9_-]+$/);
  assert.match(await sha256Base64Url('verifier'), /^[A-Za-z0-9_-]+$/);
  assert.equal(
    readCookie(new Request('https://mood.example', { headers: { Cookie: 'first=one; mood_session=two' } }), 'mood_session'),
    'two',
  );
});

test('the GitHub allowlist is an exact, required, case-insensitive match', () => {
  assert.equal(allowedGitHubLogin('Karn', { ALLOWED_GITHUB_LOGIN: 'karn' }), true);
  assert.equal(allowedGitHubLogin('someone-else', { ALLOWED_GITHUB_LOGIN: 'karn' }), false);
  assert.equal(allowedGitHubLogin('karn', {}), false);
});
