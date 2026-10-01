import { useEffect, useLayoutEffect, useState } from 'react';
import './styles.css';
import LiveDashboard from './LiveDashboard.jsx';
import Workflows from './Workflows.jsx';
import { readRoute } from './navigation.js';

function Icon({ name, ...props }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    book: <><path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Z" /><path d="M12 5v16" /></>,
    workspace: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M9 9v11" /></>,
    spark: <path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z" />,
    moon: <path d="M20.4 14.4A9 9 0 0 1 9.6 3.6a9 9 0 1 0 10.8 10.8Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

function PracticeIllustration() {
  return <div className="practice-illustration" aria-hidden="true">
    <span className="orbit orbit-one" /><span className="orbit orbit-two" />
    <span className="floating-topic topic-one">#Curiosity</span>
    <span className="floating-topic topic-two">#Patterns</span>
    <span className="floating-topic topic-three">#OneStepAtATime</span>
    <div className="illustration-disc"><svg viewBox="0 0 160 160" fill="none">
      <path d="M42 45 78 54 117 39 125 111 86 127 48 114Z" fill="var(--canvas)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
      <path d="m78 54 8 73M42 45l36 9 39-15M48 114l38 13 39-16" stroke="var(--ink)" strokeWidth="3" />
      <path d="m53 64 16 4m-14 7 16 4m-14 7 16 4m-14 7 16 4" stroke="var(--coral)" strokeWidth="4" strokeLinecap="round" />
      <path d="m93 65 13-5m-12 16 13-5m-12 16 13-5m-12 16 13-5" stroke="var(--teal)" strokeWidth="4" strokeLinecap="round" />
      <path d="m107 17 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="var(--mustard)" />
    </svg></div>
    <span className="little-spark"><Icon name="spark" /></span>
    <span className="code-chip">{'{ learn. repeat. }'}</span>
  </div>;
}

export default function App() {
  const [route, setRoute] = useState(() => readRoute(window.location.hash));
  useEffect(() => {
    function navigate() {
      setRoute(readRoute(window.location.hash));
      requestAnimationFrame(() => { document.getElementById('main')?.focus({preventScroll:true}); window.scrollTo(0,0); });
    }
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
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
  return <div className="workspace">
    <a className="skip-link" href="#main" onClick={event => {event.preventDefault(); document.getElementById('main')?.focus();}}>Skip to content</a>
    <header className="topbar">
      <a className="brand" href="#/dashboard" aria-label="Recall home"><span className="brand-mark"><Icon name="book" /></span><span>recall<span className="brand-dot">.</span></span></a>
      <nav className="navigation" aria-label="Main navigation">
        <a className={`nav-link ${route.page === 'dashboard' ? 'active' : ''}`} aria-current={route.page === 'dashboard' ? 'page' : undefined} href="#/dashboard"><Icon name="home" />Dashboard</a>
        <a className={`nav-link ${route.page === 'patterns' ? 'active' : ''}`} aria-current={route.page === 'patterns' ? 'page' : undefined} href="#/patterns"><Icon name="grid" />Patterns</a>
        <a className={`nav-link ${route.page === 'settings' ? 'active' : ''}`} aria-current={route.page === 'settings' ? 'page' : undefined} href="#/settings"><Icon name="workspace" />Workspace</a>
      </nav>
      <div className="topbar-actions">
        <span className="workspace-label"><span className="status-dot" />Your learning space</span>
        <button className="theme-toggle" type="button" aria-label={themeAction} title={themeAction} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
      </div>
    </header>

    <main id="main" tabIndex={-1}>
      {['dashboard','patterns'].includes(route.page) && <>{route.page === 'dashboard' ? <section className="hero" aria-labelledby="welcome-title">
        <div className="hero-copy">
          <p className="eyebrow"><span />A little progress, every day</p>
          <h1 id="welcome-title">Learn something.<br />Make it <span>stay.</span></h1>
          <p className="hero-description">Your DSA journey, with room to grow.<br className="desktop-break" /> Explore your coverage. Stay close to what you’ve learned.</p>
          <a className="primary-button" href="#/patterns">Explore your patterns<Icon name="arrow" /></a>
        </div>
        <PracticeIllustration />
      </section> : null}

      <LiveDashboard route={route} /></>}
      {route.page === 'settings' && <Workflows />}
      <footer className="footer"><span className="footer-brand">recall.</span><span>Built around your practice, at your pace.</span><span className="footer-flower" aria-hidden="true">✳</span></footer>
    </main>
  </div>;
}
