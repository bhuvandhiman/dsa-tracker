import { useEffect, useLayoutEffect, useState } from 'react';
import './styles.css';
import LiveDashboard from './LiveDashboard.jsx';
import Workflows from './Workflows.jsx';
import { confirmedLocation,readLocation } from './navigation.js';
import Privacy from './Privacy.jsx';
import PublicPages from './PublicPages.jsx';
import AuthPages from './AuthPages.jsx';
import Onboarding, { Installation } from './Onboarding.jsx';
import useAuth from './use-auth.js';
import { WorkspaceContext } from './workspace-context.js';
import useExtension from './use-extension.js';
import Connection from './Connection.jsx';
import { accountDestination, rememberDestination, needsWorkspaceSetup } from './auth-navigation.js';
import AccountMenu from './AccountMenu.jsx';
import Profile from './Profile.jsx';
import History from './History.jsx';

function Icon({ name, ...props }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    history: <><path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7" /><path d="M12 7v5l3 2" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    book: <><path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Z" /><path d="M12 5v16" /></>,
    workspace: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M9 9v11" /></>,
    spark: <path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z" />,
    moon: <path d="M20.4 14.4A9 9 0 0 1 9.6 3.6a9 9 0 1 0 10.8 10.8Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export default function App() {
  const auth=useAuth();
  const extension=useExtension(auth);
  const [accountError,setAccountError]=useState('');
  const [route, setRoute] = useState(() => readLocation(window.location));
  useEffect(() => {
    function navigate() {
      setRoute(readLocation(window.location));
    }
    window.addEventListener('hashchange', navigate);
    window.addEventListener('popstate',navigate);
    return () => {window.removeEventListener('hashchange', navigate);window.removeEventListener('popstate',navigate);};
  }, []);
  const authPage=['signup','login','forgot-password','reset-password'].includes(route.page);
  const callbackPage=route.page==='auth-callback';
  const callbackPending=auth.loading||Boolean(auth.user)&&!auth.error&&!route.error;
  const setupPage=route.page==='setup';
  const installationPage=route.page==='install-extension';
  const privatePage=['dashboard','patterns','history','profile','settings','connect'].includes(route.page);
  const publicPage = ['home','about','privacy'].includes(route.page);
  const accountShell=authPage||setupPage||callbackPage;
  const accountsEnabled=auth.config?.mode==='supabase';
  const goalSetupPending=accountsEnabled&&Boolean(auth.user)&&needsWorkspaceSetup(auth.setup);
  const goalPage=['dashboard','patterns','history','connect'].includes(route.page);
  const canReadWorkspace=!auth.loading&&auth.config&&(accountsEnabled?Boolean(auth.user):true)&&!(goalPage&&goalSetupPending);
  useEffect(()=>{
    if(auth.loading||auth.error)return;
    if(callbackPage&&auth.user&&!route.error){
      const destination=confirmedLocation(window.location,accountDestination(auth.setup));
      window.history.replaceState(null,'',destination);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    else if(accountsEnabled&&privatePage&&!auth.user){rememberDestination(window.location.hash.slice(1)||window.location.pathname);window.location.hash='/login';}
    else if(goalPage&&goalSetupPending){rememberDestination(window.location.hash.slice(1)||window.location.pathname);window.location.hash='/setup';}
    else if(auth.user&&['signup','login'].includes(route.page))window.location.hash=accountDestination(auth.setup);
  },[auth.loading,auth.error,auth.user,auth.setup,accountsEnabled,privatePage,goalPage,goalSetupPending,callbackPage,route.page,route.error]);
  useEffect(() => {
    const titles={home:'Recall — Know which DSA pattern to practice next',about:'About Recall',privacy:'Privacy · Recall',dashboard:'Dashboard · Recall',patterns:'Patterns · Recall',history:'History · Recall',profile:'Profile · Recall',connect:'Connect LeetCode · Recall',settings:'Settings · Recall',signup:'Create account · Recall',login:'Log in · Recall','forgot-password':'Reset password · Recall','reset-password':'New password · Recall',setup:'Your setup · Recall','install-extension':'Install the extension · Recall'};
    document.title=callbackPage?'Confirming email · Recall':titles[route.page] || 'Recall';
    const frame=requestAnimationFrame(()=>{
      const section=route.page==='home'&&['how-it-works','questions'].includes(route.section)?document.getElementById(route.section):null;
      const target=section || document.getElementById('main');
      target?.focus({preventScroll:true});
      if(section)section.scrollIntoView({block:'start'});else window.scrollTo(0,0);
    });
    return ()=>cancelAnimationFrame(frame);
  },[route,callbackPage]);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('recall-theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('recall-theme', theme); }
    catch { /* Theme switching still works when browser storage is unavailable. */ }
  }, [theme]);
  const themeAction = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return <div className={`workspace ${publicPage||installationPage||accountShell?'public-site':''} ${accountShell?'account-shell':''}`}>
    <a className="skip-link" href="#main" onClick={event => {event.preventDefault(); document.getElementById('main')?.focus();}}>Skip to content</a>
    <header className="topbar">
      <a className="brand" href="#/home" aria-label="Recall home"><span className="brand-mark"><Icon name="book" /></span><span>recall<span className="brand-dot">.</span></span></a>
      <nav className="navigation" aria-label="Main navigation">
        {publicPage||installationPage||accountShell?<>
        <a className={`nav-link ${route.page==='home'&&!route.section?'active':''}`} aria-current={route.page==='home'&&!route.section?'page':undefined} href="#/home">Home</a>
        <a className={`nav-link ${route.section==='how-it-works'?'active':''}`} aria-current={route.section==='how-it-works'?'location':undefined} href="#/home?section=how-it-works">How it works</a>
        <a className={`nav-link ${route.page==='about'?'active':''}`} aria-current={route.page==='about'?'page':undefined} href="/about">About</a>
        </>:<>
        <a className={`nav-link ${route.page === 'dashboard' ? 'active' : ''}`} aria-current={route.page === 'dashboard' ? 'page' : undefined} href="#/dashboard"><Icon name="home" />Dashboard</a>
        <a className={`nav-link ${route.page === 'patterns' ? 'active' : ''}`} aria-current={route.page === 'patterns' ? 'page' : undefined} href="#/patterns"><Icon name="grid" />Patterns</a>
        <a className={`nav-link ${route.page === 'history' ? 'active' : ''}`} aria-current={route.page === 'history' ? 'page' : undefined} href="#/history"><Icon name="history" />History</a>
        </>}
      </nav>
      <div className="topbar-actions">
        {privatePage&&<span className="workspace-label"><span className="status-dot" />Your learning space</span>}
        <button className="theme-toggle" type="button" aria-label={themeAction} title={themeAction} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
        {(publicPage||installationPage)&&<>{!auth.user&&<a className="account-header-link" href="#/login">Log in</a>}<a className="primary-button public-nav-cta" href={auth.user?'#/dashboard':'#/signup'}>{auth.user?'Open dashboard':'Get started'} <Icon name="arrow" /></a></>}
        {authPage&&<a className="account-header-link" href={route.page==='signup'?'#/login':'#/signup'}>{route.page==='signup'?'Log in':'Create account'}</a>}
        {(privatePage||setupPage)&&(auth.user||auth.config?.mode==='local')&&<AccountMenu key={auth.user?.id||'local'} user={auth.user} page={route.page} onSignOut={async()=>{try{await auth.signOut();setAccountError('');}catch(error){setAccountError(error.message);}}} />}
      </div>
    </header>

    <main id="main" tabIndex={-1}>
      <WorkspaceContext.Provider value={accountsEnabled?auth.user?.id||null:'local'}>
      {accountError&&<p className="account-error" role="alert">{accountError}</p>}
      {publicPage&&route.page!=='privacy'&&<PublicPages page={route.page} signedIn={Boolean(auth.user)} localMode={auth.config?.mode==='local'} hosted={auth.config?.deployment?.mode==='hosted'} />}
      {route.page==='privacy'&&<Privacy />}
      {route.page==='login'&&route.account&&<p role="status" className="account-notice">{route.account==='deleted'?'Your Recall account and workspace were deleted.':route.account==='deletion-pending'?'Your deletion request is queued. Workspace access is blocked while cleanup retries.':''}</p>}
      {callbackPage&&<div className="account-loading" role={callbackPending?'status':'alert'}>
        <h1>{callbackPending?'Opening your workspace…':'Could not finish signing you in.'}</h1>
        {callbackPending?<p>Confirming your email and preparing your workspace.</p>:<><p>{route.error||auth.error||'Open the confirmation link in the browser where you signed up. If the link has expired, request a new one.'}</p>{auth.error&&!route.error&&<button className="secondary-button" onClick={auth.retry}>Try again</button>}<a className="primary-button" href="/#/login">Log in</a><a className="inline-link" href="/#/signup">Back to signup</a></>}
      </div>}
      {authPage&&(auth.loading||auth.user&&['signup','login'].includes(route.page)?<div className="account-loading" role="status"><h1>Opening your workspace…</h1><p>Checking your session.</p></div>:<AuthPages key={route.page} page={route.page} auth={auth} />)}
      {setupPage&&(auth.user?<Onboarding key={auth.user.id} auth={auth} />:<div className="account-loading"><h1>Start with your account.</h1><p>{auth.loading?'Checking your session…':'Sign in to save your setup and open your private workspace.'}</p><a className="primary-button" href="#/login">Log in</a><a className="inline-link" href="#/signup">Create account</a></div>)}
      {installationPage&&<Installation auth={auth} />}
      {canReadWorkspace&&route.page==='connect'&&<Connection key={auth.user?.id||'local'} auth={auth} extension={extension} />}
      {privatePage&&!canReadWorkspace&&<div className="account-loading" role="status"><h2>{auth.error?'Could not open your workspace.':'Opening your workspace…'}</h2>{auth.error&&<><p>{auth.error}</p><button className="secondary-button" onClick={auth.retry}>Retry connection</button><a className="inline-link" href="#/login">Go to login</a></>}</div>}
      {canReadWorkspace&&['dashboard','patterns'].includes(route.page) && <LiveDashboard key={auth.user?.id||'local'} route={route} />}
      {canReadWorkspace&&['dashboard','patterns','history'].includes(route.page)&&<History key={`history-${auth.user?.id||'local'}`} visible={route.page==='history'} />}
      {canReadWorkspace&&route.page==='profile'&&<Profile key={auth.user?.id||'local'} auth={auth} />}
      {canReadWorkspace&&route.page === 'settings' && <Workflows key={auth.user?.id||'local'} auth={auth} />}
      </WorkspaceContext.Provider>
      <footer className="footer"><span className="footer-brand">recall.</span><span>Built around your practice, at your pace.</span><nav className="footer-links" aria-label="Footer"><a href="/">Home</a><a href="/about">About</a><a href="/privacy">Privacy</a><a href="/install-extension">Extension</a><a href="#/home?section=questions">FAQ</a></nav><span className="footer-flower" aria-hidden="true">✳</span></footer>
    </main>
  </div>;
}
