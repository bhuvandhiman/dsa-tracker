import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retentionFor} from '../apps/api/src/retention-policy.js';
import {applyGoalOrdering,goalQueueSnapshot} from '../apps/api/src/goal-policy.js';
import {capabilityBarModel} from '../apps/web/src/dashboard-model.js';

const now=Date.parse('2026-10-02T12:00:00Z'),day=86400000;
const events=n=>Array.from({length:n},(_,i)=>({problemId:i+1,assistance:'independent',practiceUnit:'hashing',at:new Date(now).toISOString()}));
const goal=n=>({profile:'interview',target:500,categories:[{slug:'arrays-hashing',target:20,credited:n,deficit:20-n,coverage:5*n,units:[]}]});
const rank=(n,evidence,snapshot)=>applyGoalOrdering([{slug:'arrays-hashing',queuePriority:100-evidence.queueStrength,summary:evidence,children:[]}],goal(n),snapshot)[0];
const fill=item=>{const m=capabilityBarModel(item);return m.foundationWidth+m.retentionWidth;};

test('partial practice grows capability immediately while the queue score remains held',()=>{
  const initial=rank(0,retentionFor([],now)),snapshot=goalQueueSnapshot([initial],goal(0));
  let previous=fill(initial);
  for(let n=1;n<=3;n++) {
    const current=rank(n,retentionFor(events(n),now,n),snapshot);
    assert.ok(fill(current)>previous);previous=fill(current);
    assert.equal(current.rankingPriority,initial.rankingPriority);
  }
  const completed=rank(4,retentionFor(events(4),now,4),snapshot);
  assert.ok(fill(completed)>previous);assert.ok(completed.rankingPriority<initial.rankingPriority);
});

test('pink stays built while yellow holds then gradually fades',()=>{
  const fresh=rank(4,retentionFor(events(4),now,4));
  const held=rank(4,retentionFor(events(4),now+3*day,4));
  const stale=rank(4,retentionFor(events(4),now+34*day,4));
  assert.equal(capabilityBarModel(fresh).foundationWidth,capabilityBarModel(stale).foundationWidth);
  assert.equal(fill(fresh),fill(held));assert.ok(fill(stale)<fill(fresh));
});

test('unknown dates preserve foundation without inventing a retention fill',()=>{
  const item=rank(5,retentionFor([],now,5));
  const model=capabilityBarModel(item);
  assert.equal(model.foundationWidth,16.25);assert.equal(model.retentionWidth,0);assert.equal(model.assessed,false);
  assert.equal(item.capabilitySignals.retention,null);
});

test('rare untouched patterns cannot look strong from low interview priority',()=>{
  const item={slug:'bit-manipulation',goal:{coverage:100/12},summary:{assessed:false,strength:null},queuePriority:0,emphasis:{tier:'lower'}};
  const model=capabilityBarModel(item);
  assert.ok(model.foundationWidth>5&&model.foundationWidth<6);assert.equal(model.retentionWidth,0);
  assert.equal(fill({...item,queuePriority:100,emphasis:{tier:'high'}}),fill(item));
  assert.equal(fill({...item,goal:{coverage:0}}),0);
});

test('foundation marker grows toward the next real coverage block and disappears at completion',()=>{
  const initial=rank(0,retentionFor([],now)),snapshot=goalQueueSnapshot([initial],goal(0));
  const marker=capabilityBarModel(initial).releaseMark;
  assert.equal(marker,13);
  for(let n=1;n<=3;n++) {
    const item=rank(n,retentionFor([],now),snapshot),m=capabilityBarModel(item);
    assert.equal(m.releaseMark,marker);assert.ok(m.releaseMark>m.foundationWidth+m.retentionWidth);
  }
  const completed=rank(20,retentionFor([],now,20),snapshot);
  assert.equal(capabilityBarModel(completed).releaseMark,null);
});

test('full verified evidence fills the bar, independent of ranking and focus badge',()=>{
  const complete={slug:'graphs',goal:{coverage:100},summary:{assessed:true,strength:100},rankingPriority:80,emphasis:{tier:'high'}};
  assert.equal(fill(complete),100);
  assert.equal(fill({...complete,rankingPriority:0,emphasis:{tier:'lower'}}),100);
  const m=capabilityBarModel({slug:'graphs',capabilitySignals:{foundation:1000,retention:1000}});
  assert.equal(m.foundationWidth+m.retentionWidth,100);
  assert.equal(capabilityBarModel({slug:'graphs',capabilitySignals:{foundation:20,retention:undefined}}).assessed,false);
});
