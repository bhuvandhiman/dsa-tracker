import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('LeetCode import reads accept the own worker and reject website/foreign senders',async()=>{
  let listener,reads=0;
  const chrome={runtime:{id:'fixture',getURL:path=>'chrome-extension://fixture/'+path,onMessage:{addListener(fn){listener=fn;}}}};
  vm.runInNewContext(readFileSync(new URL('../apps/extension/src/content.js',import.meta.url),'utf8'),{chrome,document:{},window:{},DsaCapture:{start:()=>({})},DsaLegacy:{account:async()=>{reads++;return 'alice';}},DsaAdapters:[]});
  const send=sender=>new Promise(resolve=>listener({type:'READ_IMPORT_ACCOUNT'},sender,resolve));
  for(const sender of [{id:'foreign'},{id:'fixture',tab:{id:1},url:'https://leetcode.com/'},{id:'fixture',tab:{id:2},url:'https://recall.test/'},{id:'fixture',url:'chrome-extension://fixture/popup.html'},{id:'fixture',url:'chrome-extension://foreign/src/service-worker.js'}])assert.match((await send(sender)).error,/Invalid setup sender/);
  assert.equal(reads,0);
  for(const sender of [{id:'fixture'},{id:'fixture',url:'chrome-extension://fixture/src/service-worker.js'},{id:'fixture',url:'chrome-extension://fixture/setup.html#start-import-1'}])assert.equal((await send(sender)).data.username,'alice');
  assert.equal(reads,3);
});
