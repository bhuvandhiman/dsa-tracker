// This panel lives in an isolated shadow root; page styles cannot break the form.
globalThis.DsaCapture = {
  start(doc, page, runtime) {
    let panel = null, currentUrl = null, timer = null, generation = 0, submission = null, keepDraft = null, returnFocus = null, disposeTheme = null, currentScope = null;
    const context = () => {
      const adapter = DsaAdapters.find(item => item.getProblem(page.location.href));
      return adapter ? { adapter, problem: adapter.getDetails(doc,page.location.href), topics: adapter.getTopics(doc) } : null;
    };
    function close() { keepDraft?.(); keepDraft=null; disposeTheme?.(); disposeTheme=null; panel?.remove(); panel = null; currentUrl = null; generation++; returnFocus?.focus?.(); }
    async function open(evidence = {}) {
      const current = context();
      if (!current) return;
      if (panel && currentUrl === current.problem.url) {
        if(evidence.captureSource==='accepted') {
          let result;try{result=await runtime.sendMessage({type:'QUEUE_CAPTURE',problem:current.problem,workspaceScope:currentScope,evidence:{...evidence,eventId:evidence.submissionId||crypto.randomUUID(),attemptedAt:evidence.attemptedAt||new Date().toISOString()}});}catch{result={error:'Could not keep the next submission. Reload Recall and refresh LeetCode.'};}
          const status=panel.shadowRoot?.querySelector('[role=status]'); if(status)status.textContent=result?.error||'Another Accepted submission is kept in the queue. Save this recording to open it next.';
        }
        return;
      }
      close();
      const token = generation;
      let pending = null, draft = null, queue = [], workspaceScope = null, connectionError;
      try { const stored=await runtime.sendMessage({ type: 'GET_PENDING_CAPTURE', problem: current.problem }); connectionError=stored?.error||'';workspaceScope=stored?.workspaceScope;currentScope=workspaceScope;pending=stored?.pending;draft=stored?.draft;queue=stored?.queue||[]; } catch { connectionError='Reload Recall and sign in through extension Settings.'; }
      if (token !== generation || context()?.problem.url !== current.problem.url) return;
      let catalog=[];
      const restored = pending || draft;
      if(restored&&evidence.captureSource==='accepted'&&(evidence.submissionId!==restored.submissionId||evidence.attemptedAt!==restored.attemptedAt)){
        try{const result=await runtime.sendMessage({type:'QUEUE_CAPTURE',problem:current.problem,workspaceScope,evidence:{...evidence,eventId:evidence.submissionId||crypto.randomUUID()}});connectionError=result?.error||connectionError;queue=result?.queue||queue;}catch{connectionError='Could not keep the next submission. Reload Recall and refresh LeetCode.';}
      }
      if(draft)evidence={...evidence,captureSource:draft.captureSource,submissionId:draft.submissionId};
      if(!restored&&queue.length){evidence=queue[0];try{const result=await runtime.sendMessage({type:'SHIFT_CAPTURE',problem:current.problem,workspaceScope});connectionError=result?.error||connectionError;}catch{connectionError='Could not open the queued submission. Reload Recall and refresh LeetCode.';}}
      let topics = pending?.topics || current.topics;
      const problem = current.problem;
      let payload = pending;
      const attemptedAt = restored?.attemptedAt || evidence.attemptedAt || new Date().toISOString();
      returnFocus=doc.activeElement;
      panel = doc.createElement('div'); panel.id = 'recall-practice-prompt'; currentUrl = problem.url;
      const root = panel.attachShadow({ mode: 'open' });
      const node = (tag,text) => { const el=doc.createElement(tag); if (text) el.textContent=text; return el; };
      const style = node('style', (globalThis.DsaTheme?.styles || '') + `
        :host{position:fixed;right:16px;top:72px;z-index:2147483647;width:360px;max-width:calc(100% - 32px);font:14px/1.6 'Trebuchet MS','Segoe UI',sans-serif;color:var(--ink)}
        *{box-sizing:border-box}section{background:var(--canvas);border:1px solid var(--line);border-top:4px solid var(--coral);border-radius:22px;padding:20px;box-shadow:0 12px 48px #0003;max-height:calc(100dvh - 96px);overflow:auto}
        header{display:flex;gap:8px;align-items:center}.brand{margin-right:auto;font-size:20px;letter-spacing:-.8px}h2{font-size:23px;line-height:1.25;letter-spacing:-.6px;margin:20px 0}
        fieldset{border:0;padding:0;margin:20px 0;min-width:0}legend{font-weight:700;margin-bottom:10px}label{display:flex;gap:10px;align-items:center;min-height:44px;padding:8px 10px;cursor:pointer;border-radius:12px}
        fieldset label{background:var(--surface);border:1px solid var(--line);margin:8px 0}fieldset label:has(input:checked){background:var(--soft-coral);border-color:var(--coral)}
        input{accent-color:var(--teal);width:18px;height:18px;flex-shrink:0}
        .pattern-picker{padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}.pattern-picker label{display:block;padding:0;font-weight:700}
        input[type=search],select{width:100%;font:inherit;color:var(--ink);background:var(--canvas);border:1px solid var(--line);border-radius:10px;padding:10px;margin:8px 0;min-width:0}input[type=search]{height:44px}select{min-height:160px}select option{padding:8px}select:focus-visible{outline:3px solid var(--focus);outline-offset:3px}

        p{margin:10px 0;overflow-wrap:anywhere;font-size:12px;color:var(--muted)}button{font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1px solid transparent;border-radius:14px;min-height:44px;padding:12px;background:var(--ink);color:var(--canvas);width:100%}
        button+button{margin-top:10px}button:hover:not(:disabled){background:var(--teal);color:#fffdec}button.close{width:44px;min-width:44px;background:var(--surface);border-color:var(--line);color:var(--muted);padding:4px 8px;font-size:23px;margin:0}button.theme-toggle{margin:0}
        button:disabled{opacity:.6;cursor:default}button:focus-visible,input:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
        [role=status]{color:var(--accent)}[hidden]{display:none!important}@media(max-width:400px){:host{right:12px;top:16px;max-width:calc(100% - 24px)}section{max-height:calc(100dvh - 32px);padding:18px}}@media(prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
      `);
      const section=node('section'); section.setAttribute('role','region'); section.setAttribute('aria-label','Record practice in Recall');
      const header=node('header'); const brand=node('strong','recall.');brand.className='brand';header.append(brand);
      const themeButton=node('button');themeButton.className='theme-toggle';themeButton.type='button';themeButton.setAttribute('aria-label','Switch to dark mode');header.append(themeButton);
      disposeTheme=globalThis.DsaTheme?.init(panel,themeButton);
      const dismiss=node('button','×'); dismiss.className='close'; dismiss.type='button'; dismiss.setAttribute('aria-label','Close recording panel'); dismiss.addEventListener('click',close); header.append(dismiss);
      const heading=node('h2',pending?.title || problem.title || problem.problemId.replaceAll('-',' '));
      const form=node('form');
      const assistance=node('fieldset'); assistance.append(node('legend','How did you solve it?'));
      for (const [value,label] of [['independent','On my own'],['hint','With hints'],['solution','Read the solution']]) {
        const row=node('label'); const input=node('input'); input.type='radio'; input.name='assistance'; input.value=value; input.required=true; input.checked=restored?.assistance===value;
        row.append(input,node('span',label)); assistance.append(row);
      }
      const topicFields=node('fieldset');topicFields.append(node('legend','Topics used'));
      const topicRows=node('div');topicFields.append(topicRows);
      const otherRow=node('label'),other=node('input');other.type='checkbox';other.checked=restored?.classification?.mode==='manual';other.setAttribute('aria-label','Other');otherRow.append(other,node('span','Other'));topicFields.append(otherRow);
      const picker=node('div');picker.className='pattern-picker';picker.id='recall-pattern-picker';picker.setAttribute('role','region');picker.setAttribute('aria-label','Choose another pattern');picker.hidden=!other.checked;other.setAttribute('aria-controls',picker.id);
      const searchLabel=node('label','Search patterns'),search=node('input');search.type='search';search.placeholder='Search any pattern…';search.setAttribute('aria-label','Search patterns');searchLabel.append(search);
      const patternLabel=node('label','Choose a pattern'),pattern=node('select');pattern.size=6;pattern.setAttribute('aria-label','Choose a pattern');patternLabel.append(pattern);
      let manualUnit=restored?.classification?.mode==='manual'?restored.classification.unit:'';
      const matchesNote=node('p');picker.append(searchLabel,patternLabel,matchesNote);topicFields.append(picker);
      topicFields.append(node('p','Choose at least one topic you used, or select Other to choose a pattern. Specialized topics take precedence.'));
      function renderPatterns(){
        const term=search.value.trim().toLowerCase();
        const matches=catalog.filter(unit=>(unit.categoryName+' '+unit.name).toLowerCase().includes(term));
        const selected=catalog.find(unit=>unit.slug===manualUnit);
        pattern.replaceChildren();const placeholder=node('option','Choose a pattern');placeholder.value='';pattern.append(placeholder);
        const entries=selected&&!matches.some(unit=>unit.slug===selected.slug)?[selected,...matches]:matches;
        for(const unit of entries){const option=node('option',unit.categoryName+' · '+unit.name);option.value=unit.slug;pattern.append(option);}
        // Frozen older/manual saves remain readable even if catalog loading fails.
        if(payload&&manualUnit&&!selected){const option=node('option',manualUnit);option.value=manualUnit;pattern.append(option);}
        pattern.value=manualUnit;pattern.required=other.checked&&!payload;
        matchesNote.textContent=catalog.length?(matches.length?`${matches.length} patterns`:'No matching patterns. Try another name.'):'Loading patterns…';
      }
      function renderTopics(){
        const selected=new Set(topicRows.children.length?[...topicRows.querySelectorAll('input:checked')].map(input=>input.value):restored?.selectedTopics||[]);
        topicRows.replaceChildren();
        for(const topic of topics){
          const row=node('label'),input=node('input');input.type='checkbox';input.name='topic';input.value=topic;input.checked=!other.checked&&selected.has(topic);
          input.addEventListener('change',()=>{if(input.checked){other.checked=false;picker.hidden=true;pattern.required=false;}});
          row.append(input,node('span',topic));topicRows.append(row);
        }
        if(!topics.length)topicRows.append(node('p','No topics detected. Select Other to choose a pattern.'));
      }
      other.addEventListener('change',()=>{
        picker.hidden=!other.checked;pattern.required=other.checked&&!payload;
        if(other.checked){for(const input of topicRows.querySelectorAll('input'))input.checked=false;search.focus();}
      });
      search.addEventListener('input',renderPatterns);pattern.addEventListener('change',()=>{manualUnit=pattern.value;});renderTopics();renderPatterns();
      const status=node('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
      const collect=()=>({assistance:assistance.querySelector('input:checked')?.value||'',classification:other.checked?{mode:'manual',unit:manualUnit}:{mode:'topics'},selectedTopics:[...topicRows.querySelectorAll('input:checked')].map(input=>input.value),attemptedAt,captureSource:evidence.captureSource||'manual',submissionId:evidence.submissionId||null});
      keepDraft=()=>{if(!payload)try{void runtime.sendMessage({type:'SAVE_EDITABLE_DRAFT',problem,workspaceScope,draft:collect()}).catch(()=>{});}catch{/* A reloaded extension cannot store the draft until the page is refreshed. */}};
      form.addEventListener('change',()=>{if(!payload&&!busy)status.textContent='';keepDraft?.();});
      form.addEventListener('input',()=>keepDraft?.());
      root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
      const submit=node('button',pending ? 'Retry save' : 'Save practice'); submit.type='submit';
      const lock = value => { assistance.disabled=value; topicFields.disabled=value; };
      if (pending) { lock(true); status.textContent='An unfinished recording was restored. Retry saves the same attempt.'; }
      let busy=false;
      form.addEventListener('submit',async event => {
        event.preventDefault(); if (!event.isTrusted || busy) return;
        const choice=assistance.querySelector('input:checked');
        if (!payload && !choice) { status.textContent='Choose how you solved it.'; return; }
        busy=true; lock(true); submit.disabled=true; dismiss.disabled=true; status.textContent='Saving…';
        try {
          if(!payload){
            await detailsReady;
            const values=collect();
            if(values.classification.mode==='topics'&&!values.selectedTopics.length)throw new Error('Choose at least one topic or select Other to choose a pattern.');
            if(values.classification.mode==='manual'&&!catalog.some(unit=>unit.slug===values.classification.unit))throw new Error('Choose a pattern from Other before saving.');
            const username=await DsaLegacy.account();
            payload={requestId:crypto.randomUUID(),username,url:problem.url,title:heading.textContent,difficulty:problem.difficulty??null,topics,...values,approachSource:'confirmed'};
          }
          const result=await runtime.sendMessage({ type:'SAVE_CAPTURE', problem,workspaceScope, payload });
          if (!result?.saved) {
            if (result?.editable) { payload=null; lock(false); }
            throw new Error(result?.error || 'Could not confirm the save. Use Retry save.');
          }
          if (generation === token && currentUrl === problem.url) {
            keepDraft=null;close();
            const notice=doc.createElement('div');notice.setAttribute('role','status');notice.textContent='Recall: practice saved.';notice.style.cssText='position:fixed;right:16px;bottom:24px;z-index:2147483647;background:#fafbe9;color:#202720;border:1px solid #2c8075;padding:16px;border-radius:12px;font:14px Trebuchet MS,Segoe UI,sans-serif';if(root.host.getAttribute('data-theme')==='dark'){notice.style.background='#232d26';notice.style.color='#f3f2df';notice.style.borderColor='#82cabb';}doc.documentElement.append(notice);page.setTimeout(()=>notice.remove(),4000);
            const stored=await runtime.sendMessage({type:'GET_PENDING_CAPTURE',problem,workspaceScope});
            if(stored?.queue?.length)await open();
          }
        } catch (error) { status.textContent=error.message || 'Reload the extension and refresh this page, then retry.'; submit.textContent=payload ? 'Retry save' : 'Save practice'; }
        finally { busy=false; submit.disabled=false; dismiss.disabled=false;reconcile.hidden=!payload;if(!payload)lock(false); }
      });
      const reconcile=node('button','Check whether this recording was saved');reconcile.type='button';reconcile.hidden=!pending;
      const release=node('button','Keep conflict copy and start a separate recording');release.type='button';release.hidden=true;
      release.addEventListener('click',async()=>{release.disabled=true;try{const result=await runtime.sendMessage({type:'RELEASE_CONFLICT',problem,workspaceScope});if(!result.released)throw new Error(result.error||'Could not release conflict.');payload=null;lock(false);reconcile.hidden=true;release.hidden=true;submit.textContent='Save practice';status.textContent='The old choices are archived in extension Settings. Check the form before creating a separate recording.';}catch(error){status.textContent=error.message;}finally{release.disabled=false;}});
      reconcile.addEventListener('click',async()=>{reconcile.disabled=true;try{const result=await runtime.sendMessage({type:'RECONCILE_CAPTURE',problem,workspaceScope});if(result.error)throw new Error(result.error);if(result.status==='saved'){keepDraft=null;close();return;}release.hidden=result.status!=='conflict';status.textContent=result.status==='removed'?'This recording was removed. Restore it in the dashboard Workspace page.':result.status==='conflict'?'This ID belongs to different saved choices. Keep a copy before starting a separate recording.':'No saved recording was found. Retry saves the same request ID.';}catch(error){status.textContent=error.message;}finally{reconcile.disabled=false;}});
      form.append(assistance,topicFields,status,submit,reconcile,release); section.append(header,heading,form); root.append(style,section); doc.documentElement.append(panel);dismiss.focus();
      if(!pending)status.textContent=draft?`Your editable draft was restored.${queue.length?' New Accepted submissions are queued.':''}`:'';
      if(connectionError)status.textContent=connectionError;
      async function loadContext(){
        try{
          if(!pending&&!topics.length&&globalThis.DsaLegacy?.topics){
            const username=await DsaLegacy.account();const metadata=(await DsaLegacy.topics([problem.problemId],username))[0];
            if(token!==generation)return;
            topics=metadata.topics;problem.difficulty??=metadata.difficulty;problem.title||=metadata.title;
            renderTopics();
          }
          const response=await runtime.sendMessage({type:'GET_PRACTICE_CONTEXT',problem,workspaceScope,topics});
          if(token!==generation)return;
          if(!response?.units?.length)throw new Error('Pattern catalog unavailable.');
          catalog=response.units.filter(unit=>unit.slug!=='other');renderPatterns();
          if(!busy&&!pending)status.textContent=draft?'Your editable draft was restored.':'';
          keepDraft?.();
          retry.hidden=true;
        }catch{if(token===generation){matchesNote.textContent='Patterns unavailable. Retry problem details to load them.';if(!busy&&!pending)status.textContent=connectionError||'Pattern list unavailable. You can still classify using the detected topics.';retry.hidden=false;}}
      }
      const retry=node('button','Retry problem details');retry.type='button';retry.hidden=true;
      let detailsReady;
      retry.addEventListener('click',()=>{if(!busy)detailsReady=loadContext();});form.append(retry);keepDraft?.();detailsReady=loadContext();
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
