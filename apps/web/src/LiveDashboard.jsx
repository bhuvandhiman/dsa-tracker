import PatternOverview, { DifficultyBar } from './PatternOverview.jsx';
import NextPractice from './NextPractice.jsx';
import PatternMetrics, { FocusBadge, FocusLegend, NextAction, RetentionMetric } from './PatternMetrics.jsx';
import SubpatternProblems from './SubpatternProblems.jsx';
import { useEffect, useRef, useState } from 'react';
import { useWorkspaceRequest } from './workspace-context.js';
import { patternLink } from './navigation.js';
import { practiceCache } from './practice-cache.js';
import { classifiedSolves, filterPatterns, prioritizedPatterns, recommendationReason, difficultyProgress } from './dashboard-model.js';
import {formatPracticeDate,PRACTICE_TIME_ZONE_LABEL} from './date-format.js';

function GoalForm({ goal, onSaved, reveal }) {
  const request=useWorkspaceRequest();
  const [profile, setProfile] = useState(goal.profile || 'interview');
  const [target, setTarget] = useState(goal.target || 300);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const root=useRef(null);
  useEffect(()=>{
    if(!reveal)return;
    root.current.open=true;
    const frame=requestAnimationFrame(()=>{root.current?.scrollIntoView({block:'center'});root.current?.querySelector('select')?.focus({preventScroll:true});});
    return()=>cancelAnimationFrame(frame);
  },[reveal]);
  async function save(event) {
    event.preventDefault();
    if(saving)return;setSaving(true); setMessage('');
    try {
      await request('/goal', { method:'PUT', body:JSON.stringify({profile,target}) });
      setMessage('Goal saved. Your practice history is unchanged.'); onSaved();
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  }
  return <details ref={root} id="practice-goal" className="goal-settings"><summary>{goal.configured ? 'Adjust your goal' : 'Choose your coverage goal'}</summary><form onSubmit={save}><label>Focus<select value={profile} disabled={saving} onChange={event => setProfile(event.target.value)}><option value="interview">Interview Focused</option><option value="deep">Deep Understanding</option></select></label><label>Target<select value={target} disabled={saving} onChange={event => setTarget(Number(event.target.value))}>{[300,500,1000].map(value => <option key={value} value={value}>{value} problems</option>)}</select></label><button className="primary-button" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save goal'}</button><p className="goal-note">Targets account for pattern and difficulty balance. Extra solves in one area do not fill gaps elsewhere.</p><p className="form-message" role="status">{message}</p></form></details>;
}

function PracticeExplanation() {
  return <details className="priority-explanation"><summary>How progress works</summary><p>Pink shows experience; yellow adds dated recent practice and fades over time. Together they estimate practice strength. Unknown dates contribute experience, not assessed retention.</p><p>Solves count once in their primary pattern. Practice follows your recorded approach. Difficulty counts show actual solves against targets; extra solves do not fill gaps elsewhere.</p><p>Your focus and coverage gaps set the queue. Its next review needs 4 practice credits from at least 4 different problems in one subpattern: independent work earns 1, hints 0.5, reading a solution 0.2, unknown assistance 0. Revisits count; repeating one problem cannot meet the different-problem requirement. Completing this work or adding enough goal coverage lets the queue reassess, without guaranteeing a new rank.</p></details>;
}

function PatternRow({ category, goalConfigured, query, rank }) {
  return <a className={`pattern-row ${rank === 1 ? 'is-next' : ''}`} href={patternLink(category.slug,query)} aria-label={`Priority ${rank}: Open ${category.name} subpatterns${rank === 1 ? '. Next recommended pattern' : ''}`}>
    <div className="pattern-row-heading"><span className="pattern-icon" aria-hidden="true">{String(rank).padStart(2,'0')}</span><div><h3>{category.name} <FocusBadge item={category} /></h3><p>{classifiedSolves({...category.summary,goal:category.goal})??'—'} primary solves · {category.children.length} subpatterns</p><p className="recommendation-reason">{recommendationReason(category)}</p></div></div>
    <PatternMetrics item={category.summary} priorityItem={category} goal={category.goal} name={category.name} goalConfigured={goalConfigured} />
    <NextAction next={rank === 1} />
  </a>;
}

function PatternDetail({ category, goalConfigured, query, onChanged, refreshToken }) {
  const children = prioritizedPatterns(category.children);
  const coverageGoal = {categories:children.filter(child => child.goal).map(child => ({
    slug:child.slug, name:child.name,
    difficulty:Object.fromEntries(['easy','medium','hard'].map(bucket => [bucket,difficultyProgress(child.goal,bucket)])),
  }))};
  return <div className="pattern-detail">
    <a className="secondary-button back-link" href={patternLink(null,query)}>← All patterns</a>
    <div className="detail-summary-grid">
      <section className="retention-tracker detail-retention" aria-label={`${category.name} retention`}><p className="eyebrow">Keep what you learn</p><h2>Pattern retention.</h2><RetentionMetric item={category.summary} name={category.name} prominent /><p className="detail-retention-reason">{category.summary.reason}</p></section>
      <section className="detail-coverage" aria-label={`${category.name} difficulty coverage`}><p className="eyebrow">Build balanced coverage</p><h2>Coverage by difficulty.</h2>{category.goal ? <><div className="difficulty-coverage-list">{['easy','medium','hard'].map(bucket => <DifficultyBar key={bucket} goal={coverageGoal} bucket={bucket} />)}</div><p className="coverage-help">Each segment is a subpattern. Hover, tap, or focus to see its progress.</p></> : <p className="data-note">{goalConfigured ? 'Outside the coverage goal.' : 'Choose a coverage goal on the dashboard.'}</p>}</section>
    </div>
    <div className="section-heading"><h2>Subpatterns</h2><span className="data-note">{children.length} approaches</span></div>
    <div className="subpattern-list">{children.map((child,index) => <SubpatternProblems key={child.slug} slug={child.slug} name={child.name} onChanged={onChanged} refreshToken={refreshToken} next={index === 0 && category.slug !== 'other'}><div className="subpattern-row-heading"><span className="pattern-icon" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div><h3>{child.name} <FocusBadge item={child} /></h3><p>{classifiedSolves(child) ?? '—'} primary {classifiedSolves(child) === 1 ? 'solve' : 'solves'}</p><p className="recommendation-reason">{recommendationReason(child)}</p></div></div><PatternMetrics item={child} goal={child.goal} name={`${category.name}, ${child.name}`} goalConfigured={goalConfigured} /></SubpatternProblems>)}</div>
  </div>;
}
export default function LiveDashboard({ route }) {
  const request=useWorkspaceRequest();
  const [data, setData] = useState(()=>practiceCache.read());
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [searchState, setSearchState] = useState(null);
  const query=searchState?.route===route?searchState.value:route.query||'';
  const [loading, setLoading] = useState(()=>!practiceCache.read());
  const refreshing=useRef(false);
  function search(value) {
    setSearchState({route,value});
    window.history.replaceState(null,'',patternLink(null,value));
  }
  function refresh({changed=false}={}) { if(!changed&&(loading||refreshing.current))return;practiceCache.invalidate(); setLoading(true); setRevision(value => value + 1); }
  useEffect(() => {
    const controller = new AbortController();
    // Opening Dashboard refreshes once. Pattern navigation shares the snapshot;
    // confirmed extension writes and explicit actions request another read.
    refreshing.current=true;
    Promise.resolve().then(()=>{
      if(controller.signal.aborted)return;
      setLoading(true);
      return practiceCache.load(()=>request('/retention'),{force:route.page==='dashboard'});
    }).then(result => {
      if (!controller.signal.aborted) {setData(result); setError('');}
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); }).finally(() => {
      if (!controller.signal.aborted) {refreshing.current=false;setLoading(false);}
    });
    return () => {controller.abort();refreshing.current=false;};
  }, [revision,request,route.page]);
  useEffect(()=>practiceCache.subscribe(()=>{setLoading(true);setRevision(value=>value+1);}),[]);
  const categories = data ? filterPatterns(prioritizedPatterns(data.categories), query) : [];
  const isDashboard = route.page === 'dashboard';
  const selected = data?.categories.find(category => category.slug === route.slug);
  return <section className={`patterns-section live-dashboard ${isDashboard ? 'dashboard-overview' : 'pattern-browser'}`} aria-labelledby="live-title" aria-busy={loading}>
    <div className="section-heading live-heading"><div>{isDashboard&&<p className="eyebrow">Your patterns. Your progress.</p>}{isDashboard ? <h1 id="live-title">Know your patterns.<br />Keep them fresh.</h1> : <h1 id="live-title">{route.slug ? selected?.name || 'Pattern details' : 'Patterns.'}</h1>}</div><button className="secondary-button" type="button" disabled={loading} onClick={refresh}>{loading ? 'Updating…' : 'Refresh practice'}</button></div>
    {loading&&data&&<p className="update-status" role="status">Updating practice…</p>}
    {error && <div className="dashboard-message error-message" role="alert"><h3>Practice could not be updated.</h3><p>{error}</p>{data && <p>Showing the last successful snapshot.</p>}<button className="secondary-button" onClick={refresh} disabled={loading}>Try again</button></div>}
    {!data && !error && <p className="dashboard-message" role="status">Loading your patterns and practice…</p>}
    {data && <>
      {!isDashboard && <div className="pattern-tools"><FocusLegend goal={data.goal} /><PracticeExplanation /></div>}
      {isDashboard ? <>
        {!data.categories.some(category=>category.summary.distinctSolved>0)&&<section className="connection-banner"><div><p className="eyebrow">Your first step</p><h2>Turn your solves into a plan.</h2><p>Connect LeetCode to organize your accepted problems and find your next pattern to practice.</p></div><div className="row-actions"><a className="primary-button" href="#/connect">Connect LeetCode →</a><a className="inline-link" href="#/patterns">Explore patterns</a></div></section>}
        {data.categories.some(category=>category.summary.distinctSolved>0)&&<div className="row-actions"><p className="data-note">Your solves are organized below. Start with your next recommended pattern.</p><a className="inline-link" href="#/connect">Connection & import</a></div>}
        <PatternOverview data={data} />
        {data.categories.some(category=>category.summary.distinctSolved>0)&&data.categories.some(category=>category.slug!=='other')&&<NextPractice category={prioritizedPatterns(data.categories).find(category=>category.slug!=='other')} />}
        <GoalForm key={`${data.goal.profile}-${data.goal.target}`} goal={data.goal} onSaved={()=>refresh({changed:true})} reveal={route.section==='goal'} />
        {data.goal.unknownDifficulty > 0 && <p className="data-note">{data.goal.unknownDifficulty} solved problems have unknown difficulty and cannot receive goal credit yet.</p>}
      </> : <>
        {!data.goal.configured && <p className="data-note"><a className="inline-link" href="#/dashboard">Choose a coverage goal on your dashboard.</a></p>}
        {route.slug ? selected ? <PatternDetail category={selected} goalConfigured={data.goal.configured} query={query} onChanged={()=>refresh({changed:true})} refreshToken={data} /> : <div className="dashboard-message"><h3>Pattern not found.</h3><a className="secondary-button" href="#/patterns">Return to patterns</a></div> : <>
          {!data.categories.some(category => category.summary.distinctSolved > 0) && <div className="dashboard-message"><h3>Your journey starts here.</h3><p>Import accepted problems or record practice through the extension. Your patterns will update here.</p></div>}
          <div className="pattern-toolbar"><label className="pattern-search"><span className="visually-hidden">Search patterns</span><input type="search" placeholder="Search patterns…" value={query} onChange={event => search(event.target.value)} /></label><p>{query?`${categories.length} / ${data.categories.length}`:categories.length} patterns</p></div>
          {categories.length ? <div className="pattern-list">{categories.map(category => <PatternRow category={category} goalConfigured={data.goal.configured} query={query} rank={data.categories.findIndex(item => item.slug === category.slug)+1} key={category.slug} />)}</div> : <div className="dashboard-message" role="status"><h3>No matching patterns.</h3><p>Try a category or subpattern name.</p><button className="secondary-button" onClick={() => search('')}>Clear search</button></div>}
        </>}
      </>}
      <p className="data-note">Updated {formatPracticeDate(data.asOf)} · {PRACTICE_TIME_ZONE_LABEL}.</p>
    </>}
  </section>;
}
