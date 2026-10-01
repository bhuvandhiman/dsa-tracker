import PatternOverview, { DifficultyBar } from './PatternOverview.jsx';
import PatternMetrics, { NextAction, RetentionMetric } from './PatternMetrics.jsx';
import SubpatternProblems from './SubpatternProblems.jsx';
import { useEffect, useState } from 'react';
import { request } from './api.js';
import { patternLink } from './navigation.js';
import { filterPatterns, prioritizedPatterns } from './dashboard-model.js';

function GoalForm({ goal, onSaved }) {
  const [profile, setProfile] = useState(goal.profile || 'interview');
  const [target, setTarget] = useState(goal.target || 300);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  async function save(event) {
    event.preventDefault();
    setSaving(true); setMessage('');
    try {
      await request('/goal', { method:'PUT', body:JSON.stringify({profile,target}) });
      setMessage('Goal saved. Your practice history is unchanged.'); onSaved();
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  }
  return <details className="goal-settings"><summary>{goal.configured ? 'Adjust your goal' : 'Choose your coverage goal'}</summary><form onSubmit={save}><label>Focus<select value={profile} disabled={saving} onChange={event => setProfile(event.target.value)}><option value="interview">Interview Focused</option><option value="deep">Deep Understanding</option></select></label><label>Target<select value={target} disabled={saving} onChange={event => setTarget(Number(event.target.value))}>{[300,500,1000].map(value => <option key={value} value={value}>{value} problems</option>)}</select></label><button className="primary-button" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save goal'}</button><p className="goal-note">Targets account for pattern and difficulty balance. Extra solves in one area do not fill gaps elsewhere.</p><p className="form-message" role="status">{message}</p></form></details>;
}

function PatternRow({ category, goalConfigured, query, rank }) {
  return <a className={`pattern-row ${rank === 1 ? 'is-next' : ''}`} href={patternLink(category.slug,query)} aria-label={`Priority ${rank}: Open ${category.name} subpatterns${rank === 1 ? '. Next recommended pattern' : ''}`}>
    <div className="pattern-row-heading"><span className="pattern-icon" aria-hidden="true">{String(rank).padStart(2,'0')}</span><div><h3>{category.name}</h3><p>{category.goal?.deficit > 0 ? `${category.goal.deficit} credits to close this gap · ` : ''}{category.children.length} subpatterns</p></div></div>
    <PatternMetrics item={category.summary} goal={category.goal} name={category.name} goalConfigured={goalConfigured} />
    <NextAction next={rank === 1} />
  </a>;
}

function PatternDetail({ category, goalConfigured, query }) {
  const children = prioritizedPatterns(category.children);
  const coverageGoal = {categories:children.filter(child => child.goal).map(child => ({
    slug:child.slug, name:child.name,
    difficulty:Object.fromEntries(['easy','medium','hard'].map(bucket => [bucket,{target:child.goal.difficulty[bucket],credited:child.goal.creditedByDifficulty[bucket]}])),
  }))};
  return <div className="pattern-detail">
    <a className="secondary-button back-link" href={patternLink(null,query)}>← All patterns</a>
    <div className="detail-summary-grid">
      <section className="retention-tracker detail-retention" aria-label={`${category.name} retention`}><p className="eyebrow">Keep what you learn</p><h2>Pattern retention.</h2><RetentionMetric item={category.summary} name={category.name} prominent /><p className="detail-retention-reason">{category.summary.reason}</p></section>
      <section className="detail-coverage" aria-label={`${category.name} difficulty coverage`}><p className="eyebrow">Build balanced coverage</p><h2>Coverage by difficulty.</h2>{category.goal ? <><div className="difficulty-coverage-list">{['easy','medium','hard'].map(bucket => <DifficultyBar key={bucket} goal={coverageGoal} bucket={bucket} />)}</div><p className="coverage-help">Each segment is a subpattern. Hover, tap, or focus to see its progress.</p></> : <p className="data-note">{goalConfigured ? 'Outside the coverage goal.' : 'Choose a coverage goal on the dashboard.'}</p>}</section>
    </div>
    <div className="section-heading"><h2>Subpatterns</h2><span className="data-note">{children.length} approaches</span></div>
    <div className="subpattern-list">{children.map((child,index) => <SubpatternProblems key={child.slug} slug={child.slug} name={child.name} next={index === 0 && category.slug !== 'other'}><div className="subpattern-row-heading"><span className="pattern-icon" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div><h3>{child.name}</h3><p>{child.distinctSolved} distinct {child.distinctSolved === 1 ? 'solve' : 'solves'}{child.goal?.deficit > 0 ? ` · ${child.goal.deficit} credits remaining` : ''}</p></div></div><PatternMetrics item={child} goal={child.goal} name={`${category.name}, ${child.name}`} goalConfigured={goalConfigured} /></SubpatternProblems>)}</div>
  </div>;
}
export default function LiveDashboard({ route }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState(route.query);
  const [loading, setLoading] = useState(true);
  function refresh() { setLoading(true); setRevision(value => value + 1); }
  useEffect(() => {
    const controller = new AbortController();
    let poll;
    request('/retention', {signal:controller.signal}).then(result => {
      if (!Array.isArray(result.categories)) throw new Error('The dashboard response is incomplete. Please refresh.');
      setData(result); setError('');
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); }).finally(() => {
      if (!controller.signal.aborted) { setLoading(false); poll = setTimeout(() => {if (!document.hidden) setRevision(value => value + 1);}, 45000); }
    });
    function visible() { if (!document.hidden) setRevision(value => value + 1); }
    document.addEventListener('visibilitychange', visible);
    return () => { controller.abort(); clearTimeout(poll); document.removeEventListener('visibilitychange', visible); };
  }, [revision]);
  const categories = data ? filterPatterns(prioritizedPatterns(data.categories), query) : [];
  const isDashboard = route.page === 'dashboard';
  const selected = data?.categories.find(category => category.slug === route.slug);
  return <section className={`patterns-section live-dashboard ${isDashboard ? 'dashboard-overview' : 'pattern-browser'}`} aria-labelledby="live-title" aria-busy={loading}>
    <div className="section-heading live-heading"><div><p className="eyebrow">{isDashboard ? 'Your patterns. Your progress.' : 'Explore your patterns'}</p>{isDashboard ? <h1 id="live-title">Know your patterns.<br />Keep them fresh.</h1> : <h1 id="live-title">{route.slug ? selected?.name || 'Pattern details' : 'Patterns.'}</h1>}{!isDashboard && !route.slug && <p className="page-description">Build your coverage. Keep what you learn.</p>}</div><button className="secondary-button" type="button" disabled={loading} onClick={refresh}>{loading ? 'Refreshing…' : 'Refresh practice'}</button></div>
    {error && <div className="dashboard-message error-message" role="alert"><h3>Practice could not be updated.</h3><p>{error}</p>{data && <p>Showing the last successful snapshot.</p>}<button className="secondary-button" onClick={refresh} disabled={loading}>Try again</button></div>}
    {!data && !error && <p className="dashboard-message" role="status">Loading your patterns and practice…</p>}
    {data && <>
      {isDashboard ? <>
        <PatternOverview data={data} />
        <GoalForm key={`${data.goal.profile}-${data.goal.target}`} goal={data.goal} onSaved={refresh} />
        {data.goal.unknownDifficulty > 0 && <p className="data-note">{data.goal.unknownDifficulty} solved problems have unknown difficulty and cannot receive goal credit yet.</p>}
      </> : <>
        {!data.goal.configured && <p className="data-note"><a className="inline-link" href="#/dashboard">Choose a coverage goal on your dashboard.</a></p>}
        {route.slug ? selected ? <PatternDetail category={selected} goalConfigured={data.goal.configured} query={query || route.query} /> : <div className="dashboard-message"><h3>Pattern not found.</h3><a className="secondary-button" href="#/patterns">Return to patterns</a></div> : <>
          {!data.categories.some(category => category.summary.distinctSolved > 0) && <div className="dashboard-message"><h3>Your journey starts here.</h3><p>Import accepted problems or record practice through the extension. Your patterns will update here.</p></div>}
          <div className="pattern-toolbar"><label className="pattern-search">Search patterns<input type="search" placeholder="Try trees, prefix sums, or knapsack…" value={query} onChange={event => setQuery(event.target.value)} /></label><p>{categories.length} / {data.categories.length} patterns<br /><span>{data.goal.configured ? '' : 'Choose a goal to reveal coverage gaps'}</span></p></div>
          {categories.length ? <div className="pattern-list">{categories.map(category => <PatternRow category={category} goalConfigured={data.goal.configured} query={query} rank={data.categories.findIndex(item => item.slug === category.slug)+1} key={category.slug} />)}</div> : <div className="dashboard-message" role="status"><h3>No matching patterns.</h3><p>Try a category or subpattern name.</p><button className="secondary-button" onClick={() => setQuery('')}>Clear search</button></div>}
        </>}
      </>}
      <p className="data-note">Updated {new Intl.DateTimeFormat('en-IN',{timeZone:data.timeZone || 'Asia/Calcutta',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(data.asOf))} · {data.timeZone || 'Asia/Calcutta'}.</p>
    </>}
  </section>;
}
