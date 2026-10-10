import { useRef,useState } from 'react';
import { useWorkspaceRequest } from './workspace-context.js';
import { installationLink } from './installation-model.js';
import { accountDestination } from './auth-navigation.js';
import { practiceCache } from './practice-cache.js';
import './accounts.css';
import ProfileForm from './ProfileForm.jsx';
import {hasProfileName} from '../../shared/profile.js';

export function Installation({auth,embedded=false}){
  const config=auth.config?.installation||{},store=installationLink(config.storeUrl,{store:true}),video=installationLink(config.videoUrl),download=installationLink(config.downloadUrl)||'/downloads/recall-extension.zip';
  const steps=store?[['Add Recall to Chrome','Open the store link and choose Add to Chrome.'],['Return to Recall','Refresh this website tab to connect your login.']]:[['Download and extract','Extract the ZIP into a folder you will keep.'],['Open Chrome Extensions','Enter chrome://extensions in the address bar and turn on Developer mode.'],['Load unpacked','Choose Load unpacked and select the extracted folder containing manifest.json.'],['Return to this tab','Refresh Recall to connect your website login. No second password is needed.']];
  return <section className="installation-page" aria-labelledby="install-title">
    <div className="installation-heading"><div><p className="eyebrow">Desktop Chrome · Same profile as LeetCode</p>{embedded?<h2 id="install-title">Install Recall.</h2>:<h1 id="install-title">Bring Recall<br /><span>to your browser.</span></h1>}<p className="page-description">Record practice after an accepted submission. On mobile? Return here on your computer when ready.</p></div><a className="primary-button" href={store||download} {...(store?{target:'_blank',rel:'noopener noreferrer'}:{download:'recall-extension.zip'})}>{store?'Add to Chrome':'Download extension'} ↗</a></div>
    <div className={'installation-body '+(video?'':'installation-without-video')}>{video&&<div className="installation-video"><video controls preload="metadata" src={video}><a href={video}>Watch the installation walkthrough</a></video></div>}<div className="installation-instructions"><ol>{steps.map(([title,description],index)=><li key={title}><span>{index+1}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol><p className="installation-note">{store?'Chrome updates the extension automatically.':'Keep the extracted folder. To update, replace its files and click Reload in Chrome Extensions.'} Refresh Recall and LeetCode after an update.</p></div></div>
    {!embedded&&<div className="installation-footer"><p>Connection and import progress are available together on Recall.</p><a className="primary-button" href="#/connect">Check connection →</a><a className="inline-link" href={auth.user?'#/dashboard':'#/signup'}>{auth.user?'Set up later':'Create account'}</a></div>}
  </section>;
}

export default function Onboarding({auth}){
  const request=useWorkspaceRequest();
  const [step,setStep]=useState(()=>hasProfileName(auth.user?.name)?'goal':'profile');
  const heading=useRef(null);
  const [profile,setProfile]=useState(auth.setup?.goal?.profile||'interview'),[target,setTarget]=useState(auth.setup?.goal?.target||300),[busy,setBusy]=useState(false),[error,setError]=useState('');
  function showStep(next){setStep(next);requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));}
  async function saveProfile(name){
    const {user}=await request('/account/profile',{method:'PUT',body:JSON.stringify({name})});
    auth.applyProfile(user);
    if(auth.setup?.goal?.configured)window.location.hash=accountDestination({...auth.setup,profileConfigured:true});
    else showStep('goal');
  }
  async function save(){setBusy(true);setError('');try{await request('/setup',{method:'PUT',body:JSON.stringify({profile,target,completed:true})});const account=await auth.refresh();practiceCache.clear();window.location.hash=accountDestination(account.setup);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <section className="goal-onboarding" aria-labelledby="setup-title">
    {!auth.setup?.goal?.configured&&<ol className="profile-setup-steps" aria-label="Your setup"><li aria-current={step==='profile'?'step':undefined}><span>1</span>Your profile</li><li aria-current={step==='goal'?'step':undefined}><span>2</span>Practice goal</li></ol>}
    {step==='profile'?<>
      <p className="eyebrow">Your name. Your practice. Your space.</p><h1 id="setup-title" ref={heading} tabIndex={-1}>Make Recall<br /><span>yours.</span></h1>
      <p className="page-description">Start with your profile so your learning space feels like home.</p>
      <ProfileForm user={auth.user} onSave={saveProfile} submitLabel={auth.setup?.goal?.configured?'Open my workspace →':'Continue to my goal →'} />
    </>:<>
    <p className="eyebrow">{auth.user.name?`Your next step, ${auth.user.name}`:'A starting point, not a commitment'}</p><h1 id="setup-title" ref={heading} tabIndex={-1}>What are you<br /><span>working toward?</span></h1>
    <p className="page-description">Choose your focus and coverage target to organize your patterns. Connect LeetCode whenever you are ready.</p>
    <form onSubmit={event=>{event.preventDefault();if(!busy)void save();}}>
      <fieldset disabled={busy}><legend>Preparation mode</legend>{[['interview','Interview focused','Give interview-relevant patterns more emphasis.','↗'],['deep','Deep understanding','Build a broader foundation across patterns.','✳']].map(([value,title,description,symbol])=><label className={'setup-mode-option '+(profile===value?'setup-mode-selected':'')} key={value}><input type="radio" name="profile" value={value} checked={profile===value} onChange={()=>setProfile(value)} /><span><strong>{title}</strong><span>{description}</span></span><i aria-hidden="true">{symbol}</i></label>)}</fieldset>
      <label className="setup-target" htmlFor="setup-target">Balanced coverage target<select id="setup-target" value={target} disabled={busy} onChange={e=>setTarget(Number(e.target.value))}>{[300,500,1000].map(value=><option key={value} value={value}>{value} problems</option>)}</select><small>A target across patterns and difficulty, not a daily quota. Change it later on your dashboard.</small></label>
      <div className="row-actions"><button className="primary-button" disabled={busy}>{busy?'Saving…':'Open my workspace'} →</button><button type="button" className="text-button inline-link" disabled={busy} onClick={()=>showStep('profile')}>Back to profile</button></div>
    </form><p className="account-error" role="alert">{error}</p></>}
  </section>;
}
