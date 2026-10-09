// Real website + import engine, simulated Chrome/LeetCode/API. No account writes.
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../apps/web/',import.meta.url));
const fixture=fileURLToPath(new URL('../tests/fixtures/website-import.js',import.meta.url)).replaceAll('\\','/');
const server=await createServer({configFile:fileURLToPath(new URL('../apps/web/vite.config.js',import.meta.url)),root,plugins:[{
  name:'website-import-fixture',
  transformIndexHtml(){return [{tag:'script',attrs:{type:'module',src:'/@fs/'+fixture},injectTo:'head-prepend'}];},
  configureServer(server){server.middlewares.use((request,response,next)=>{
    if(request.url!=='/api/auth/config'&&request.url!=='/api/ready')return next();
    response.setHeader('Content-Type','application/json');response.end(JSON.stringify(request.url==='/api/auth/config'?{mode:'local',configured:false,installation:{downloadUrl:'/downloads/recall-extension.zip'}}:{status:'ready',storage:'Simulated import fixture'}));
  });},
}],server:{host:'127.0.0.1',port:5175,strictPort:true}});
await server.listen();
console.log('Website import fixture: http://127.0.0.1:5175/#/connect; ?fixture=missing or ?fixture=failed');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
