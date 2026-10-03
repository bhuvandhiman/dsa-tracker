import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import {get as httpGet} from 'node:http';
import { createApp } from '../apps/api/src/app.js';
import { createPool } from '../apps/api/src/db.js';

let server;
let base;
before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
test('unexpected failures redact record content from both logs and responses',async t=>{
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
  const broken=createApp({repository:{readiness:async()=>{throw new Error('sensitive-note-and-password');}}}).listen(0,'127.0.0.1');await once(broken,'listening');t.after(()=>new Promise(resolve=>broken.close(resolve)));
  const response=await fetch(`http://127.0.0.1:${broken.address().port}/api/ready`);assert.equal(response.status,500);
  assert.equal((await response.json()).error,'Internal server error.');assert.equal(logs.length,1);assert.ok(!JSON.stringify(logs).includes('sensitive-note-and-password'));
});

test('health responds over HTTP without a database', async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'dsa-tracker-api' });
});
test('remote origins and rebinding hosts are rejected before reading or mutating data',async()=>{
  for(const headers of [{Origin:'https://untrusted.example'},{Origin:'http://localhost:6666'}])assert.equal((await fetch(`${base}/api/health`,{headers})).status,403);
  const hostStatus=await new Promise((resolve,reject)=>httpGet(`${base}/api/health`,{headers:{Host:'untrusted.example'}},response=>{response.resume();resolve(response.statusCode);}).on('error',reject));
  assert.equal(hostStatus,403);
  for(const Origin of ['http://127.0.0.1:5173','http://localhost:4173','chrome-extension://'+'a'.repeat(32)])assert.equal((await fetch(`${base}/api/health`,{headers:{Origin}})).status,200);
});
test('data routes explicitly require database configuration', async () => {
  const response = await fetch(`${base}/api/attempts`);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.match(body.error, /Database is not configured/);
  const post = await fetch(`${base}/api/attempts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(post.status, 503);
  assert.match((await post.json()).error, /Database is not configured/);
});
test('unknown routes and malformed/oversized requests return JSON errors', async () => {
  const missing = await fetch(`${base}/missing`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, 'Route not found.');
  const bad = await fetch(`${base}/api/attempts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error, 'Invalid JSON body.');
  const large = await fetch(`${base}/api/attempts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'a'.repeat(20000) }) });
  assert.equal(large.status, 413);
  assert.equal((await large.json()).error, 'Request body too large.');
});
test('database configuration fails clearly when omitted', () => {
  assert.throws(() => createPool(''), /Set DATABASE_URL/);
});

for (const headers of [
  { 'Content-Type': 'application/json; charset=iso-8859-1' },
  { 'Content-Type': 'application/json', 'Content-Encoding': 'unsupported' },
]) {
  test(`unsupported request encoding is a client error: ${JSON.stringify(headers)}`, async () => {
    const response = await fetch(`${base}/api/attempts`, { method: 'POST', headers, body: '{}' });
    assert.equal(response.status, 415);
    assert.deepEqual(await response.json(), { error: 'Unsupported request encoding or charset.' });
  });
}

test('health supports HEAD without advertising framework details', async () => {
  const response = await fetch(`${base}/api/health`, { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.match(response.headers.get('content-type'), /application\/json/);
});

test('concurrent health checks remain available without a configured database', async () => {
  const responses = await Promise.all(Array.from({ length: 20 }, () => fetch(`${base}/api/health`)));
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'ok');
  }
  const response = await fetch(`${base}/api/attempts`);
  assert.equal(response.status, 503);
  await response.json();
});
