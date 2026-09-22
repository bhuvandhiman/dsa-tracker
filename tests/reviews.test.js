import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { createApp } from '../apps/api/src/app.js';
import { reviewInput } from '../apps/api/src/domain.js';

async function serverFor(t, repository) {
  const server = createApp({ repository }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/api/reviews`;
}

test('review query defaults and rejects unsupported or unbounded filters', () => {
  assert.deepEqual(reviewInput({}), { view: 'due', limit: 50, offset: 0 });
  assert.deepEqual(reviewInput({ view: 'all', limit: '10', offset: '20' }), { view: 'all', limit: 10, offset: 20 });
  for (const query of [{ view: 'upcoming' }, { view: ['due','all'] }, { limit: '101' }, { offset: '-1' }, { now: '2025-01-01' }]) {
    assert.throws(() => reviewInput(query), { status: 400 });
  }
});

test('review HTTP response includes server time, pagination, counts and policy', async (t) => {
  const url = await serverFor(t, { async listReviews(input) {
    assert.equal(input.view, 'all'); assert.equal(input.limit, 10); assert.equal(input.offset, 20);
    assert.ok(Number.isFinite(Date.parse(input.asOf)));
    return { reviews: [], totalDue: 3, totalTracked: 5, totalMatching: 5 };
  } });
  const response = await fetch(url + '?view=all&limit=10&offset=20');
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(body.totalDue, 3);
  assert.deepEqual(body.policy.days, { solution: 1, hint: 3, independent: 7 });
  assert.equal(body.offset, 20);
});

test('review route validates before accessing the repository', async (t) => {
  const url = await serverFor(t, { listReviews() { assert.fail('Invalid query reached repository'); } });
  assert.equal((await fetch(url + '?view=invalid')).status, 400);
});

test('review route reports database absence and outages without an empty success', async (t) => {
  const absent = await serverFor(t, null);
  assert.equal((await fetch(absent)).status, 503);
  const offline = await serverFor(t, { listReviews() { throw Object.assign(new Error('unavailable'), { code: 'ECONNREFUSED' }); } });
  const response = await fetch(offline);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Database is unavailable/);
});
