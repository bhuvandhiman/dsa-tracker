// Manifest content scripts are classic scripts, so expose one isolated-world namespace.
// The manifest loads adapters before the platform-neutral content script.
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
});
