// This panel lives in an isolated shadow root; page styles cannot break the form.
globalThis.DsaCapture = {
  start(doc, page, runtime) {
    let panel = null, currentUrl = null, timer = null, generation = 0, submission = null, keepDraft = null, returnFocus = null;
    const context = () => {
      const adapter = DsaAdapters.find(item => item.getProblem(page.location.href));
      return adapter ? { adapter, problem: adapter.getDetails(doc,page.location.href), topics: adapter.getTopics(doc) } : null;
    };
    function close() { keepDraft?.(); keepDraft=null; panel?.remove(); panel = null; currentUrl = null; generation++; returnFocus?.focus?.(); }
    async function open(evidence = {}) {
      const current = context();
      if (!current) return;
      if (panel && currentUrl === current.problem.url) {
        if(evidence.captureSource==='accepted') {
          await runtime.sendMessage({type:'QUEUE_CAPTURE',problem:current.problem,evidence:{...evidence,eventId:evidence.submissionId||crypto.randomUUID(),attemptedAt:evidence.attemptedAt||new Date().toISOString()}});
          const status=panel.shadowRoot?.querySelector('[role=status]'); if(status)status.textContent='Another Accepted submission is kept in the queue. Save this recording to open it next.';
        }
        return;
      }
      close();
      const token = generation;
      let pending = null, draft = null, queue = [];
      try { const stored=await runtime.sendMessage({ type: 'GET_PENDING_CAPTURE', problem: current.problem }); pending=stored?.pending;draft=stored?.draft;queue=stored?.queue||[]; } catch { /* A fresh panel can still explain a save failure. */ }
      if (token !== generation || context()?.problem.url !== current.problem.url) return;
      let practiceContext={units:[{slug:'other',name:'Needs classification'}],practiceUnit:'other'};
      const restored = pending || draft;
      if(restored&&evidence.captureSource==='accepted'&&(evidence.submissionId!==restored.submissionId||evidence.attemptedAt!==restored.attemptedAt)){
        const result=await runtime.sendMessage({type:'QUEUE_CAPTURE',problem:current.problem,evidence:{...evidence,eventId:evidence.submissionId||crypto.randomUUID()}});queue=result?.queue||queue;
      }
      if(draft)evidence={...evidence,captureSource:draft.captureSource,submissionId:draft.submissionId};
      if(!restored&&queue.length){evidence=queue[0];await runtime.sendMessage({type:'SHIFT_CAPTURE',problem:current.problem});}
      let topics = pending?.topics || current.topics;
      const problem = current.problem;
      let payload = pending;
      const attemptedAt = restored?.attemptedAt || evidence.attemptedAt || new Date().toISOString();
      returnFocus=doc.activeElement;
      panel = doc.createElement('div'); panel.id = 'recall-practice-prompt'; currentUrl = problem.url;
      const root = panel.attachShadow({ mode: 'open' });
      const node = (tag,text) => { const el=doc.createElement(tag); if (text) el.textContent=text; return el; };
      const style = node('style', ':host{position:fixed;right:16px;top:80px;z-index:2147483647;width:340px;max-width:calc(100vw - 32px);font:14px/1.5 system-ui;color:#edf3f7;color-scheme:dark}*{box-sizing:border-box}section{background:#161d27;border:1px solid #354254;border-radius:16px;padding:22px;box-shadow:0 12px 48px #0004;max-height:calc(100dvh - 100px);overflow:auto}header{display:flex;justify-content:space-between;align-items:center}h2{font-size:20px;line-height:1.3;margin:16px 0}fieldset{border:0;padding:0;margin:18px 0}legend{font-weight:650;margin-bottom:8px}label{display:flex;gap:10px;align-items:center;min-height:44px;padding:7px 0;cursor:pointer}input{accent-color:#5b8cff;width:17px;height:17px}p{margin:8px 0;overflow-wrap:anywhere;font-size:12px;color:#9aa9ba}button{font:inherit;cursor:pointer;border:0;border-radius:8px;min-height:44px;padding:10px;background:#5b8cff;color:#08111f;width:100%}button.close{width:auto;min-width:44px;background:transparent;color:#9aa9ba;padding:4px 8px}button:disabled{opacity:.6;cursor:wait}button:focus-visible,input:focus-visible{outline:3px solid #7aa2ff;outline-offset:3px}select{background:#0d1117;color:#edf3f7;border:1px solid #354254;border-radius:8px}select:focus-visible{outline:2px solid #7aa2ff;outline-offset:3px}label:hover{color:#7aa2ff}[role=status]{color:#f3b562}');
      const section=node('section'); section.setAttribute('role','region'); section.setAttribute('aria-label','Record practice in Recall');
      const header=node('header'); header.append(node('strong','recall'));
      const dismiss=node('button','×'); dismiss.className='close'; dismiss.type='button'; dismiss.setAttribute('aria-label','Close recording panel'); dismiss.addEventListener('click',close); header.append(dismiss);
      const heading=node('h2',pending?.title || problem.title || problem.problemId.replaceAll('-',' '));
      const form=node('form');
      const assistance=node('fieldset'); assistance.append(node('legend','How did you solve it?'));
      for (const [value,label] of [['independent','On my own'],['hint','With hints'],['solution','Read the solution']]) {
        const row=node('label'); const input=node('input'); input.type='radio'; input.name='assistance'; input.value=value; input.required=true; input.checked=restored?.assistance===value;
        row.append(input,node('span',label)); assistance.append(row);
      }
      const approachLabel=node('label','Practiced approach');
      const approach=node('select');approach.setAttribute('aria-label','Practiced approach');approach.style.cssText='width:100%;padding:8px;font:inherit';
      for(const unit of practiceContext.units){const option=node('option',(unit.categoryName?unit.categoryName+' · ':'')+unit.name);option.value=unit.slug;approach.append(option);}
      if(pending?.practiceUnit&&!practiceContext.units.some(u=>u.slug===pending.practiceUnit)){const option=node('option',pending.practiceUnit);option.value=pending.practiceUnit;approach.append(option);}
      approach.value=restored?.practiceUnit||practiceContext.practiceUnit;
      const topicFields=node('fieldset'); topicFields.append(node('legend','Topics used (optional)'));
      for (const topic of topics) {
        const row=node('label'); const input=node('input'); input.type='checkbox'; input.name='topic'; input.value=topic; input.checked=Boolean(restored?.selectedTopics?.includes(topic)); row.append(input,node('span',topic)); topicFields.append(row);
      }
      topicFields.append(node('p',topics.length ? 'Optional context only. These do not refresh additional patterns.' : 'No topics detected. You can still save; choose the approach above.'));
      const status=node('p'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
      const timeLabel=node('label','Practiced at (your browser time)');
      const time=node('input');time.type='datetime-local';time.step='1';time.setAttribute('aria-label','Practiced at');time.style.cssText='width:100%;height:44px';
      const at=new Date(attemptedAt);time.value=new Date(at.getTime()-at.getTimezoneOffset()*60000).toISOString().slice(0,19);
      const initialTime=time.value;
      const collect=()=>({assistance:assistance.querySelector('input:checked')?.value||'',practiceUnit:approach.value,selectedTopics:[...topicFields.querySelectorAll('input:checked')].map(input=>input.value),attemptedAt:time.value===initialTime?attemptedAt:new Date(time.value).toISOString(),captureSource:evidence.captureSource||'manual',submissionId:evidence.submissionId||null});
      keepDraft=()=>{if(!payload&&time.value)try{void runtime.sendMessage({type:'SAVE_EDITABLE_DRAFT',problem,draft:collect()}).catch(()=>{});}catch{/* Invalid local time remains on the form until corrected. */}};
      form.addEventListener('change',()=>keepDraft?.());
      form.addEventListener('input',()=>keepDraft?.());
      root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
      const submit=node('button',pending ? 'Retry save' : 'Save practice'); submit.type='submit';
      const lock = value => { assistance.disabled=value; topicFields.disabled=value; approach.disabled=value;time.disabled=value; };
      if (pending) { lock(true); status.textContent='An unfinished recording was restored. Retry saves the same attempt.'; }
      let busy=false;
      form.addEventListener('submit',async event => {
        event.preventDefault(); if (!event.isTrusted || busy) return;
        const choice=assistance.querySelector('input:checked');
        if (!payload && !choice) { status.textContent='Choose how you solved it.'; return; }
        busy=true; lock(true); submit.disabled=true; dismiss.disabled=true; status.textContent='Saving…';
        try {
          if(!payload){
            const username=await DsaLegacy.account();
            const values=collect();
            payload={requestId:crypto.randomUUID(),username,url:problem.url,title:heading.textContent,difficulty:problem.difficulty??null,topics,...values,approachSource:approach.value==='other'?'inferred':'confirmed'};
          }
          const result=await runtime.sendMessage({ type:'SAVE_CAPTURE', problem, payload });
          if (!result?.saved) {
            if (result?.editable) { payload=null; lock(false); }
            throw new Error(result?.error || 'Could not confirm the save. Use Retry save.');
          }
          if (generation === token && currentUrl === problem.url) {
            keepDraft=null;close();
            const notice=doc.createElement('div');notice.setAttribute('role','status');notice.textContent='Recall: practice saved.';notice.style.cssText='position:fixed;right:16px;bottom:24px;z-index:2147483647;background:#161d27;color:#edf3f7;border:1px solid #45d483;padding:16px;border-radius:12px;font:14px system-ui';doc.documentElement.append(notice);page.setTimeout(()=>notice.remove(),4000);
            const stored=await runtime.sendMessage({type:'GET_PENDING_CAPTURE',problem});
            if(stored?.queue?.length)await open();
          }
        } catch (error) { status.textContent=error.message || 'Reload the extension and refresh this page, then retry.'; submit.textContent=payload ? 'Retry save' : 'Save practice'; }
        finally { busy=false; submit.disabled=false; dismiss.disabled=false;reconcile.hidden=!payload;if(!payload)lock(false); }
      });
      const reconcile=node('button','Check whether this recording was saved');reconcile.type='button';reconcile.hidden=!pending;
      const release=node('button','Keep conflict copy and start a separate recording');release.type='button';release.hidden=true;
      release.addEventListener('click',async()=>{release.disabled=true;try{const result=await runtime.sendMessage({type:'RELEASE_CONFLICT',problem});if(!result.released)throw new Error(result.error||'Could not release conflict.');payload=null;lock(false);reconcile.hidden=true;release.hidden=true;submit.textContent='Save practice';status.textContent='The old choices are archived in extension Settings. Check the form before creating a separate recording.';}catch(error){status.textContent=error.message;}finally{release.disabled=false;}});
      reconcile.addEventListener('click',async()=>{reconcile.disabled=true;try{const result=await runtime.sendMessage({type:'RECONCILE_CAPTURE',problem});if(result.status==='saved'){keepDraft=null;close();return;}release.hidden=result.status!=='conflict';status.textContent=result.status==='removed'?'This recording was removed. Restore it in dashboard Settings.':result.status==='conflict'?'This ID belongs to different saved choices. Keep a copy before starting a separate recording.':'No saved recording was found. Retry saves the same request ID.';}catch(error){status.textContent=error.message;}finally{reconcile.disabled=false;}});
      form.append(assistance,approachLabel,approach,topicFields,timeLabel,time,status,submit,reconcile,release); section.append(header,heading,form); root.append(style,section); doc.documentElement.append(panel);dismiss.focus();
      if(!pending)status.textContent=draft?`Your editable draft was restored.${queue.length?' New Accepted submissions are queued.':''}`:'Loading approaches… You can fill the form now.';
      async function loadContext(){
        try{
          if(!pending&&!topics.length&&globalThis.DsaLegacy?.topics){
            const username=await DsaLegacy.account();const metadata=(await DsaLegacy.topics([problem.problemId],username))[0];
            if(token!==generation)return;
            topics=metadata.topics;problem.difficulty??=metadata.difficulty;problem.title||=metadata.title;
            topicFields.replaceChildren(node('legend','Topics used (optional)'));
            for(const topic of topics){const row=node('label'),input=node('input');input.type='checkbox';input.name='topic';input.value=topic;row.append(input,node('span',topic));topicFields.append(row);}
          }
          const response=await runtime.sendMessage({type:'GET_PRACTICE_CONTEXT',problem,topics});
          if(token!==generation)return;
          if(!response?.units?.length)throw new Error(response?.error||'Approaches unavailable.');
          const selected=approach.value;approach.replaceChildren();
          for(const unit of response.units){const option=node('option',(unit.categoryName?unit.categoryName+' · ':'')+unit.name);option.value=unit.slug;approach.append(option);}
          approach.value=restored?.practiceUnit||(selected!=='other'?selected:response.practiceUnit);
          if(!pending)status.textContent=draft?'Your editable draft was restored.':'Choose the approach you actually practiced.';
          retry.hidden=true;
        }catch(error){if(token===generation){status.textContent=error.message+' Save with Needs classification or retry approaches.';retry.hidden=false;}}
      }
      const retry=node('button','Retry approaches');retry.type='button';retry.hidden=true;retry.addEventListener('click',()=>void loadContext());form.append(retry);keepDraft?.();void loadContext();
    }
    function check() {
      timer=null;const current=context();
      if(currentUrl&&current?.problem.url!==currentUrl)close();
      if(!submission)return;
      if(current?.problem.url!==submission.url||Date.now()-submission.started>120000){submission=null;return;}
      const result=current.adapter.submissionResult(doc);
      if(result.pending)submission.sawPending=true;
      const newIdentity=result.submissionId&&result.submissionId!==submission.initial.submissionId;
      const changedNode=result.node&&result.node!==submission.initial.node;
      const changedText=result.text&&result.text!==submission.initial.text;
      if(!result.terminal||(!submission.sawPending&&!newIdentity&&!changedNode&&!changedText))return;
      submission=null;
      if(result.accepted)void open({captureSource:'accepted',submissionId:result.submissionId||page.location.href.match(/\/submissions\/(?:detail\/)?(\d+)/)?.[1]||null,attemptedAt:new Date().toISOString()});
    }
    function arm(current){submission={url:current.problem.url,started:Date.now(),initial:current.adapter.submissionResult(doc),sawPending:false};schedule();}
    function schedule() { if(submission&&context()?.adapter.submissionResult(doc).pending)submission.sawPending=true; if (timer===null) timer=page.setTimeout(check,150); }
    doc.addEventListener('click',event => { const current=context(); if (!event.isTrusted || !current) return; if (current.adapter.isSubmit(event.target)) arm(current); else if (current.adapter.isRun(event.target) || event.target.closest?.('a[href]')) submission=null; },true);
    doc.addEventListener('keydown',event => { const current=context(); if (event.isTrusted && current?.adapter.isSubmitShortcut(event)) arm(current); },true);
    const observer=new MutationObserver(()=>{if(submission||currentUrl&& !page.location.href.startsWith(currentUrl))schedule();}); observer.observe(doc.documentElement,{childList:true,subtree:true,characterData:true});
    page.addEventListener('popstate',()=>{submission=null;schedule();});
    page.addEventListener('pagehide',() => { submission=null; close(); observer.disconnect(); if (timer!==null) page.clearTimeout(timer); timer=null; });
    page.addEventListener('pageshow',() => observer.observe(doc.documentElement,{childList:true,subtree:true,characterData:true}));
    return { open };
  },
};
