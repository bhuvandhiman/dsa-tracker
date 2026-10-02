import { percent, priorityBarModel } from './dashboard-model.js';

export function FocusLegend({goal}) {
  if(!goal.configured)return null;
  return <div className="focus-legend" aria-label="Priority signals"><strong>{goal.profileName}</strong><span className="priority-key priority-key-focus">Focus push</span><span className="priority-key priority-key-retention">Retention push</span></div>;
}

export function PriorityBar({item,name}) {
  const model=priorityBarModel(item);
  if(!model)return <p className="data-note">Priority breakdown unavailable.</p>;
  const {focusWidth,retentionWidth,releaseMark,coverage,practice,assessed,held}=model;
  const practiceName=item.children?.find(unit=>unit.slug===practice?.unit)?.name||item.name||name;
  const practiceEarned=Math.round((practice?.earned||0)*100)/100;
  const coverageText=coverage?(coverage.active?`Next coverage ${coverage.earned}/${coverage.required} credits`:'Coverage complete'):null;
  const revisionText=practice?`Next revision ${practiceEarned}/${practice.required} credits`:null;
  return <div className="split-priority" role="img" aria-label={`${name}: focus push occupies ${Math.round(focusWidth)}% of the bar, retention push ${Math.round(retentionWidth)}%. ${assessed?'Dated practice evidence':'Retention dates unknown; revision need is unverified'}. ${coverageText||'Choose a coverage focus'}. ${revisionText?`${revisionText} weighted distinct practice credits in ${practiceName}; at least ${practice.minimumDistinct} distinct problems required.`:''} ${releaseMark!==null?'Dashed line marks the coverage release, holding retention constant.':''} ${held?'Queue held until a meaningful block completes.':''} Release permits a score update, not a guaranteed rank change.`}>
    <div className="split-priority-labels"><span className="priority-key priority-key-focus">{item.goal?'Focus push':'Choose a focus'}</span><span className="priority-key priority-key-retention">Retention{!assessed?' · undated':''}</span></div>
    <div className="split-priority-track"><span className="split-priority-focus" style={{width:`${focusWidth}%`}} /><span className={`split-priority-retention ${assessed?'':'is-undated'}`} style={{width:`${retentionWidth}%`}} />{releaseMark!==null&&<i className="priority-release-marker" style={{left:`${releaseMark}%`}} aria-hidden="true" />}</div>
    {(coverageText||revisionText)&&<div className="queue-threshold">{coverageText&&<span>{releaseMark!==null&&<i className="threshold-key" aria-hidden="true" />}{coverageText}</span>}{revisionText&&<span>{revisionText}{item.children?.length>1&&practice?.earned>0?` · ${practiceName}`:''}</span>}</div>}
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
  return <div className="row-difficulty-metrics">{['easy','medium','hard'].map(bucket => {
    const value = goal.difficulty[bucket];
    const target = typeof value === 'number' ? value : value.target;
    const credited = typeof value === 'number' ? goal.creditedByDifficulty[bucket] : value.credited;
    const label = bucket[0].toUpperCase()+bucket.slice(1);
    return <div className={`row-difficulty row-difficulty-${bucket}`} key={bucket} title={`${name} · ${label}: ${credited} / ${target} goal credits`}><div><strong>{label}</strong><span>{credited}/{target}</span></div><div className="row-difficulty-track" role="img" aria-label={`${name}: ${credited} of ${target} ${bucket} goal credits`}><span style={{width:`${target ? percent(100*credited/target) : 0}%`}} /></div></div>;
  })}</div>;
}

function PriorityMetric({ item, priorityItem, name }) {
  return <div className="pattern-retention"><div className="pattern-retention-label"><strong>{priorityItem.slug === 'other' ? 'Needs classification' : 'Practice priority'}</strong></div>{priorityItem.slug!=='other'&&<PriorityBar item={priorityItem} name={name} />}<small>{item.assessed ? `Practice strength ${Math.round(percent(item.strength))}%` : item.distinctSolved > 0 ? 'Retention undated' : 'Retention not assessed'} · {item.datedDistinctSolved} practiced · {item.legacyDistinctSolved} prior solves</small></div>;
}

export default function PatternMetrics({ item, priorityItem = item, goal, name, goalConfigured }) {
  return <div className="pattern-metrics"><PriorityMetric item={item} priorityItem={priorityItem} name={name} /><DifficultyMetrics goal={goal} name={name} goalConfigured={goalConfigured} /></div>;
}
