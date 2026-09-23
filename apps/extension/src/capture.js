// A small state machine separate from DOM observation for deterministic testing.
globalThis.DsaCapture = {
  createTracker() {
    let armed = null;
    const seen = new Set();
    return {
      arm(problem, previousId, now, previousStatus = null) { armed = problem ? { problem, previousId, startedAt: now, ready: previousStatus !== 'Accepted' } : null; },
      cancel() { armed = null; },
      observe(problem, submission, now) {
        if (!armed) return null;
        if (!problem || problem.url !== armed.problem.url || now - armed.startedAt > 120000) { armed = null; return null; }
        if (submission?.status !== 'Accepted') armed.ready = true;
        if (!armed.ready || !submission || submission.id === armed.previousId || !submission.status) return null;
        const original = armed;
        armed = null;
        if (submission.status !== 'Accepted' || seen.has(submission.id)) return null;
        seen.add(submission.id);
        if (seen.size > 100) seen.delete(seen.values().next().value);
        return { problem: original.problem, attemptedAt: new Date(now).toISOString() };
      },
    };
  },
  start(doc, page, runtime) {
    const tracker = this.createTracker();
    let prompt = null;
    let timer = null;
    const context = () => {
      const adapter = DsaAdapters.find((item) => item.getProblem(page.location.href));
      return adapter ? { adapter, problem: adapter.getDetails(doc, page.location.href) } : null;
    };
    function removePrompt() { prompt?.remove(); prompt = null; }
    function show(capture) {
      removePrompt();
      prompt = doc.createElement('div');
      prompt.id = 'recall-practice-prompt';
      const root = prompt.attachShadow({ mode: 'open' });
      const style = doc.createElement('style');
      style.textContent = ':host{position:fixed;bottom:20px;right:20px;z-index:2147483647;width:320px;max-width:calc(100vw - 40px);font:14px/1.5 system-ui;color:#20332f}section{background:#fff;border:1px solid #b5ccc4;border-radius:12px;padding:18px;box-shadow:0 6px 30px #0003}h2{font-size:17px;margin:0 0 8px}p{margin:8px 0;overflow-wrap:anywhere}button{font:inherit;border:1px solid #175f55;border-radius:6px;padding:8px 12px;cursor:pointer;margin:8px 8px 0 0;background:#175f55;color:white}button:last-of-type{background:white;color:#175f55}button:focus-visible{outline:3px solid #c89026;outline-offset:2px}button:disabled{opacity:.6}';
      const section = doc.createElement('section');
      section.setAttribute('role', 'region'); section.setAttribute('aria-label', 'Recall practice reminder');
      const heading = doc.createElement('h2'); heading.textContent = 'Accepted — record your practice?';
      const description = doc.createElement('p'); description.textContent = capture.problem.title || capture.problem.problemId;
      const guidance = doc.createElement('p'); guidance.textContent = 'Choose assistance and practiced patterns in Recall. Nothing is saved automatically.';
      const status = doc.createElement('p'); status.setAttribute('role', 'status');
      const open = doc.createElement('button'); open.type = 'button'; open.textContent = 'Open recording form';
      const dismiss = doc.createElement('button'); dismiss.type = 'button'; dismiss.textContent = 'Dismiss';
      open.addEventListener('click', async () => {
        if (open.disabled) return;
        open.disabled = true;
        try {
          const result = await runtime.sendMessage({ type: 'OPEN_RECORDER', problem: capture.problem, attemptedAt: capture.attemptedAt });
          if (!result?.opened) throw new Error('Not opened');
          status.textContent = 'Form opened. Review the details and save there.';
        } catch {
          open.disabled = false;
          status.textContent = 'Could not open Recall. Reload the extension or use its popup to record manually.';
        }
      });
      dismiss.addEventListener('click', removePrompt);
      section.append(heading, description, guidance, open, dismiss, status);
      root.append(style, section); doc.documentElement.append(prompt);
    }
    function check() {
      timer = null;
      const current = context();
      if (prompt && (!current || prompt.dataset.problem !== current.problem.url)) removePrompt();
      const capture = tracker.observe(current?.problem, current?.adapter.getSubmission(doc, page.location.href), Date.now());
      if (capture) { show(capture); prompt.dataset.problem = capture.problem.url; }
    }
    function schedule() { if (timer === null) timer = page.setTimeout(check, 150); }
    function arm(current) {
      removePrompt();
      tracker.arm(current.problem, current.adapter.getSubmissionId(page.location.href), Date.now(), current.adapter.getSubmission(doc, page.location.href)?.status);
      schedule();
    }
    doc.addEventListener('keydown', (event) => {
      const current = context();
      if (event.isTrusted && current?.adapter.isSubmitShortcut(event)) arm(current);
    }, true);
    doc.addEventListener('click', (event) => {
      if (!event.isTrusted) return;
      const current = context();
      if (current?.adapter.isSubmit(event.target)) arm(current);
      else if (event.target.closest?.('a[href]')) tracker.cancel();
    }, true);
    const observer = new MutationObserver(schedule);
    observer.observe(doc.documentElement, { childList: true, subtree: true, characterData: true });
    page.addEventListener('popstate', () => { tracker.cancel(); schedule(); });
    page.addEventListener('pagehide', () => { tracker.cancel(); removePrompt(); observer.disconnect(); if (timer !== null) page.clearTimeout(timer); timer = null; });
    page.addEventListener('pageshow', () => { observer.observe(doc.documentElement, { childList: true, subtree: true, characterData: true }); schedule(); });
  },
};
