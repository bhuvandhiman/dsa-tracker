import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createImportController} from '../apps/extension/src/import-controller.js';
import {connectionAction} from '../apps/extension/src/connection-flow.js';
import {importView} from '../apps/extension/src/import-view.js';

function fixture({holdBatch=false,lock=true,failStorage=false}={}){
  const stored={},calls=[],reads=[],opened=[],notifications=[];let owner='alice',complete=false,release,entered;
  const pending=new Promise(resolve=>{release=resolve;}),batchStarted=new Promise(resolve=>{entered=resolve;});
  const account={key:(scope,name)=>scope+':'+name,async assertScope(expected){if(expected!==owner)throw new Error('Recall account changed');return owner;},async localScope(expected){return this.assertScope(expected);},async request(path,options,scope){await this.assertScope(scope);const body=options.body?JSON.parse(options.body):null;calls.push({path,body});if(body?.problems?.length&&holdBatch){entered();await pending;}if(body?.complete)complete=true;return Response.json({completed:body?path==='/imports/recent'||body.complete===true:path.includes('/legacy/')&&complete});}};
  const chromeApi={storage:{local:{async get(names){return Object.fromEntries(names.map(name=>[name,stored[name]]));},async set(values){if(failStorage)throw new Error('Storage unavailable');Object.assign(stored,structuredClone(values));}}},tabs:{async create(value){opened.push(value);},async update(id,value){opened.push({id,...value});}}};
  const connect=async()=>async(type,extra)=>{reads.push(type);if(type==='SCAN_LEGACY_PROBLEMS')return {username:'leetcode-alice',problems:[{slug:'two-sum'}]};if(type==='READ_IMPORT_ACCOUNT')return {username:'leetcode-alice'};if(type==='READ_LEGACY_TOPICS')return extra.slugs.map(slug=>({url:`https://leetcode.com/problems/${slug}/`,title:slug,difficulty:'easy',topics:['Array']}));return {username:'leetcode-alice',submissions:[]};};
  const options={account,chromeApi,connect,locks:{async request(_name,_options,run){return run(lock?{}:null);}},retry:operation=>operation(),interval:()=>1,clear:()=>{},onChanged:scope=>notifications.push(scope)};
  const importer=createImportController(options);
  return {stored,calls,reads,opened,notifications,account,chromeApi,importer,release,batchStarted,options,switchAccount(){owner='bob';},status:()=>connectionAction({action:'STATUS',owner:'alice',account,chromeApi,importer})};
}

test('website start acknowledges immediately, completes both phases and never opens a page',async()=>{
  const f=fixture({holdBatch:true});
  assert.deepEqual(await connectionAction({action:'START_IMPORT',owner:'alice',...f}),{started:true});
  await f.batchStarted;const status=await f.status();assert.equal(status.import.running,true);assert.equal(status.import.total,1);assert.equal(status.import.saved,0);assert.deepEqual(f.opened,[]);
  assert.deepEqual(f.notifications,[]);
  f.release();await f.importer.wait('alice');
  assert.equal(f.stored['alice:legacySetup'].count,1);assert.equal(f.stored['alice:retentionSetup'].complete,true);assert.equal((await f.status()).import.running,false);assert.equal(importView((await f.status()).import).ready,true);
  assert.deepEqual(f.notifications,['alice']);
});

test('pause finishes the acknowledged batch and resume uses the same checkpoint',async()=>{
  const f=fixture({holdBatch:true});await f.importer.start('alice');await f.batchStarted;
  await connectionAction({action:'PAUSE_IMPORT',owner:'alice',...f});assert.equal((await f.status()).import.pausing,true);
  f.release();await f.importer.wait('alice');const run=f.stored['alice:legacySetup'].installationId;
  assert.equal(f.stored['alice:legacySetup'].offset,1);assert.equal(f.stored['alice:importProgress'].phase,'paused');
  assert.deepEqual(f.notifications,['alice']);
  await f.importer.start('alice');await f.importer.wait('alice');
  assert.equal(f.stored['alice:legacySetup'].installationId,run);assert.equal(f.stored['alice:retentionSetup'].complete,true);assert.equal(f.reads.filter(value=>value==='SCAN_LEGACY_PROBLEMS').length,1);
  // Resuming completion without another saved problem needs no extra refresh.
  assert.deepEqual(f.notifications,['alice']);
});

test('repeated starts join the existing job and never create duplicate batches',async()=>{
  const f=fixture({holdBatch:true});await f.importer.start('alice');await f.batchStarted;
  assert.deepEqual(await f.importer.start('alice'),{started:true,alreadyRunning:true});
  f.release();await f.importer.wait('alice');assert.equal(f.calls.filter(value=>value.body?.problems?.length).length,1);
});

test('a busy lock and unavailable checkpoint storage reject start instead of hanging',async()=>{
  const busy=fixture({lock:false});busy.stored['alice:importProgress']={phase:'saving',updatedAt:1};await assert.rejects(busy.importer.start('alice'),/already running/);await busy.importer.wait('alice');assert.equal(busy.stored['alice:importProgress'].phase,'saving');
  const broken=fixture({failStorage:true});await assert.rejects(broken.importer.start('alice'),/Storage unavailable/);await broken.importer.wait('alice');assert.equal(broken.importer.running('alice'),false);
  assert.deepEqual(busy.notifications,[]);assert.deepEqual(broken.notifications,[]);
});

test('account changes stop the job without advancing or writing into another workspace',async()=>{
  const f=fixture({holdBatch:true});await f.importer.start('alice');await f.batchStarted;f.switchAccount();f.release();await f.importer.wait('alice');
  assert.equal(f.stored['alice:legacySetup'].offset,0);assert.ok(Object.keys(f.stored).every(key=>key.startsWith('alice:')));await assert.rejects(f.importer.start('alice'),/account changed/);
});

test('a restarted controller detects saved progress and resumes without another scan',async()=>{
  const f=fixture({holdBatch:true});await f.importer.start('alice');await f.batchStarted;await f.importer.pause('alice');f.release();await f.importer.wait('alice');
  const importer=createImportController(f.options);await importer.start('alice');await importer.wait('alice');assert.equal(f.stored['alice:retentionSetup'].complete,true);assert.equal(f.reads.filter(type=>type==='SCAN_LEGACY_PROBLEMS').length,1);
});

test('website and extension labels distinguish running, resumable and finished imports',()=>{
  assert.equal(importView().actionLabel,'Import my solves');assert.equal(importView({total:12,saved:10,phase:'paused'}).actionLabel,'Resume import');assert.equal(importView({running:true,pausing:true}).pausing,true);
  assert.equal(importView({phase:'paused',total:null,saved:0}).actionLabel,'Resume import');
  assert.equal(importView({decision:'complete',datesComplete:false}).actionLabel,'Retry recent dates');assert.equal(importView({decision:'complete',datesComplete:true}).actionLabel,'Check for new solves');
});
