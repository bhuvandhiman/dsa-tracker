import { useState } from 'react';
import './styles.css';

const patterns = [
  { name: 'Arrays & hashing', symbol: '[ ]', color: 'coral', topics: 'Two pointers · Sliding window', coverage: 'Start with the building blocks.', retention: 'Keep the fundamentals close.' },
  { name: 'Trees & graphs', symbol: '↗', color: 'teal', topics: 'Traversal · Search · Connections', coverage: 'Find your way through new ideas.', retention: 'Revisit the paths you know.' },
  { name: 'Dynamic programming', symbol: '↻', color: 'mustard', topics: 'Subproblems · States · Decisions', coverage: 'Make a big problem feel smaller.', retention: 'Reconnect the steps that matter.' },
];

function Icon({ name, ...props }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    book: <><path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Z" /><path d="M12 5v16" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    spark: <path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z" />,
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
  const [view, setView] = useState('coverage');
  return <div className="workspace">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="topbar">
      <a className="brand" href="#main" aria-label="Recall home"><span className="brand-mark"><Icon name="book" /></span><span>recall<span className="brand-dot">.</span></span></a>
      <nav className="navigation" aria-label="Main navigation">
        <a className="nav-link active" href="#main"><Icon name="home" />Dashboard</a>
        <a className="nav-link" href="#patterns"><Icon name="grid" />Patterns</a>
      </nav>
      <span className="workspace-label"><span className="status-dot" />Your learning space</span>
    </header>

    <main id="main">
      <section className="hero" aria-labelledby="welcome-title">
        <div className="hero-copy">
          <p className="eyebrow"><span />A little progress, every day</p>
          <h1 id="welcome-title">Learn something.<br />Make it <span>stay.</span></h1>
          <p className="hero-description">Your DSA journey, with room to grow.<br className="desktop-break" /> Explore your coverage. Stay close to what you’ve learned.</p>
          <a className="primary-button" href="#patterns">Explore your patterns<Icon name="arrow" /></a>
        </div>
        <PracticeIllustration />
      </section>

      <section className="perspective" aria-labelledby="perspective-title">
        <div><p className="eyebrow">Two ways to see your progress</p><h2 id="perspective-title">The bigger picture.</h2></div>
        <div className="view-switch" role="group" aria-label="Progress perspective">
          <button type="button" aria-pressed={view === 'coverage'} className={view === 'coverage' ? 'selected' : ''} onClick={() => setView('coverage')}><Icon name="grid" />Coverage</button>
          <button type="button" aria-pressed={view === 'retention'} className={view === 'retention' ? 'selected' : ''} onClick={() => setView('retention')}><Icon name="spark" />Retention</button>
        </div>
      </section>

      <section className="perspective-card" aria-live="polite" aria-atomic="true">
        <div className={`perspective-symbol ${view === 'coverage' ? 'coral' : 'teal'}`}><Icon name={view === 'coverage' ? 'grid' : 'spark'} /></div>
        <div className="perspective-copy"><h3>{view === 'coverage' ? 'How far have you explored?' : 'What’s staying with you?'}</h3><p>{view === 'coverage' ? 'See the patterns you’ve practiced and the ground still left to cover.' : 'See how dated practice holds up over time, with undated experience kept separate.'}</p></div>
        <span className="perspective-label">{view === 'coverage' ? 'Breadth of practice' : 'Practice over time'}<Icon name={view === 'coverage' ? 'book' : 'clock'} /></span>
      </section>

      <section id="patterns" className="patterns-section" aria-labelledby="patterns-title">
        <div className="section-heading"><div><p className="eyebrow">One idea at a time</p><h2 id="patterns-title">A world of patterns.</h2></div><span className="section-note">Small steps. Strong foundations.</span></div>
        <div className="pattern-grid">{patterns.map(pattern => <article className={`pattern-card ${pattern.color}`} key={pattern.name}>
          <div className="pattern-card-top"><span className="pattern-icon">{pattern.symbol}</span><span className="pattern-type">DSA pattern</span></div>
          <h3>{pattern.name}</h3><p>{pattern[view]}</p><div className="pattern-card-footer"><span>{pattern.topics}</span><Icon name="spark" /></div>
        </article>)}</div>
      </section>
      <footer className="footer"><span className="footer-brand">recall.</span><span>Built around your practice, at your pace.</span><span className="footer-flower" aria-hidden="true">✳</span></footer>
    </main>
  </div>;
}
