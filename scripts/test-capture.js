import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['../tests/fixtures/capture.html','text/html']],
  ['/fixture.js', ['../tests/fixtures/capture-browser.js','text/javascript']],
  ['/adapter.js', ['../apps/extension/src/adapters/leetcode.js','text/javascript']],
  ['/capture.js', ['../apps/extension/src/capture.js','text/javascript']],
]);
const server = createServer(async (request, response) => {
  const entry = files.get(new URL(request.url,'http://127.0.0.1').pathname);
  if (!entry) { response.writeHead(404); response.end('Not found'); return; }
  try { const body = await readFile(new URL(entry[0],import.meta.url)); response.writeHead(200,{'Content-Type':entry[1], 'Cache-Control':'no-store'}); response.end(body); }
  catch { response.writeHead(500); response.end('Fixture unavailable'); }
});
server.listen(8765,'127.0.0.1',()=>console.log('Capture fixture: http://127.0.0.1:8765 (no real submissions or database writes)'));
process.on('SIGINT',()=>server.close());
process.on('SIGTERM',()=>server.close());
