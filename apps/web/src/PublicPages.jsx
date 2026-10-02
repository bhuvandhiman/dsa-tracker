import { DifficultyMetrics, FocusBadge, NextAction, StrengthBar } from './PatternMetrics.jsx';
import './public.css';

// Illustrative product data stays separate from the user's API and workspace.
const examples=[
  {slug:'dynamic-programming',name:'Dynamic programming',strength:48,experienceScore:32,distinctSolved:22,reason:'Build balanced coverage',tier:'high',practiceBlock:{required:4,earned:2,distinct:2,minimumDistinct:4}},
  {slug:'graphs',name:'Graphs',strength:64,experienceScore:43,distinctSolved:28,reason:'Refresh recent practice',tier:'high'},
  {slug:'arrays-hashing',name:'Arrays & hashing',strength:81,experienceScore:55,distinctSolved:41,reason:'Keep your foundation strong',tier:'medium'},
].map(item=>({...item,assessed:true,emphasis:{tier:item.tier,label:`${item.tier} focus`,profileName:'Interview Focused'}}));
const exampleGoal={difficulty:{easy:{target:8,credited:6,actual:6},medium:{target:16,credited:9,actual:9},hard:{target:6,credited:2,actual:2}}};
const questions=[
  ['What does Recall track?','Recall organizes solved problems into patterns and subpatterns. Goal coverage shows where you have built breadth. Practice strength combines experience with dated recent practice to help you decide what needs attention.'],
  ['Can I bring my existing LeetCode solves?','Yes. The extension imports accepted problems from the LeetCode account signed into your Chrome profile. Each problem counts once. Imported solves without a known practice date build experience, but do not establish retention.'],
  ['How are problems classified?','Imported problems use their topic tags, with specialized techniques taking precedence. When you record practice, the topics you select determine one primary pattern. Other lets you search and choose a pattern directly, and you can correct placement later.'],
  ['Is the retention bar a measured recall score?','No. It is an estimate based on recorded experience, recency and assistance. It does not test your memory. Recent-practice strength fades after its hold, and recorded practice can build it again.'],
  ['Will one problem shuffle my whole queue?','Individual practice can grow the bar immediately. Queue reassessment waits for a meaningful practice block or enough new coverage, so switching topics after one problem does not repeatedly shuffle recommendations.'],
  ['What do I need to use it today?','Install the Recall Chrome extension using the installation guide. The local workspace supports practice today. Account sign-in is available once configured; sign into the same Recall account in extension Settings to connect your practice. Recall never asks for your LeetCode password.'],
];

function Arrow(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;}

function ProductPreview(){
  return <figure className="public-preview" aria-labelledby="preview-title">
    <figcaption className="preview-heading"><div><p className="eyebrow">Your next move</p><h2 id="preview-title">A little direction.<br />A lot more progress.</h2></div><span className="preview-mode">Interview focused</span></figcaption>
    <ol className="preview-queue">{examples.map((item,index)=><li className={`preview-pattern ${index===0?'preview-pattern-next':''}`} key={item.slug}>
      <div className="preview-pattern-heading"><span className="preview-rank">{String(index+1).padStart(2,'0')}</span><div><h3>{item.name}</h3><p>{item.reason}</p></div><NextAction next={index===0} /></div>
      <div className="preview-pattern-metric"><FocusBadge item={item} /><StrengthBar item={item} name={item.name} /></div>
    </li>)}</ol>
    <p className="preview-caption">Product preview · example data, not your personal queue</p>
  </figure>;
}

function Home({signedIn,localMode}){
  const start=signedIn?'#/dashboard':'#/signup',startLabel=signedIn?'Open your dashboard':'Get started';
  return <>
    <section className="public-hero" aria-labelledby="home-title">
      <div className="public-hero-copy"><p className="eyebrow public-eyebrow"><span />More than a solved count</p>
        <h1 id="home-title">You solved it.<br />Now, <span>keep it.</span></h1>
        <p className="public-lead">Know which DSA pattern to practice next. Build balanced coverage, strengthen what you remember, and make your next session count.</p>
        <div className="public-actions"><a className="primary-button" href={start}>{startLabel} <Arrow /></a><a className="public-text-link" href="#/home?section=how-it-works">See how it works <span aria-hidden="true">↘</span></a></div>
        <p className="public-availability">A learning companion for your LeetCode practice.</p>
        {localMode&&<a className="public-local-link inline-link" href="#/dashboard">Open existing local workspace</a>}
        <div className="public-topic-tags" aria-label="Practice organized by patterns"><span>Graphs</span><span>Dynamic programming</span><span>Two pointers</span><span>+ your next challenge</span></div>
      </div>
      <ProductPreview />
    </section>
    <section className="public-how public-section" id="how-it-works" tabIndex={-1} aria-labelledby="how-title">
      <div className="public-section-heading"><p className="eyebrow">A repeatable rhythm</p><h2 id="how-title">Less guessing.<br />More meaningful practice.</h2><p>Keep solving where you already solve.<br />Recall helps you see what to work on next.</p></div>
      <ol className="public-steps">
        <li><span className="step-number">01</span><h3>Bring your experience.</h3><p>Import your accepted LeetCode problems. See them organized by pattern, with gaps across Easy, Medium and Hard.</p><span className="step-tag">Find your starting point</span></li>
        <li><span className="step-number">02</span><h3>Practice with purpose.</h3><p>Follow the pattern queue. After an accepted submission, record the topics you used and how much help you needed.</p><span className="step-tag">Build a meaningful block</span></li>
        <li><span className="step-number">03</span><h3>Keep coming back.</h3><p>Watch experience and recent practice grow together. As freshness fades, your queue helps bring patterns back into focus.</p><span className="step-tag">Strengthen what stays</span></li>
      </ol>
    </section>
    <section className="public-signals public-section" aria-labelledby="signals-title">
      <div className="public-section-heading"><p className="eyebrow">Two signals. One clearer picture.</p><h2 id="signals-title">Have you covered it?<br />Have you kept it?</h2></div>
      <div className="public-signal-grid">
        <article className="public-retention"><p className="eyebrow">Keep what you learn</p><h3>Experience meets<br />recent practice.</h3><StrengthBar item={examples[1]} name="Example Graphs pattern" /><p>Pink builds from experience. Yellow adds dated recent practice. Together, they show estimated strength—not a tested memory score.</p><span className="signal-example">Illustrative Graphs pattern</span></article>
        <article className="public-coverage"><p className="eyebrow">Build a balanced foundation</p><h3>Every difficulty.<br />Every gap matters.</h3><DifficultyMetrics goal={exampleGoal} name="Example pattern" goalConfigured /><p>Extra solves still show in your count. They do not fill a missing difficulty or another subpattern’s goal.</p><span className="signal-example">Illustrative coverage goal</span></article>
      </div>
    </section>
    <section className="public-focus public-section" aria-labelledby="focus-title"><div><p className="eyebrow">Your goal sets the direction</p><h2 id="focus-title">Interview coming up?<br />Or going deeper?</h2><p>Choose Interview Focused or Deep Understanding. Recall adjusts emphasis while keeping your coverage and practice evidence together.</p><a className="public-text-link" href="#/about">Meet the thinking behind Recall <Arrow /></a></div><div className="public-focus-visual" aria-label="Two preparation modes"><span className="focus-mode focus-mode-interview">Interview<br /><strong>focused.</strong><span aria-hidden="true">↗</span></span><span className="focus-mode focus-mode-deep">Deep<br /><strong>understanding.</strong><span aria-hidden="true">✳</span></span><p>Different focus. The same honest progress.</p></div></section>
    <section className="public-faq public-section" id="questions" tabIndex={-1} aria-labelledby="faq-title"><div className="public-section-heading"><p className="eyebrow">A few things to know</p><h2 id="faq-title">Good questions.</h2><p>Clear answers about your practice,<br />your progress, and the current version.</p></div><div className="public-question-list">{questions.map(([question,answer])=><details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className="public-closing" aria-labelledby="closing-title"><p className="eyebrow">Make your next session count</p><h2 id="closing-title">More direction.<br /><span>Less starting over.</span></h2><a className="primary-button" href={start}>{startLabel} <Arrow /></a><p>A clearer direction for your practice.</p></section>
  </>;
}

function About({signedIn,localMode}){
  return <div className="public-about">
    <section className="public-about-hero" aria-labelledby="about-title"><p className="eyebrow public-eyebrow"><span />The idea behind Recall</p><h1 id="about-title">A solved count<br />is only <span>the start.</span></h1><p className="public-lead">You can solve hundreds of problems and still be unsure what to practice tomorrow. Recall brings the patterns behind those problems into view.</p><div className="about-wordmark" aria-hidden="true">recall<span>.</span><span className="about-spark">✳</span></div></section>
    <section className="about-story public-section" aria-labelledby="story-title"><p className="eyebrow">Why it exists</p><div><h2 id="story-title">Progress should give<br />you direction.</h2><p>Recognizing a familiar problem is different from being able to use its pattern again. Solving more in a comfortable area can also hide gaps elsewhere.</p><p>Recall puts coverage and practice evidence beside each other. Patterns are the foundation: what you have explored, where your experience is uneven, and what deserves another session.</p></div></section>
    <section className="about-principles public-section" aria-labelledby="principles-title"><div className="public-section-heading"><p className="eyebrow">What we believe</p><h2 id="principles-title">Useful signals.<br />Honest limits.</h2></div><div className="about-principle-list">
      <article><span>01</span><div><h3>Patterns before totals.</h3><p>Each problem has one primary placement for coverage. Your recorded approach supplies practice evidence, so a raw count never has to pretend it tells the whole story.</p></div></article>
      <article><span>02</span><div><h3>Evidence before confidence.</h3><p>Previous solves matter. Unknown dates stay unknown. Practice strength is an estimate built from the evidence available—not a promise that you will recall a solution.</p></div></article>
      <article><span>03</span><div><h3>Consistency before constant switching.</h3><p>One problem can improve your bar. A meaningful block of work lets the queue reassess, encouraging you to spend enough time with an approach before moving on.</p></div></article>
    </div></section>
    <section className="about-connection public-section" aria-labelledby="connection-title"><div><p className="eyebrow">A companion, not another problem bank</p><h2 id="connection-title">Solve on LeetCode.<br />Reflect with Recall.</h2><p>The Chrome extension connects practice to your workspace. After an accepted submission, choose the topics you used and whether you solved independently, used hints, or read the solution.</p><p>Recall is an independent project and is not affiliated with LeetCode. It never asks for your LeetCode password.</p></div><aside><span aria-hidden="true">↗</span><h3>Where we are today.</h3><p>Local practice works with the Chrome extension. Account setup is ready once sign-in is configured; sign into that same account in extension Settings to connect your practice.</p><a className="primary-button" href={signedIn||localMode?'#/dashboard':'#/signup'}>{signedIn||localMode?'Explore your workspace':'Get started'} <Arrow /></a></aside></section>
  </div>;
}

export default function PublicPages({page,signedIn,localMode}){return page==='about'?<About signedIn={signedIn} localMode={localMode} />:<Home signedIn={signedIn} localMode={localMode} />;}
