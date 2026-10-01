import { useId, useState } from 'react';
import { difficultyCoverage, percent, priorityProgress, retentionOverview } from './dashboard-model.js';
import { patternLink } from './navigation.js';

export function DifficultyBar({ goal, bucket }) {
  const coverage = difficultyCoverage(goal, bucket);
  const [active, setActive] = useState(null);
  const tooltipId = useId();
  const label = bucket[0].toUpperCase() + bucket.slice(1);
  return <div className={`difficulty-coverage difficulty-coverage-${bucket}`} onKeyDown={event => { if (event.key === 'Escape') setActive(null); }}>
    <div className="difficulty-coverage-label"><strong>{label}</strong><span>{coverage.credited} <span className="data-note">/ {coverage.target} credited</span></span></div>
    <div className="pattern-segments" aria-label={`${label} coverage by pattern`} onMouseLeave={event => { if (!event.currentTarget.contains(document.activeElement)) setActive(null); }}>
      {coverage.patterns.map(pattern => <button type="button" key={pattern.slug} className="pattern-segment" style={{ flexGrow:pattern.target }} aria-label={`${pattern.name}: ${pattern.credited} of ${pattern.target} ${bucket} goal credits, ${Math.round(percent(100 * pattern.credited / pattern.target))}% complete`} aria-describedby={active?.slug === pattern.slug ? tooltipId : undefined} onMouseEnter={() => setActive(pattern)} onFocus={() => setActive(pattern)} onBlur={() => setActive(null)} onClick={() => setActive(pattern)}>
        <span style={{ width:`${percent(100 * pattern.credited / pattern.target)}%` }} />
      </button>)}
    </div>
    {active && <div className="coverage-tooltip" id={tooltipId} role="tooltip"><strong>{active.name} · {label}</strong><span>{active.credited} / {active.target} goal credits · {Math.round(percent(100 * active.credited / active.target))}% complete</span></div>}
  </div>;
}

export default function PatternOverview({ data }) {
  const retention = retentionOverview(data.categories);
  const priorities = data.categories.filter(item => item.slug !== 'other').slice(0,3);
  return <>
    <section className="retention-tracker" aria-labelledby="retention-title">
      <div className="retention-heading"><div><p className="eyebrow">Keep what you learn</p><h2 id="retention-title">Your pattern retention.</h2><p>Coverage builds your foundation. Repeat practice makes it stay.</p></div><div className="retention-score"><strong>{retention.score === null ? '—' : Math.round(retention.score)}<span>{retention.score === null ? '' : '%'}</span></strong><span>{retention.score === null ? 'Waiting for dated practice' : 'Average practice strength'}</span></div></div>
      <div className="retention-main-bar" role="progressbar" aria-label="Average pattern practice strength" aria-valuemin={0} aria-valuemax={100} aria-valuenow={retention.score === null ? undefined : Math.round(retention.score)} aria-valuetext={retention.score === null ? 'Not assessed: no dated pattern practice' : `${Math.round(retention.score)} percent, across ${retention.dated} dated patterns`}><span style={{ width:`${percent(retention.score)}%` }} /></div>
      <div className="retention-context"><span><strong>{retention.dated} / {retention.total}</strong> patterns with dated practice</span><span><strong>{retention.undated}</strong> patterns with undated experience</span></div>
      <details className="retention-explanation"><summary>What does this bar mean?</summary><p>An equal-weight average of the existing practice-strength scores for patterns with dated practice. Each score combines breadth, repeat work, and recency; recency fades over time. Patterns without dates are excluded, rather than treated as zero. This is a practice-strength estimate, not a tested recall percentage.</p></details>
      {retention.score === null && <p className="data-note">Record practice through the extension to start tracking retention. Imported solves still count toward coverage.</p>}
    </section>
    <div className="pattern-dashboard-grid">
      <section className="priority-patterns" aria-labelledby="priority-title"><div className="section-heading"><div><p className="eyebrow">Your next moves</p><h2 id="priority-title">Patterns to focus on.</h2></div><a className="inline-link" href={patternLink(null)}>All patterns ↗</a></div><p className="data-note">{data.goal.configured ? 'Coverage and retention, weighted for your chosen focus.' : 'Your practice priorities. Choose a goal to reveal coverage gaps.'}</p><div className="priority-pattern-list">{priorities.map((category,index) => <a className={`priority-pattern priority-pattern-${index}`} key={category.slug} href={patternLink(category.slug)}><span className="priority-number">#{index+1}</span><div className="priority-pattern-content"><div><h3>{category.name}</h3><strong>{priorityProgress(category) === null ? '—' : `${Math.round(priorityProgress(category))}%`}</strong></div><div className="priority-strength-bar" aria-hidden="true"><span style={{width:`${priorityProgress(category) ?? 0}%`}} /></div><p>Priority balance{category.summary.assessed ? ` · Retention ${Math.round(percent(category.summary.strength))}%` : ' · Retention undated'}{category.goal ? ` · ${category.goal.deficit} goal credits remaining` : ''}</p></div><span aria-hidden="true">↗</span></a>)}</div></section>
      <section className="pattern-coverage" aria-labelledby="coverage-title"><p className="eyebrow">Build balanced coverage</p><h2 id="coverage-title">Coverage by difficulty.</h2>{data.goal.configured ? <><p className="data-note">{data.goal.credited} / {data.goal.target} goal credits · {data.goal.profileName}</p><div className="difficulty-coverage-list">{['easy','medium','hard'].map(bucket => <DifficultyBar key={bucket} goal={data.goal} bucket={bucket} />)}</div><p className="coverage-help">Each segment is a pattern, sized by its target. Filled color shows completed goal credits. Hover, tap, or focus a segment for the pattern breakdown.</p></> : <p className="data-note">Choose a goal below to see Easy, Medium, and Hard coverage across your patterns.</p>}</section>
    </div>
  </>;
}
