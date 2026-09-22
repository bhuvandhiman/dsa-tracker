import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createApp } from '../apps/api/src/app.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const web = fileURLToPath(new URL('../apps/web/', import.meta.url));

function launch(t, args, { cwd = root, env = {} } = {}) {
  const child = spawn(process.execPath, args, {
    cwd, env: { ...process.env, NO_COLOR: '1', ...env },
    stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000,
  });
  let output = '';
  let ended = false;
  child.stdout.on('data', (data) => { output += data; });
  child.stderr.on('data', (data) => { output += data; });
  const done = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => { ended = true; resolve({ code, signal, output }); });
  });
  t.after(async () => { if (!ended) child.kill(); await done; });
  return { child, done, async waitFor(pattern) {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline && !ended) {
      const match = output.match(pattern);
      if (match) return match;
      await delay(40);
    }
    throw new Error(`Process did not become ready: ${output}`);
  } };
}

async function listen(server, port = 0) {
  server.listen(port, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}
const close = (server) => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
async function freePort() {
  const server = createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

for (const port of ['0', '-1', '65536', 'invalid', '1.5']) {
  test(`API startup rejects invalid PORT=${port}`, async (t) => {
    const process = launch(t, ['apps/api/src/server.js'], { env: { PORT: port } });
    const result = await process.done;
    assert.equal(result.code, 1);
    assert.match(result.output, /PORT must be between/);
  });
}

test('API startup fails clearly when its port is already occupied', async (t) => {
  const blocker = createServer();
  const port = await listen(blocker);
  t.after(() => close(blocker));
  const process = launch(t, ['apps/api/src/server.js'], { env: { HOST: '127.0.0.1', PORT: String(port) } });
  const result = await process.done;
  assert.equal(result.code, 1);
  assert.match(result.output, /EADDRINUSE/);
  assert.doesNotMatch(result.output, /API listening/);
});

test('API starts without .env or a database and releases its port when stopped', async (t) => {
  const port = await freePort();
  const process = launch(t, ['apps/api/src/server.js'], { env: { HOST: '127.0.0.1', PORT: String(port), DATABASE_URL: '' } });
  await process.waitFor(/API listening/);
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal((await response.json()).status, 'ok');
  process.child.kill();
  await process.done;
  const probe = createServer();
  await listen(probe, port);
  await close(probe);
});

test('database check fails clearly without DATABASE_URL', async (t) => {
  const process = launch(t, ['apps/api/src/check-db.js'], { env: { DATABASE_URL: '' } });
  const result = await process.done;
  assert.equal(result.code, 1);
  assert.match(result.output, /Set DATABASE_URL/);
});

test('database check exits rather than hanging when PostgreSQL is unavailable', async (t) => {
  const port = await freePort();
  const process = launch(t, ['apps/api/src/check-db.js'], { env: { DATABASE_URL: `postgresql://test:test@127.0.0.1:${port}/test` } });
  const result = await process.done;
  assert.equal(result.code, 1);
  assert.match(result.output, /PostgreSQL check failed/);
  assert.doesNotMatch(result.output, /connection OK/);
});

test('Vite development proxy reaches the real API and forwards failures', async (t) => {
  const api = createApp().listen(0, '127.0.0.1');
  await once(api, 'listening');
  t.after(() => api.listening ? close(api) : undefined);
  const process = launch(t, ['../../node_modules/vite/bin/vite.js', '--port', '0'], {
    cwd: web, env: { API_PROXY_TARGET: `http://127.0.0.1:${api.address().port}` },
  });
  const [, url] = await process.waitFor(/Local:\s+(http:\/\/127\.0\.0\.1:\d+\/)/);
  const html = await fetch(url);
  assert.match(await html.text(), /Recall/);
  const health = await fetch(`${url}api/health`);
  assert.equal((await health.json()).service, 'dsa-tracker-api');
  const placeholder = await fetch(`${url}api/attempts`, { method: 'POST' });
  assert.equal(placeholder.status, 503);
  await placeholder.json();
  await close(api);
  const offline = await fetch(`${url}api/health`);
  assert.equal(offline.status, 502);
  await offline.text();
});

test('combined startup shuts down its API if the web port is occupied', async (t) => {
  const blocker = createServer();
  try {
    await listen(blocker, 5173);
    t.after(() => close(blocker));
  } catch (error) {
    // An already-running local dashboard is also a valid port conflict.
    if (error.code !== 'EADDRINUSE') throw error;
  }
  const port = await freePort();
  const process = launch(t, ['scripts/dev.js'], { env: { HOST: '127.0.0.1', PORT: String(port) } });
  const result = await process.done;
  assert.equal(result.code, 1);
  assert.match(result.output, /5173.*already in use/);
  const probe = createServer();
  await listen(probe, port);
  await close(probe);
});
