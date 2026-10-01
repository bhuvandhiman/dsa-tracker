import PatternMenu from './PatternMenu.jsx';
import { useEffect, useState } from 'react';
import { request } from './api.js';
import { backupSummary, correctionPayload, localDateTime, safeProblemUrl } from './workflow-model.js';

function useResource(path) {
  const [state,setState] = useState({path:null,data:null,error:'',loading:true});
  const [revision,setRevision] = useState(0);
  useEffect(()=>{
    const controller = new AbortController();
    request(path,{signal:controller.signal}).then(data=>{
      if (!controller.signal.aborted) setState({path,data,error:'',loading:false});
    }).catch(error=>{
      if (!controller.signal.aborted) setState({path,data:null,error:error.message,loading:false});
    });
    return ()=>controller.abort();
  },[path,revision]);
  return {...(state.path === path ? state : {data:null,error:'',loading:true}),reload:()=>setRevision(value=>value+1)};
}

function ResourceState({resource}) {
  if (resource.loading) return <p className="dashboard-message" role="status">Loading your workspace…</p>;
  if (resource.error) return <div className="dashboard-message error-message" role="alert"><p>{resource.error}</p><button className="secondary-button" onClick={resource.reload}>Try again</button></div>;
  return null;
}

function dateLabel(value) {
  return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Calcutta',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
}

function ExternalProblem({problem}) {
  const url = safeProblemUrl(problem.url);
  return url ? <a className="inline-link" href={url} target="_blank" rel="noopener noreferrer">Open on LeetCode ↗</a> : null;
}

function Pagination({offset,count,more,onChange}) {
  return <div className="pagination"><button className="secondary-button" disabled={offset === 0} onClick={()=>onChange(Math.max(0,offset-25))}>← Previous</button><span>{count ? `${offset+1}–${offset+count}` : 'No records'}</span><button className="secondary-button" disabled={!more} onClick={()=>onChange(offset+25)}>Next →</button></div>;
}

function TopicSelection({patterns,value,onChange}) {
  return <fieldset className="topic-selection"><legend>Patterns used</legend><div>{patterns.map(pattern=><label key={pattern.slug}><input type="checkbox" checked={value.includes(pattern.slug)} onChange={event=>onChange(event.target.checked ? [...value,pattern.slug] : value.filter(slug=>slug!==pattern.slug))} />{pattern.name}</label>)}</div></fieldset>;
}

function AttemptEditor({attempt,patterns,units,onSaved,onCancel}) {
  const [fields,setFields] = useState({assistance:attempt.assistance,notes:attempt.notes || '',patternSlugs:attempt.patternSlugs || [],attemptedAt:localDateTime(attempt.attemptedAt),practiceUnit:attempt.practiceUnit || ''});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  function field(key,value) {setFields(old=>({...old,[key]:value}));}
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {await request(`/attempts/${attempt.id}`,{method:'PUT',body:JSON.stringify(correctionPayload(attempt,fields))});onSaved('Practice corrected.');}
    catch(failure) {setError(failure.message);}
    finally {setBusy(false);}
  }
  return <form className="workflow-form" onSubmit={save}><fieldset disabled={busy}><legend>Edit practice</legend><div className="form-grid"><label>Assistance<select value={fields.assistance} onChange={event=>field('assistance',event.target.value)}><option value="independent">Independent</option><option value="hint">Used a hint</option><option value="solution">Used a solution</option></select></label><label>Practice date · your local time<input type="datetime-local" step="0.001" required value={fields.attemptedAt} onChange={event=>field('attemptedAt',event.target.value)} /></label>{units.length > 0 && <label>Approach<select value={fields.practiceUnit} onChange={event=>field('practiceUnit',event.target.value)}><option value="">Keep current approach</option>{units.map(unit=><option key={unit.slug} value={unit.slug}>{unit.categoryName ? `${unit.categoryName} / ${unit.name}` : unit.name}</option>)}</select></label>}</div><TopicSelection patterns={patterns} value={fields.patternSlugs} onChange={value=>field('patternSlugs',value)} /><label>Notes<textarea maxLength={5000} rows={3} value={fields.notes} onChange={event=>field('notes',event.target.value)} /></label><div className="row-actions"><button className="primary-button" type="submit">{busy ? 'Saving…' : 'Save correction'}</button><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button></div></fieldset>{error && <p role="alert" className="form-message">{error}</p>}</form>;
}

function AttemptRow({attempt,patterns,units=[],onChanged,removed=false,canExpand=true}) {
  const [expanded,setExpanded] = useState(false);
  const [editing,setEditing] = useState(false);
  const [confirming,setConfirming] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  async function mutate() {
    setBusy(true); setMessage('');
    try {
      await request(`/attempts/${attempt.id}${removed ? '/restore' : ''}`,{method:removed ? 'POST' : 'DELETE',body:JSON.stringify({revision:attempt.revision})});
      onChanged(removed ? 'Recording restored.' : 'Recording removed. You can recover it in Workspace.');
    } catch(error) {setMessage(error.message);}
    finally {setBusy(false);}
  }
  return <article className="record-row"><div className="record-heading"><div><h3>{attempt.problem ? <>{canExpand && !removed ? <button className="inline-link text-button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{attempt.problem.title} {expanded ? "▴" : "▾"}</button> : attempt.problem.title}</> : 'Practice recording'}</h3><p>{dateLabel(attempt.attemptedAt)} · {({independent:'Independent',hint:'Used a hint',solution:'Used a solution',unknown:'Assistance unknown'})[attempt.assistance]}</p><p>{attempt.imported ? 'Imported submission · read only' : `${attempt.captureSource === 'accepted' ? 'Accepted capture' : 'Recorded practice'} · ${attempt.approachSource === 'confirmed' ? 'Confirmed approach' : 'Inferred approach'}`}</p></div>{!attempt.imported && <div className="row-actions">{removed ? <button disabled={busy} className="secondary-button" onClick={mutate}>{busy ? 'Restoring…' : 'Restore recording'}</button> : <><button disabled={busy || !patterns.length} className="secondary-button" onClick={()=>{setEditing(true);setConfirming(false);}}>Edit</button><button disabled={busy} className="secondary-button" onClick={()=>{setConfirming(true);setEditing(false);}}>Remove</button></>}</div>}</div>{attempt.notes && <p className="record-notes">{attempt.notes}</p>}{confirming && <div className="removal-confirm"><p>Remove this recording from your active practice? It will remain recoverable in Workspace.</p><div className="row-actions"><button disabled={busy} className="secondary-button" onClick={mutate}>{busy ? 'Removing…' : 'Remove recording'}</button><button disabled={busy} className="secondary-button" onClick={()=>setConfirming(false)}>Cancel</button></div></div>}{editing && <AttemptEditor attempt={attempt} patterns={patterns} units={units} onCancel={()=>setEditing(false)} onSaved={text=>{setEditing(false);onChanged(text);}} />}{message && <p role="alert">{message}</p>}{expanded && canExpand && attempt.problem && <ProblemNotebook problemId={attempt.problem.id} onChanged={()=>onChanged("Problem notebook updated.")} />}</article>;
}

export function ProblemNotebook({problemId,onChanged}) {
  const [offset,setOffset] = useState(0);
  const resource = useResource(`/problems/${encodeURIComponent(problemId)}/history?limit=25&offset=${offset}`);
  const patterns = useResource('/patterns');
  const [message,setMessage] = useState('');
  function changed(text) {setMessage(text);resource.reload();onChanged?.();}
  return <section className="problem-notebook"><ResourceState resource={resource} />{resource.data && <><div className="section-heading"><div><p className="eyebrow">Problem notebook</p><h4>{resource.data.problem.title}</h4><p className="data-note">{resource.data.problem.difficulty || 'Difficulty unknown'} · Dates displayed in Asia/Calcutta</p></div><div className="row-actions"><ExternalProblem problem={resource.data.problem} /><PatternMenu problem={resource.data.problem} onSaved={()=>changed("Pattern updated.")} /></div></div>{resource.data.legacy && <p className="data-note">This problem also has an undated historical solve. It counts as experience, without an invented practice date.</p>}<ResourceState resource={patterns} /><h4>Practice history</h4><p className="form-message" role="status">{message}</p><div className="record-list">{resource.data.attempts.map(attempt=><AttemptRow key={`${attempt.id}-${attempt.revision}`} attempt={attempt} patterns={patterns.data?.patterns || []} units={resource.data.units} onChanged={changed} canExpand={false} />)}</div>{!resource.data.attempts.length && <p className="dashboard-message">No dated recordings yet. Record your next practice with the extension.</p>}<Pagination offset={offset} count={resource.data.attempts.length} more={resource.data.more} onChange={setOffset} /></>}</section>;
}

function History() {
  const [offset,setOffset] = useState(0);

  const patterns = useResource('/patterns');
  const units = useResource('/retention');
  const [query,setQuery] = useState('');
  const [assistance,setAssistance] = useState('');
  const resource = useResource(`/attempts?${new URLSearchParams({limit:'25',offset:String(offset),q:query,assistance})}`);
  const [message,setMessage] = useState('');
  const rows = resource.data?.attempts || [];
  const filtered = rows;
  return <><p className="eyebrow">Every practice has a story</p><h1>History.</h1><p className="data-note">Your recorded practice, newest first. Imported submissions appear in each problem’s history.</p><div className="filter-bar"><label>Search practice<input type="search" maxLength={200} value={query} onChange={event=>{setQuery(event.target.value);setOffset(0);}} placeholder="Problem title or notes" /></label><label>Assistance<select value={assistance} onChange={event=>{setAssistance(event.target.value);setOffset(0);}}><option value="">All assistance</option><option value="independent">Independent</option><option value="hint">Used a hint</option><option value="solution">Used a solution</option></select></label></div><ResourceState resource={resource} /><ResourceState resource={patterns} /><p className="form-message" role="status">{message}</p>{resource.data && <><div className="record-list">{filtered.map(attempt=><AttemptRow key={`${attempt.id}-${attempt.revision}`} attempt={attempt} patterns={patterns.data?.patterns || []} units={units.data?.categories.flatMap(category=>category.children.map(child=>({...child,categoryName:category.name}))) || []} onChanged={text=>{setMessage(text);resource.reload();}} />)}</div>{!filtered.length && <p className="dashboard-message">{query || assistance ? 'No matching practice. Clear filters or try another search.' : 'No practice recordings on this page.'}</p>}<Pagination offset={offset} count={rows.length} more={rows.length === 25} onChange={setOffset} /></>}</>;
}

function Settings() {
  const ready = useResource('/ready');
  const [offset,setOffset] = useState(0);
  const removed = useResource(`/attempts/removed?limit=25&offset=${offset}`);
  const [backup,setBackup] = useState(null);
  const [summary,setSummary] = useState(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  async function download() {
    setBusy(true);setMessage('');
    try {const data=await request('/workspace/backup');const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`recall-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Backup downloaded.');}
    catch(error) {setMessage(error.message);}
    finally {setBusy(false);}
  }
  async function selectFile(event) {
    setBackup(null);setSummary(null);setMessage('');
    const file=event.target.files?.[0];if(!file)return;
    try {if(file.size>10*1024*1024)throw new Error('Choose a backup smaller than 10 MB.');const value=JSON.parse(await file.text());const preview=backupSummary(value);setBackup(value);setSummary(preview);}
    catch(error) {setMessage(error instanceof SyntaxError ? 'This file is not valid JSON.' : error.message);}
  }
  async function restore() {
    setBusy(true);setMessage('');
    try {const result=await request('/workspace/restore',{method:'POST',body:JSON.stringify(backup)});setMessage(`Backup restored: ${result.records} records processed.`);setBackup(null);setSummary(null);ready.reload();removed.reload();}
    catch(error) {setMessage(error.message);}
    finally {setBusy(false);}
  }
  return <><p className="eyebrow">Make room for your practice</p><h1>Workspace.</h1><ResourceState resource={ready} />{ready.data && <section className="workspace-panel"><h2>Your workspace</h2><dl><dt>Storage</dt><dd>{ready.data.storage}</dd><dt>LeetCode account</dt><dd>{ready.data.account || 'No account connected'}</dd><dt>Practice time zone</dt><dd>{ready.data.timeZone}</dd></dl><p className="data-note">Use the moon / sun in the header for appearance. Adjust your practice goal on the dashboard.</p></section>}<section className="workspace-panel"><h2>Backup & restore</h2><p>Keep a copy of your problems, practice, notes, and goal.</p><button className="secondary-button" disabled={busy} onClick={download}>{busy ? 'Working…' : 'Download backup'}</button><label className="file-label">Choose a Recall JSON backup<input disabled={busy} type="file" accept=".json,application/json" onChange={selectFile} /></label>{summary && <div className="restore-preview"><h3>Review your backup</h3><p>{summary.problems} problems · {summary.attempts} recordings · {summary.records} total records</p><p>Restore adds missing records. Existing records must match exactly; differing records cause the restore to fail without changes. Use an empty workspace when restoring a different snapshot.</p><div className="row-actions"><button disabled={busy} className="primary-button" onClick={restore}>{busy ? 'Restoring…' : 'Restore this backup'}</button><button disabled={busy} className="secondary-button" onClick={()=>{setBackup(null);setSummary(null);}}>Cancel</button></div></div>}<p role="status" className="form-message">{message}</p></section><section className="workspace-panel"><h2>Removed recordings</h2><p className="data-note">Recover a recording to include it in your practice again.</p><ResourceState resource={removed} />{removed.data && <><div className="record-list">{removed.data.attempts.map(attempt=><AttemptRow key={`${attempt.id}-${attempt.revision}`} attempt={attempt} patterns={[]} removed onChanged={text=>{setMessage(text);removed.reload();}} />)}</div>{!removed.data.attempts.length && <p>No removed recordings on this page.</p>}<Pagination offset={offset} count={removed.data.attempts.length} more={removed.data.attempts.length === 25} onChange={setOffset} /></>}</section></>;
}

export default function Workflows({route}) {
  return <section className="workflow-page">{route.page === 'history' ? <History /> : <Settings />}</section>;
}
