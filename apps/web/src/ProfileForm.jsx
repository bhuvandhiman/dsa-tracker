import {useState} from 'react';
import {normalizeProfileName,profileNameError} from '../../shared/profile.js';
import {accountInitials} from './profile-model.js';

export default function ProfileForm({user,onSave,submitLabel='Save profile',onCancel,autoFocus=false}){
  const [name,setName]=useState(user?.name||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function save(event){
    event.preventDefault();if(busy)return;
    const problem=profileNameError(name);if(problem){setError(problem);return;}
    setBusy(true);setError('');
    try{await onSave(normalizeProfileName(name));}catch(error){setError(error.message);}finally{setBusy(false);}
  }
  return <form className="profile-form" onSubmit={save}>
    <div className="profile-preview"><span className="account-avatar profile-avatar" aria-hidden="true">{accountInitials({name:normalizeProfileName(name)||'Your name'})}</span><div><strong>{normalizeProfileName(name)||'Your name'}</strong><span>{user?.email}</span></div></div>
    <label htmlFor="profile-name">What should we call you?<input id="profile-name" name="name" autoComplete="name" autoFocus={autoFocus} value={name} onChange={event=>{setName(event.target.value);setError('');}} required maxLength={100} disabled={busy} placeholder="Your name" aria-describedby="profile-name-help profile-form-error" aria-invalid={Boolean(error&&profileNameError(name))||undefined} /></label>
    <p id="profile-name-help" className="data-note">This is the name you will see in your workspace. You can change it on your Profile page.</p>
    <p id="profile-form-error" className="account-error" role="alert">{error}</p>
    <div className="row-actions"><button type="submit" className="primary-button" disabled={busy}>{busy?'Saving…':submitLabel}</button>{onCancel&&<button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>Cancel</button>}</div>
  </form>;
}
