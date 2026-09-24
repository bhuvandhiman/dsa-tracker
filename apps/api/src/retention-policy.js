import { navigationCategories, unitsFor, unitForPlacement } from './pattern-catalog.js';

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
export const policy = Object.freeze({ceiling:95,cap:94,halfLifeDays:30,timeZone:'Asia/Calcutta',defaultBreadthTarget:12,depthScale:10,recovery:{independent:0.6,hint:0.4,solution:0.2,unknown:0.3},reinforcement:{independent:1,hint:0.5,solution:0.2,unknown:0}});
const day=86400000;
export const practiceDay=value=>new Intl.DateTimeFormat('en-CA',{timeZone:policy.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function decay(value,days) { return value*Math.pow(0.5,Math.max(0,days)/policy.halfLifeDays); }
export function retentionFor(events,now=Date.now(),distinctProblems,breadthTarget=policy.defaultBreadthTarget) {
  const daily=new Map();
  for(const event of events) {
    const time=new Date(event.at).getTime();
    if(!Number.isFinite(time)||time>now) continue;
    const key=event.problemId+':'+practiceDay(time);
    const rank=event.assistance==='unknown'?0:policy.recovery[event.assistance];
    const old=daily.get(key);
    if(!old||rank>old.rank||(rank===old.rank&&time>old.time))daily.set(key,{...event,time,rank});
  }
  let recency=0,previous=null,weightedRevisits=0;
  const seen=new Set();
  for(const event of [...daily.values()].sort((a,b)=>a.time-b.time||a.problemId-b.problemId)) {
    if(previous!==null)recency=decay(recency,(event.time-previous)/day);
    recency+=(1-recency)*policy.recovery[event.assistance];
    if(seen.has(event.problemId))weightedRevisits+=policy.reinforcement[event.assistance];
    seen.add(event.problemId);previous=event.time;
  }
  if(previous!==null)recency=decay(recency,(now-previous)/day);
  const breadth=1-Math.exp(-(distinctProblems??seen.size)/breadthTarget);
  const reinforcement=1-Math.exp(-weightedRevisits/policy.depthScale);
  const strength=previous===null?null:Math.min(policy.cap,95*(0.5*breadth+0.3*reinforcement+0.2*recency));
  const experienceScore=Math.min(policy.cap,95*(0.5*breadth+0.3*reinforcement)/0.8);
  return {assessed:previous!==null,strength,displayStrength:strength??experienceScore,retention:strength,breadth,breadthTarget,reinforcement,recency:previous===null?null:recency,weightedRevisits,lastPracticedAt:previous===null?null:new Date(previous).toISOString(),experienceScore};
}
export function overview(problems,events,_preferences={},now=Date.now()) {
  const placements=new Map(problems.map(p=>[p.id,unitForPlacement(p.placement)]));
  const groups=navigationCategories.map((category,index)=>{
    const members=problems.filter(p=>p.placement.category===category.slug);
    const unitSlugs=unitsFor(category).map(unit=>unit.slug);
    const children=unitsFor(category).map((unit,order)=>{
      const matching=members.filter(p=>unitForPlacement(p.placement)===unit.slug);
      const evidence=events.filter(e=>(e.practiceUnit||placements.get(e.problemId))===unit.slug);
      const distinctSolved=new Set([...matching.filter(p=>p.historicallySolved).map(p=>p.id),...evidence.map(e=>e.problemId)]).size;
      const freshness=retentionFor(evidence,now,distinctSolved,breadthTargets[unit.slug]??policy.defaultBreadthTarget);
      const experienced=distinctSolved>0;
      const priority=experienced&&category.slug!=='other'?95-freshness.displayStrength:null;
      const days=freshness.lastPracticedAt?Math.floor((now-new Date(freshness.lastPracticedAt))/day):null;
      const reason=!experienced?'No solved problems yet':!freshness.assessed?'Prior solves · date unknown':freshness.breadth<0.5?'Limited coverage':days>=30?'Last practiced '+Math.floor(days/7)+' weeks ago':freshness.weightedRevisits<3?'Limited reinforcement':'Recently practiced';
      return {...unit,...freshness,count:matching.length,distinctSolved,experienced,priority,reason,order};
    }).sort((a,b)=>(b.priority??-1)-(a.priority??-1)||a.order-b.order);
    const attention=children.find(c=>c.priority!==null);
    const categoryEvidence=events.filter(e=>unitSlugs.includes(e.practiceUnit||placements.get(e.problemId)));
    const distinctSolved=new Set([...members.filter(p=>p.historicallySolved).map(p=>p.id),...categoryEvidence.map(e=>e.problemId)]).size;
    const summaryFreshness=retentionFor(categoryEvidence,now,distinctSolved,categoryBreadthTargets[category.slug]??policy.defaultBreadthTarget);
    const experienced=distinctSolved>0;
    const days=summaryFreshness.lastPracticedAt?Math.floor((now-new Date(summaryFreshness.lastPracticedAt))/day):null;
    const reason=!experienced?'No solved problems yet':!summaryFreshness.assessed?'Prior solves · date unknown':summaryFreshness.breadth<0.5?'Limited category coverage':days>=30?'Last practiced '+Math.floor(days/7)+' weeks ago':summaryFreshness.weightedRevisits<3?'Limited reinforcement':'Recently practiced';
    const summary={name:category.name,...summaryFreshness,distinctSolved,experienced,reason};
    const priority=experienced&&category.slug!=='other'?95-summary.displayStrength:null;
    return {slug:category.slug,name:category.name,count:members.length,tracked:children.filter(c=>c.assessed).length,children,summary,attention:attention?.slug||null,priority,order:index};
  }).sort((a,b)=>(b.priority??-1)-(a.priority??-1)||a.order-b.order);
  return {asOf:new Date(now).toISOString(),timeZone:policy.timeZone,categories:groups};
}
