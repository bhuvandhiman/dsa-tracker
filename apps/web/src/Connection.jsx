import { useEffect, useState } from 'react';
import { Installation } from './Onboarding.jsx';
import './accounts.css';

export default function Connection({auth,extension}){
  const [status,setStatus]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[username,setUsername]=useState('');
  const {state,request}=extension;
  useEffect(()=>{
    if(!state.detected||state.outdated||(!state.connected&&auth.config?.mode!=='local'))return;
    let active=true,timer;
    async function poll(){
      try{const result=await request('STATUS');if(active){setStatus(result);setError('');}}
      catch(failure){if(active){setStatus(null);setError(failure.message);}}
      finally{if(active)timer=setTimeout(poll,5000);}
    }
    void poll();return()=>{active=false;clearTimeout(timer);};
  },[state.detected,state.connected,state.outdated,request,auth.config?.mode]);
  async function act(action){setBusy(true);setError('');try{const result=await request(action);if(action==='CHECK_LEETCODE')setUsername(result.username);if(action==='STATUS')setStatus(result);}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  const connected=!state.outdated&&(state.connected||auth.config?.mode==='local')&&status?.connected;
  const progress=connected?status?.import:null;
  const complete=progress?.decision==='complete',ready=complete&&progress.datesComplete;
  const imported=progress?.saved==null?'Accepted problems':`${progress.saved} accepted problems`;
  const summary=ready?`${imported} imported. Available recent dates are included.`:complete?`${imported} are ready. Recent practice dates are still pending.`:progress?.total!==null&&progress?.total!==undefined?`${progress.saved} of ${progress.total} problems saved. You can resume if interrupted.`:'Import your accepted problems to organize your first personal pattern queue.';
  const phases={scanning:'Finding accepted problems…',metadata:'Reading topics and difficulty…',saving:'Organizing your patterns…',dates:'Checking available practice dates…',complete:'Import finished.',error:'Import needs attention.'};
  return <section className="connection-page" aria-labelledby="connect-title">
    <a className="inline-link" href="#/dashboard">← Dashboard</a><p className="eyebrow">Your practice, connected</p><h1 id="connect-title">Connect LeetCode.</h1><p className="page-description">Sign in to Recall once. The extension brings your LeetCode practice here.</p>
    <ol className="connection-steps">
      <li><span className={`connection-check ${state.detected?'is-complete':''}`} aria-hidden="true">{state.detected?'✓':'1'}</span><div><h2>Install the extension</h2><p>{state.outdated?'An older Recall extension is installed. Update its files, reload it in Chrome Extensions, then refresh this tab.':state.detected?'Recall is detected in this browser.':'Use desktop Chrome, in the same profile as your LeetCode account. You can finish this later on your computer.'}</p>{(!state.detected||state.outdated)&&<><button className="secondary-button" type="button" onClick={()=>{const guide=document.getElementById("installation");guide?.focus({preventScroll:true});guide?.scrollIntoView({block:"start"});}}>Installation steps ↓</button><button className="text-button" onClick={()=>window.location.reload()}>Installed already? Refresh connection</button></>}</div></li>
      <li><span className={`connection-check ${connected?'is-complete':''}`} aria-hidden="true">{connected?'✓':'2'}</span><div><h2>Connect your Recall account</h2><p>{connected?'Connected. Your practice will go to this workspace.':state.outdated?'Update the extension to use guided connection.':state.detected?'Connecting your website login…':'Your website login connects automatically after installation and a page refresh.'}</p>{state.error&&<p role="alert">{state.error}</p>}{state.detected&&!connected&&<button className="secondary-button" onClick={()=>window.location.reload()}>Retry connection</button>}</div></li>
      <li><span className={`connection-check ${ready?'is-complete':''}`} aria-hidden="true">{ready?'✓':'3'}</span><div><h2>{ready?'Your patterns are ready':'Bring your previous solves'}</h2><p>Keep a signed-in LeetCode tab open in this Chrome profile. Keep the import tab open while it works; progress appears here too.</p><div className="row-actions"><a className="inline-link" href="https://leetcode.com/problemset/" target="_blank" rel="noopener noreferrer">Open LeetCode ↗</a><button className="text-button" disabled={!connected||busy} onClick={()=>act('CHECK_LEETCODE')}>Check LeetCode connection</button></div>{username&&<p role="status">LeetCode verified as {username}. Import checks this account again before saving.</p>}<p role="status">{summary}</p>{progress?.phase&&<p role="status">{phases[progress.phase]||''}</p>}{progress?.total>0&&!complete&&<progress aria-label="Accepted problems saved" value={progress.saved} max={progress.total} />}<div className="row-actions"><button className={ready?'secondary-button':'primary-button'} disabled={!connected||busy} onClick={()=>act('OPEN_IMPORT')}>{busy?'Connecting…':ready?'Open import controls':progress?.saved||complete?'Resume import':'Import my solves'} <span aria-hidden="true">↗</span></button>{complete&&<a className="primary-button" href="#/dashboard">View my patterns →</a>}</div><p className="data-note">Solves with unknown dates count toward experience and coverage. They do not establish retention.</p></div></li>
    </ol>
    {(error||progress?.error)&&<p className="account-error" role="alert">{error||progress.error}</p>}
    {(!state.detected||state.outdated)&&<div id="installation" tabIndex={-1}><Installation auth={auth} embedded /></div>}
    <a className="public-text-link" href="#/dashboard">{ready?'Return to dashboard':'Continue to my workspace; set up later'}</a>
  </section>;
}
