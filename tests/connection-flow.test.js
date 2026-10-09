import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectionAction,openRecallWebsite} from '../apps/extension/src/connection-flow.js';
import {accountDestination,rememberDestination,safeDestination} from '../apps/web/src/auth-navigation.js';

function fixture(){
  let owner='alice';const calls=[],storage={};
  const account={async assertScope(expected){if(expected!==owner)throw new Error('account changed');return owner;},key:(scope,name)=>scope+':'+name};
  const chromeApi={runtime:{getURL:path=>'chrome-extension://recall/'+path},storage:{local:{async get(keys){return Object.fromEntries(keys.map(key=>[key,storage[key]]));}}},tabs:{async query(){return [];},async create(value){calls.push(value);},async update(id,value){calls.push({id,...value});},async sendMessage(){return {username:'leetcode-user'};}}};
  return {account,chromeApi,calls,storage,switchOwner(value){owner=value;},run(action,owner='alice'){return connectionAction({action,owner,account,chromeApi});}};
}
test('connection status exposes only current-account import summaries',async()=>{
  const f=fixture();f.storage['alice:legacySetup']={decision:'pending',offset:10,snapshot:Array(21).fill({secret:'problem data'}),installationId:'private'};
  f.storage['alice:retentionSetup']={snapshot:{private:'dates'}};f.storage['bob:legacySetup']={count:999};
  const status=await f.run('STATUS');assert.equal(status.import.saved,10);assert.equal(status.import.total,21);assert.equal(status.import.datesComplete,false);assert.ok(!JSON.stringify(status).includes('private'));assert.ok(!JSON.stringify(status).includes('999'));
  f.storage['alice:legacySetup']={decision:'complete',count:21};f.storage['alice:retentionSetup']={complete:true};assert.equal((await f.run('STATUS')).import.datesComplete,true);
  f.storage['alice:legacySetup']={decision:'complete'};assert.equal((await f.run('STATUS')).import.saved,null);
});
test('stale and foreign accounts cannot inspect state or open import tabs',async()=>{
  const f=fixture();await assert.rejects(f.run('OPEN_IMPORT','bob'),/account changed/);assert.equal(f.calls.length,0);
  f.chromeApi.storage.local.get=async()=>{f.switchOwner('bob');return {};};await assert.rejects(f.run('STATUS'),/account changed/);
});
test('import resumes the existing exact extension page and rejects arbitrary commands',async()=>{
  const f=fixture();f.chromeApi.tabs.query=async()=>[{id:1,url:'https://evil.test/setup.html'},{id:2,url:'chrome-extension://recall/setup.html#old'}];
  await f.run('OPEN_IMPORT');assert.equal(f.calls[0].id,2);assert.match(f.calls[0].url,/^chrome-extension:\/\/recall\/setup.html#start-import-/);
  await assert.rejects(f.run('FETCH_URL'),/Unknown/);
});
test('LeetCode verification reports missing tabs, signed-out accounts and verified users',async()=>{
  const f=fixture();await assert.rejects(f.run('CHECK_LEETCODE'),/Open LeetCode/);
  f.chromeApi.tabs.query=async()=>[{id:1}];f.chromeApi.tabs.sendMessage=async()=>({error:'Sign in first'});await assert.rejects(f.run('CHECK_LEETCODE'),/Sign in first/);
  f.chromeApi.tabs.sendMessage=async()=>({username:'learner'});assert.deepEqual(await f.run('CHECK_LEETCODE'),{username:'learner'});
});
test('website reconnect reuses only the configured origin and focuses its window',async()=>{
  const f=fixture(),windows=[];f.chromeApi.tabs.query=async()=>[{id:4,url:'https://recall.test.evil.test/'},{id:5,windowId:2,url:'https://recall.test/#/dashboard'}];f.chromeApi.windows={async update(...args){windows.push(args);}};
  await openRecallWebsite(f.chromeApi,'https://recall.test');assert.deepEqual(f.calls,[{id:5,active:true,url:'https://recall.test/#/connect'}]);assert.equal(windows[0][0],2);
});
test('login returns only to internal allowed destinations, preserving them through focus setup',()=>{
  const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  for(const path of ['https://evil.test','//evil.test','/login','/patterns/../login','/dashboard#evil'])assert.equal(safeDestination(path),null);
  rememberDestination('/patterns/graphs?q=dfs',storage);assert.equal(accountDestination({},storage),'/setup');assert.equal(accountDestination({completed:true},storage),'/setup');assert.equal(accountDestination({completed:true,goal:{configured:true}},storage),'/patterns/graphs?q=dfs');assert.equal(accountDestination({completed:true,goal:{configured:true}},storage),'/dashboard');
  rememberDestination('/connect',storage);assert.equal(accountDestination({goal:{configured:true}},storage),'/connect');
});
