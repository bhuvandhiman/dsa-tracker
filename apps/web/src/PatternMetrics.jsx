import { percent, strengthBarModel, practiceEvidenceLabel, practiceReviewProgress, difficultyProgress } from './dashboard-model.js';
import {formatPracticeDate} from './date-format.js';

export function FocusBadge({item}) {
  const emphasis=item.emphasis;
  if(!emphasis)return null;
  return <span className={`focus-emphasis focus-emphasis-${emphasis.tier}`} aria-label={`${emphasis.label} for ${emphasis.profileName}`}>{emphasis.tier==='high'?'High':emphasis.tier==='medium'?'Medium':'Lower'} focus</span>;
}

export function FocusLegend({goal}) {
  return <div className="focus-legend" aria-label="Practice strength contributions">{goal.configured&&<strong>{goal.profileName}</strong>}<span className="priority-key priority-key-experience">Experience</span><span className="priority-key priority-key-recent">Recent practice</span></div>;
}

export function StrengthBar({item,name,showLegend=true}) {
  const model=strengthBarModel(item);
  if(!model)return <p className="data-note">Record practice to start tracking strength.</p>;
  const {score,experienceWidth,recentWidth,practice,assessed}=model;
  const unknownLabel=(item.summary||item).distinctSolved>0?'Dates unknown':'No dated practice';
  const practiceName=item.children?.find(unit=>unit.slug===practice?.unit)?.name||item.name||name;
  const review=practiceReviewProgress(practice);
  return <div className="strength-bar">
    <div className="strength-bar-heading"><strong>Practice strength</strong><span className={!assessed?'strength-bar-unknown':undefined}>{assessed?`${Math.round(score)}%`:unknownLabel}</span></div>
    {showLegend&&<div className="split-priority-labels"><span className="priority-key priority-key-experience">Experience</span><span className="priority-key priority-key-recent">Recent practice{!assessed?' · unassessed':''}</span></div>}
    <div className="split-priority-track" role="img" aria-label={`${name}: ${assessed?`${Math.round(score)}% estimated practice strength`:'experience only; retention unassessed because practice dates are unknown'}. Experience contributes ${experienceWidth.toFixed(1)} percentage points${assessed?`, recent practice contributes ${recentWidth.toFixed(1)} percentage points`:''}. This is not a tested recall percentage.`}><span className="split-priority-experience" style={{width:`${experienceWidth}%`}} /><span className="split-priority-recent" style={{width:`${recentWidth}%`}} /></div>
    {review&&<p className="practice-review" title="Independent work earns 1 credit, hints 0.5, reading a solution 0.2. A review requires enough credits from at least four different problems in one subpattern.">{review}{item.children?.length>1&&practice?.earned>0?` · ${practiceName}`:''}</p>}
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
    <small>{assessed ? `Last practice: ${formatPracticeDate(item.lastPracticedAt,{dateStyle:'medium'})}` : item.distinctSolved > 0 ? `${item.distinctSolved} previous solves · retention not assessed` : 'Record practice to begin tracking.'}</small>
  </div>;
}

export function DifficultyMetrics({ goal, name, goalConfigured }) {
  if (!goal) return <p className="data-note">{goalConfigured ? 'Outside the coverage goal' : 'Choose a coverage goal on the dashboard.'}</p>;
  return <div className="row-difficulty-metrics"><strong className="goal-coverage-label">Goal coverage</strong>{['easy','medium','hard'].map(bucket => {
    const {target,credited,actual,fill}=difficultyProgress(goal,bucket);
    const label = bucket[0].toUpperCase()+bucket.slice(1);
    return <div className={`row-difficulty row-difficulty-${bucket}`} key={bucket} title={`${name} · ${label}: ${actual} solved / ${target} target; ${credited} goal credits`}><div><strong>{label}</strong><span>{actual}/{target}</span></div><div className="row-difficulty-track" role="img" aria-label={`${name}: ${actual} ${bucket} problems solved, target ${target}; ${credited} goal credits, ${Math.round(fill)}% goal coverage`}><span style={{width:`${fill}%`}} /></div></div>;
  })}</div>;
}

function PriorityMetric({ item, priorityItem, name }) {
  return <div className="pattern-retention" title={practiceEvidenceLabel(item)}>{priorityItem.slug==='other'?<strong>Needs classification</strong>:<StrengthBar item={priorityItem} name={name} showLegend={false} />}</div>;
}

export default function PatternMetrics({ item, priorityItem = item, goal, name, goalConfigured }) {
  return <div className="pattern-metrics"><PriorityMetric item={item} priorityItem={priorityItem} name={name} /><DifficultyMetrics goal={goal} name={name} goalConfigured={goalConfigured} /></div>;
}
