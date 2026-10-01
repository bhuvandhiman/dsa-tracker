import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from '../apps/web/src/api.js';

test('dashboard client surfaces actionable API errors', async t => {
  t.mock.method(globalThis,'fetch',async () => ({ok:false,status:503,json:async () => ({error:'Apply database migrations first.'})}));
  await assert.rejects(request('/retention'),/Apply database migrations first/);
});
test('dashboard client preserves cancellation and reports connection failures', async t => {
  const controller = new AbortController(); controller.abort();
  t.mock.method(globalThis,'fetch',async (_url,options) => { throw options.signal.reason; });
  await assert.rejects(request('/retention',{signal:controller.signal}),{name:'AbortError'});
  t.mock.method(globalThis,'fetch',async () => {throw new TypeError('Failed to fetch');});
  await assert.rejects(request('/retention'),/Cannot reach the local API/);
});
