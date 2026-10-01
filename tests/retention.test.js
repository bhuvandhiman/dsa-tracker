import {test} from 'node:test';
import assert from 'node:assert/strict';
import {breadthTargets,categoryBreadthTargets,decay,retentionFor,overview,practiceDay} from '../apps/api/src/retention-policy.js';
import {classifyProblem} from '../apps/api/src/pattern-catalog.js';
const now=Date.parse('2026-01-01T12:00:00Z'),day=86400000;
const event=(assistance='independent',at=now,problemId=1,practiceUnit)=>({problemId,assistance,at:new Date(at).toISOString(),practiceUnit});
const problem=(id,slug,historicallySolved=false)=>{const p={id,platform:'leetcode',externalId:slug,patternSlugs:[],historicallySolved};return {...p,placement:classifyProblem(p)};};
const block=(at=now,assistance='independent',count=4,unit='hashing')=>Array.from({length:count},(_,i)=>event(assistance,at,i+1,unit));
test('four independent distinct solves earn a three-day hold then gradual decay resumes',()=>{
  const events=block(),fresh=retentionFor(events,now);
  assert.equal(fresh.completedPracticeBlocks,1);
  assert.equal(retentionFor(events,now+3*day).strength,fresh.strength);
  assert.ok(retentionFor(events,now+4*day).strength<fresh.strength);
  assert.equal(retentionFor(events.slice(0,3),now).completedPracticeBlocks,0);
});
test('partial practice grows the bar without changing committed queue evidence or extending the hold',()=>{
  const events=block(),partial=[...events,event('independent',now+2*day,5,'hashing')];
  const before=retentionFor(events,now+2*day),after=retentionFor(partial,now+2*day);
  assert.ok(after.strength>before.strength);
  assert.equal(after.queueStrength,before.queueStrength);
  assert.equal(after.completedPracticeBlocks,1);
  assert.ok(retentionFor(partial,now+4*day).strength<retentionFor(partial,now+3*day).strength);
  assert.equal(retentionFor([event()],now).queueStrength,retentionFor([],now).queueStrength);
  assert.ok(retentionFor(events,now).queueStrength>retentionFor(events.slice(0,3),now).queueStrength);
});
test('holds require weighted distinct practice in one subpattern, never a repeated single problem',()=>{
  assert.equal(retentionFor(block(now,'hint'),now).completedPracticeBlocks,0);
  assert.equal(retentionFor(block(now,'hint',8),now).completedPracticeBlocks,1);
  assert.equal(retentionFor(block(now,'solution',20),now).completedPracticeBlocks,1);
  assert.equal(retentionFor(block(now,'unknown',20),now).completedPracticeBlocks,0);
  const repeated=Array.from({length:20},(_,i)=>event('independent',now-i*day,1,'hashing'));
  assert.equal(retentionFor(repeated,now).completedPracticeBlocks,0);
  assert.ok(retentionFor(repeated,now).strength<50);
  assert.equal(retentionFor(block().map((e,i)=>({...e,practiceUnit:i<2?'hashing':'prefix-sum'})),now).completedPracticeBlocks,0);
});
test('spaced blocks extend the hold, same-day blocks do not, and corrections recalculate it',()=>{
  const spaced=[...block(now-day),...block(now)],fresh=retentionFor(spaced,now);
  assert.equal(fresh.completedPracticeBlocks,2);
  assert.equal(retentionFor(spaced,now+5*day).strength,fresh.strength);
  assert.ok(retentionFor(spaced,now+6*day).strength<fresh.strength);
  const sameDay=block(now,'independent',8);
  assert.equal(retentionFor(sameDay,now).completedPracticeBlocks,2);
  assert.ok(retentionFor(sameDay,now+4*day).strength<retentionFor(sameDay,now).strength);
  const corrected=spaced.slice(0,-1);
  assert.equal(retentionFor(corrected,now).completedPracticeBlocks,1);
  assert.ok(retentionFor(corrected,now+3*day).strength<retentionFor(corrected,now+2*day).strength);
  const many=Array.from({length:10},(_,i)=>block(now-i*day)).flat();
  assert.equal(retentionFor(many,now+14*day).strength,retentionFor(many,now).strength);
  assert.ok(retentionFor(many,now+15*day).strength<retentionFor(many,now).strength);
});
test('the first dated event adds evidence without lowering the undated experience baseline',()=>{
  for(const assistance of ['unknown','independent','hint','solution']){
    const baseline=retentionFor([],now,100,20);
    const dated=retentionFor([event(assistance)],now,100,20);
    assert.ok(dated.displayStrength>=baseline.displayStrength);
    assert.ok(retentionFor([event(assistance)],now+365*day,100,20).displayStrength>=baseline.displayStrength);
  }
});
test('only recency decays; substantial breadth and reinforcement can exceed the old artificial cap',()=>{
  const events=[event(),event('independent',now-day)];
  const fresh=retentionFor(events,now),old=retentionFor(events,now+365*day);
  assert.equal(old.breadth,fresh.breadth);assert.equal(old.reinforcement,fresh.reinforcement);assert.ok(old.strength>0);assert.ok(old.strength<fresh.strength);
  assert.equal(decay(0.6,30),0.3);
  const strong=retentionFor(Array.from({length:400},(_,i)=>event('independent',now-i*day)),now,10000).strength;
  assert.ok(strong>94&&strong<=100);
  assert.equal(retentionFor([],now,12).strength,null);
});
test('local-day dedup favors explicit assistance; only separate-day revisits reinforce',()=>{
  assert.equal(practiceDay('2026-01-01T19:00:00Z'),practiceDay('2026-01-02T01:00:00Z'));
  assert.equal(retentionFor([event('unknown'),event('solution')],now).recency,0.2);
  assert.equal(retentionFor([event('hint'),event(),event()],now).recency,0.6);
  assert.equal(retentionFor([event(),event()],now).weightedRevisits,0);
  assert.equal(retentionFor([event('unknown',now-day),event('hint')],now).weightedRevisits,0.5);
  assert.equal(retentionFor([event('unknown',now-day),event('unknown')],now).weightedRevisits,0);
});
test('retention exposes factual evidence counts and a deduplicated recent activity window',()=>{
  const events=[
    event('unknown',now-2*day,1),
    event('independent',now-2*day+1000,1),
    event('hint',now-day,1),
    event('independent',now-day,2),
    event('independent',now-90*day,3),
  ];
  const result=retentionFor(events,now,4);
  assert.equal(result.datedDistinctSolved,3);
  assert.equal(result.legacyDistinctSolved,1);
  assert.equal(result.revisitCount,1);
  assert.deepEqual(result.activity.map(item=>item.count),[1,2]);
  assert.ok(result.activity[0].date<result.activity[1].date);
});
test('attempt approaches isolate siblings independently of browsing placement and other practice',()=>{
  const problems=[problem(1,'climbing-stairs'),problem(2,'coin-change',true)];
  const units=e=>overview(problems,e,{},now).categories.flatMap(c=>c.children);
  const before=units([event('independent',now,1,'dp-1d')]);
  const after=units([event('independent',now,1,'dp-1d'),event('independent',now,1,'knapsack-01')]);
  assert.equal(before.find(u=>u.slug==='dp-1d').strength,after.find(u=>u.slug==='dp-1d').strength);
  assert.equal(after.find(u=>u.slug==='knapsack-01').assessed,true);
  assert.equal(after.find(u=>u.slug==='knapsack-unbounded').assessed,false);
  assert.equal(after.find(u=>u.slug==='knapsack-unbounded').distinctSolved,1);
});
test('deep older coverage ranks below shallow recent practice; untouched categories come last',()=>{
  const problems=Array.from({length:60},(_,i)=>problem(i+1,'two-sum',true));
  problems.push(...Array.from({length:10},(_,i)=>problem(i+100,'word-ladder',true)));
  const events=[...Array.from({length:60},(_,i)=>event('independent',now-180*day,i+1,'hashing')),...Array.from({length:20},(_,i)=>event('independent',now-(150+i)*day,1,'hashing')),...Array.from({length:10},(_,i)=>event('independent',now,i+100,'graph-bfs'))];
  const groups=overview(problems,events,{},now).categories;
  assert.equal(groups[0].slug,'graphs');assert.equal(groups[1].slug,'arrays-hashing');assert.equal(groups.at(-1).slug,'other');
});
test('undated experience is unassessed but ranked; multiple records do not inflate breadth',()=>{
  const groups=overview([problem(1,'coin-change',true)],[event('unknown',now,1),event('hint',now,1)],{},now).categories;
  const dp=groups.find(c=>c.slug==='dynamic-programming');assert.equal(dp.children.find(u=>u.slug==='knapsack-unbounded').distinctSolved,1);
  const undated=overview([problem(1,'coin-change',true)],[],{},now).categories;
  assert.equal(undated[0].slug,'dynamic-programming');assert.equal(undated[0].children[0].strength,null);assert.ok(undated[0].children[0].displayStrength>0);assert.equal(undated[0].children.at(-1).displayStrength,0);assert.equal(undated[0].children.at(-1).experienced,false);
});
test('breadth is normalized by pattern scope so narrow advanced patterns need fewer examples',()=>{
  const narrow=retentionFor([],now,4,breadthTargets['segment-tree']);
  const broad=retentionFor([],now,4,breadthTargets.hashing);
  assert.ok(narrow.displayStrength>35);
  assert.ok(narrow.displayStrength>broad.displayStrength);
  assert.equal(narrow.assessed,false);
});
test('major category summaries aggregate solved problems without merging child evidence',()=>{
  const problems=[
    ...Array.from({length:20},(_,i)=>problem(i+1,'climbing-stairs',true)),
    ...Array.from({length:15},(_,i)=>problem(i+101,'coin-change',true)),
  ];
  const dp=overview(problems,[],{},now).categories.find(category=>category.slug==='dynamic-programming');
  assert.equal(dp.summary.distinctSolved,35);
  assert.equal(dp.summary.assessed,false);
  assert.ok(dp.summary.displayStrength>0);
  assert.ok(dp.summary.distinctSolved>Math.max(...dp.children.map(unit=>unit.distinctSolved)));
  assert.equal(dp.children.find(unit=>unit.slug==='dp-1d').distinctSolved,20);
  assert.equal(dp.children.find(unit=>unit.slug==='knapsack-unbounded').distinctSolved,15);
  assert.equal(dp.summary.breadthTarget,categoryBreadthTargets['dynamic-programming']);
});
test('30-day trend reports decay, recent recovery, and no invented trend for legacy-only evidence',()=>{
  const p=problem(1,'two-sum',true);
  const stale=overview([p],[event('independent',now-60*day,1,'hashing')],{},now).categories.find(category=>category.slug==='arrays-hashing').summary;
  const recent=overview([p],[event('independent',now,1,'hashing')],{},now).categories.find(category=>category.slug==='arrays-hashing').summary;
  const legacy=overview([p],[],{},now).categories.find(category=>category.slug==='arrays-hashing').summary;
  assert.ok(stale.trend30Days.delta<0);
  assert.ok(recent.trend30Days.delta>0);
  assert.equal(legacy.trend30Days,null);
});
