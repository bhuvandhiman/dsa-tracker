import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {importView} from '../apps/extension/src/import-view.js';

function fixture({failedConnection=false}={}){
  const listeners={},elements={},calls=[];let poll,fail=failedConnection;
  const snapshot={connected:true,import:{decision:'pending',saved:0,total:null,running:false}};
  for(const id of ['status','import','pause','import-progress','import-count','view-patterns'])elements['#'+id]={dataset:{},hidden:false,disabled:false,textContent:'',addEventListener(type,fn){listeners[id+':'+type]=fn;}};
  const source=readFileSync(new URL('../apps/extension/src/setup.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'');
  const context={importView,connection:async()=>{if(fail)throw new Error('API offline');return {connected:true,scope:'alice'};},document:{querySelector:id=>elements[id],querySelectorAll:()=>[]},window:{addEventListener(){}},location:{hash:''},chrome:{runtime:{async sendMessage(message){calls.push(message);if(message.action==='START_IMPORT')Object.assign(snapshot.import,{running:true,phase:'scanning'});if(message.action==='PAUSE_IMPORT')snapshot.import.pausing=true;return {data:structuredClone(snapshot)};}}},setTimeout:fn=>{poll=fn;return 1;},clearTimeout(){}};
  return {snapshot,elements,listeners,calls,ready:vm.runInNewContext('(async()=>{'+source+'})()',context),poll:()=>poll(),reconnect(){fail=false;}};
}

test('extension import controls start the shared job in the connected workspace',async()=>{
  const f=fixture();await f.ready;await f.listeners['import:click']();
  assert.equal(f.calls.find(value=>value.action==='START_IMPORT').workspaceScope,'alice');
  assert.equal(f.elements['#import'].disabled,true);assert.equal(f.elements['#pause'].hidden,false);assert.match(f.elements['#status'].textContent,/Finding/);
});

test('pause and polled checkpoints expose resume and completion on the same screen',async()=>{
  const f=fixture();await f.ready;await f.listeners['import:click']();await f.listeners['pause:click']();
  assert.equal(f.calls.at(-2).action,'PAUSE_IMPORT');assert.equal(f.elements['#pause'].disabled,true);
  Object.assign(f.snapshot.import,{running:false,pausing:false,phase:'paused',saved:10,total:12});await f.poll();
  assert.equal(f.elements['#import'].textContent,'Resume import');assert.equal(f.elements['#import-progress'].value,10);assert.equal(f.elements['#import-progress'].max,12);
  Object.assign(f.snapshot.import,{decision:'complete',datesComplete:true,phase:null,saved:12});await f.poll();
  assert.equal(f.elements['#view-patterns'].hidden,false);assert.equal(f.elements['#import'].textContent,'Check for new solves');assert.equal(f.elements['#pause'].hidden,true);
});

test('a background import failure is visible and keeps a resumable checkpoint',async()=>{
  const f=fixture();Object.assign(f.snapshot.import,{total:12,saved:10,phase:'error',error:'Refresh your LeetCode tab, then retry.'});await f.ready;
  assert.match(f.elements['#status'].textContent,/Refresh your LeetCode/);assert.equal(f.elements['#import'].disabled,false);assert.equal(f.elements['#import'].textContent,'Resume import');
});

test('a failed initial connection can retry without leaving the import screen',async()=>{
  const f=fixture({failedConnection:true});await f.ready;assert.equal(f.elements['#import'].textContent,'Retry connection');assert.equal(f.elements['#import'].disabled,false);assert.match(f.elements['#status'].textContent,/API offline/);
  f.reconnect();await f.listeners['import:click']();assert.equal(f.calls.find(value=>value.action==='START_IMPORT').workspaceScope,'alice');assert.equal(f.elements['#import'].textContent,'Importing…');
});
