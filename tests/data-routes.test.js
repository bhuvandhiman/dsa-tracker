import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../apps/api/src/app.js';
import { DomainError } from '../apps/api/src/domain.js';

async function serverFor(t, repository) {
  const server = createApp({ repository }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/api`;
}
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
test('invalid input is rejected before any repository write', async (t) => {
  let writes = 0;
  const base = await serverFor(t, { createAttempt() { writes++; } });
  const response = await post(`${base}/attempts`, { assistance: 'independent' });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /requestId/);
  assert.equal(writes, 0);
});
test('attempt creation returns 201 and safe retry returns 200', async (t) => {
  let call = 0;
  const base = await serverFor(t, { async createAttempt(input) { return { created: call++ === 0, attempt: { id: input.requestId } }; } });
  const input = { requestId: randomUUID(), problemId: 1, assistance: 'hint', patternSlugs: ['stack'], attemptedAt: '2025-01-01T00:00:00.000Z' };
  const created = await post(`${base}/attempts`, input);
  assert.equal(created.status, 201);
  assert.equal((await created.json()).attempt.id, input.requestId);
  const retry = await post(`${base}/attempts`, input);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).created, false);
});
test('lists return bounded pagination and prevent stale browser caching', async (t) => {
  const base = await serverFor(t, { async listAttempts(page) { assert.deepEqual(page, { limit: 5, offset: 10 }); return []; } });
  const response = await fetch(`${base}/attempts?limit=5&offset=10`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { attempts: [], persistence: true, limit: 5, offset: 10 });
});
test('domain conflicts and missing resources retain their HTTP status', async (t) => {
  for (const status of [404, 409]) {
    const base = await serverFor(t, { async listPatterns() { throw new DomainError(status, 'Clear domain error.'); } });
    const response = await fetch(`${base}/patterns`);
    assert.equal(response.status, status);
    assert.equal((await response.json()).error, 'Clear domain error.');
  }
});
test('database setup and connection errors give actionable 503 responses', async (t) => {
  for (const code of ['42P01', 'ECONNREFUSED', '28P01', '3D000']) {
    const base = await serverFor(t, { async listPatterns() { throw Object.assign(new Error('private connection details'), { code }); } });
    const response = await fetch(`${base}/patterns`);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.match(body.error, /Database/);
    assert.doesNotMatch(body.error, /private/);
  }
});
