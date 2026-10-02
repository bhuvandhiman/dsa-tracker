import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyGoalOrdering,goalQueueSnapshot} from '../apps/api/src/goal-policy.js';
import {retentionFor} from '../apps/api/src/retention-policy.js';

const now=Date.parse('2026-10-02T12:00:00Z'),day=86400000;
const events=(n,assistance='independent',unit='hashing',at=now)=>Array.from({length:n},(_,i)=>({problemId:i+1,assistance,practiceUnit:unit,at:new Date(at).toISOString()}));
const goal=(credited=0,target=20)=>({profile:'interview',target:300,categories:[{slug:'arrays-hashing',target,credited,deficit:target-credited,units:[]}]});
const rows=evidence=>[{slug:'arrays-hashing',order:0,queuePriority:100-evidence.queueStrength,summary:evidence,children:[]}];
const run=(credited=0,snapshot,e=retentionFor([],now),target=20)=>applyGoalOrdering(rows(e),goal(credited,target),snapshot)[0];
const save=(item,credited=0,target=20)=>goalQueueSnapshot([item],goal(credited,target));

test('refresh at each partial credit preserves the coverage gate until four, then keeps overflow',()=>{
  let item=run(),snapshot=save(item);
  const anchor=item.rankingPriority;
  for(let credit=1;credit<4;credit++) {
    item=run(credit,snapshot);snapshot=save(item,credit);
    assert.equal(item.rankingPriority,anchor);
    assert.equal(item.queueGate.coverage.earned,credit);
  }
  item=run(4,snapshot);assert.ok(item.rankingPriority<anchor);
  item=run(7,save(item,4));assert.equal(item.queueGate.coverage.earned,3);
  const batch=run(7,save(run()));
  assert.equal(batch.queueGate.coverage.earned,3);
  assert.equal(batch.queueMemory.credited,4);
});

test('near completion uses the real remaining quota and has no phantom gate when complete',()=>{
  const initial=run(0,undefined,undefined,2);
  const partial=run(1,save(initial,0,2),undefined,2);
  assert.equal(partial.queueGate.coverage.required,2);
  assert.equal(partial.queueGate.coverage.earned,1);
  const complete=run(2,save(partial,1,2),undefined,2);
  assert.equal(complete.queueGate.coverage.active,false);
  assert.equal(complete.prioritySignals.releaseMark,null);
  assert.ok(complete.rankingPriority<partial.rankingPriority);
});

test('revision evidence advances without new coverage and releases only at a full distinct block',()=>{
  let item=run(10),snapshot=save(item,10);const anchor=item.rankingPriority;
  for(let n=1;n<=3;n++) {
    item=run(10,snapshot,retentionFor(events(n),now,10));snapshot=save(item,10);
    assert.equal(item.rankingPriority,anchor);
    assert.equal(item.queueGate.practice.earned,n);
    assert.equal(item.queueGate.coverage.earned,0);
  }
  item=run(10,snapshot,retentionFor(events(4),now,10));
  assert.ok(item.rankingPriority<anchor);
  assert.equal(item.queueGate.practice.earned,0);
  assert.equal(item.queueGate.reason,'practice');
});

test('pending practice is weighted and never pools siblings or repeated identical problems',()=>{
  assert.equal(retentionFor(events(3),now).practiceBlock.earned,3);
  assert.equal(retentionFor(events(4,'hint'),now).practiceBlock.earned,2);
  assert.equal(retentionFor(events(4,'solution'),now).practiceBlock.earned,0.8);
  assert.equal(retentionFor(events(20,'unknown'),now).practiceBlock.earned,0);
  const split=[...events(2),...events(2,'independent','prefix-sum').map(e=>({...e,problemId:e.problemId+2}))];
  assert.equal(retentionFor(split,now).practiceBlock.earned,2);
  const repeated=Array.from({length:9},(_,i)=>({...events(1)[0],at:new Date(now-i*day).toISOString()}));
  assert.equal(retentionFor(repeated,now).practiceBlock.earned,1);
  assert.equal(retentionFor(events(8,'hint'),now).completedPracticeBlocks,1);
});

test('same block-count corrections invalidate held evidence and replay the queue',()=>{
  const old=retentionFor(events(4,'independent','hashing',now-30*day),now,10);
  const initial=run(10,undefined,old),snapshot=save(initial,10);
  const corrected=retentionFor(events(4),now,10);
  assert.equal(corrected.completedPracticeBlocks,old.completedPracticeBlocks);
  const next=run(10,snapshot,corrected);
  assert.ok(next.rankingPriority<initial.rankingPriority);
  assert.equal(next.queueGate.reason,'correction');
});

test('malformed derived memory cannot create NaN rankings or block legitimate updates',()=>{
  const snapshot=save(run());snapshot.items['category:arrays-hashing']={anchor:'broken',credited:0,blocks:0,gap:20};
  const next=run(1,snapshot);
  assert.ok(Number.isFinite(next.rankingPriority));
  assert.equal(next.queueGate.coverage.earned,0);
});

test('coverage marker stays fixed within a block, tracks recency, then rolls forward',()=>{
  const initial=run(),snapshot=save(initial);
  const marker=initial.prioritySignals.releaseMark;
  for(let credit=1;credit<=3;credit++)assert.equal(run(credit,snapshot).prioritySignals.releaseMark,marker);
  const completed=run(4,snapshot);
  assert.ok(completed.prioritySignals.releaseMark<marker);
});


test('policy changes and partial-credit corrections reset derived gates',()=>{
  const initial=run(),partial=run(3,save(initial)),snapshot=save(partial,3);
  const corrected=run(2,snapshot);
  assert.equal(corrected.queueGate.reason,'correction');assert.equal(corrected.queueGate.coverage.earned,0);
  const switched=applyGoalOrdering(rows(retentionFor([],now)),{...goal(3),profile:'deep'},snapshot)[0];
  assert.equal(switched.queueGate.coverage.earned,0);
  const resized=applyGoalOrdering(rows(retentionFor([],now)),{...goal(3),target:500},snapshot)[0];
  assert.equal(resized.queueGate.coverage.earned,0);
});

test('duplicate, future and missing-date events do not advance the revision gate',()=>{
  const existing=events(3);
  assert.equal(retentionFor([...existing,...existing],now).practiceBlock.earned,3);
  assert.equal(retentionFor([...existing,...events(8,'independent','hashing',now+day)],now).practiceBlock.earned,3);
  assert.equal(retentionFor([...existing,...events(8).map(e=>({...e,at:null}))],now).practiceBlock.earned,3);
  assert.equal(retentionFor(events(4),now).practiceBlock.earned,0);
});

test('decay raises revision need after holds without minting block progress',()=>{
  const evidence=events(4);
  const fresh=run(4,undefined,retentionFor(evidence,now,4));
  const held=run(4,save(fresh,4),retentionFor(evidence,now+3*day,4));
  const decayed=run(4,save(held,4),retentionFor(evidence,now+34*day,4));
  assert.equal(held.dashboardPriority,fresh.dashboardPriority);
  assert.ok(decayed.dashboardPriority>held.dashboardPriority);
  assert.equal(decayed.queueGate.practice.earned,0);assert.equal(decayed.queueGate.coverage.earned,0);
});

test('revision block removal and restoration replay instead of preserving stale rank',()=>{
  const complete=run(10,undefined,retentionFor(events(4),now,10));
  const removed=run(10,save(complete,10),retentionFor(events(3),now,10));
  assert.equal(removed.queueGate.reason,'correction');assert.equal(removed.queueGate.practice.earned,3);
  assert.ok(removed.rankingPriority>complete.rankingPriority);
  const restored=run(10,save(removed,10),retentionFor(events(4),now,10));
  assert.equal(restored.queueGate.reason,'practice');assert.equal(restored.rankingPriority,complete.rankingPriority);
});


test('all quota sizes keep gate counters and markers bounded through complete sequential solves',()=>{
  for(let target=1;target<=60;target++) {
    let item=run(0,undefined,undefined,target),snapshot=save(item,0,target);
    for(let credit=1;credit<=target;credit++) {
      const prior=item;
      item=run(credit,snapshot,undefined,target);snapshot=save(item,credit,target);
      const gate=item.queueGate.coverage;
      assert.ok(gate.earned>=0&&gate.earned<Math.max(1,gate.required));
      if(gate.active) {
        assert.ok(gate.required>=1&&gate.required<=4);
        assert.ok(item.prioritySignals.releaseMark>=0&&item.prioritySignals.releaseMark<=100*item.dashboardPriority/target+1e-8);
      } else assert.equal(item.prioritySignals.releaseMark,null);
      if(item.queueGate.reason==='held')assert.equal(item.rankingPriority,prior.rankingPriority);
      else assert.ok(item.rankingPriority<prior.rankingPriority);
    }
  }
});


test('backdated unknown imports cannot bypass a held revision block',()=>{
  const existing=events(4,'independent','hashing',now-2*day);
  const legacy=Array.from({length:10},(_,i)=>i+1);
  const initial=run(10,undefined,retentionFor(existing,now,10,12,legacy));
  const imported={problemId:9,assistance:'unknown',practiceUnit:'hashing',at:new Date(now-3*day).toISOString()};
  const next=run(10,save(initial,10),retentionFor([...existing,imported],now,10,12,legacy));
  assert.equal(next.rankingPriority,initial.rankingPriority);
  assert.equal(next.queueGate.reason,'held');
});
