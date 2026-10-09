import {useEffect,useRef} from 'react';
import {accountInitials} from './profile-model.js';

export default function AccountMenu({user,page,onSignOut}){
  const details=useRef(null),trigger=useRef(null);
  useEffect(()=>{
    const close=()=>{if(details.current)details.current.open=false;};
    const outside=event=>{if(!details.current?.contains(event.target))close();};
    const escape=event=>{if(event.key==='Escape'&&details.current?.open){event.preventDefault();close();trigger.current?.focus();}};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    window.addEventListener('hashchange',close);
    window.addEventListener('popstate',close);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('hashchange',close);window.removeEventListener('popstate',close);};
  },[]);
  function close(){if(details.current)details.current.open=false;}
  return <details className="account-dropdown" ref={details} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))close();}}>
    <summary ref={trigger} aria-label="Account menu" className={`account-menu-trigger ${['profile','settings','connect'].includes(page)?'is-current':''}`}>
      <span className="account-avatar" aria-hidden="true">{accountInitials(user)}</span>
      <span className="account-menu-name">{user?.name?.trim()||'Your account'}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </summary>
    <div className="account-menu-panel">
      <div className="account-menu-identity"><strong>{user?.name?.trim()||'Your account'}</strong><span>{user?.email||'Local workspace'}</span></div>
      <nav aria-label="Account navigation">
        <a href="#/profile" aria-current={page==='profile'?'page':undefined} onClick={close}>Profile</a>
        <a href="#/settings" aria-current={page==='settings'?'page':undefined} onClick={close}>Settings</a>
        <a href="#/connect" aria-current={page==='connect'?'page':undefined} onClick={close}>Connect LeetCode</a>
      </nav>
      {user&&<button className="account-menu-signout" type="button" onClick={()=>{close();onSignOut();}}>Log out</button>}
    </div>
  </details>;
}
