import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { extensionDraft, localDateTime } from '../apps/web/src/attempt-form.js';

const root = new URL('../apps/extension/src/', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
function environment(extra = {}) {
  const context = vm.createContext({ URL, Date, ...extra });
  for (const file of ['adapters/leetcode.js', 'recorder.js', 'capture.js']) vm.runInContext(read(file), context);
  return context;
}
const problem = { platform: 'leetcode', problemId: 'two-sum', url: 'https://leetcode.com/problems/two-sum/', title: 'Two Sum' };
const now = Date.parse('2025-01-01T12:00:00.000Z');
const result = (id='2', status='Accepted') => ({ id, status });

test('acceptance requires an armed Submit and a new submission ID, then prompts once', () => {
  const tracker = environment().DsaCapture.createTracker();
  assert.equal(tracker.observe(problem,result(),now), null);
  tracker.arm(problem,'1',now);
  assert.equal(tracker.observe(problem,result('1'),now), null);
  const capture = tracker.observe(problem,result(),now+1000);
  assert.equal(capture.problem.url,problem.url);
  assert.equal(capture.attemptedAt,'2025-01-01T12:00:01.000Z');
  assert.equal(tracker.observe(problem,result(),now+2000),null);
  tracker.arm(problem,'1',now+3000);
  assert.equal(tracker.observe(problem,result(),now+4000),null);
});

test('failed results, navigation, cancellation and expiry never offer a prompt', () => {
  for (const status of ['Wrong Answer','Runtime Error','Time Limit Exceeded','Compile Error']) {
    const tracker=environment().DsaCapture.createTracker();tracker.arm(problem,null,now);
    assert.equal(tracker.observe(problem,result('2',status),now+1),null);
    assert.equal(tracker.observe(problem,result('3'),now+2),null);
  }
  const tracker=environment().DsaCapture.createTracker();
  tracker.arm(problem,null,now);assert.equal(tracker.observe(null,result(),now+1),null);
  tracker.arm(problem,null,now);assert.equal(tracker.observe({...problem,url:'https://leetcode.com/problems/3sum/'},result(),now+1),null);
  tracker.arm(problem,null,now);assert.equal(tracker.observe(problem,result(),now+120001),null);
  tracker.arm(problem,null,now);tracker.cancel();assert.equal(tracker.observe(problem,result(),now+1),null);
});

test('a stale Accepted verdict cannot be reused immediately after another Submit', () => {
  const tracker=environment().DsaCapture.createTracker();tracker.arm(problem,'1',now,'Accepted');
  assert.equal(tracker.observe(problem,result('2'),now+1),null);
  assert.equal(tracker.observe(problem,result('2',null),now+2),null);
  assert.ok(tracker.observe(problem,result('2'),now+3));
});

test('adapter requires numeric submission detail URL and visible dedicated verdict', () => {
  const adapter=environment().DsaAdapters[0];
  let text='Accepted';let visible=true;
  const doc={ querySelector(selector) { assert.equal(selector,'[data-e2e-locator="submission-result"]');return {textContent:text,getClientRects:()=>visible?[{}]:[]}; } };
  assert.equal(adapter.getSubmission(doc,problem.url),null);
  assert.equal(adapter.getSubmission(doc,problem.url+'submissions/'),null);
  assert.equal(adapter.getSubmission(doc,problem.url+'submissions/not-an-id/'),null);
  const href=problem.url+'submissions/1234/';
  assert.equal(adapter.getSubmission(doc,href).status,'Accepted');
  visible=false;assert.equal(adapter.getSubmission(doc,href).status,null);
  visible=true;text='Accepted 500 / 1000';assert.equal(adapter.getSubmission(doc,href).status,null);
  text='Pending';assert.equal(adapter.getSubmission(doc,href).status,null);
});

test('metadata chooses only the matching problem title and bounds it', () => {
  const adapter=environment().DsaAdapters[0];
  const doc={querySelectorAll:()=>[{href:'https://leetcode.com/problems/3sum/',textContent:'15. 3Sum'}, {href:problem.url,textContent:'1. Two Sum'}]};
  assert.equal(adapter.getDetails(doc,problem.url).title,'Two Sum');
  doc.querySelectorAll=()=>[{href:problem.url,textContent:'x'.repeat(201)}];
  assert.equal(adapter.getDetails(doc,problem.url).title,undefined);
});

test('recorder carries bounded metadata to a fixed origin and never sends code or notes', () => {
  const recorder=environment().DsaRecorder;
  const url=new URL(recorder.buildUrl(problem,{title:'Two Sum',attemptedAt:new Date(now).toISOString(),code:'private'}));
  assert.equal(url.origin,'http://127.0.0.1:5173');assert.equal(url.hash,'#record-attempt');
  assert.equal(url.searchParams.get('title'),'Two Sum');assert.equal(url.searchParams.get('attemptedAt'),new Date(now).toISOString());
  assert.equal(url.searchParams.has('code'),false);
  assert.throws(()=>recorder.buildUrl({...problem,url:'https://evil.example/'}));
  const invalid=new URL(recorder.buildUrl(problem,{title:'x'.repeat(201),attemptedAt:'bad'}));
  assert.equal(invalid.searchParams.has('title'),false);assert.equal(invalid.searchParams.has('attemptedAt'),false);
});

test('dashboard accepts title/time as editable metadata, never as practice evidence', () => {
  const query=new URLSearchParams({problem:problem.url,title:'Two Sum & More',attemptedAt:new Date(now).toISOString()});
  const {form}=extensionDraft('?'+query);
  assert.equal(form.title,'Two Sum & More');assert.equal(form.attemptedAt,localDateTime(new Date(now)));
  assert.equal(form.assistance,'');assert.deepEqual(form.patternSlugs,[]);
  query.set('title','x'.repeat(201));query.set('attemptedAt','2099-01-01T00:00:00.000Z');
  const invalid=extensionDraft('?'+query).form;
  assert.equal(invalid.title,'Two Sum');assert.notEqual(invalid.attemptedAt,'2099-01-01T00:00');
});

test('worker restricts prompt opening to its own top-frame matching LeetCode content script', async () => {
  let listener;const opened=[];
  const context=environment({chrome:{runtime:{id:'recall-test',onMessage:{addListener(fn){listener=fn;}}},tabs:{async create(value){opened.push(value.url);}}}});
  vm.runInContext(read('service-worker.js').replace(/^import .*;\r?$/gm,''),context);
  const message={type:'OPEN_RECORDER',problem,attemptedAt:new Date(now).toISOString()};
  const sender={id:'recall-test',frameId:0,tab:{id:2},url:problem.url+'submissions/123/'};
  for(const invalid of [{...sender,id:'other'}, {...sender,frameId:1}, {...sender,url:'https://evil.example/'}, {...sender,url:'https://leetcode.com/problems/3sum/'}, {}]) {
    let response;listener(message,invalid,value=>response=value);assert.equal(response.opened,false);
  }
  await new Promise(resolve=>{assert.equal(listener(message,sender,value=>{assert.equal(value.opened,true);resolve();}),true);});
  assert.equal(opened.length,1);assert.equal(new URL(opened[0]).origin,'http://127.0.0.1:5173');
});

test('adapter recognizes Submit shortcuts but excludes Run and repeated keys', () => {
  const adapter=environment().DsaAdapters[0];
  assert.equal(adapter.isSubmitShortcut({key:'Enter',ctrlKey:true}),true);
  assert.equal(adapter.isSubmitShortcut({key:'Enter',metaKey:true}),true);
  assert.equal(adapter.isSubmitShortcut({key:'Enter',ctrlKey:true,repeat:true}),false);
  assert.equal(adapter.isSubmitShortcut({key:'Enter',ctrlKey:true,shiftKey:true}),false);
  assert.equal(Boolean(adapter.isSubmitShortcut({key:'Enter'})),false);
});
