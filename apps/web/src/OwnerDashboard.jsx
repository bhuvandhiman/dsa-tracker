import {useCallback,useEffect,useRef,useState} from 'react';
import {request} from './api.js';
import './owner.css';

const sections=[['overview','Overview'],['users','Users'],['extension','Extension & imports'],['health','System health'],['activity','Owner activity']];
const count=value=>value===null||value===undefined?'—':Number(value).toLocaleString();
const date=value=>value?new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Not recorded';
const short=value=>value?value.slice(0,8)+'…':'Server CLI';
function Status({children,tone=''}){return <span className={`owner-status ${tone}`}>{children}</span>;}
function Empty({children}){return <p className="owner-empty">{children}</p>;}
function Stats({items}){return <div className="owner-stats">{items.map(([label,value,note])=><article className="owner-stat" key={label}><p>{label}</p><strong>{count(value)}</strong>{note&&<span>{note}</span>}</article>)}</div>;}
function Pagination({total,offset,onChange,busy}){return <div className="owner-pagination"><span>{total?`${offset+1}–${Math.min(offset+25,total)} of ${count(total)}`:'0 records'}</span><div><button className="secondary-button" disabled={busy||offset===0} onClick={()=>onChange(Math.max(0,offset-25))}>Previous</button><button className="secondary-button" disabled={busy||offset+25>=total} onClick={()=>onChange(offset+25)}>Next</button></div></div>;}
function Table({headings,children,label}){return <div className="owner-table-scroll" role="region" aria-label={label} tabIndex={0}><table className="owner-table"><thead><tr>{headings.map(heading=><th scope="col" key={heading}>{heading}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;}

function Mfa({auth,onVerified}){
  const [factors,setFactors]=useState(null),[selected,setSelected]=useState(''),[enrollment,setEnrollment]=useState(null),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const active=useRef(true);
  const load=useCallback(async()=>{
    try{const {data,error}=await auth.client.auth.mfa.listFactors();if(error)throw error;if(active.current){const verified=(data.totp||[]).filter(f=>f.status==='verified');setFactors(verified);setSelected(verified[0]?.id||'');}}
    catch{if(active.current)setError('Could not load your authenticator. Retry, or sign in again.');}
  },[auth.client]);
  useEffect(()=>{active.current=true;void Promise.resolve().then(load);return ()=>{active.current=false;};},[load]);
  async function enroll(){
    setBusy(true);setError('');
    try{
      // Clean up only unfinished factors created by this screen, never a verified factor.
      const listed=await auth.client.auth.mfa.listFactors();if(listed.error)throw listed.error;
      for(const factor of listed.data.all||[])if(factor.factor_type==='totp'&&factor.status==='unverified'&&factor.friendly_name==='Recall owner'){
        const removed=await auth.client.auth.mfa.unenroll({factorId:factor.id});if(removed.error)throw removed.error;
      }
      const {data,error}=await auth.client.auth.mfa.enroll({factorType:'totp',friendlyName:'Recall owner'});if(error)throw error;
      if(active.current){setEnrollment(data);setSelected(data.id);}
    }catch{if(active.current)setError('Could not create an authenticator. Check that TOTP MFA is enabled for this Supabase project, then retry.');}
    finally{if(active.current)setBusy(false);}
  }
  async function verify(event){
    event.preventDefault();setBusy(true);setError('');
    try{const {error}=await auth.client.auth.mfa.challengeAndVerify({factorId:selected,code});if(error)throw error;if(active.current){setCode('');setEnrollment(null);onVerified();}}
    catch{if(active.current)setError('That code could not be verified. Enter a fresh six-digit code and retry.');}
    finally{if(active.current)setBusy(false);}
  }
  const qr=enrollment?.totp?.qr_code;
  return <section className="owner-mfa owner-card"><p className="eyebrow">Private owner access</p><h2>Verify it’s you.</h2><p>Use an authenticator app to open account summaries and service diagnostics. Owner access requires a recent code and lasts up to 15 minutes.</p>
    {error&&<p className="account-error" role="alert">{error}</p>}
    {!factors&&!error&&<p role="status">Checking your authenticator…</p>}
    {!factors&&error&&<button className="secondary-button" onClick={()=>{setError('');void load();}}>Retry</button>}
    {factors?.length===0&&!enrollment&&<><p>Add Recall to your authenticator app to get started.</p><button className="primary-button" disabled={busy} onClick={enroll}>{busy?'Preparing…':'Set up authenticator'}</button></>}
    {enrollment&&<div className="owner-enrollment"><h3>Scan in your authenticator app</h3>{typeof qr==='string'&&<img width="200" height="200" alt="Scan this QR code to add Recall owner to your authenticator" src={qr.startsWith('data:image/')?qr:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`} />}<details><summary>Can’t scan the code?</summary><p>Enter this setup key in your authenticator app.</p><code>{enrollment.totp.secret}</code></details></div>}
    {(selected||enrollment)&&<form className="owner-mfa-form" onSubmit={verify}>{factors?.length>1&&<label>Authenticator<select value={selected} onChange={e=>setSelected(e.target.value)} disabled={busy}>{factors.map(f=><option key={f.id} value={f.id}>{f.friendly_name||'Authenticator'}</option>)}</select></label>}<label htmlFor="owner-code">Authenticator code</label><input id="owner-code" value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="000000" required disabled={busy} /><button className="primary-button" disabled={busy||code.length!==6}>{busy?'Verifying…':'Open owner dashboard'}</button></form>}
    <p className="owner-note">Keep access to your authenticator. If you lose it, recovery requires the Supabase project operator; this screen cannot bypass MFA.</p>
  </section>;
}

function Overview({data}){
  const t=data.totals;
  const funnel=[['Email verified',t.verified],['Profile created',t.profiles],['Goal selected',t.goals],['Onboarding finished',t.onboarded],['Extension reported',t.connected],['First practice saved',t.saved]];
  return <>
    <Stats items={[[data.syncedAt?'Registered accounts':'Observed accounts',t.registered,data.syncedAt?'Directory synchronized':'Full directory sync pending'],['Active this week',t.active,'Dashboard, history or practice activity'],['Onboarding complete',t.onboarded,'Profile, goal and installation step'],['Started importing',t.imported,'Existing solves successfully stored']]} />
    {!data.syncedAt&&<p className="owner-notice">The account directory has not been synchronized yet. These counts cover accounts seen by Recall. Run the server’s owner sync command to include existing and unverified signups.</p>}
    <div className="owner-two-columns"><section className="owner-card"><p className="eyebrow">From signup to practice</p><h2>Getting started</h2><p className="owner-note">Steps can be completed in a different order. Installation acknowledgment alone does not count as an extension connection.</p><ol className="owner-funnel">{funnel.map(([label,value])=><li key={label}><div><span>{label}</span><strong>{count(value)} <small>/ {count(t.registered)}</small></strong></div><div className="owner-track"><span style={{width:`${t.registered?Math.min(100,value/t.registered*100):0}%`}} /></div></li>)}</ol></section>
    <section className="owner-card"><p className="eyebrow">Last 14 days · UTC</p><h2>New accounts</h2><div className="owner-bars" role="img" aria-label={`New accounts per day: ${data.daily.map(row=>`${String(row.day).slice(0,10)}: ${row.signups}`).join(', ')}`}>{data.daily.map(row=><div key={row.day} title={`${String(row.day).slice(0,10)} · ${row.signups} signups`}><span style={{height:`${Math.max(2,row.signups/Math.max(1,...data.daily.map(d=>d.signups))*140)}px`}} /><small>{new Date(row.day).getUTCDate()}</small></div>)}</div><p className="owner-note">Signup dates come from Supabase. Meaningful activity is recorded by Recall; importing older solves does not count as practice performed today.</p><dl className="owner-definition"><div><dt>Tracking began</dt><dd>{date(data.trackingSince)}</dd></div><div><dt>Directory last synchronized</dt><dd>{date(data.syncedAt)}</dd></div></dl></section></div>
  </>;
}

function UserDetail({id,read,canReveal,onClose}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[email,setEmail]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false);
  const panel=useRef(null);
  useEffect(()=>{panel.current?.focus();},[]);
  useEffect(()=>{const controller=new AbortController();read(`/owner/users/${id}`,{signal:controller.signal}).then(setData,error=>{if(!controller.signal.aborted)setError(error.message);});return ()=>controller.abort();},[id,read]);
  async function reveal(event){event.preventDefault();setBusy(true);setError('');try{const result=await read(`/owner/users/${id}/contact`,{method:'POST',body:JSON.stringify({reason})});setEmail(result.email);setReason('');}catch(error){setError(error.message);}finally{setBusy(false);}}
  return <section ref={panel} tabIndex={-1} className="owner-card owner-user-detail" aria-label="Account summary"><div className="owner-section-heading"><h2>{data?.user.name||'Account summary'}</h2><button className="secondary-button" onClick={onClose}>Back to accounts</button></div>{error&&<p role="alert" className="account-error">{error}</p>}{!data&&!error&&<p role="status">Loading account summary…</p>}{data&&<><p className="owner-id">{data.user.id}</p><Stats items={[["Saved problems",data.user.problems],['Practice recordings',data.user.attempts],['Imported solves',data.user.imported]]} /><dl className="owner-definition"><div><dt>Contact</dt><dd>{email||data.user.email}</dd></div><div><dt>Joined</dt><dd>{date(data.user.createdAt)}</dd></div><div><dt>Last activity</dt><dd>{date(data.user.lastActive)}</dd></div><div><dt>Extension last reported</dt><dd>{date(data.user.extensionSeen)}</dd></div><div><dt>Reported extension version</dt><dd>{data.user.extensionVersion||'Unknown'}</dd></div><div><dt>Summary updated</dt><dd>{date(data.user.summaryAt)}</dd></div></dl>{canReveal&&!email&&<form className="owner-contact-form" onSubmit={reveal}><label htmlFor="contact-reason">Support reason to reveal email</label><input id="contact-reason" value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={300} required placeholder="e.g. Responding to their account support request" /><button className="secondary-button" disabled={busy||reason.trim().length<10}>{busy?'Recording access…':'Reveal contact email'}</button><p className="owner-note">This action records your account ID, the target account and the reason in the owner activity log.</p></form>}</>}</section>;
}
function Users({data,query,setQuery,filter,setFilter,onSearch,busy,read,canReveal,selected,setSelected,detailRevision}){
  if(selected)return <UserDetail key={selected+detailRevision} id={selected} read={read} canReveal={canReveal} onClose={()=>setSelected(null)} />;
  return <><section className="owner-card"><div className="owner-section-heading"><div><h2>Account directory</h2><p className="owner-note">Contact emails are masked. Open an account for counts and connection details.</p></div><Status>{count(data.total)} accounts</Status></div><form className="owner-filters" onSubmit={onSearch}><label>Find an account<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, email or account ID" maxLength={100} /></label><label>Show<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All accounts</option><option value="setup-pending">Setup pending</option><option value="connected">Extension reported</option><option value="active">Active this week</option></select></label><button className="secondary-button" disabled={busy}>Apply filters</button></form>
    {data.users.length?<Table label="Users" headings={['Account','Joined','Setup','Extension','Last activity','Details']}>{data.users.map(user=><tr key={user.id}><td><strong>{user.name||'Profile pending'}</strong><span>{user.email}</span><small>{user.id}</small></td><td>{date(user.createdAt)}</td><td><Status tone={user.onboarded?'good':''}>{user.onboarded?'Complete':!user.verified?'Email pending':!user.profileReady?'Profile pending':!user.goalReady?'Goal pending':'Install step pending'}</Status></td><td><span>{user.extensionVersion||'Not reported'}</span><small>{user.extensionSeen?date(user.extensionSeen):'No connection report'}</small></td><td>{date(user.lastActive)}</td><td><button className="owner-text-button" onClick={()=>setSelected(user.id)} aria-label={`Open summary for ${user.name||user.email}`}>View summary ↗</button></td></tr>)}</Table>:<Empty>No accounts match these filters.</Empty>}</section>{selected&&<UserDetail key={selected} id={selected} read={read} canReveal={canReveal} onClose={()=>setSelected(null)} />}</>;
}
function Extension({data}){
  const server=data.totals.filter(t=>t.source==='server'),client=data.totals.filter(t=>t.source==='client');
  const sum=(rows,operation,outcome)=>rows.filter(r=>r.operation===operation&&r.outcome===outcome).reduce((total,r)=>total+r.count,0);
  return <><Stats items={[["Confirmed captures · 7 days",sum(server,'capture','success'),'New recordings; retries excluded'],['Import batches saved · 7 days',sum(server,'import','success'),'Batches with new solves'],['API failures · 7 days',server.filter(r=>r.outcome==='failure').reduce((s,r)=>s+r.count,0),'Capture and import requests'],['Client reports · 7 days',client.reduce((s,r)=>s+r.count,0),'Reports from browsers and extensions']]} />
    <section className="owner-card"><h2>Extension versions</h2><p className="owner-note">The connection is verified against a Recall account. Version numbers are client reported. “Last reported” describes past contact, not whether an extension is online now.</p>{data.versions.length?<Table label="Reported extension versions" headings={['Version','Accounts','Last reported']}>{data.versions.map(row=><tr key={row.version}><td><strong>{row.version}</strong></td><td>{count(row.users)}</td><td>{date(row.lastSeen)}</td></tr>)}</Table>:<Empty>No extension connections have been reported yet. Updated extensions report their version when connecting.</Empty>}</section>
    <section className="owner-card"><h2>Recent capture and import events</h2><p className="owner-note">Server events confirm API outcomes. Client reports help diagnose timeouts and LeetCode sign-in problems. Events contain codes and account IDs; they exclude notes, tokens and solution code. Retained for 30 days.</p>{data.events.length?<Table label="Extension and import events" headings={['Received','Operation','Outcome','Code','Source','Account']}>{data.events.map(event=><tr key={event.id}><td>{date(event.receivedAt)}</td><td>{event.operation}</td><td><Status tone={event.outcome==='success'?'good':'warning'}>{event.outcome}</Status></td><td>{event.code}</td><td>{event.source==='server'?'Server confirmed':'Client reported'}</td><td title={event.userId||''}>{short(event.userId)}</td></tr>)}</Table>:<Empty>No operational events have been recorded yet.</Empty>}</section></>;
}
function Health({data}){
  const requests=data.routes.reduce((sum,row)=>sum+row.requests,0),errors=data.routes.reduce((sum,row)=>sum+(row.errors||0),0),aborted=data.routes.reduce((sum,row)=>sum+(row.aborted||0),0),average=requests?Math.round(data.routes.reduce((sum,row)=>sum+row.averageMs*row.requests,0)/requests):null;
  return <><Stats items={[["API requests · 24 hours",requests,'Recorded responses'],['Average response · ms',average,'Authentication + database + processing'],['Server errors · 24 hours',errors,'Responses with status 500 or higher'],['Interrupted requests',aborted,'Connection closed before response']]} />
    <div className="owner-two-columns"><section className="owner-card"><div className="owner-section-heading"><h2>Database</h2><Status tone="good">Connected</Status></div><p>Checked with a real database query when this screen opened.</p><dl className="owner-definition"><div><dt>Check latency</dt><dd>{data.database.latencyMs} ms</dd></div><div><dt>Pool connections</dt><dd>{count(data.database.pool.total)}</dd></div><div><dt>Idle connections</dt><dd>{count(data.database.pool.idle)}</dd></div><div><dt>Waiting for a connection</dt><dd>{count(data.database.pool.waiting)}</dd></div></dl></section><section className="owner-card"><h2>Collection status</h2><dl className="owner-definition"><div><dt>API uptime</dt><dd>{Math.floor(data.uptimeSeconds/60)} minutes</dd></div><div><dt>Dropped observations</dt><dd>{count(data.collection.dropped)}</dd></div><div><dt>Collection failures</dt><dd>{count(data.collection.failures)}</dd></div></dl><p className="owner-note">Metrics are collected by this API and batched on the server. A sleeping host is not measurable until it wakes. Browser timeouts appear separately as client reports.</p></section></div>
    <section className="owner-card"><h2>Where requests spend time</h2><p className="owner-note">Last 24 hours. Database time includes acquiring a connection and executing queries. Authentication measures provider verification. Slow means at least 10 seconds; max is the slowest recorded response.</p>{data.routes.length?<Table label="API response timings" headings={['Endpoint','Requests','Average','Auth','Database','Other','Max','Slow','Errors']}>{data.routes.map(row=><tr key={row.method+row.route}><td><strong>{row.method} {row.route}</strong></td><td>{count(row.requests)}</td><td>{row.averageMs} ms</td><td>{row.authMs} ms</td><td>{row.databaseMs} ms</td><td>{Math.max(0,row.averageMs-row.authMs-row.databaseMs)} ms</td><td>{row.maxMs} ms</td><td>{count(row.slow)}</td><td>{count(row.errors||0)}</td></tr>)}</Table>:<Empty>No API measurements have been recorded yet.</Empty>}</section></>;
}
function Activity({data}){return <section className="owner-card"><h2>Owner activity</h2><p className="owner-note">Reads, MFA challenges, contact reveals and server-side permission changes are recorded for 90 days. Contact reasons are cleared when their account is deleted.</p>{data.events.length?<Table label="Owner audit log" headings={['Time','Action','Actor','Target','Reason']}>{data.events.map(row=><tr key={row.id}><td>{date(row.createdAt)}</td><td><strong>{row.action}</strong></td><td title={row.actorId||''}>{short(row.actorId)}</td><td title={row.targetId||''}>{row.targetId?short(row.targetId):'—'}</td><td>{row.reason||'—'}</td></tr>)}</Table>:<Empty>No owner actions have been recorded yet.</Empty>}</section>;}

function OwnerSection({auth,section,onMfa}){
  const [data,setData]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[offset,setOffset]=useState(0),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[applied,setApplied]=useState({q:'',status:'all'}),[revision,setRevision]=useState(0),[updated,setUpdated]=useState(null),[selected,setSelected]=useState(null);
  const read=useCallback(async(path,options)=>{try{return await request(path,options);}catch(error){if(error.code==='OWNER_MFA_REQUIRED')onMfa();throw error;}},[onMfa]);
  useEffect(()=>{
    const controller=new AbortController();
    const params=new URLSearchParams({offset:String(offset),limit:'25',...(section==='users'?applied:{})});
    read(`/owner/${section}${['users','extension','activity'].includes(section)?'?'+params:''}`,{signal:controller.signal}).then(value=>{setData(value);setUpdated(new Date().toISOString());},error=>{if(!controller.signal.aborted){setError(error.message);setData(null);}}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return ()=>controller.abort();
  },[read,section,offset,applied,revision]);
  function refresh(){setBusy(true);setError('');setRevision(value=>value+1);}
  function changePage(value){setBusy(true);setError('');setOffset(value);}
  function search(event){event.preventDefault();setBusy(true);setError('');setOffset(0);setApplied({q:query.trim(),status:filter});}
  return <><div className="owner-section-heading owner-page-heading"><div><p className="eyebrow">Owner workspace</p><h1>{sections.find(([id])=>id===section)?.[1]}</h1><p>Understand how Recall is working for your users.</p></div><button className="secondary-button" disabled={busy} onClick={refresh}>{busy?'Loading…':'Refresh view'}</button></div>
    {error&&<div className="owner-error" role="alert"><h2>Could not load this view.</h2><p>{error}</p><button className="secondary-button" onClick={refresh}>Try again</button></div>}
    {busy&&!data&&!error&&<div className="owner-card" role="status">Loading {sections.find(([id])=>id===section)?.[1].toLowerCase()}…</div>}
    {data&&<div aria-busy={busy}>{section==='overview'&&<Overview data={data} />}{section==='users'&&<Users data={data} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} onSearch={search} busy={busy} read={read} canReveal={auth.owner.permissions.includes('contact:read')} selected={selected} setSelected={setSelected} detailRevision={revision} />}{section==='extension'&&<Extension data={data} />}{section==='health'&&<Health data={data} />}{section==='activity'&&<Activity data={data} />}{['users','extension','activity'].includes(section)&&!selected&&<Pagination total={data.total} offset={offset} onChange={changePage} busy={busy} />}</div>}
    {updated&&<p className="owner-note owner-updated">Updated {date(updated)} · Refresh manually for new data.</p>}
  </>;
}
export default function OwnerDashboard({auth,section='overview'}){
  const [mfa,setMfa]=useState(false),[verified,setVerified]=useState(0);
  const requireMfa=useCallback(()=>setMfa(true),[]);
  if(!auth.owner?.enabled)return <div className="owner-restricted owner-card"><p className="eyebrow">Private workspace</p><h1>Owner access required.</h1><p>This account has no owner permissions. Access is assigned by the Recall server operator.</p><a className="secondary-button" href="#/dashboard">Return to your dashboard</a></div>;
  return <div className="owner-layout"><aside className="owner-sidebar"><a href="#/owner" className="owner-sidebar-title">Recall operations<span>Owner dashboard</span></a><nav aria-label="Owner navigation">{sections.map(([id,label],index)=><a key={id} href={`#/owner/${id}`} aria-current={section===id?'page':undefined}><span aria-hidden="true">0{index+1}</span>{label}</a>)}</nav><div className="owner-sidebar-note"><Status tone="good">MFA protected</Status><p>Account summaries and operational data. Every owner read is audited.</p><a className="inline-link" href="#/dashboard">← Back to practice</a></div></aside><div className="owner-content">{mfa?<Mfa auth={auth} onVerified={()=>{setVerified(value=>value+1);setMfa(false);}} />:sections.some(([id])=>section===id)?<OwnerSection key={section+verified} auth={auth} section={section} onMfa={requireMfa} />:<section className="owner-card"><h1>View not found.</h1><a className="inline-link" href="#/owner">Open overview</a></section>}</div></div>;
}
