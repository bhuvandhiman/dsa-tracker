// This panel lives in an isolated shadow root; page styles cannot break the form.
globalThis.DsaCapture = {
  start(doc, page, runtime) {
    let panel = null, currentUrl = null, timer = null, generation = 0, submission = null;
    const context = () => {
      const adapter = DsaAdapters.find(item => item.getProblem(page.location.href));
      return adapter ? { adapter, problem: adapter.getDetails(doc,page.location.href), topics: adapter.getTopics(doc) } : null;
    };
    function close() { panel?.remove(); panel = null; currentUrl = null; generation++; }
    async function open(evidence = {}) {
      const current = context();
      if (!current || (panel && currentUrl === current.problem.url)) return;
      close();
      const token = generation;
      let pending = null;
      try { pending = (await runtime.sendMessage({ type: 'GET_PENDING_CAPTURE', problem: current.problem }))?.pending; } catch { /* A fresh panel can still explain a save failure. */ }
      if (token !== generation || context()?.problem.url !== current.problem.url) return;
      let practiceContext={units:[{slug:'other',name:'Needs classification'}],practiceUnit:'other'};
      try { const response=await runtime.sendMessage({type:'GET_PRACTICE_CONTEXT',problem:current.problem,topics:current.topics});if(response?.units?.length)practiceContext=response; } catch { /* Saving unspecified remains available offline. */ }
      if (token !== generation || context()?.problem.url !== current.problem.url) return;
      const topics = pending?.topics || current.topics;
      const problem = current.problem;
      let payload = pending;
      const attemptedAt = pending?.attemptedAt || new Date().toISOString();
      panel = doc.createElement('div'); panel.id = 'recall-practice-prompt'; currentUrl = problem.url;
      const root = panel.attachShadow({ mode: 'open' });
      const node = (tag,text) => { const el=doc.createElement(tag); if (text) el.textContent=text; return el; };
      const style = node('style', ':host{position:fixed;right:16px;top:80px;z-index:2147483647;width:340px;max-width:calc(100vw - 32px);font:14px/1.5 system-ui;color:#edf3f7;color-scheme:dark}*{box-sizing:border-box}section{background:#161d27;border:1px solid #354254;border-radius:16px;padding:22px;box-shadow:0 12px 48px #0004;max-height:calc(100dvh - 100px);overflow:auto}header{display:flex;justify-content:space-between;align-items:center}h2{font-size:20px;line-height:1.3;margin:16px 0}fieldset{border:0;padding:0;margin:18px 0}legend{font-weight:650;margin-bottom:8px}label{display:flex;gap:10px;align-items:center;padding:7px 0;cursor:pointer}input{accent-color:#5b8cff;width:17px;height:17px}p{margin:8px 0;overflow-wrap:anywhere;font-size:12px;color:#9aa9ba}button{font:inherit;cursor:pointer;border:0;border-radius:8px;padding:10px;background:#5b8cff;color:#08111f;width:100%}button.close{width:auto;background:transparent;color:#9aa9ba;padding:4px 8px}button:disabled{opacity:.6;cursor:wait}button:focus-visible,input:focus-visible{outline:3px solid #7aa2ff;outline-offset:3px}select{background:#0d1117;color:#edf3f7;border:1px solid #354254;border-radius:8px}select:focus-visible{outline:2px solid #7aa2ff;outline-offset:3px}label:hover{color:#7aa2ff}[role=status]{color:#f3b562}');
      const section=node('section'); section.setAttribute('role','region'); section.setAttribute('aria-label','Record practice in Recall');
      const header=node('header'); header.append(node('strong','recall'));
      const dismiss=node('button','×'); dismiss.className='close'; dismiss.type='button'; dismiss.setAttribute('aria-label','Close recording panel'); dismiss.addEventListener('click',close); header.append(dismiss);
      const heading=node('h2',pending?.title || problem.title || problem.problemId.replaceAll('-',' '));
      const form=node('form');
      const assistance=node('fieldset'); assistance.append(node('legend','How did you solve it?'));
      for (const [value,label] of [['independent','On my own'],['hint','With hints'],['solution','Read the solution']]) {
        const row=node('label'); const input=node('input'); input.type='radio'; input.name='assistance'; input.value=value; input.required=true; input.checked=pending?.assistance===value;
        row.append(input,node('span',label)); assistance.append(row);
      }
      const approachLabel=node('label','Practiced approach');
      const approach=node('select');approach.setAttribute('aria-label','Practiced approach');approach.style.cssText='width:100%;padding:8px;font:inherit';
      for(const unit of practiceContext.units){const option=node('option',(unit.categoryName?unit.categoryName+' · ':'')+unit.name);option.value=unit.slug;approach.append(option);}
      if(pending?.practiceUnit&&!practiceContext.units.some(u=>u.slug===pending.practiceUnit)){const option=node('option',pending.practiceUnit);option.value=pending.practiceUnit;approach.append(option);}
      approach.value=pending?.practiceUnit||practiceContext.practiceUnit;
      const topicFields=node('fieldset'); topicFields.append(node('legend','Topics used (optional)'));
      for (const topic of topics) {
        const row=node('label'); const input=node('input'); input.type='checkbox'; input.name='topic'; input.value=topic; input.checked=Boolean(pending?.selectedTopics.includes(topic)); row.append(input,node('span',topic)); topicFields.append(row);
      }
      topicFields.append(node('p',topics.length ? 'Optional context only. These do not refresh additional patterns.' : 'No topics detected. You can still save; choose the approach above.'));
      const status=node('p'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
      const submit=node('button',pending ? 'Retry save' : 'Save practice'); submit.type='submit';
      const lock = value => { assistance.disabled=value; topicFields.disabled=value; approach.disabled=value; };
      if (pending) { lock(true); status.textContent='An unfinished recording was restored. Retry saves the same attempt.'; }
      let busy=false;
      form.addEventListener('submit',async event => {
        event.preventDefault(); if (!event.isTrusted || busy) return;
        const choice=assistance.querySelector('input:checked');
        if (!payload && !choice) { status.textContent='Choose how you solved it.'; return; }
        payload ||= { requestId: crypto.randomUUID(), url: problem.url, title: heading.textContent, difficulty:problem.difficulty??null,
          practiceUnit:approach.value, approachSource:approach.value==='other'?'inferred':'confirmed', captureSource:evidence.captureSource||'manual', submissionId:evidence.submissionId||null, topics, selectedTopics: [...topicFields.querySelectorAll('input:checked')].map(input=>input.value), assistance: choice.value, attemptedAt };
        busy=true; lock(true); submit.disabled=true; dismiss.disabled=true; status.textContent='Saving…';
        try {
          const result=await runtime.sendMessage({ type:'SAVE_CAPTURE', problem, payload });
          if (!result?.saved) {
            if (result?.editable) { payload=null; lock(false); }
            throw new Error(result?.error || 'Could not confirm the save. Use Retry save.');
          }
          if (generation === token && currentUrl === problem.url) close();
        } catch (error) { status.textContent=error.message || 'Reload the extension and refresh this page, then retry.'; submit.textContent=payload ? 'Retry save' : 'Save practice'; }
        finally { busy=false; submit.disabled=false; dismiss.disabled=false; }
      });
      form.append(assistance,approachLabel,approach,topicFields,status,submit); section.append(header,heading,form); root.append(style,section); doc.documentElement.append(panel);
    }
    function check() {
      timer=null;const current=context();
      if(currentUrl&&current?.problem.url!==currentUrl)close();
      if(!submission)return;
      if(current?.problem.url!==submission.url||Date.now()-submission.started>120000){submission=null;return;}
      const result=current.adapter.submissionResult(doc);
      if(result.pending)submission.sawPending=true;
      const newIdentity=result.submissionId&&result.submissionId!==submission.initial.submissionId;
      if(!result.terminal||(!submission.sawPending&&!newIdentity))return;
      submission=null;
      if(result.accepted)void open({captureSource:'accepted',submissionId:result.submissionId});
    }
    function arm(current){submission={url:current.problem.url,started:Date.now(),initial:current.adapter.submissionResult(doc),sawPending:false};schedule();}
    function schedule() { if(submission&&context()?.adapter.submissionResult(doc).pending)submission.sawPending=true; if (timer===null) timer=page.setTimeout(check,150); }
    doc.addEventListener('click',event => { const current=context(); if (!event.isTrusted || !current) return; if (current.adapter.isSubmit(event.target)) arm(current); else if (current.adapter.isRun(event.target) || event.target.closest?.('a[href]')) submission=null; },true);
    doc.addEventListener('keydown',event => { const current=context(); if (event.isTrusted && current?.adapter.isSubmitShortcut(event)) arm(current); },true);
    const observer=new MutationObserver(schedule); observer.observe(doc.documentElement,{childList:true,subtree:true,characterData:true,attributes:true});
    page.addEventListener('popstate',()=>{submission=null;schedule();});
    page.addEventListener('pagehide',() => { submission=null; close(); observer.disconnect(); if (timer!==null) page.clearTimeout(timer); timer=null; });
    page.addEventListener('pageshow',() => observer.observe(doc.documentElement,{childList:true,subtree:true,characterData:true,attributes:true}));
    return { open };
  },
};
