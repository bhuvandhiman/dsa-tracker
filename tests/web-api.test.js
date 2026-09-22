import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getHealth } from '../apps/web/src/api.js';

test('web client sends its signal and accepts the API health contract', async (t) => {
  const controller = new AbortController();
  const health = { status: 'ok', service: 'dsa-tracker-api', phase: 1 };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/health');
    assert.equal(options.signal, controller.signal);
    return Response.json(health);
  });
  assert.deepEqual(await getHealth(controller.signal), health);
});

for (const status of [404, 500, 502, 503]) {
  test(`web client rejects HTTP ${status}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response('upstream unavailable', { status }));
    await assert.rejects(getHealth(), new RegExp(`HTTP ${status}`));
  });
}

for (const body of [null, {}, [], { status: 'ok' }, { status: 'ok', service: 'another-api' }, { status: 'offline', service: 'dsa-tracker-api' }]) {
  test(`web client rejects an unexpected health response: ${JSON.stringify(body)}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(body));
    await assert.rejects(getHealth(), /Unexpected health response/);
  });
}

test('web client rejects invalid JSON and propagates network failure', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('<html>not JSON</html>'));
  await assert.rejects(getHealth(), SyntaxError);
  mock.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(getHealth(), /Failed to fetch/);
});

test('web client preserves cancellation so the dashboard can show a timeout', async (t) => {
  const controller = new AbortController();
  controller.abort();
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => { signal.throwIfAborted(); });
  await assert.rejects(getHealth(controller.signal), { name: 'AbortError' });
});
