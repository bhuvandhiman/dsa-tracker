import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importRecentDates} from '../apps/extension/src/import-session.js';
const setup={installationId:'11111111-1111-4111-8111-111111111111',decision:'complete',username:'alice'};
function fixture({wrongAccount=false}={}){
  const data={},storage={async get(key){return {[key]:data[key]};},async set(values){Object.assign(data,structuredClone(values));}};
  let complete=false,writes=0,reads=0,fail=true;
  const api=async(_path,body)=>{if(body){writes++;complete=true;if(fail)throw new Error('Lost response');}return {completed:complete};};
  const read=async(type)=>{reads++;if(type==='READ_RECENT_SUBMISSIONS')return {username:wrongAccount?'bob':'alice',submissions:[{submissionId:'123',slug:'coin-change',submittedAt:'2025-01-01T00:00:00.000Z'}]};return [{url:'https://leetcode.com/problems/coin-change/',title:'Coin Change',topics:['Dynamic Programming']}];};
  return {data,storage,api,read,get writes(){return writes;},get reads(){return reads;},allow(){fail=false;}};
}
test('recent import preserves a lost-response snapshot and recovers without another provider read or write',async()=>{
  const f=fixture();await assert.rejects(importRecentDates({setup,...f}),/Lost response/);
  assert.equal(f.data.retentionSetup.snapshot.submissions.length,1);assert.equal(f.data.retentionSetup.complete,undefined);
  const reads=f.reads;f.allow();await importRecentDates({setup,...f});assert.equal(f.data.retentionSetup.complete,true);assert.equal(f.data.retentionSetup.count,1);assert.equal(f.writes,1);assert.equal(f.reads,reads);
});
test('recent-date initialization rejects provider account changes before storing evidence',async()=>{
  const f=fixture({wrongAccount:true});await assert.rejects(importRecentDates({setup,...f}),/same LeetCode account/);assert.equal(f.writes,0);assert.equal(f.data.retentionSetup,undefined);
});

test('a damaged recent checkpoint is rebuilt after confirming it was not committed',async()=>{
  const f=fixture();f.allow();f.data.retentionSetup={snapshot:{runId:setup.installationId,username:'alice',submissions:[null]}};
  await importRecentDates({setup,...f});assert.equal(f.data.retentionSetup.complete,true);assert.equal(f.data.retentionSetup.count,1);assert.equal(f.writes,1);
});

test('a mismatched server account cannot overwrite the local checkpoint',async()=>{
  const f=fixture();await assert.rejects(importRecentDates({setup,...f,api:async()=>({completed:true,username:'bob'})}),/different LeetCode account/);
  assert.equal(f.data.retentionSetup,undefined);assert.equal(f.reads,0);
});
