import {useCallback,useEffect,useRef,useState} from 'react';
import {Installation} from './Onboarding.jsx';
import {importView} from '../../extension/src/import-view.js';
import './accounts.css';
import {practiceCache} from './practice-cache.js';

export default function Connection({auth,extension}){
  const [status,setStatus]=useState(null),[error,setError]=useState(''),[statusError,setStatusError]=useState(''),[busy,setBusy]=useState(false),[username,setUsername]=useState(''),[showInstall,setShowInstall]=useState(false);
  const {state,request}=extension,version=useRef(0);
  // Extension imports bypass the website API client. Refresh practice when
  // returning from this screen, retaining the previous snapshot while loading.
  useEffect(()=>{practiceCache.invalidate();},[]);
  const refresh=useCallback(async(shouldApply=()=>true)=>{
    const current=++version.current,result=await request('STATUS');
    if(current===version.current&&shouldApply())setStatus(result);
    return result;
  },[request]);
  useEffect(()=>{
    if(!state.detected||state.outdated||(!state.connected&&auth.config?.mode!=='local'))return;
    let active=true,timer;
    async function poll(){
      try{await refresh(()=>active);if(active)setStatusError('');}
      catch(failure){if(active)setStatusError(failure.message);}
      finally{if(active)timer=setTimeout(poll,1000);}
    }
    void poll();return()=>{active=false;clearTimeout(timer);};
  },[state.detected,state.connected,state.outdated,refresh,auth.config?.mode]);
  async function act(action){
    if(busy)return;setBusy(true);setError('');
    try{const result=await request(action);if(action==='CHECK_LEETCODE')setUsername(result.username);else await refresh();}
    catch(failure){setError(failure.message);}finally{setBusy(false);}
  }
  const connected=!state.outdated&&(state.connected||auth.config?.mode==='local')&&status?.connected;
  const view=importView(connected?status.import:undefined);
  return <section className="connection-page" aria-labelledby="connect-title">
    <a className="inline-link" href="#/dashboard">← Dashboard</a><p className="eyebrow">Your practice, connected</p><h1 id="connect-title">Connect LeetCode.</h1><p className="page-description">Connect once. Bring your LeetCode practice into this workspace.</p>
    <ol className="connection-steps">
      <li><span className={`connection-check ${state.detected&&!state.outdated?'is-complete':''}`} aria-hidden="true">{state.detected&&!state.outdated?'✓':'1'}</span><div><h2>Install the extension</h2><p>{state.outdated?'Update Recall to import here. Replace its files, reload it in Chrome Extensions, then refresh this tab.':state.detected?'Recall is detected in this browser.':'Use desktop Chrome, in the same profile as your LeetCode account. You can finish this later on your computer.'}</p>
        {(!state.detected||state.outdated)&&<><div className="row-actions"><button className="secondary-button" type="button" aria-expanded={showInstall} aria-controls="connection-installation" onClick={()=>setShowInstall(value=>!value)}>Installation steps <span aria-hidden="true">{showInstall?'↑':'↓'}</span></button><button className="text-button" onClick={()=>window.location.reload()}>Installed already? Refresh connection</button></div>
        {showInstall&&<div id="connection-installation" className="connection-installation" role="region" aria-label="Extension installation instructions"><Installation auth={auth} embedded /></div>}</>}
      </div></li>
      <li><span className={`connection-check ${connected?'is-complete':''}`} aria-hidden="true">{connected?'✓':'2'}</span><div><h2>Connect your Recall account</h2><p>{connected?'Connected. Your practice will go to this workspace.':state.outdated?'Update the extension to continue here.':state.detected?'Connecting your website login…':'Your website login connects automatically after installation and a page refresh.'}</p>{state.error&&<p role="alert">{state.error}</p>}{state.detected&&!connected&&<button className="secondary-button" onClick={()=>window.location.reload()}>Retry connection</button>}</div></li>
      <li><span className={`connection-check ${view.ready?'is-complete':''}`} aria-hidden="true">{view.ready?'✓':'3'}</span><div><h2>{view.ready?'Your patterns are ready':'Bring your previous solves'}</h2><p>Keep a signed-in LeetCode tab open in this Chrome profile. Start your import and follow its progress right here.</p><div className="row-actions"><a className="inline-link" href="https://leetcode.com/problemset/" target="_blank" rel="noopener noreferrer">Open LeetCode ↗</a><button className="text-button" disabled={!connected||busy||view.running} onClick={()=>act('CHECK_LEETCODE')}>Check LeetCode connection</button></div>
        {username&&<p role="status">LeetCode verified as {username}.</p>}
        <div className="connection-import-status" role="status" aria-live="polite"><p>{view.summary}</p>{view.phaseText&&<p>{view.phaseText}</p>}</div>
        {view.total>0&&<progress aria-label="Accepted problems saved" value={view.saved} max={view.total} />}
        {(error||statusError||view.error)&&<p className="account-error" role="alert">{error||statusError||view.error}</p>}
        <div className="row-actions"><button className={view.ready?'secondary-button':'primary-button'} disabled={!connected||busy||view.running} onClick={()=>act('START_IMPORT')}>{busy?'Please wait…':view.actionLabel}</button>
          {view.running&&<button className="secondary-button" disabled={busy||view.pausing} onClick={()=>act('PAUSE_IMPORT')}>{view.pausing?'Pausing…':'Pause import'}</button>}
          {view.complete&&<a className="primary-button" href="#/dashboard">View my patterns →</a>}
        </div><p className="data-note">Your progress is saved as problems are imported. Resume here if interrupted. Solves with unknown dates count toward experience and coverage; they do not establish retention.</p>
      </div></li>
    </ol>
    <a className="public-text-link" href="#/dashboard">{view.ready?'Return to dashboard':'Continue to my workspace; set up later'}</a>
  </section>;
}
