import { useEffect, useState } from 'react';
import { request } from './api.js';
import { patternLink } from './navigation.js';
import { evidenceLabel, filterPatterns, orderedPatterns, percent } from './dashboard-model.js';

function Metrics({ item, goal, name, goalConfigured }) {
  return <div className="live-metrics">
    <div className="coverage-metric"><span className="coverage-ring" role="img" aria-label={goal ? `${name}: ${Math.round(percent(goal.coverage))}% goal coverage` : `${name}: ${goalConfigured ? 'outside the coverage goal' : 'no goal configured'}`} style={{ '--coverage': `${percent(goal?.coverage)}%` }}><span>{goal ? `${Math.round(percent(goal.coverage))}%` : '—'}</span></span><div><strong>Goal coverage</strong><small>{goal ? `${goal.credited} / ${goal.target} credited` : goalConfigured ? 'Outside the coverage goal' : 'Choose a coverage goal'}</small></div></div>
    <div className="strength-metric"><div><strong>{evidenceLabel(item)}</strong><span>{item.distinctSolved > 0 ? `${Math.round(percent(item.displayStrength))}%` : '—'}</span></div><progress max="100" value={percent(item.displayStrength)} aria-label={`${name}: ${evidenceLabel(item)}`} /><small>{item.assessed ? `Last practice: ${new Intl.DateTimeFormat('en-IN', {timeZone:'Asia/Calcutta', day:'numeric',month:'short',year:'numeric'}).format(new Date(item.lastPracticedAt))}` : item.distinctSolved > 0 ? 'Undated solves are not assessed retention.' : 'Record practice with the extension.'}</small></div>
  </div>;
}

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

function PatternRow({ category, goalConfigured, query }) {
  const color = ['coral','teal','mustard'][category.order % 3] || 'coral';
  return <a className={`pattern-row ${color}`} href={patternLink(category.slug,query)} aria-label={`Open ${category.name} subpatterns`}>
    <div className="pattern-row-heading"><span className="pattern-icon" aria-hidden="true">{['[ ]','↗','↻'][category.order % 3]}</span><div><h3>{category.name}</h3><p>{category.children.length} subpatterns · {category.summary.reason}</p></div></div>
    <Metrics item={category.summary} goal={category.goal} name={category.name} goalConfigured={goalConfigured} />
    <span className="row-arrow" aria-hidden="true">↗</span>
  </a>;
}

function PatternDetail({ category, view, goalConfigured, query }) {
  const children = orderedPatterns(category.children,view);
  return <div className="pattern-detail">
    <a className="secondary-button back-link" href={patternLink(null,query)}>← All patterns</a>
    <section className="detail-overview" aria-label={`${category.name} overview`}><p className="eyebrow">Pattern overview</p><h2>{category.name}</h2><p>{category.summary.reason}</p><Metrics item={category.summary} goal={category.goal} name={category.name} goalConfigured={goalConfigured} /></section>
    <div className="section-heading"><h2>Subpatterns</h2><span className="data-note">{children.length} approaches to explore</span></div>
    <div className="subpattern-list">{children.map(child => <section className="subpattern-row" key={child.slug}><div><h3>{child.name}</h3><p>{child.distinctSolved} distinct {child.distinctSolved === 1 ? 'solve' : 'solves'}</p><p>{child.reason}</p></div><Metrics item={child} goal={child.goal} name={`${category.name}, ${child.name}`} goalConfigured={goalConfigured} />{child.goal && <p className="difficulty-breakdown">{['easy','medium','hard'].map(bucket => `${bucket[0].toUpperCase()+bucket.slice(1)} ${child.goal.creditedByDifficulty[bucket]}/${child.goal.difficulty[bucket]}`).join(' · ')} credited</p>}</section>)}</div>
  </div>;
}
export default function LiveDashboard({ view, route }) {
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
  const categories = data ? filterPatterns(orderedPatterns(data.categories, view), query) : [];
  const dated = data?.categories.filter(category => category.summary.assessed).length || 0;
  const undated = data?.categories.filter(category => !category.summary.assessed && category.summary.distinctSolved > 0).length || 0;
  const isDashboard = route.page === 'dashboard';
  const selected = data?.categories.find(category => category.slug === route.slug);
  return <section className="patterns-section live-dashboard" aria-labelledby="live-title" aria-busy={loading}>
    <div className="section-heading"><div><p className="eyebrow">{isDashboard ? 'Your progress at a glance' : 'One idea at a time'}</p><h2 id="live-title">{isDashboard ? 'Your overview.' : route.slug ? 'Pattern details.' : 'Explore patterns.'}</h2></div><button className="secondary-button" type="button" disabled={loading} onClick={refresh}>{loading ? 'Refreshing…' : 'Refresh practice'}</button></div>
    {error && <div className="dashboard-message error-message" role="alert"><h3>Practice could not be updated.</h3><p>{error}</p>{data && <p>Showing the last successful snapshot.</p>}<button className="secondary-button" onClick={refresh} disabled={loading}>Try again</button></div>}
    {!data && !error && <p className="dashboard-message" role="status">Loading your patterns and practice…</p>}
    {data && <>
      {isDashboard ? <>
        <div className="overview-grid"><article><p className="eyebrow">Goal coverage</p><strong className="overview-value">{data.goal.configured ? `${Math.round(data.goal.coverage)}%` : 'Your next step'}</strong><p>{data.goal.configured ? `${data.goal.credited} / ${data.goal.target} credited · ${data.goal.profileName}` : 'Choose a goal to reveal coverage gaps.'}</p></article><article><p className="eyebrow">Dated retention</p><strong className="overview-value">{dated} <span>patterns</span></strong><p>Assessed from dated practice.</p></article><article><p className="eyebrow">Undated experience</p><strong className="overview-value">{undated} <span>patterns</span></strong><p>Previous solves without practice dates.</p></article></div>
        <GoalForm key={`${data.goal.profile}-${data.goal.target}`} goal={data.goal} onSaved={refresh} />
        {data.goal.unknownDifficulty > 0 && <p className="data-note">{data.goal.unknownDifficulty} solved problems have unknown difficulty and cannot receive goal credit yet.</p>}
        <a className="primary-button" href="#/patterns">Browse patterns →</a>
      </> : <>
        {!data.goal.configured && <p className="data-note"><a className="inline-link" href="#/dashboard">Choose a coverage goal on your dashboard.</a></p>}
        {route.slug ? selected ? <PatternDetail category={selected} view={view} goalConfigured={data.goal.configured} query={query || route.query} /> : <div className="dashboard-message"><h3>Pattern not found.</h3><a className="secondary-button" href="#/patterns">Return to patterns</a></div> : <>
          {!data.categories.some(category => category.summary.distinctSolved > 0) && <div className="dashboard-message"><h3>Your journey starts here.</h3><p>Import accepted problems or record practice through the extension. Your patterns will update here.</p></div>}
          <div className="pattern-toolbar"><label className="pattern-search">Search patterns<input type="search" placeholder="Try trees, prefix sums, or knapsack…" value={query} onChange={event => setQuery(event.target.value)} /></label><p>{categories.length} / {data.categories.length} patterns<br /><span>{view === 'coverage' ? data.goal.configured ? 'Largest remaining goal gaps first' : 'Catalog order until you choose a goal' : 'Dated: weakest first · Undated · Unpracticed'}</span></p></div>
          {categories.length ? <div className="pattern-list">{categories.map(category => <PatternRow category={category} goalConfigured={data.goal.configured} query={query} key={category.slug} />)}</div> : <div className="dashboard-message" role="status"><h3>No matching patterns.</h3><p>Try a category or subpattern name.</p><button className="secondary-button" onClick={() => setQuery('')}>Clear search</button></div>}
        </>}
      </>}
      <p className="data-note">Updated {new Intl.DateTimeFormat('en-IN',{timeZone:data.timeZone || 'Asia/Calcutta',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(data.asOf))} · {data.timeZone || 'Asia/Calcutta'}.</p>
    </>}
  </section>;
}
