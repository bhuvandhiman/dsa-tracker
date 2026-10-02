import { navigationCategories, unitsFor, unitForPlacement } from './pattern-catalog.js';
import { practicePolicy } from './practice-policy.js';

// Breadth targets reflect the size of each pattern, not a claim that every
// pattern needs the same number of problems. Broad families need more distinct
// problems; narrow or advanced patterns reach comparable coverage with fewer.
export const breadthTargets = Object.freeze({
  hashing:20,'prefix-sum':10,'arrays-hashing-general':20,
  'two-pointers':14,'sliding-window':12,stack:12,'monotonic-stack':8,'stack-general':12,
  'binary-search':12,'linked-list':10,'tree-dfs':15,'tree-bfs':8,bst:10,
  'segment-tree':4,'fenwick-tree':4,'trees-general':12,trie:6,heap:12,backtracking:12,
  'graph-bfs':10,'graph-dfs':12,'union-find':8,'topological-sort':8,
  'shortest-path':8,mst:5,'graphs-general':14,'dp-1d':14,'dp-2d':12,
  'knapsack-01':8,'knapsack-unbounded':8,'sequence-dp':12,'interval-dp':6,
  'state-machine-dp':6,'multidimensional-dp':6,'dynamic-programming-general':16,
  greedy:14,intervals:10,math:16,'bit-manipulation':10,other:20,
});
export const categoryBreadthTargets = Object.freeze({
  'arrays-hashing':40,'two-pointers':20,'sliding-window':18,stack:18,
  'binary-search':18,'linked-list':15,trees:30,trie:8,heap:18,
  backtracking:18,graphs:28,'dynamic-programming':35,greedy:20,
  intervals:14,math:24,'bit-manipulation':14,other:24,
});
export const policy = Object.freeze({
  ceiling:100,cap:100,halfLifeDays:30,timeZone:'Asia/Calcutta',defaultBreadthTarget:12,depthScale:10,
  weights:{breadth:0.5,reinforcement:0.3,recency:0.2},
  recovery:{independent:0.6,hint:0.4,solution:0.2,unknown:0.3},
  reinforcement:{independent:1,hint:0.5,solution:0.2,unknown:0},
});
const day=86400000;
export const practiceDay=value=>new Intl.DateTimeFormat('en-CA',{timeZone:policy.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function decay(value,days) { return value*Math.pow(0.5,Math.max(0,days)/policy.halfLifeDays); }
function datedEvents(events,now) {
  const daily=new Map();
  for(const event of events) {
    const time=new Date(event.at).getTime();
    if(!Number.isFinite(time)||time>now) continue;
    const key=event.problemId+':'+practiceDay(time);
    const rank=event.assistance==='unknown'?0:policy.recovery[event.assistance];
    const old=daily.get(key);
    if(!old||rank>old.rank||(rank===old.rank&&time>old.time))daily.set(key,{...event,time,rank});
  }
  return [...daily.values()].sort((a,b)=>a.time-b.time||a.problemId-b.problemId);
}
function activityFor(events,now,windowDays=84) {
  const cutoffDay=practiceDay(now-(windowDays-1)*day);
  const totals=new Map();
  for(const event of events) {
    const key=practiceDay(event.time);
    if(key<cutoffDay) continue;
    totals.set(key,(totals.get(key)||0)+1);
  }
  return [...totals.entries()].map(([date,count])=>({date,count}));
}
function earnedBlocks(daily) {
  const units=new Map(),blocks=[];
  daily.forEach((event,index)=>{
    const weight=practicePolicy.evidenceWeight[event.assistance]||0;
    if(!weight)return;
    const unit=event.practiceUnit||'unspecified';
    if(!units.has(unit))units.set(unit,{pending:new Map(),lastDay:null,spaced:0});
    const state=units.get(unit);
    state.pending.set(event.problemId,Math.max(weight,state.pending.get(event.problemId)||0));
    const total=[...state.pending.values()].reduce((sum,value)=>sum+value,0);
    if(state.pending.size<practicePolicy.minimumDistinct||total+1e-9<practicePolicy.blockWeight)return;
    const date=practiceDay(event.time);
    if(state.lastDay&&date!==state.lastDay)state.spaced++;
    const holdDays=Math.min(practicePolicy.maxHoldDays,practicePolicy.baseHoldDays+state.spaced*practicePolicy.spacedHoldIncrementDays);
    blocks.push({index,time:event.time,holdDays,unit});
    state.pending.clear();state.lastDay=date;
  });
  return blocks;
}

function summarizePractice(daily,now,distinctProblems,breadthTarget) {
  const blocks=earnedBlocks(daily),byIndex=new Map(blocks.map(block=>[block.index,block]));
  let recency=0,previous=null,weightedRevisits=0,revisitCount=0;
  let holdUntil=0;
  const seen=new Set();
  for(const [index,event] of daily.entries()) {
    if(previous!==null)recency=decay(recency,Math.max(0,event.time-Math.max(previous,holdUntil))/day);
    recency+=(1-recency)*policy.recovery[event.assistance];
    if(seen.has(event.problemId)) { weightedRevisits+=policy.reinforcement[event.assistance];revisitCount++; }
    seen.add(event.problemId);previous=event.time;
    const block=byIndex.get(index);
    if(block)holdUntil=Math.max(holdUntil,block.time+block.holdDays*day);
  }
  if(previous!==null)recency=decay(recency,Math.max(0,now-Math.max(previous,holdUntil))/day);
  const breadth=1-Math.exp(-(distinctProblems??seen.size)/breadthTarget);
  const reinforcement=1-Math.exp(-weightedRevisits/policy.depthScale);
  const {breadth:breadthWeight,reinforcement:reinforcementWeight,recency:recencyWeight}=policy.weights;
  const persistentWeight=breadthWeight+reinforcementWeight;
  const experienceScore=Math.min(policy.cap,policy.ceiling*(breadthWeight*breadth+reinforcementWeight*reinforcement)/persistentWeight);
  // The first dated event adds recency to the existing experience baseline.
  const strength=previous===null?null:Math.min(policy.cap,experienceScore+(policy.ceiling-experienceScore)*recencyWeight*recency);
  const totalDistinct=distinctProblems??seen.size;
  const datedDistinctSolved=seen.size;
  return {
    assessed:previous!==null,strength,displayStrength:strength??experienceScore,retention:strength,
    breadth,breadthTarget,reinforcement,recency:previous===null?null:recency,weightedRevisits,revisitCount,
    datedDistinctSolved,legacyDistinctSolved:Math.max(0,totalDistinct-datedDistinctSolved),
    lastPracticedAt:previous===null?null:new Date(previous).toISOString(),experienceScore,
    activity:activityFor(daily,now),
    completedPracticeBlocks:blocks.length,
  };
}

export function retentionFor(events,now=Date.now(),distinctProblems,breadthTarget=policy.defaultBreadthTarget,legacyProblemIds=[]) {
  const daily=datedEvents(events,now),blocks=earnedBlocks(daily);
  const result=summarizePractice(daily,now,distinctProblems,breadthTarget);
  // Queue evidence only changes when a meaningful block is completed. Partial
  // practice still grows the visible bar, without refreshing the queue snapshot.
  const last=blocks.at(-1);
  const committed=last?daily.slice(0,last.index+1):[];
  const committedIds=new Set([...legacyProblemIds,...committed.map(event=>event.problemId)]);
  const queue=summarizePractice(committed,now,committedIds.size,breadthTarget);
  return {...result,queueStrength:queue.displayStrength};
}
function trendFor(events,legacyProblemIds,now,breadthTarget,current) {
  if(!current.assessed) return null;
  const then=now-policy.halfLifeDays*day;
  const priorEvents=events.filter(event=>new Date(event.at).getTime()<=then);
  const priorDistinct=new Set(legacyProblemIds);
  for(const event of priorEvents) priorDistinct.add(event.problemId);
  const prior=retentionFor(priorEvents,then,priorDistinct.size,breadthTarget);
  const delta=current.displayStrength-prior.displayStrength;
  return {days:policy.halfLifeDays,delta:Number(delta.toFixed(1)),previous:Number(prior.displayStrength.toFixed(1))};
}
export function overview(problems,events,_preferences={},now=Date.now()) {
  const placements=new Map(problems.map(p=>[p.id,unitForPlacement(p.placement)]));
  const solvedIds=new Set([...problems.filter(p=>p.historicallySolved).map(p=>p.id),...events.map(e=>e.problemId)]);
  const groups=navigationCategories.map((category,index)=>{
    const members=problems.filter(p=>p.placement.category===category.slug);
    const unitSlugs=unitsFor(category).map(unit=>unit.slug);
    const children=unitsFor(category).map((unit,order)=>{
      const matching=members.filter(p=>unitForPlacement(p.placement)===unit.slug);
      const evidence=events.filter(e=>(e.practiceUnit||placements.get(e.problemId))===unit.slug);
      const legacyProblemIds=matching.filter(p=>p.historicallySolved).map(p=>p.id);
      const distinctSolved=new Set([...legacyProblemIds,...evidence.map(e=>e.problemId)]).size;
      const freshness=retentionFor(evidence,now,distinctSolved,breadthTargets[unit.slug]??policy.defaultBreadthTarget,legacyProblemIds);
      const experienced=distinctSolved>0;
      const priority=experienced&&category.slug!=='other'?100-freshness.displayStrength:null;
      const queuePriority=experienced&&category.slug!=='other'?100-freshness.queueStrength:null;
      const days=freshness.lastPracticedAt?Math.floor((now-new Date(freshness.lastPracticedAt))/day):null;
      const reason=!experienced?'No solved problems here yet':!freshness.assessed?distinctSolved+' previous '+(distinctSolved===1?'solve':'solves')+' · dates unavailable':freshness.breadth<0.5?'Only a few problems solved in this pattern':days>=30?'No practice here for '+Math.floor(days/7)+' weeks':freshness.weightedRevisits<3?'Most practice here was one-time solves':'Practiced recently with repeat work';
      const trend30Days=trendFor(evidence,legacyProblemIds,now,breadthTargets[unit.slug]??policy.defaultBreadthTarget,freshness);
      return {...unit,...freshness,count:matching.length,coverageSolved:matching.filter(p=>solvedIds.has(p.id)).length,distinctSolved,experienced,priority,queuePriority,reason,trend30Days,order};
    }).sort((a,b)=>Math.floor((b.queuePriority??-1)/practicePolicy.bufferCredits)-Math.floor((a.queuePriority??-1)/practicePolicy.bufferCredits)||a.order-b.order);
    const attention=children.find(c=>c.priority!==null);
    const categoryEvidence=events.filter(e=>unitSlugs.includes(e.practiceUnit||placements.get(e.problemId))).map(e=>({...e,practiceUnit:e.practiceUnit||placements.get(e.problemId)}));
    const legacyProblemIds=members.filter(p=>p.historicallySolved).map(p=>p.id);
    const distinctSolved=new Set([...legacyProblemIds,...categoryEvidence.map(e=>e.problemId)]).size;
    const summaryFreshness=retentionFor(categoryEvidence,now,distinctSolved,categoryBreadthTargets[category.slug]??policy.defaultBreadthTarget,legacyProblemIds);
    const experienced=distinctSolved>0;
    const days=summaryFreshness.lastPracticedAt?Math.floor((now-new Date(summaryFreshness.lastPracticedAt))/day):null;
    const reason=!experienced?'No solved problems here yet':!summaryFreshness.assessed?distinctSolved+' previous '+(distinctSolved===1?'solve':'solves')+' · dates unavailable':summaryFreshness.breadth<0.5?'Only a few problems solved across this pattern':days>=30?'No practice here for '+Math.floor(days/7)+' weeks':summaryFreshness.weightedRevisits<3?'Most practice here was one-time solves':'Practiced recently with repeat work';
    const trend30Days=trendFor(categoryEvidence,legacyProblemIds,now,categoryBreadthTargets[category.slug]??policy.defaultBreadthTarget,summaryFreshness);
    const summary={name:category.name,...summaryFreshness,coverageSolved:members.filter(p=>solvedIds.has(p.id)).length,distinctSolved,experienced,reason,trend30Days};
    const priority=experienced&&category.slug!=='other'?100-summary.displayStrength:null;
    const queuePriority=experienced&&category.slug!=='other'?100-summary.queueStrength:null;
    return {slug:category.slug,name:category.name,count:members.length,tracked:children.filter(c=>c.assessed).length,children,summary,attention:attention?.slug||null,priority,queuePriority,order:index};
  }).sort((a,b)=>Math.floor((b.queuePriority??-1)/practicePolicy.bufferCredits)-Math.floor((a.queuePriority??-1)/practicePolicy.bufferCredits)||a.order-b.order);
  return {asOf:new Date(now).toISOString(),timeZone:policy.timeZone,categories:groups};
}
