// Shared by the popup, page prompt, and service worker. No page can choose the destination.
globalThis.DsaRecorder = {
  buildUrl(problem, details = {}) {
    const identity = DsaAdapters.map((adapter) => adapter.getProblem(problem?.url)).find(Boolean);
    if (!identity || identity.platform !== problem.platform || identity.problemId !== problem.problemId) throw new Error('Invalid problem identity.');
    const destination = new URL('http://127.0.0.1:5173/');
    destination.searchParams.set('problem', identity.url);
    if (typeof details.title === 'string' && details.title.trim() && details.title.trim().length <= 200) destination.searchParams.set('title', details.title.trim());
    if (typeof details.attemptedAt === 'string' && Number.isFinite(Date.parse(details.attemptedAt)) && new Date(details.attemptedAt).toISOString() === details.attemptedAt && Date.parse(details.attemptedAt) <= Date.now() + 60000) destination.searchParams.set('attemptedAt', details.attemptedAt);
    destination.hash = 'record-attempt';
    return destination.href;
  },
};
