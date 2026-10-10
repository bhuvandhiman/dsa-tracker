import {useEffect,useRef,useState} from 'react';
import {useWorkspaceRequest} from './workspace-context.js';
import {accountInitials} from './profile-model.js';
import ProfileForm from './ProfileForm.jsx';
import {hasProfileName} from '../../shared/profile.js';

export default function Profile({auth}){
  const request=useWorkspaceRequest();
  const [connection,setConnection]=useState({loading:true,data:null,error:''});
  const [revision,setRevision]=useState(0);
  const [editing,setEditing]=useState(()=>Boolean(auth.user)&&!hasProfileName(auth.user.name)),[message,setMessage]=useState('');
  const editButton=useRef(null);
  useEffect(()=>{
    const controller=new AbortController();
    Promise.all([request('/ready',{signal:controller.signal}),request('/goal',{signal:controller.signal})]).then(([data,goal])=>{if(!controller.signal.aborted)setConnection({loading:false,data:{...data,goal},error:''});}).catch(error=>{if(!controller.signal.aborted)setConnection({loading:false,data:null,error:error.message});});
    return ()=>controller.abort();
  },[request,revision]);
  const user=auth.user,goal=connection.data?.goal||auth.setup?.goal;
  const joined=user?.createdAt&&Number.isFinite(Date.parse(user.createdAt))?new Intl.DateTimeFormat('en-IN',{dateStyle:'long',timeZone:'Asia/Calcutta'}).format(new Date(user.createdAt)):null;
  function finishEditing(){setEditing(false);requestAnimationFrame(()=>editButton.current?.focus());}
  async function saveProfile(name){
    const result=await request('/account/profile',{method:'PUT',body:JSON.stringify({name})});
    auth.applyProfile(result.user);finishEditing();setMessage('Your profile is saved.');
  }
  return <section className="workflow-page profile-page">
    <p className="eyebrow">Your learning space</p><h1>Your profile.</h1>
    <div className="profile-layout">
      <section className="workspace-panel profile-account" aria-labelledby="profile-account-title">
        {editing?<><h2 id="profile-account-title">{hasProfileName(user?.name)?'Edit your profile.':'Create your profile.'}</h2><ProfileForm user={user} onSave={saveProfile} autoFocus onCancel={hasProfileName(user?.name)?finishEditing:undefined} /></>:<div className="profile-identity"><span className="account-avatar profile-avatar" aria-hidden="true">{accountInitials(user)}</span><div><h2 id="profile-account-title">{user?.name?.trim()||'Recall account'}</h2><p>{user?'Your account details.':'You are using a local workspace.'}</p></div></div>}
        <dl>{!editing&&user?.name?.trim()&&<><dt>Name</dt><dd>{user.name}</dd></>}{user?<><dt>Email</dt><dd>{user.email}</dd><dt>Email status</dt><dd>{user.emailVerified?'Verified':'Unavailable'}</dd>{joined&&<><dt>Member since</dt><dd>{joined}</dd></>}</>:<><dt>Account</dt><dd>Local workspace</dd></>}</dl>
        <div className="row-actions">{user&&!editing&&<button type="button" ref={editButton} className="secondary-button" onClick={()=>{setMessage('');setEditing(true);}}>Edit profile</button>}<a className="inline-link" href="#/settings">Account settings →</a></div><p className="form-message" role="status">{message}</p>
      </section>
      <section className="workspace-panel" aria-labelledby="profile-practice-title"><h2 id="profile-practice-title">Your practice</h2>
        <dl><dt>Focus</dt><dd>{goal?.configured?(goal.profile==='deep'?'Deep Focus':'Interview Focused'):'Choose your focus'}</dd><dt>Target</dt><dd>{goal?.configured?`${goal.target} problems`:'Choose your target'}</dd><dt>LeetCode account</dt><dd>{connection.loading?'Checking connection…':connection.error?'Connection unavailable':connection.data?.account||'No account connected'}</dd></dl>
        {connection.error&&<p className="form-message" role="alert">{connection.error} <button type="button" className="text-button inline-link" onClick={()=>{setConnection({loading:true,data:null,error:''});setRevision(value=>value+1);}}>Try again</button></p>}
        <div className="row-actions"><a className="inline-link" href={goal?.configured?'#/dashboard':'#/setup'}>{goal?.configured?'Adjust goal':'Choose focus and target'} →</a><a className="inline-link" href="#/connect">Manage connection →</a></div>
      </section>
    </div>
  </section>;
}
