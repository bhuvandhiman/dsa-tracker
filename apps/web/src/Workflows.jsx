import { useEffect, useRef, useState } from 'react';
import { useWorkspaceRequest } from './workspace-context.js';
import { backupSummary } from './workflow-model.js';
import AccountControls from './AccountControls.jsx';

function useResource(path) {
  const request=useWorkspaceRequest();
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
  },[path,revision,request]);
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

function Pagination({offset,count,more,onChange}) {
  return <div className="pagination"><button className="secondary-button" disabled={offset === 0} onClick={()=>onChange(Math.max(0,offset-25))}>← Previous</button><span>{count ? `${offset+1}–${offset+count}` : 'No records'}</span><button className="secondary-button" disabled={!more} onClick={()=>onChange(offset+25)}>Next →</button></div>;
}

function RemovedRecording({attempt,onChanged}) {
  const request=useWorkspaceRequest();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  async function restore() {
    setBusy(true);setError('');
    try {await request(`/attempts/${attempt.id}/restore`,{method:'POST',body:JSON.stringify({revision:attempt.revision})});onChanged('Recording restored.');}
    catch(failure) {setError(failure.message);}
    finally {setBusy(false);}
  }
  return <article className="record-row"><div className="record-heading"><div><h3>{attempt.problem?.title || 'Practice recording'}</h3><p>{dateLabel(attempt.attemptedAt)} · {({independent:'Independent',hint:'Used a hint',solution:'Used a solution',unknown:'Assistance unknown'})[attempt.assistance]}</p></div><button disabled={busy} className="secondary-button" onClick={restore}>{busy ? 'Restoring…' : 'Restore recording'}</button></div>{attempt.notes && <p className="record-notes">{attempt.notes}</p>}{error && <p role="alert">{error}</p>}</article>;
}

function Settings() {
  const request=useWorkspaceRequest();
  const ready = useResource('/ready');
  const [offset,setOffset] = useState(0);
  const removed = useResource(`/attempts/removed?limit=25&offset=${offset}`);
  const [backup,setBackup] = useState(null);
  const [summary,setSummary] = useState(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [recoveryMessage,setRecoveryMessage] = useState('');
  const fileInput = useRef(null);
  function clearBackup() {setBackup(null);setSummary(null);if(fileInput.current)fileInput.current.value='';}
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
    catch(error) {if(fileInput.current)fileInput.current.value='';setMessage(error instanceof SyntaxError ? 'This file is not valid JSON.' : error.message);}
  }
  async function restore() {
    setBusy(true);setMessage('');
    try {const result=await request('/workspace/restore',{method:'POST',body:JSON.stringify(backup)});setMessage(`Backup restored: ${result.records} records processed.`);clearBackup();ready.reload();removed.reload();}
    catch(error) {setMessage(error.message);}
    finally {setBusy(false);}
  }
  return <><p className="eyebrow">Make room for your practice</p><h1>Workspace.</h1><p className="page-description">Your learning space, safely in your hands.</p><div className="workspace-grid"><ResourceState resource={ready} />{ready.data && <section className="workspace-panel"><h2>Your workspace</h2><dl><dt>Storage</dt><dd>{ready.data.storage}</dd><dt>LeetCode account</dt><dd>{ready.data.account || 'No account connected'}</dd><dt>Practice time zone</dt><dd>{ready.data.timeZone}</dd></dl><p className="data-note">Manage your coverage goal on the dashboard.</p></section>}<section className="workspace-panel"><h2>Backup & restore</h2><p>Keep a copy of your problems, practice, notes, and goal.</p><button className="secondary-button" disabled={busy} onClick={download}>{busy ? 'Working…' : 'Download backup'}</button><label className="file-label">Choose a Recall JSON backup<input ref={fileInput} disabled={busy} type="file" accept=".json,application/json" onChange={selectFile} /></label>{summary && <div className="restore-preview"><h3>Review your backup</h3><p>{summary.problems} problems · {summary.attempts} recordings · {summary.records} total records</p><p>Restore adds missing records. Existing records must match exactly; differing records cause the restore to fail without changes. Use an empty workspace when restoring a different snapshot.</p><div className="row-actions"><button disabled={busy} className="primary-button" onClick={restore}>{busy ? 'Restoring…' : 'Restore this backup'}</button><button disabled={busy} className="secondary-button" onClick={clearBackup}>Cancel</button></div></div>}<p role="status" className="form-message">{message}</p></section><section className="workspace-panel workspace-recovery"><h2>Removed recordings</h2><p className="data-note">Recover a recording to include it in your practice again.</p><ResourceState resource={removed} />{removed.data && <><div className="record-list">{removed.data.attempts.map(attempt=><RemovedRecording key={`${attempt.id}-${attempt.revision}`} attempt={attempt} onChanged={text=>{setRecoveryMessage(text);removed.reload();}} />)}</div>{!removed.data.attempts.length && <p>Nothing to recover. Removed recordings will appear here.</p>}{(removed.data.attempts.length > 0 || offset > 0) && <Pagination offset={offset} count={removed.data.attempts.length} more={removed.data.attempts.length === 25} onChange={setOffset} />}</>}<p role="status" className="form-message">{recoveryMessage}</p></section></div></>;
}

export default function Workflows({auth}) {
  return <section className="workflow-page"><section className="connection-banner"><div><p className="eyebrow">LeetCode connection</p><h2>Bring your practice together.</h2><p>Check your extension, import solves, or resume an interrupted import.</p></div><a className="primary-button" href="#/connect">Manage connection →</a></section><Settings />{auth?.user&&<AccountControls auth={auth} />}</section>;
}
