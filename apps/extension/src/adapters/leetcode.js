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
      let difficulty = null, scope = link.parentElement;
      for (let level = 0; scope && level < 5 && !difficulty; level++, scope = scope.parentElement) {
        for (const node of scope.querySelectorAll?.('[class*="text-difficulty-"]') || []) {
          const value = node.textContent?.trim()?.toLowerCase();
          if (['easy','medium','hard'].includes(value)) { difficulty = value; break; }
        }
      }
      if (title && title.length <= 200) return { ...problem, title, difficulty };
    }
    return problem;
  },
  getTopics(doc) {
    // Topic links use /tag/ paths; never infer topics from the description text.
    const topics = [];
    for (const link of doc.querySelectorAll('a[href*="/tag/"]')) {
      let section = link.parentElement;
      let inTopics = false;
      for (let level = 0; section && level < 5; level++, section = section.parentElement) {
        if (section.firstElementChild?.textContent.trim() === 'Topics') { inTopics = true; break; }
      }
      if (!inTopics) continue;
      let url; try { url = new URL(link.href, 'https://leetcode.com'); } catch { continue; }
      if (url.origin !== 'https://leetcode.com' || !/^\/tag\/[a-z0-9-]+\/?$/.test(url.pathname)) continue;
      const name = link.textContent.trim();
      if (name && name.length <= 100 && !topics.includes(name)) topics.push(name);
      if (topics.length === 30) break;
    }
    return topics;
  },
  submissionResult(doc) {
    const verdict=/^(Pending|Judging|Running|Submitting|Accepted|Wrong Answer|Time Limit Exceeded|Runtime Error|Compile Error|Memory Limit Exceeded|Output Limit Exceeded|Internal Error)(\b|…|$)/i;
    // Primary locators first; attribute substrings stay stable across layout generations.
    let node=doc.querySelector('[data-e2e-locator="submission-result"], [data-e2e-locator="submission-result-status"], [data-e2e-locator="console-result"], [data-testid*="submission-result"], [data-testid*="verdict"], [class*="result-state"]');
    let text=node?.textContent?.trim()||'';
    if(!verdict.test(text)) {
      node=[...doc.querySelectorAll('span, div')].find(candidate=>{
        const value=candidate.textContent?.trim()||'';
        if(!value||value.length>40||!verdict.test(value))return false;
        if(candidate.getAttribute?.('aria-label')&&verdict.test(candidate.getAttribute('aria-label')))return true;
        const className=typeof candidate.className==='string'?candidate.className:'';
        return /(text-(green|red|yellow|orange)|font-(medium|semibold)|result-state|verdict)/i.test(className);
      })||null;
      text=node?.textContent?.trim()||'';
    }
    const link=doc.querySelector('a[href*="/submissions/detail/"]');
    const submissionId=link?.getAttribute('href')?.match(/\/submissions\/detail\/(\d+)/)?.[1]||null;
    return {node,text,submissionId,pending:/^(Pending|Judging|Running|Submitting)(\b|…)/i.test(text),accepted:/^Accepted(\b|$)/.test(text),terminal:/^(Accepted|Wrong Answer|Time Limit Exceeded|Runtime Error|Compile Error|Memory Limit Exceeded|Output Limit Exceeded|Internal Error)(\b|$)/.test(text)};
  },
  isRun(target) {
    const direct=target.closest?.('[data-e2e-locator="console-run-button"], [data-cy="run-code-btn"], [data-testid*="run"]');
    if(direct)return !direct.disabled&&this.labelled(direct,'run');
    const button=target.closest?.('button');
    return Boolean(button&&!button.disabled&&this.labelled(button,'run'));
  },
  isSubmit(target) {
    const direct=target.closest?.('[data-e2e-locator="console-submit-button"], [data-cy="submit-code-btn"], [data-testid*="submit"]');
    if(direct)return !direct.disabled&&this.labelled(direct,'submit');
    const button=target.closest?.('button');
    return Boolean(button&&!button.disabled&&this.labelled(button,'submit'));
  },
  // Actions match the first word of the label or text. Strict equality broke when
  // LeetCode added icons, counts or shortcut hints inside login-safe variants.
  labelled(node,action) {
    const text=`${node.getAttribute?.('aria-label')??''} ${typeof node.textContent==='string'?node.textContent:''}`;
    return new RegExp(`^${action}\\b`,'i').test(text.replace(/\s+/g,' ').trim());
  },
  isSubmitShortcut(event) { return !event.repeat && !event.altKey && !event.shiftKey && (event.ctrlKey || event.metaKey) && event.key === 'Enter'; },
});
