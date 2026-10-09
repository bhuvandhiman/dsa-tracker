import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {runImportSession} from '../apps/extension/src/import-session.js';
import {requestError,retryImportRequest} from '../apps/extension/src/import-request.js';

function fixture({lock=true,failedConnection=false,holdBatch=false}={}){
  const data={legacySetup:{installationId:'00000000-0000-4000-8000-000000000001',decision:'pending',offset:0}},listeners={},elements={};
  for(const id of ['status','import','pause','import-progress','import-count','view-patterns'])elements['#'+id]={dataset:{},hidden:false,disabled:false,textContent:'',addEventListener(type,fn){listeners[id+':'+type]=fn;}};
  const storage={async get(names){return Object.fromEntries((Array.isArray(names)?names:[names]).map(name=>[name,data[name]]));},async set(value){Object.assign(data,structuredClone(value));}};
  let connections=0,release,began;
  const waiting=new Promise(resolve=>{release=resolve;}),batchStarted=new Promise(resolve=>{began=resolve;});
  const api=async(path,body)=>{
    if(body?.problems?.length&&holdBatch){began();await waiting;}
    return {completed:Boolean(body)&&(path==='/imports/recent'||body.complete===true),added:body?.problems?.length||0};
  };
  const read=async(type,extra)=>type==='SCAN_LEGACY_PROBLEMS'?{username:'alice',problems:[{slug:'two-sum'}]}:type==='READ_LEGACY_TOPICS'?extra.slugs.map(slug=>({url:`https://leetcode.com/problems/${slug}/`,title:slug,topics:['Hash Table']})):type==='READ_IMPORT_ACCOUNT'?{username:'alice'}:{username:'alice',submissions:[]};
  const source=readFileSync(new URL('../apps/extension/src/setup.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'');
  const context={api,scopedStorage:storage,connection:async()=>{connections++;if(failedConnection)throw new Error('API offline');return {connected:true,scope:'local'};},runImportSession,connectLeetCode:async()=>read,requestError,retryImportRequest:(operation,options)=>retryImportRequest(operation,{...options,wait:async()=>{}}),document:{querySelector:id=>elements[id],querySelectorAll:()=>[]},window:{addEventListener(){}},location:{hash:''},chrome:{runtime:{sendMessage:async()=>data.legacySetup}},navigator:{locks:{request:async(_name,_options,fn)=>fn(lock?{}:null)}},setInterval:()=>1,clearInterval(){},Date};
  const ready=vm.runInNewContext('(async()=>{'+source+'})()',context);
  return {data,elements,listeners,ready,release,batchStarted,get connections(){return connections;}};
}
test('import screen uses one controller, finishes both phases and offers the dashboard',async()=>{
  const f=fixture();await f.ready;await f.listeners['import:click']();
  assert.equal(f.data.legacySetup.decision,'complete');assert.equal(f.data.retentionSetup.complete,true);assert.equal(f.elements['#view-patterns'].hidden,false);assert.match(f.elements['#status'].textContent,/finished/);assert.equal(f.elements['#pause'].hidden,true);
});
test('pausing during a save preserves its acknowledged offset before stopping',async()=>{
  const f=fixture({holdBatch:true});await f.ready;const operation=f.listeners['import:click']();await f.batchStarted;f.listeners['pause:click']();assert.match(f.elements['#status'].textContent,/Pausing/);f.release();await operation;
  assert.equal(f.data.legacySetup.offset,1);assert.equal(f.data.legacySetup.decision,'pending');assert.equal(f.data.importProgress.phase,'paused');assert.equal(f.elements['#import'].textContent,'Resume import');
});
test('a second import tab cannot overwrite the active import progress',async()=>{
  const f=fixture({lock:false});f.data.importProgress={phase:'saving',updatedAt:123};await f.ready;await f.listeners['import:click']();assert.equal(f.data.importProgress.phase,'saving');assert.match(f.elements['#status'].textContent,/another Recall tab/);
});
test('initial connection failure leaves a usable retry action and the saved checkpoint intact',async()=>{
  const f=fixture({failedConnection:true});await f.ready;assert.equal(f.elements['#import'].disabled,false);assert.equal(f.elements['#import'].textContent,'Retry connection');assert.match(f.elements['#status'].textContent,/API offline/);assert.equal(f.data.legacySetup.offset,0);
});
