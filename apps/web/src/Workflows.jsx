import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspaceRequest } from './workspace-context.js';
import { backupSummary, readRemovedRecordings } from './workflow-model.js';
import { createBackupFileReader } from './backup-file-reader.js';
import { formatPracticeDate, PRACTICE_TIME_ZONE_LABEL } from './date-format.js';
import AccountControls from './AccountControls.jsx';
import { backupFileText } from '../../shared/backup-limits.js';

const readResource = (request,path,options) => request(path,options);
const emptyBackup = {fileName:'',reading:false,value:null,summary:null,error:''};

function useResource(path,load=readResource) {
  const request=useWorkspaceRequest();
  const [state,setState] = useState({path:null,data:null,error:'',loading:true});
  const [revision,setRevision] = useState(0);
  const inFlight = useRef(null);
  const queuedReload = useRef(null);
  useEffect(()=>{
    const controller = new AbortController();
    const job = {path,controller};
    inFlight.current = job;
    load(request,path,{signal:controller.signal}).then(data=>{
      if (!controller.signal.aborted) setState({path,data,error:'',loading:false});
    }).catch(error=>{
      if (!controller.signal.aborted) setState(previous=>({path,data:previous.path===path?previous.data:null,error:error.message,loading:false}));
    }).finally(()=>{
      if(inFlight.current!==job)return;
      inFlight.current=null;
      if(queuedReload.current===path&&!controller.signal.aborted){
        queuedReload.current=null;inFlight.current={path};
        setState(previous=>({...previous,error:'',loading:true}));
        setRevision(value=>value+1);
      }
    });
    return ()=>{controller.abort();if(inFlight.current===job)inFlight.current=null;if(queuedReload.current===path)queuedReload.current=null;};
  },[path,revision,request,load]);
  const reload = useCallback(()=>{
    if(inFlight.current?.path===path){queuedReload.current=path;return;}
    inFlight.current={path};
    setState(previous=>({path,data:previous.path===path?previous.data:null,error:'',loading:true}));
    setRevision(value=>value+1);
  },[path]);
  return {...(state.path === path ? state : {data:null,error:'',loading:true}),reload};
}

function ResourceState({resource}) {
  if (resource.loading) return <p className="dashboard-message" role="status">{resource.data?'Updating…':'Loading settings…'}</p>;
  if (resource.error) return <div className="dashboard-message error-message" role="alert"><p>{resource.error}</p><button className="secondary-button" onClick={resource.reload}>Try again</button></div>;
  return null;
}

function Pagination({offset,count,more,onChange,disabled}) {
  return <div className="pagination"><button className="secondary-button" disabled={disabled||offset === 0} onClick={()=>onChange(Math.max(0,offset-25))}>← Previous</button><span>{count ? `${offset+1}–${offset+count}` : 'No records'}</span><button className="secondary-button" disabled={disabled||!more} onClick={()=>onChange(offset+25)}>Next →</button></div>;
}

function RemovedRecording({attempt,onRestore,busy,disabled,error}) {
  return <article className="record-row"><div className="record-heading"><div><h3>{attempt.problem?.title || 'Practice recording'}</h3><p>{formatPracticeDate(attempt.attemptedAt)} IST · {({independent:'Independent',hint:'Used a hint',solution:'Used a solution',unknown:'Assistance unknown'})[attempt.assistance]}</p></div><button disabled={disabled} className="secondary-button" onClick={()=>onRestore(attempt)}>{busy ? 'Restoring…' : 'Restore recording'}</button></div>{attempt.notes && <p className="record-notes">{attempt.notes}</p>}{error && <p role="alert">{error}</p>}</article>;
}

function Settings() {
  const request=useWorkspaceRequest();
  const ready = useResource('/ready');
  const [offset,setOffset] = useState(0);
  const removed = useResource(`/attempts/removed?limit=25&offset=${offset}`,readRemovedRecordings);
  const [backup,setBackup] = useState(emptyBackup);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [recoveryMessage,setRecoveryMessage] = useState('');
  const [restoring,setRestoring] = useState(null);
  const [restoreError,setRestoreError] = useState({id:null,message:''});
  const fileInput = useRef(null);
  const reader = useRef(createBackupFileReader());
  const validatedBackup = useRef(null);
  const working = useRef(false),restoringId = useRef(null);
  useEffect(()=>{const selection=reader.current;return()=>selection.cancel();},[]);
  function clearBackup() {reader.current.cancel();validatedBackup.current=null;setBackup(emptyBackup);if(fileInput.current)fileInput.current.value='';}
  async function download() {
    if(working.current)return;
    working.current=true;setBusy(true);setMessage('');
    try {const data=await request('/workspace/backup',{timeoutMs:60000});backupSummary(data);const url=URL.createObjectURL(new Blob([backupFileText(data)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`recall-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Practice backup downloaded.');}
    catch(error) {setMessage(error.message);}
    finally {working.current=false;setBusy(false);}
  }
  async function selectFile(event) {
    const file=event.target.files?.[0];
    validatedBackup.current=null;
    setMessage('');
    if(!file){clearBackup();return;}
    setBackup({...emptyBackup,fileName:file.name,reading:true});
    const selection=await reader.current.read(file);
    if(selection){validatedBackup.current=selection.value;setBackup(selection);if(selection.error&&fileInput.current)fileInput.current.value='';}
  }
  async function restore() {
    if(working.current||backup.reading||!backup.value||!backup.summary||backup.value!==validatedBackup.current)return;
    working.current=true;setBusy(true);setMessage('');
    try {const result=await request('/workspace/restore',{method:'POST',body:JSON.stringify(backup.value),timeoutMs:60000});setMessage(`Backup restored: ${result.records} records processed.`);clearBackup();ready.reload();removed.reload();}
    catch(error) {setMessage(error.message);}
    finally {working.current=false;setBusy(false);}
  }
  async function restoreRecording(attempt) {
    if(restoringId.current||removed.loading)return;
    restoringId.current=attempt.id;setRestoring(attempt.id);setRestoreError({id:null,message:''});setRecoveryMessage('');
    try {
      await request(`/attempts/${attempt.id}/restore`,{method:'POST',body:JSON.stringify({revision:attempt.revision})});
      setRecoveryMessage('Recording restored.');
      const pageOffset=removed.data.offset;
      if(removed.data.attempts.length===1&&pageOffset>0)setOffset(pageOffset-25);
      else removed.reload();
    } catch(failure) {setRestoreError({id:attempt.id,message:failure.message});}
    finally {restoringId.current=null;setRestoring(null);}
  }
  return <><h1>Settings.</h1><div className="workspace-grid"><ResourceState resource={ready} />{ready.data && <section className="workspace-panel"><h2>Your workspace</h2><dl><dt>Storage</dt><dd>{ready.data.storage}</dd><dt>LeetCode account</dt><dd>{ready.data.account || 'No account connected'}</dd><dt>Practice time zone</dt><dd>{PRACTICE_TIME_ZONE_LABEL}</dd></dl><p className="data-note">Manage your coverage goal on the dashboard.</p></section>}<section className="workspace-panel"><h2>Practice backup & restore</h2><p>Back up your problems, practice, notes, and goal. This file can be restored in Recall.</p><button className="secondary-button" disabled={busy} onClick={download}>{busy ? 'Working…' : 'Download practice backup'}</button><label className="file-label">Choose a Recall JSON backup<input ref={fileInput} disabled={busy} type="file" accept=".json,application/json" onChange={selectFile} /></label>{backup.fileName&&<p className="data-note">Selected file: {backup.fileName}</p>}{backup.reading&&<p role="status">Reading and checking your backup…</p>}{backup.error&&<p role="alert">{backup.error}</p>}{backup.summary && <div className="restore-preview"><h3>Review your backup</h3><p>{backup.summary.problems} problems · {backup.summary.attempts} recordings · {backup.summary.records} total records</p><p>Restore adds missing records. Existing records must match exactly; differing records cause the restore to fail without changes. Use an empty workspace when restoring a different snapshot.</p><div className="row-actions"><button disabled={busy||backup.reading} className="primary-button" onClick={restore}>{busy ? 'Restoring…' : 'Restore this backup'}</button><button disabled={busy} className="secondary-button" onClick={clearBackup}>Cancel</button></div></div>}<p role="status" className="form-message">{message}</p></section><section className="workspace-panel workspace-recovery"><h2>Removed recordings</h2><p className="data-note">Recover a recording to include it in your practice again. Dates use {PRACTICE_TIME_ZONE_LABEL}.</p><ResourceState resource={removed} />{removed.data && <><div className="record-list">{removed.data.attempts.map(attempt=><RemovedRecording key={`${attempt.id}-${attempt.revision}`} attempt={attempt} onRestore={restoreRecording} busy={restoring===attempt.id} disabled={removed.loading||Boolean(restoring)} error={restoreError.id===attempt.id?restoreError.message:''} />)}</div>{!removed.data.attempts.length && <p>Nothing to recover. Removed recordings will appear here.</p>}{(removed.data.attempts.length > 0 || removed.data.offset > 0) && <Pagination offset={removed.data.offset} count={removed.data.attempts.length} more={removed.data.hasMore} disabled={removed.loading||Boolean(restoring)} onChange={setOffset} />}</>}<p role="status" className="form-message">{recoveryMessage}</p></section></div></>;
}

export default function Workflows({auth}) {
  return <section className="workflow-page"><section className="connection-banner"><div><p className="eyebrow">LeetCode connection</p><h2>Bring your practice together.</h2><p>Check your extension, import solves, or resume an interrupted import.</p></div><a className="primary-button" href="#/connect">Manage connection →</a></section><Settings />{auth?.user&&<AccountControls auth={auth} />}</section>;
}
