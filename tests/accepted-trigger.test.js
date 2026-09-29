import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function fixture({fallbackButtons=false,fallbackVerdict=false}={}) {
  const listeners={},pageEvents={},jobs=[];let observe,opens=0,href='https://leetcode.com/problems/two-sum/';
  let result={textContent:'Accepted',className:fallbackVerdict?'font-medium text-green-s':'',};const root={};
  const doc={documentElement:root,
    querySelectorAll:selector=>selector==='span, div'&&fallbackVerdict?[result]:[],
    querySelector:selector=>selector.includes('submission-result')&&!fallbackVerdict?result:null,
    addEventListener:(event,fn)=>listeners[event]=fn};
  const page={get location(){return {href};},setTimeout:fn=>{jobs.push(fn);return jobs.length;},clearTimeout:()=>{},addEventListener:(event,fn)=>pageEvents[event]=fn};
  const runtime={sendMessage:()=>{opens++;return new Promise(()=>{});}};
  const context=vm.createContext({URL,Date,MutationObserver:class {constructor(fn){observe=fn;}observe(){}disconnect(){}}});
  for(const name of ['adapters/leetcode.js','capture.js'])vm.runInContext(readFileSync(new URL('../apps/extension/src/'+name,import.meta.url),'utf8'),context);
  context.DsaCapture.start(doc,page,runtime);
  const flush=()=>{while(jobs.length)jobs.shift()();};
  return {get opens(){return opens;},click(kind){const label=kind==='submit'?'Submit':'Run';const button={textContent:label,disabled:false};listeners.click({isTrusted:true,target:{closest:selector=>{
    if(fallbackButtons)return selector==='button'?button:null;
    return selector.includes('console-'+kind+'-button')?button:null;
  }}});flush();},result(text,{replace=false}={}){if(replace)result={textContent:text,className:fallbackVerdict?'font-medium text-green-s':''};else result.textContent=text;observe();flush();},navigate(){href='https://leetcode.com/problems/3sum/';observe();flush();},history(){pageEvents.popstate();flush();},shortcut(repeat=false){listeners.keydown({isTrusted:true,key:'Enter',ctrlKey:true,repeat});flush();}};
}
test('stale Accepted, Run and navigation never trigger recording',()=>{
  const f=fixture();f.result('Accepted');f.click('run');f.result('Accepted');f.history();assert.equal(f.opens,0);
  f.click('submit');f.result('Pending');f.navigate();f.result('Accepted');assert.equal(f.opens,0);
});
test('only a fresh submit transition to Accepted opens once',()=>{
  const f=fixture();f.click('submit');f.result('Accepted');assert.equal(f.opens,0);
  f.result('Pending');f.result('Accepted');assert.equal(f.opens,1);f.result('Accepted');assert.equal(f.opens,1);
});
test('failed verdicts, repeated shortcuts and Run during judging are ignored',()=>{
  for(const verdict of ['Wrong Answer','Runtime Error','Time Limit Exceeded']){const f=fixture();f.click('submit');f.result('Judging');f.result(verdict);f.result('Accepted');assert.equal(f.opens,0);}
  const f=fixture();f.shortcut(true);f.result('Pending');f.result('Accepted');assert.equal(f.opens,0);
  f.shortcut();f.result('Pending');f.click('run');f.result('Accepted');assert.equal(f.opens,0);
});
test('current LeetCode fallbacks detect a fresh Accepted result without visible judging',()=>{
  const f=fixture({fallbackButtons:true,fallbackVerdict:true});
  f.click('submit');f.result('Accepted',{replace:true});assert.equal(f.opens,1);
});
test('fallback verdict text alone never opens a stale Accepted result',()=>{
  const f=fixture({fallbackButtons:true,fallbackVerdict:true});
  f.result('Accepted');assert.equal(f.opens,0);
});
