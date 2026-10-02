import { percent, strengthBarModel, practiceEvidenceLabel } from './dashboard-model.js';

export function FocusBadge({item}) {
  const emphasis=item.emphasis;
  if(!emphasis)return null;
  return <span className={`focus-emphasis focus-emphasis-${emphasis.tier}`} aria-label={`${emphasis.label} for ${emphasis.profileName}`}>{emphasis.tier==='high'?'High':emphasis.tier==='medium'?'Medium':'Lower'} focus</span>;
}

export function FocusLegend({goal}) {
  return <div className="focus-legend" aria-label="Practice strength contributions">{goal.configured&&<strong>{goal.profileName}</strong>}<span className="priority-key priority-key-experience">Experience</span><span className="priority-key priority-key-recent">Recent practice</span></div>;
}

export function StrengthBar({item,name}) {
  const model=strengthBarModel(item);
  if(!model)return <p className="data-note">Record practice to start tracking strength.</p>;
  const {score,experienceWidth,recentWidth,practice,assessed,steps,blocks}=model;
  const unknownLabel=(item.summary||item).distinctSolved>0?'Dates unknown':'No dated practice';
  const practiceName=item.children?.find(unit=>unit.slug===practice?.unit)?.name||item.name||name;
  const practiceEarned=Math.round((practice?.earned||0)*100)/100;
  return <div className="strength-bar">
    <div className="strength-bar-heading"><strong>Practice strength</strong><span className={!assessed?'strength-bar-unknown':undefined}>{assessed?`${Math.round(score)}%`:unknownLabel}</span></div>
    <div className="split-priority-labels"><span className="priority-key priority-key-experience">Experience</span><span className="priority-key priority-key-recent">Recent practice{!assessed?' · unassessed':''}</span></div>
    <div className="split-priority-track" role="img" aria-label={`${name}: ${assessed?`${Math.round(score)}% estimated practice strength`:'experience only; retention unassessed because practice dates are unknown'}. Experience contributes ${experienceWidth.toFixed(1)} percentage points${assessed?`, recent practice contributes ${recentWidth.toFixed(1)} percentage points`:''}. This is not a tested recall percentage.`}><span className="split-priority-experience" style={{width:`${experienceWidth}%`}} /><span className="split-priority-recent" style={{width:`${recentWidth}%`}} /></div>
    {steps.length>0&&<div className="practice-block"><span className="practice-block-dots" role="img" aria-label={`Practice block: ${practiceEarned} of ${practice.required} weighted credits from ${practice.distinct??0} distinct problems in ${practiceName}; at least ${practice.minimumDistinct} distinct problems required.`}>{steps.map((fill,index)=><span className="practice-block-dot" key={index}><i style={{width:`${100*fill}%`}} /></span>)}</span><span>Practice block {practiceEarned}/{practice.required}{item.children?.length>1&&practice?.earned>0?` · ${practiceName}`:''}</span>{blocks>0&&<span className="practice-block-completed">{blocks} {blocks===1?'block':'blocks'} completed</span>}</div>}
  </div>;
}

export function NextAction({ next, expanded = false, disclosure = false }) {
  return <span className={`next-action ${next && !expanded ? 'next-action-play' : ''}`} aria-hidden="true">{next && !expanded ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7Z" /></svg> : <span>{disclosure ? expanded ? '⌃' : '⌄' : '↗'}</span>}</span>;
}

export function RetentionMetric({ item, name, prominent = false }) {
  const assessed = item.assessed && Number.isFinite(item.strength);
  const label = assessed ? 'Practice strength' : item.distinctSolved > 0 ? 'Dates unknown' : 'No dated practice';
  return <div className={`pattern-retention ${prominent ? 'pattern-retention-prominent' : ''}`}>
    <div className="pattern-retention-label"><strong>{label}</strong><span>{assessed ? `${Math.round(percent(item.strength))}%` : '—'}</span></div>
    <div className="pattern-retention-track" role="img" aria-label={`${name}: ${assessed ? `${Math.round(percent(item.strength))}% practice strength` : label}`}><span style={{width:`${assessed ? percent(item.strength) : 0}%`}} /></div>
    <small>{assessed ? `Last practice: ${new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Calcutta',day:'numeric',month:'short',year:'numeric'}).format(new Date(item.lastPracticedAt))}` : item.distinctSolved > 0 ? `${item.distinctSolved} previous solves · retention not assessed` : 'Record practice to begin tracking.'}</small>
  </div>;
}

export function DifficultyMetrics({ goal, name, goalConfigured }) {
  if (!goal) return <p className="data-note">{goalConfigured ? 'Outside the coverage goal' : 'Choose a coverage goal on the dashboard.'}</p>;
  return <div className="row-difficulty-metrics"><strong className="goal-coverage-label">Goal coverage</strong>{['easy','medium','hard'].map(bucket => {
    const value = goal.difficulty[bucket];
    const target = typeof value === 'number' ? value : value.target;
    const credited = typeof value === 'number' ? goal.creditedByDifficulty[bucket] : value.credited;
    const label = bucket[0].toUpperCase()+bucket.slice(1);
    return <div className={`row-difficulty row-difficulty-${bucket}`} key={bucket} title={`${name} · ${label}: ${credited} / ${target} goal credits`}><div><strong>{label}</strong><span>{credited}/{target}</span></div><div className="row-difficulty-track" role="img" aria-label={`${name}: ${credited} of ${target} ${bucket} goal credits`}><span style={{width:`${target ? percent(100*credited/target) : 0}%`}} /></div></div>;
  })}</div>;
}

function PriorityMetric({ item, priorityItem, name }) {
  return <div className="pattern-retention">{priorityItem.slug==='other'?<strong>Needs classification</strong>:<StrengthBar item={priorityItem} name={name} />}<small>{practiceEvidenceLabel(item)}</small></div>;
}

export default function PatternMetrics({ item, priorityItem = item, goal, name, goalConfigured }) {
  return <div className="pattern-metrics"><PriorityMetric item={item} priorityItem={priorityItem} name={name} /><DifficultyMetrics goal={goal} name={name} goalConfigured={goalConfigured} /></div>;
}
