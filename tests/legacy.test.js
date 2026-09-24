import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {runLegacyImport} from '../apps/extension/src/legacy-runner.js';
import {legacyInput} from '../apps/api/src/domain.js';
const installationId='00000000-0000-4000-8000-000000000001';
const row=(slug,status='ac')=>({status,stat:{question__title_slug:slug}});
function adapter(responses) {
  const calls=[];
  const context=vm.createContext({URL,AbortSignal,document:{cookie:''},fetch:async(url,options)=>{calls.push({url,options});const data=responses.shift();return{ok:true,json:async()=>data};}});
  vm.runInContext(readFileSync(new URL('../apps/extension/src/adapters/leetcode-import.js',import.meta.url),'utf8'),context);
  return{api:context.DsaLegacy,calls};
}
const account=username=>({data:{userStatus:{isSignedIn:true,username}}});
test('legacy scan imports accepted problems only, deduplicates and binds to the signed-in account',async()=>{
  const a=adapter([account('alice'),{user_name:'alice',num_solved:2,stat_status_pairs:[row('two-sum'),row('two-sum'),row('3sum'),row('wrong-answer','notac'),row('untried',null)]},account('alice')]);
  const result=await a.api.scan();assert.equal(result.username,'alice');assert.deepEqual(Array.from(result.problems,p=>p.slug),['3sum','two-sum']);
  assert.ok(a.calls.every(c=>c.url.startsWith('https://leetcode.com/')&&c.options.credentials==='include'));
});
test('legacy scan fails closed when logged out, switched accounts, or incomplete',async()=>{
  await assert.rejects(adapter([{data:{userStatus:{isSignedIn:false}}}]).api.scan(),/Sign in/);
  await assert.rejects(adapter([account('alice'),{user_name:'bob',stat_status_pairs:[],num_solved:0},account('bob')]).api.scan(),/account changed/);
  await assert.rejects(adapter([account('alice'),{user_name:'alice',stat_status_pairs:[],num_solved:10},account('alice')]).api.scan(),/incomplete/);
});
test('topic batches require matching slugs and the same account; no submission dates are manufactured',async()=>{
  const a=adapter([{data:{userStatus:{isSignedIn:true,username:'alice'},q0:{titleSlug:'two-sum',title:'Two Sum',difficulty:'Easy',topicTags:[{name:'Array'}]}}}]);
  const result=await a.api.topics(['two-sum'],'alice');
  assert.equal(result[0].url,'https://leetcode.com/problems/two-sum/');assert.equal(result[0].difficulty,'easy');assert.equal('attemptedAt' in result[0],false);
  await assert.rejects(adapter([account('bob')]).api.topics(['two-sum'],'alice'),/Sign back/);
  await assert.rejects(adapter([account('alice')]).api.topics(['two-sum'],'alice'),/all problem topics/);
});
test('import resumes the frozen snapshot after failure without skipping an unconfirmed batch',async()=>{
  let state={installationId,decision:'pending',offset:0};let fail=true;const sent=[];
  const settings={scan:async()=>({username:'alice',problems:Array.from({length:12},(_,i)=>({slug:'p-'+i}))}),topics:async slugs=>slugs.map(slug=>({url:'https://leetcode.com/problems/'+slug+'/',title:slug,topics:[]})),writeBatch:async body=>{sent.push(body);if(!body.complete&&body.problems.length===2&&fail)throw new Error('offline');},saveState:async value=>{state=value;}};
  await assert.rejects(runLegacyImport({state,...settings}),/offline/);assert.equal(state.offset,10);assert.equal(state.decision,'pending');
  fail=false;await runLegacyImport({state,...settings});assert.equal(state.decision,'complete');assert.equal(state.count,12);
  assert.deepEqual(sent.map(b=>b.problems.length),[10,2,2,0]);
  assert.equal(sent.at(-1).complete,true);
  await runLegacyImport({state,...settings,scan:()=>assert.fail('Completed import must not scan')});
});
test('resuming under another account does not write anything',async()=>{
  await assert.rejects(runLegacyImport({state:{installationId,decision:'pending',username:'alice',snapshot:[],offset:0},scan:async()=>({username:'bob',problems:[]}),writeBatch:()=>assert.fail(),saveState:()=>assert.fail()}),/Sign back/);
});
test('legacy API bounds batch size, maps standard topics and rejects invented dates',()=>{
  const valid={installationId,username:'alice',problems:[{url:'https://leetcode.com/problems/two-sum/',title:'Two Sum',difficulty:'easy',topics:['Array']}],complete:false};
  assert.deepEqual(legacyInput(valid).problems[0].patternSlugs,['arrays-hashing']);
  for(const bad of [{...valid,installationId:'bad'},{...valid,problems:Array(11).fill(valid.problems[0])},{...valid,problems:[]},{...valid,problems:[{...valid.problems[0],attemptedAt:'2020-01-01'}]}])assert.throws(()=>legacyInput(bad),{status:400});
  assert.equal(legacyInput({...valid,problems:[],complete:true}).complete,true);
});

test('first-run setup persists decisions across worker restarts and ignores foreign senders',async()=>{
  const stored={};const tabs=[];
  function load(){let onInstall,listener;const context=vm.createContext({crypto:{randomUUID:()=>installationId},chrome:{storage:{local:{async get(){return stored;},async set(value){Object.assign(stored,value);}}},tabs:{async create(value){tabs.push(value);}},runtime:{id:'recall',getURL:path=>'chrome-extension://recall/'+path,onInstalled:{addListener(fn){onInstall=fn;}},onMessage:{addListener(fn){listener=fn;}}}}});
    vm.runInContext(readFileSync(new URL('../apps/extension/src/legacy-setup.js',import.meta.url),'utf8'),context);
    return {onInstall,send:(message,sender={id:'recall',url:'chrome-extension://recall/popup.html'})=>new Promise(resolve=>listener(message,sender,resolve))};
  }
  const initial=load();await initial.onInstall({reason:'install'});assert.equal(tabs.length,1);
  assert.equal((await initial.send({type:'LEGACY_SETUP_STATE'})).decision,'pending');
  stored.legacySetup.decision='complete';
  const restarted=load();await restarted.onInstall({reason:'update'});assert.equal(tabs.length,1);
  assert.equal((await restarted.send({type:'LEGACY_SETUP_STATE'})).decision,'complete');
  assert.ok((await restarted.send({type:'LEGACY_SETUP_STATE'},{id:'other',url:'https://evil.test'})).error);
});
test('popup offers setup only while pending, never after completing or skipping',async()=>{
  for(const decision of ['pending','complete','skipped']) {
    let click;const button={hidden:true,addEventListener(_event,fn){click=fn;}};
    const context=vm.createContext({document:{querySelector:()=>button},chrome:{runtime:{sendMessage:async()=>({decision})},tabs:{}},window:{}});
    vm.runInContext(readFileSync(new URL('../apps/extension/src/popup-legacy.js',import.meta.url),'utf8'),context);
    await Promise.resolve();await Promise.resolve();assert.equal(button.hidden,decision!=='pending');assert.equal(typeof click,'function');
  }
});

test('recent accepted submissions retain validated dates and never invent assistance',async()=>{
  const row={id:'123',title:'Two Sum',titleSlug:'two-sum',timestamp:'1735689600'};
  const a=adapter([account('alice'),{data:{userStatus:{isSignedIn:true,username:'alice'},recentAcSubmissionList:[row,row]}}]);
  const result=await a.api.recent();assert.equal(result.submissions.length,1);assert.equal(result.submissions[0].submittedAt,'2025-01-01T00:00:00.000Z');assert.equal('assistance' in result.submissions[0],false);
  await assert.rejects(adapter([account('alice'),{data:{userStatus:{isSignedIn:true,username:'bob'},recentAcSubmissionList:[]}}]).api.recent(),/account changed/);
  await assert.rejects(adapter([account('alice'),{data:{userStatus:{isSignedIn:true,username:'alice'},recentAcSubmissionList:[{...row,timestamp:'bad'}]}}]).api.recent(),/invalid/);
  assert.equal((await adapter([account('alice'),{data:{userStatus:{isSignedIn:true,username:'alice'},recentAcSubmissionList:[]}}]).api.recent()).submissions.length,0);
});
