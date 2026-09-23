// Classic content scripts share only this isolated-world adapter namespace.
globalThis.DsaAdapters = globalThis.DsaAdapters || [];
globalThis.DsaAdapters.push({
  id: 'leetcode',
  getProblem(href) {
    let url;
    try { url = new URL(href); } catch { return null; }
    if (url.protocol !== 'https:' || url.hostname !== 'leetcode.com' || url.port || url.username || url.password) return null;
    const match = url.pathname.match(/^\/problems\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/);
    if (!match) return null;
    return { platform: 'leetcode', problemId: match[1], url: `https://leetcode.com/problems/${match[1]}/` };
  },
  getDetails(doc, href) {
    const problem = this.getProblem(href);
    if (!problem) return null;
    // Match the title link to this exact problem, never a related-problem title.
    for (const link of doc.querySelectorAll('.text-title-large a[href]')) {
      if (this.getProblem(link.href)?.url !== problem.url) continue;
      const title = link.textContent.replace(/^\s*\d+\.\s*/, '').trim();
      if (title && title.length <= 200) return { ...problem, title };
    }
    return problem;
  },
  isSubmit(target) { return Boolean(target.closest?.('[data-e2e-locator="console-submit-button"]:not([disabled])')); },
  isSubmitShortcut(event) { return !event.repeat && !event.altKey && !event.shiftKey && (event.ctrlKey || event.metaKey) && event.key === 'Enter'; },
  getSubmissionId(href) {
    if (!this.getProblem(href)) return null;
    return new URL(href).pathname.match(/^\/problems\/[^/]+\/submissions\/([0-9]+)\/?$/)?.[1] || null;
  },
  getSubmission(doc, href) {
    const id = this.getSubmissionId(href);
    if (!id) return null;
    // Never search page-wide text: descriptions include aggregate "Accepted" counts,
    // and the Run panel can report success without an accepted submission.
    const node = doc.querySelector('[data-e2e-locator="submission-result"]');
    const text = node?.getClientRects().length ? node.textContent.trim() : '';
    const terminal = ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Memory Limit Exceeded', 'Runtime Error', 'Compile Error', 'Output Limit Exceeded'];
    return { id, status: terminal.includes(text) ? text : null };
  },
});
