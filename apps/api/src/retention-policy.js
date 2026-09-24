import { navigationCategories, unitsFor, unitForPlacement } from './pattern-catalog.js';
export const policy = Object.freeze({ceiling:95,cap:94,halfLifeDays:30,timeZone:'Asia/Calcutta',breadthScale:20,depthScale:10,recovery:{independent:0.6,hint:0.4,solution:0.2,unknown:0.3},reinforcement:{independent:1,hint:0.5,solution:0.2,unknown:0}});
const day=86400000;
export const practiceDay=value=>new Intl.DateTimeFormat('en-CA',{timeZone:policy.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function decay(value,days) { return value*Math.pow(0.5,Math.max(0,days)/policy.halfLifeDays); }
export function retentionFor(events,now=Date.now(),distinctProblems) {
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
  const breadth=1-Math.exp(-(distinctProblems??seen.size)/policy.breadthScale);
  const reinforcement=1-Math.exp(-weightedRevisits/policy.depthScale);
  const strength=previous===null?null:Math.min(policy.cap,95*(0.5*breadth+0.3*reinforcement+0.2*recency));
  return {assessed:previous!==null,strength,retention:strength,breadth,reinforcement,recency:previous===null?null:recency,weightedRevisits,lastPracticedAt:previous===null?null:new Date(previous).toISOString(),experienceScore:95*(0.5*breadth+0.3*reinforcement)/0.8};
}
export function overview(problems,events,_preferences={},now=Date.now()) {
  const placements=new Map(problems.map(p=>[p.id,unitForPlacement(p.placement)]));
  const groups=navigationCategories.map((category,index)=>{
    const members=problems.filter(p=>p.placement.category===category.slug);
    const children=unitsFor(category).map((unit,order)=>{
      const matching=members.filter(p=>unitForPlacement(p.placement)===unit.slug);
      const evidence=events.filter(e=>(e.practiceUnit||placements.get(e.problemId))===unit.slug);
      const distinctSolved=new Set([...matching.filter(p=>p.historicallySolved).map(p=>p.id),...evidence.map(e=>e.problemId)]).size;
      const freshness=retentionFor(evidence,now,distinctSolved);
      const experienced=distinctSolved>0;
      const priority=experienced&&category.slug!=='other'?95-(freshness.strength??freshness.experienceScore):null;
      const days=freshness.lastPracticedAt?Math.floor((now-new Date(freshness.lastPracticedAt))/day):null;
      const reason=!experienced?'Coverage gap':!freshness.assessed?'Undated experience':distinctSolved<10?'Limited coverage':days>=30?'Last practiced '+Math.floor(days/7)+' weeks ago':freshness.weightedRevisits<3?'Limited reinforcement':'Recently practiced';
      return {...unit,...freshness,count:matching.length,distinctSolved,experienced,priority,reason,order};
    }).sort((a,b)=>(b.priority??-1)-(a.priority??-1)||a.order-b.order);
    const attention=children.find(c=>c.priority!==null);
    return {slug:category.slug,name:category.name,count:members.length,tracked:children.filter(c=>c.assessed).length,children,attention:attention?.slug||null,priority:attention?.priority??null,order:index};
  }).sort((a,b)=>(b.priority??-1)-(a.priority??-1)||a.order-b.order);
  return {asOf:new Date(now).toISOString(),timeZone:policy.timeZone,categories:groups};
}
