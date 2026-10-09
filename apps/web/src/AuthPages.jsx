import { useEffect, useRef, useState } from 'react';
import { authRedirect } from './auth-client.js';
import { accountDestination } from './auth-navigation.js';
import {authFeedback,signupOutcome,requireSignedIn,rememberAuthEmail,readAuthEmail,clearAuthEmail} from './auth-feedback.js';
import './accounts.css';


const content={signup:{eyebrow:'Your next chapter',title:'Build it.\nKeep it.',description:'Turn your solved problems into a clearer picture of what you know—and what to practice next.',form:'Create your account.',intro:'A little setup. A clearer direction.'},login:{eyebrow:'Welcome back',title:'Pick up\nwhere you left off.',description:'Your patterns, your progress, your next step. Bring your practice back into focus.',form:'Good to see you.',intro:'Sign in to your Recall workspace.'},'forgot-password':{eyebrow:'Back on track',title:'A fresh start.\nSame progress.',description:'Reset your password and return to the patterns you have been building.',form:'Forgot your password?',intro:'We’ll send you a link to choose a new one.'},'reset-password':{eyebrow:'One last step',title:'Make room\nfor what’s next.',description:'Choose a new password, then get back to your learning space.',form:'Choose a new password.',intro:'Use a password you don’t use elsewhere.'}};

export default function AuthPages({page,auth}){
  const [email,setEmail]=useState(readAuthEmail),[password,setPassword]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[verification,setVerification]=useState(false),[existing,setExisting]=useState(false),[unconfirmed,setUnconfirmed]=useState(false),[cooldown,setCooldown]=useState(0);
  const pending=useRef(false),resultHeading=useRef(null),emailField=useRef(null),feedbackWasVisible=useRef(false);
  const copy=content[page],signup=page==='signup',forgot=page==='forgot-password',reset=page==='reset-password',enabled=Boolean(auth.client)&&(!reset||Boolean(auth.sessionUser));
  useEffect(()=>{clearAuthEmail();},[]);
  useEffect(()=>{const visible=verification||existing;if(visible)resultHeading.current?.focus();else if(feedbackWasVisible.current)emailField.current?.focus();feedbackWasVisible.current=visible;},[verification,existing]);
  useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(value=>Math.max(0,value-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
  function clearFeedback(){setError('');setMessage('');setUnconfirmed(false);}
  function changeEmail(){if(pending.current)return;setVerification(false);setExisting(false);setPassword('');clearFeedback();}
  function rememberEmail(){rememberAuthEmail(email);}
  async function run(action){
    if(!enabled||pending.current)return;pending.current=true;setBusy(true);setError('');setMessage('');
    try{await action();}catch(e){const feedback=authFeedback(e);setError(feedback.message);if(feedback.unconfirmed)setUnconfirmed(true);if(feedback.cooldown)setCooldown(feedback.cooldown);}finally{pending.current=false;setBusy(false);}
  }
  async function resend(){
    if(cooldown||pending.current)return;
    await run(async()=>{const {error}=await auth.client.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:authRedirect()}});if(error)throw error;setCooldown(60);setMessage('If this email still needs confirmation, a new link is on its way. Check your inbox and spam folder.');});
  }
  async function submit(event){
    event.preventDefault();if(!enabled||busy)return;
    await run(async()=>{
      let result;
      if(forgot){result=await auth.client.auth.resetPasswordForEmail(email.trim(),{redirectTo:authRedirect('recovery')});if(result.error)throw result.error;setMessage('If an account exists for this email, a reset link is on its way. Open it in this browser.');return;}
      if(reset){result=await auth.client.auth.updateUser({password});if(result.error)throw result.error;setPassword('');setMessage('Password updated.');const account=await auth.refresh();window.location.hash=accountDestination(account.setup);return;}
      if(signup){
        result=await auth.client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:authRedirect()}});
        const outcome=signupOutcome(result);setPassword('');
        if(outcome==='existing'){setExisting(true);setMessage('An account with this email already exists. Log in to continue, or reset your password.');return;}
        if(outcome!=='signed-in'){setVerification(true);setCooldown(60);setMessage(outcome==='confirmation'?'Check your inbox and spam folder to confirm your email. Open the link in this browser to go straight to your dashboard.':'If this email needs confirmation, check your inbox and spam folder. Already confirmed your account? Log in instead.');return;}
      }
      else {result=await auth.client.auth.signInWithPassword({email:email.trim(),password});requireSignedIn(result);setPassword('');setUnconfirmed(false);}
      await auth.refresh();
    });
  }
  return <div className="account-split">
    <section className="account-story" aria-label="Your learning with Recall"><p className="eyebrow public-eyebrow"><span />{copy.eyebrow}</p><h1>{copy.title.split('\n').map((line,index)=><span className={index===1?'account-title-accent':''} key={line}>{line}</span>)}</h1><p>{copy.description}</p><div className="account-illustration" aria-hidden="true"><div className="account-pattern"><span>01</span><strong>Your next pattern</strong><span>↗</span></div><div className="account-example-bar"><i /><i /></div><div className="account-example-tags"><span>Experience</span><span>Recent practice</span></div><p>Small sessions. Lasting foundations.</p></div></section>
    <section className="account-form-panel" aria-labelledby="account-form-title"><a className="account-back" href="#/home">← Back to Recall</a><h2 id="account-form-title" ref={resultHeading} tabIndex={-1}>{existing?'You already have an account.':verification?'Confirm your email.':copy.form}</h2><p className="account-intro">{existing?'Your workspace is waiting for you.':verification?'Confirm your email to open your workspace.':copy.intro}</p>
      {!auth.loading&&auth.config?.mode==='local'&&<p className="account-notice">This installation uses a local workspace. <a className="inline-link" href="#/dashboard">Open your workspace</a>.</p>}
      {!auth.loading&&!auth.error&&auth.config?.mode==='supabase'&&!auth.config.configured&&<p className="account-notice">Sign-in is temporarily unavailable. Please try again shortly.</p>}
      {auth.error&&<div className="account-notice" role="alert">{auth.error} <button className="text-button" onClick={auth.retry}>Retry connection</button></div>}
      {reset&&auth.config?.configured&&!auth.sessionUser&&<p className="account-notice">Open the password-reset link from your email in the browser where you requested it.</p>}
      {!verification&&!existing&&<form className="account-form" onSubmit={submit}>
        {!reset&&<label htmlFor="account-email">Email address<input ref={emailField} id="account-email" type="email" autoComplete="email" placeholder="you@example.com" required value={email} disabled={busy} onChange={e=>{setEmail(e.target.value);clearFeedback();}} /></label>}
        {!forgot&&<div className="account-password-field"><label htmlFor="account-password">{reset?'New password':'Password'}</label><div className="password-input"><input id="account-password" aria-describedby={signup||reset?'account-password-help':undefined} type={show?'text':'password'} autoComplete={signup||reset?'new-password':'current-password'} minLength={signup||reset?8:undefined} required value={password} disabled={busy} onChange={e=>{setPassword(e.target.value);clearFeedback();}} /><button type="button" aria-label={show?'Hide password':'Show password'} aria-pressed={show} onClick={()=>setShow(value=>!value)}>{show?'Hide':'Show'}</button></div>{(signup||reset)&&<small id="account-password-help">At least 8 characters.</small>}</div>}
        {!signup&&!forgot&&!reset&&<a className="account-forgot" href="#/forgot-password" onClick={rememberEmail}>Forgot password?</a>}
        <button className="primary-button" disabled={!enabled||busy}>{busy?'Please wait…':signup?'Create account':forgot?'Send reset link':reset?'Save new password':'Log in'}<span aria-hidden="true">→</span></button>
      </form>}
      {existing&&<><p className="account-email-sent">{email.trim()}</p><div className="row-actions"><a className="primary-button" href="#/login" onClick={rememberEmail}>Log in →</a><a className="inline-link" href="#/forgot-password" onClick={rememberEmail}>Reset password</a></div></>}
      {(verification||unconfirmed)&&<>{verification&&<p className="account-email-sent">{email.trim()}</p>}<button className="secondary-button" disabled={!enabled||busy||cooldown>0} onClick={resend}>{busy?'Please wait…':cooldown>0?`Resend available in ${cooldown}s`:'Resend confirmation'}</button></>}
      {(verification||existing)&&<button className="text-button account-change-email" disabled={busy} onClick={changeEmail}>Use a different email</button>}
      <p className="account-status" role="status">{message}</p><p className="account-error" role="alert">{error}</p>
      <p className="account-switch">{forgot||reset?<a href="#/login" onClick={rememberEmail}>Back to log in</a>:signup?<>Already have an account? <a href="#/login" onClick={rememberEmail}>Log in</a></>:<>New to Recall? <a href="#/signup" onClick={rememberEmail}>Create an account</a></>}</p><p className="account-footnote">Your Recall account is separate from LeetCode. <a className="inline-link" href="/privacy">Privacy & data</a></p>
    </section>
  </div>;
}
