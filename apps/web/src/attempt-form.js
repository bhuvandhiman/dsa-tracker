import { leetcodeProblem } from './adapters/leetcode.js';

export const pendingKey = 'recall.pending-attempt.v1';
export const assistanceLabels = { independent: 'Independently', hint: 'With hints', solution: 'Saw the solution' };

export function localDateTime(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function emptyForm() {
  return { problemId: '', url: '', title: '', difficulty: '', assistance: '', patternSlugs: [], notes: '', attemptedAt: localDateTime() };
}

export function extensionDraft(search) {
  const params = new URLSearchParams(search);
  if (!params.has('problem')) return { form: emptyForm(), message: null };
  const problem = leetcodeProblem(params.get('problem'));
  if (!problem) return { form: emptyForm(), message: { severity: 'warning', text: 'The problem link was not recognized. Enter a valid LeetCode URL below.' } };
  const suppliedTitle = params.get('title')?.trim();
  const suppliedTime = params.get('attemptedAt');
  const validTime = typeof suppliedTime === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(suppliedTime) && Number.isFinite(Date.parse(suppliedTime)) && new Date(suppliedTime).toISOString() === suppliedTime && Date.parse(suppliedTime) <= Date.now() + 60000;
  const title = problem.externalId.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
  return {
    form: { ...emptyForm(), url: problem.url, title: suppliedTitle && suppliedTitle.length <= 200 ? suppliedTitle : title, ...(validTime ? { attemptedAt: localDateTime(new Date(suppliedTime)) } : {}) },
    message: { severity: 'info', text: 'Problem details filled in. Review the title and time, then choose assistance and the patterns you actually practiced. Nothing has been saved yet.' },
  };
}

export function prepareSave(form, requestId = crypto.randomUUID()) {
  if (!Object.hasOwn(assistanceLabels, form.assistance)) throw new Error('Choose how you solved this attempt.');
  if (!form.patternSlugs.length) throw new Error('Select at least one pattern you actually used.');
  if (form.notes.length > 5000) throw new Error('Notes must be at most 5000 characters.');
  const date = new Date(form.attemptedAt);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(form.attemptedAt) || !Number.isFinite(date.getTime()) || localDateTime(date) !== form.attemptedAt) throw new Error('Enter a valid local date and time.');
  if (date.getTime() > Date.now() + 60000) throw new Error('The attempt time cannot be in the future.');
  let problem = null;
  const problemId = form.problemId ? Number(form.problemId) : null;
  if (problemId !== null && (!Number.isInteger(problemId) || problemId < 1)) throw new Error('Choose a valid saved problem.');
  if (!problemId) {
    if (!leetcodeProblem(form.url.trim())) throw new Error('Enter an HTTPS problem URL on leetcode.com.');
    if (!form.title.trim() || form.title.trim().length > 200) throw new Error('Enter a problem title of up to 200 characters.');
    // Actual practiced patterns are not automatically declared as the catalog's possible approaches.
    problem = { url: form.url.trim(), title: form.title.trim(), difficulty: form.difficulty || null, patternSlugs: [] };
  }
  return {
    problemId, problem,
    attempt: { requestId, assistance: form.assistance, patternSlugs: [...form.patternSlugs].sort(), notes: form.notes, attemptedAt: date.toISOString() },
  };
}

export function readPending(storage) {
  try {
    const value = JSON.parse(storage.getItem(pendingKey));
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value?.draft?.attempt?.requestId)) return null;
    const rebuilt = prepareSave(value.form, value.draft.attempt.requestId);
    if (JSON.stringify(rebuilt) === JSON.stringify(value.draft)) return value;
  } catch { /* A blocked or outdated browser session must not prevent opening the form. */ }
  return null;
}
