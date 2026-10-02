import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retentionFor} from '../apps/api/src/retention-policy.js';
import {applyGoalOrdering,goalQueueSnapshot} from '../apps/api/src/goal-policy.js';
import {strengthBarModel,practiceEvidenceLabel,recommendationReason} from '../apps/web/src/dashboard-model.js';

const now=Date.parse('2026-10-02T12:00:00Z'),day=86400000;
const events=n=>Array.from({length:n},(_,i)=>({problemId:i+1,assistance:'independent',practiceUnit:'hashing',at:new Date(now).toISOString()}));
const goal=n=>({profile:'interview',target:500,categories:[{slug:'arrays-hashing',target:20,credited:n,deficit:20-n,coverage:5*n,units:[]}]});
const rank=(n,evidence,snapshot)=>applyGoalOrdering([{slug:'arrays-hashing',queuePriority:100-evidence.queueStrength,summary:evidence,children:[]}],goal(n),snapshot)[0];
const fill=item=>{const m=strengthBarModel(item);return m.experienceWidth+m.recentWidth;};

test('partial practice grows strength immediately while the queue score remains held',()=>{
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
  assert.equal(strengthBarModel(fresh).experienceWidth,strengthBarModel(stale).experienceWidth);
  assert.equal(fill(fresh),fill(held));assert.ok(fill(stale)<fill(fresh));
});

test('unknown dates preserve experience without inventing retention or a strength percentage',()=>{
  const item=rank(5,retentionFor([],now,5));
  const model=strengthBarModel(item);
  assert.equal(model.experienceWidth,item.summary.experienceScore);assert.equal(model.recentWidth,0);assert.equal(model.assessed,false);
  assert.equal(model.score,null);assert.equal(item.summary.strengthComponents.recentPractice,null);
});

test('rare untouched patterns cannot look strong from low interview priority',()=>{
  const item={slug:'bit-manipulation',goal:{coverage:100/12},summary:retentionFor([],now,1,14),queuePriority:0,emphasis:{tier:'lower'}};
  const model=strengthBarModel(item);
  assert.ok(model.experienceWidth>0&&model.experienceWidth<5);assert.equal(model.recentWidth,0);
  assert.equal(fill({...item,queuePriority:100,emphasis:{tier:'high'}}),fill(item));
  assert.equal(fill({...item,goal:{coverage:100}}),fill(item));
});

test('both segment widths equal the exact strength score across solves, hints, repeats and decay',()=>{
  for(const assistance of ['independent','hint','solution','unknown']) {
    const evidence=events(8).map(e=>({...e,assistance}));
    evidence.push(...evidence.map(e=>({...e,at:new Date(now+day).toISOString()})));
    for(const offset of [1,5,34,120]) {
      const summary=retentionFor(evidence,now+offset*day,8);
      const m=strengthBarModel({slug:'graphs',summary});
      assert.ok(Math.abs(m.experienceWidth+m.recentWidth-summary.strength)<1e-9);
      assert.equal(m.score,summary.strength);assert.ok(m.recentWidth>=0);
      assert.equal(summary.strengthComponents.experience,summary.experienceScore);
      assert.ok(Math.abs(summary.strengthComponents.experience+summary.strengthComponents.recentPractice-summary.strength)<1e-9);
    }
  }
});

test('full strength fills the bar without blending goal coverage or interview focus',()=>{
  const complete={slug:'graphs',goal:{coverage:0},summary:{assessed:true,strength:100,experienceScore:80},rankingPriority:80,emphasis:{tier:'high'}};
  assert.equal(fill(complete),100);
  assert.equal(fill({...complete,rankingPriority:0,emphasis:{tier:'lower'}}),100);
  const m=strengthBarModel({slug:'graphs',assessed:true,strength:20,experienceScore:1000});
  assert.equal(m.experienceWidth+m.recentWidth,20);
  assert.equal(strengthBarModel({slug:'graphs',experienceScore:20,strength:undefined}).assessed,false);
});

test('practice dots show weighted partial work, reject one-problem repetition, and reset after a block',()=>{
  const hints=events(4).map(e=>({...e,assistance:'hint'}));
  let evidence=retentionFor(hints,now,4);
  assert.deepEqual(strengthBarModel({slug:'hashing',...evidence}).steps,[1,1,0,0]);
  evidence=retentionFor(events(1).map(e=>({...e,assistance:'hint'})),now,1);
  assert.deepEqual(strengthBarModel({slug:'hashing',...evidence}).steps,[0.5,0,0,0]);
  const repeats=Array.from({length:8},(_,i)=>({...events(1)[0],at:new Date(now-(7-i)*day).toISOString()}));
  evidence=retentionFor(repeats,now,1);
  assert.equal(evidence.completedPracticeBlocks,0);
  assert.deepEqual(strengthBarModel({slug:'hashing',...evidence}).steps,[1,0,0,0]);
  evidence=retentionFor(events(4),now,4);
  const completed=strengthBarModel({slug:'hashing',...evidence});
  assert.deepEqual(completed.steps,[0,0,0,0]);assert.equal(completed.blocks,1);
});

test('imported experience remains visibly separate from the small dated-practice contribution',()=>{
  const unknown=retentionFor([],now,90,40);
  const dated=retentionFor(events(1),now,90,40);
  assert.equal(dated.experienceScore,unknown.experienceScore);
  const model=strengthBarModel({slug:'arrays-hashing',summary:dated});
  assert.equal(model.experienceWidth,unknown.experienceScore);
  assert.ok(model.recentWidth>0&&model.recentWidth<10);
  assert.equal(practiceEvidenceLabel({...dated,distinctSolved:90}),'90 distinct practice problems · 1 dated · 89 dates unknown');
});

test('brief queue reasons describe held gates and actual contributing needs',()=>{
  const item={slug:'graphs',summary:{assessed:true},priorityDetails:{actualGap:10,coverageContribution:6.5,practiceContribution:4,score:10.5}};
  assert.equal(recommendationReason(item),'Coverage gap');
  assert.equal(recommendationReason({...item,queueGate:{held:true}}),'Queue held · block unfinished');
  assert.equal(recommendationReason({...item,priorityDetails:{...item.priorityDetails,practiceContribution:10}}),'Refresh practice');
  assert.equal(recommendationReason({...item,summary:{assessed:false,distinctSolved:2},priorityDetails:null}),'Practice dates unknown');
});
