import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runImportSession} from '../apps/extension/src/import-session.js';
import {readRecallResponse,retryImportRequest} from '../apps/extension/src/import-request.js';
import {createAccountClient} from '../apps/extension/src/account-client.js';

const id='00000000-0000-4000-8000-000000000001';
const problem=slug=>({url:`https://leetcode.com/problems/${slug}/`,title:slug,difficulty:'easy',topics:['Array']});
function fixture(){
  const data={legacySetup:{installationId:id,decision:'pending',offset:0}},events=[],calls=[];
  let complete=false;
  const storage={async get(names){return Object.fromEntries((Array.isArray(names)?names:[names]).map(name=>[name,data[name]]));},async set(values){Object.assign(data,structuredClone(values));}};
  const api=async(path,body)=>{calls.push({path,body});if(body){if(body.complete)complete=true;return {completed:body.complete===true||path==='/imports/recent',added:body.problems?.length||0};}return {completed:path.includes('/legacy/')&&complete,username:'alice'};};
  const read=async(type,extra)=>{events.push(type);if(type==='SCAN_LEGACY_PROBLEMS')return {username:'alice',problems:[{slug:'two-sum'}]};if(type==='READ_LEGACY_TOPICS')return extra.slugs.map(problem);if(type==='READ_IMPORT_ACCOUNT')return {username:'alice'};return {username:'alice',submissions:[]};};
  return {data,storage,api,read,events,calls};
}
test('one session imports solves then recent dates, without inventing dated evidence',async()=>{
  const f=fixture(),phases=[];await runImportSession({...f,phase:value=>phases.push(value.phase)});
  assert.equal(f.data.legacySetup.count,1);assert.equal(f.data.retentionSetup.complete,true);assert.equal(f.data.retentionSetup.count,0);
  assert.ok(phases.indexOf('saving')<phases.indexOf('dates'));assert.equal(phases.at(-1),'complete');
  assert.deepEqual(f.calls.filter(call=>call.body).map(call=>call.path),['/imports/legacy','/imports/legacy','/imports/recent']);
});
test('failed batch retains the checkpoint; resume verifies account without rescanning',async()=>{
  const f=fixture();let fail=true;
  const api=async(path,body)=>{if(body?.problems?.length&&fail)throw new Error('offline');return f.api(path,body);};
  await assert.rejects(runImportSession({...f,api}),/offline/);assert.equal(f.data.legacySetup.offset,0);assert.equal(f.data.legacySetup.snapshot.length,1);
  fail=false;await runImportSession({...f,api});assert.equal(f.events.filter(type=>type==='SCAN_LEGACY_PROBLEMS').length,1);assert.ok(f.events.includes('READ_IMPORT_ACCOUNT'));
});
test('a failed recent-date phase resumes only dates, never restarts solved import',async()=>{
  const f=fixture();let fail=true;
  const read=async(type,extra)=>{if(type==='READ_RECENT_SUBMISSIONS'&&fail)throw new Error('provider unavailable');return f.read(type,extra);};
  await assert.rejects(runImportSession({...f,read}),/provider unavailable/);assert.equal(f.data.legacySetup.decision,'complete');const writes=f.calls.length;
  fail=false;await runImportSession({...f,read});assert.ok(f.calls.slice(writes).every(call=>!call.path.includes('/legacy')));
});
test('unconfirmed responses cannot advance offsets or mark the import complete',async()=>{
  const f=fixture();await assert.rejects(runImportSession({...f,api:async()=>({})}),/did not confirm/);assert.equal(f.data.legacySetup.offset,0);
  await assert.rejects(runImportSession({...f,api:async(path,body)=>body?{}:f.api(path)}),/did not confirm/);assert.equal(f.data.legacySetup.offset,0);assert.equal(f.data.legacySetup.decision,'pending');
});
test('pause keeps a frozen checkpoint, and a provider account switch cannot resume it',async()=>{
  const f=fixture();let pause=false;
  await assert.rejects(runImportSession({...f,phase:value=>{if(value.phase==='metadata')pause=true;},check:()=>{if(pause)throw new Error('paused');}}),/paused/);
  assert.equal(f.data.legacySetup.offset,0);assert.ok(f.data.legacySetup.snapshot);
  await assert.rejects(runImportSession({...f,read:async type=>type==='READ_IMPORT_ACCOUNT'?{username:'bob'}:assert.fail('Unexpected read')}),/Sign back/);
  assert.equal(f.calls.filter(call=>call.body).length,0);
});
test('a new run replaces both phase checkpoints together; completed runs do not reimport implicitly',async()=>{
  const f=fixture();await runImportSession(f);const count=f.calls.length;await runImportSession(f);assert.equal(f.calls.length,count);
  let first;const storage={...f.storage,async set(value){first??=value;return f.storage.set(value);}};
  await assert.rejects(runImportSession({...f,storage,newRun:true,uuid:()=>id+'new',api:async()=>{throw new Error('offline');}}),/offline/);
  assert.equal(first.legacySetup.installationId,id+'new');assert.equal(first.retentionSetup.runId,id+'new');assert.equal(f.data.retentionSetup.complete,undefined);
});
test('transient import failures retry at most twice, while auth/conflict errors stop immediately',async()=>{
  for(const status of [401,409,429,503]){
    let attempts=0;const waits=[];
    await assert.rejects(retryImportRequest(async()=>{attempts++;return readRecallResponse(Response.json({error:'fixture failure'},{status}));},{wait:async ms=>waits.push(ms)}),/fixture failure/);
    assert.equal(attempts,[429,503].includes(status)?3:1);assert.equal(waits.length,attempts-1);
  }
  let tries=0;await retryImportRequest(async()=>{if(++tries===1)throw Object.assign(new Error('lost response'),{retryable:true});return {completed:true};},{wait:async()=>{}});assert.equal(tries,2);
});
test('HTML gateway failures are actionable, and long provider cooldowns are not hammered',async()=>{
  await assert.rejects(readRecallResponse(new Response('<html>proxy error</html>',{status:502})),error=>error.retryable&&error.status===502&&!error.message.includes('<html>'));
  let calls=0;await assert.rejects(retryImportRequest(async()=>{calls++;return readRecallResponse(Response.json({error:'rate limited'},{status:429,headers:{'Retry-After':'120'}}));},{wait:()=>assert.fail('Do not retry a long cooldown')}),/rate limited/);assert.equal(calls,1);
});

test('malformed authorization and validation errors stop, and HTML rate limits respect cooldowns',async()=>{
  for(const status of [400,401,409]){
    await assert.rejects(readRecallResponse(Response.json(null,{status})),error=>!error.retryable&&error.status===status);
    await assert.rejects(readRecallResponse(new Response('<html>failure</html>',{status})),error=>!error.retryable&&error.status===status);
  }
  await assert.rejects(readRecallResponse(new Response('<html>rate limited</html>',{status:429,headers:{'Retry-After':'120'}})),error=>error.retryable&&error.retryAfter===120000);
});

test('a lost final solve response recovers from the server without rescanning or replaying batches',async()=>{
  const f=fixture();let lost=true;
  const api=async(path,body)=>{const result=await f.api(path,body);if(body?.complete&&lost){lost=false;throw new Error('lost final response');}return result;};
  await assert.rejects(runImportSession({...f,api}),/lost final response/);
  assert.equal(f.data.legacySetup.decision,'pending');assert.equal(f.data.legacySetup.offset,1);
  const writes=f.calls.filter(call=>call.path==='/imports/legacy'&&call.body).length;
  await runImportSession({...f,api});assert.equal(f.data.legacySetup.count,1);
  assert.equal(f.calls.filter(call=>call.path==='/imports/legacy'&&call.body).length,writes);
  assert.equal(f.events.filter(type=>type==='SCAN_LEGACY_PROBLEMS').length,1);
});
test('expired website access can preserve local checkpoints offline but cannot authorize API writes',async()=>{
  const owner='fa631c58-72ad-4a67-89d8-f6a4ae5d1641';
  const stored={'recall-account-session':{source:'website',user:{id:owner,email:'fixture@example.test'},project:'https://fixture.supabase.co',accessToken:'expired',expiresAt:1}};let calls=0;
  const client=createAccountClient({storage:{session:{async get(key){return {[key]:stored[key]};}}}},async()=>{calls++;throw new TypeError('offline');});
  assert.equal(await client.localScope(owner),owner);assert.equal(calls,0);await assert.rejects(client.localScope('foreign'),/account changed/);
  await assert.rejects(client.request('/imports/legacy',{method:'POST'},owner),error=>error.retryable&&error.code==='NETWORK');assert.equal(calls,1);
});
