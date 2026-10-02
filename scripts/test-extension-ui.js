import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

// Real extension markup/scripts, simulated Chrome messages, no API/database writes.
const server=createServer(async(request,response)=>{
  const path=new URL(request.url,'http://127.0.0.1').pathname;
  const name=path === '/' ? 'popup.html' : path.slice(1);
  if (!/^(popup\.html|setup\.html|popup\.css|setup\.css|account\.css|src\/[a-z/-]+\.js|fixture\.js)$/.test(name)) {response.writeHead(404);response.end();return;}
  const url=name === 'fixture.js' ? new URL('../tests/fixtures/extension-ui.js',import.meta.url) : new URL('../apps/extension/'+name,import.meta.url);
  try {
    let body=await readFile(url,'utf8');
    if(name.endsWith('.html')) body=body.replace('</head>','<script src="/fixture.js"></script></head>');
    response.writeHead(200,{'Content-Type':({'.html':'text/html','.css':'text/css','.js':'text/javascript'})[extname(name)],'Cache-Control':'no-store'});response.end(body);
  } catch {response.writeHead(404);response.end();}
});
server.listen(8766,'127.0.0.1',()=>console.log('Extension UI fixture: http://127.0.0.1:8766 (simulated account and imports)'));
process.on('SIGINT',()=>server.close());process.on('SIGTERM',()=>server.close());
