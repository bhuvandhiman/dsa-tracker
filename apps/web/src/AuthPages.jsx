import { useState } from 'react';
import { authRedirect } from './auth-client.js';
import './accounts.css';

function GoogleMark(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"/><path fill="#34a853" d="M12 22c2.7 0 5-1 6.7-2.5l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.9-1.8-5.7-4.1H2.9v2.7A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.3 13.8a6 6 0 0 1 0-3.6V7.5H2.9a10 10 0 0 0 0 9l3.4-2.7Z"/><path fill="#ea4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 2.9 7.5l3.4 2.7A6 6 0 0 1 12 6.1Z"/></svg>;}

const content={signup:{eyebrow:'Your next chapter',title:'Build it.\nKeep it.',description:'Turn your solved problems into a clearer picture of what you know—and what to practice next.',form:'Create your account.',intro:'A little setup. A clearer direction.'},login:{eyebrow:'Welcome back',title:'Pick up\nwhere you left off.',description:'Your patterns, your progress, your next step. Bring your practice back into focus.',form:'Good to see you.',intro:'Sign in to your Recall workspace.'},'forgot-password':{eyebrow:'Back on track',title:'A fresh start.\nSame progress.',description:'Reset your password and return to the patterns you have been building.',form:'Forgot your password?',intro:'We’ll send you a link to choose a new one.'},'reset-password':{eyebrow:'One last step',title:'Make room\nfor what’s next.',description:'Choose a new password, then get back to your learning space.',form:'Choose a new password.',intro:'Use a password you don’t use elsewhere.'}};

export default function AuthPages({page,auth}){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[verification,setVerification]=useState(false);
  const copy=content[page],signup=page==='signup',forgot=page==='forgot-password',reset=page==='reset-password',enabled=Boolean(auth.client)&&(!reset||Boolean(auth.user));
  async function run(action){setBusy(true);setError('');setMessage('');try{await action();}catch(e){setError(e.message||'Something went wrong. Please try again.');}finally{setBusy(false);}}
  async function submit(event){
    event.preventDefault();if(!enabled||busy)return;
    await run(async()=>{
      let result;
      if(forgot){result=await auth.client.auth.resetPasswordForEmail(email.trim(),{redirectTo:authRedirect('recovery')});if(result.error)throw result.error;setMessage('If an account exists for this email, a reset link is on its way. Open it in this browser.');return;}
      if(reset){result=await auth.client.auth.updateUser({password});if(result.error)throw result.error;setPassword('');setMessage('Password updated.');window.location.hash='/dashboard';return;}
      if(signup){result=await auth.client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:authRedirect()}});if(result.error)throw result.error;setPassword('');if(!result.data.session){setVerification(true);setMessage('Check your inbox to confirm your email. Open the link in this browser, then continue setup.');return;}}
      else {result=await auth.client.auth.signInWithPassword({email:email.trim(),password});if(result.error)throw result.error;setPassword('');}
      const account=await auth.refresh();window.location.hash=account.setup.completed?'/dashboard':'/setup';
    });
  }
  return <div className="account-split">
    <section className="account-story" aria-label="Your learning with Recall"><p className="eyebrow public-eyebrow"><span />{copy.eyebrow}</p><h1>{copy.title.split('\n').map((line,index)=><span className={index===1?'account-title-accent':''} key={line}>{line}</span>)}</h1><p>{copy.description}</p><div className="account-illustration" aria-hidden="true"><div className="account-pattern"><span>01</span><strong>Your next pattern</strong><span>↗</span></div><div className="account-example-bar"><i /><i /></div><div className="account-example-tags"><span>Experience</span><span>Recent practice</span></div><p>Small sessions. Lasting foundations.</p></div></section>
    <section className="account-form-panel" aria-labelledby="account-form-title"><a className="account-back" href="#/home">← Back to Recall</a><h2 id="account-form-title">{verification?'Check your inbox.':copy.form}</h2><p className="account-intro">{verification?'Your account starts with a confirmed email.':copy.intro}</p>
      {!auth.loading&&!auth.config?.configured&&<p className="account-notice">Online sign-in is being connected. You can still <a className="inline-link" href="#/dashboard">open your local workspace</a>.</p>}
      {auth.error&&<div className="account-notice" role="alert">{auth.error} <button className="text-button" onClick={auth.retry}>Retry connection</button></div>}
      {reset&&auth.config?.configured&&!auth.user&&<p className="account-notice">Open the password-reset link from your email in the browser where you requested it.</p>}
      {!forgot&&!reset&&!verification&&<><button className="google-button" disabled={!enabled||busy} onClick={()=>run(async()=>{const {error}=await auth.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:authRedirect()}});if(error)throw error;})}><GoogleMark />Continue with Google</button><div className="account-divider"><span>or continue with email</span></div></>}
      {!verification&&<form className="account-form" onSubmit={submit}>
        {!reset&&<label htmlFor="account-email">Email address<input id="account-email" type="email" autoComplete="email" placeholder="you@example.com" required value={email} disabled={busy} onChange={e=>setEmail(e.target.value)} /></label>}
        {!forgot&&<div className="account-password-field"><label htmlFor="account-password">{reset?'New password':'Password'}</label><div className="password-input"><input id="account-password" aria-describedby={signup||reset?'account-password-help':undefined} type={show?'text':'password'} autoComplete={signup||reset?'new-password':'current-password'} minLength={signup||reset?8:undefined} required value={password} disabled={busy} onChange={e=>setPassword(e.target.value)} /><button type="button" aria-label={show?'Hide password':'Show password'} aria-pressed={show} onClick={()=>setShow(value=>!value)}>{show?'Hide':'Show'}</button></div>{(signup||reset)&&<small id="account-password-help">At least 8 characters.</small>}</div>}
        {!signup&&!forgot&&!reset&&<a className="account-forgot" href="#/forgot-password">Forgot password?</a>}
        <button className="primary-button" disabled={!enabled||busy}>{busy?'Please wait…':signup?'Create account':forgot?'Send reset link':reset?'Save new password':'Log in'}<span aria-hidden="true">→</span></button>
      </form>}
      {verification&&<><p className="account-email-sent">{email}</p><button className="secondary-button" disabled={!enabled||busy} onClick={()=>run(async()=>{const {error}=await auth.client.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:authRedirect()}});if(error)throw error;setMessage('If confirmation is needed, a new link is on its way.');})}>Resend confirmation</button><button className="text-button account-change-email" onClick={()=>{setVerification(false);setMessage('');}}>Use a different email</button></>}
      <p className="account-status" role="status">{message}</p><p className="account-error" role="alert">{error}</p>
      <p className="account-switch">{forgot||reset?<a href="#/login">Back to log in</a>:signup?<>Already have an account? <a href="#/login">Log in</a></>:<>New to Recall? <a href="#/signup">Create an account</a></>}</p><p className="account-footnote">Your Recall account is separate from LeetCode.</p>
    </section>
  </div>;
}
