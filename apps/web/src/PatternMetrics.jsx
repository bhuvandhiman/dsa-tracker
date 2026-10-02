import { percent, priorityProgress } from './dashboard-model.js';

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
  const progress = priorityProgress(priorityItem);
  return <div className="pattern-retention"><div className="pattern-retention-label"><strong>{priorityItem.slug === 'other' ? 'Needs classification' : 'Estimated readiness'}</strong><span>{progress === null ? '—' : `${Math.round(progress)}%`}</span></div>{progress !== null && <div className="pattern-retention-track" role="img" aria-label={`${name}: ${Math.round(progress)}% estimated readiness.`}><span style={{width:`${progress}%`}} /></div>}<small>{item.assessed ? `Practice strength ${Math.round(percent(item.strength))}%` : item.distinctSolved > 0 ? 'Retention undated' : 'Retention not assessed'} · {item.datedDistinctSolved} practiced · {item.legacyDistinctSolved} prior solves</small></div>;
}

export default function PatternMetrics({ item, priorityItem = item, goal, name, goalConfigured }) {
  return <div className="pattern-metrics"><PriorityMetric item={item} priorityItem={priorityItem} name={name} /><DifficultyMetrics goal={goal} name={name} goalConfigured={goalConfigured} /></div>;
}
