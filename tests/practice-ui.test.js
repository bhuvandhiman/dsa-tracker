import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { prepareSave, readPending, localDateTime } from '../apps/web/src/attempt-form.js';
import { requestJson, saveAttempt } from '../apps/web/src/api.js';

const form = () => ({ problemId: '', url: 'https://leetcode.com/problems/two-sum/', title: 'Two Sum', difficulty: 'easy', assistance: 'hint', notes: 'Needed help with the map.', patternSlugs: ['arrays-hashing'], attemptedAt: '2025-01-02T12:30' });
test('form produces UTC timestamps and keeps actual approaches separate from problem tags', () => {
  const draft = prepareSave(form());
  assert.deepEqual(draft.problem.patternSlugs, []);
  assert.deepEqual(draft.attempt.patternSlugs, ['arrays-hashing']);
  assert.equal(localDateTime(new Date(draft.attempt.attemptedAt)), '2025-01-02T12:30');
});
test('existing problem attempts do not require reentering metadata', () => {
  const draft = prepareSave({ ...form(), problemId: '7', url: '', title: '' });
  assert.equal(draft.problemId, 7);
  assert.equal(draft.problem, null);
});
test('assistance and practiced patterns require an explicit choice', () => {
  assert.throws(() => prepareSave({ ...form(), assistance: '' }), /Choose how/);
  assert.throws(() => prepareSave({ ...form(), patternSlugs: [] }), /at least one/);
});
test('bad URLs, titles, note lengths, dates and IDs are rejected before a request', () => {
  for (const override of [{ url: 'https://example.com/problems/two-sum/' }, { url: 'https://user@leetcode.com/problems/two-sum/' }, { title: ' ' }, { notes: 'a'.repeat(5001) }, { attemptedAt: '2025-02-30T10:00' }, { attemptedAt: '2999-01-01T10:00' }, { problemId: '-1' }]) assert.throws(() => prepareSave({ ...form(), ...override }));
});
test('pending saves restore their exact request identity after a page reload', () => {
  const value = { form: form(), draft: prepareSave(form()) };
  assert.deepEqual(readPending({ getItem: () => JSON.stringify(value) }), value);
  for (const text of ['not json', 'null', '{}', JSON.stringify({ form: {}, draft: { attempt: { requestId: randomUUID() } } })]) assert.equal(readPending({ getItem: () => text }), null);
  assert.equal(readPending({ getItem() { throw new Error('Storage blocked'); } }), null);
});
test('API failures preserve validation status and useful messages', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Choose a pattern.' }, { status: 400 }));
  await assert.rejects(requestJson('/attempts', { body: {} }), { message: 'Choose a pattern.', status: 400 });
});
test('network failure remains ambiguous instead of claiming the write failed', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Network disconnected'); });
  await assert.rejects(requestJson('/attempts', { body: {} }), (error) => error.status === undefined && /Could not reach/.test(error.message));
});
test('save retries send identical attempt IDs and times after a lost response', async (t) => {
  const draft = prepareSave(form());
  const attempts = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body);
    if (url.endsWith('/problems')) return Response.json({ problem: { id: 7 } });
    attempts.push(body);
    if (attempts.length === 1) throw new TypeError('Lost response after commit');
    return Response.json({ created: false, attempt: { id: body.requestId } });
  });
  await assert.rejects(saveAttempt(draft));
  const result = await saveAttempt(draft);
  assert.equal(result.created, false);
  assert.deepEqual(attempts[0], attempts[1]);
  assert.equal(attempts[0].requestId, draft.attempt.requestId);
});
test('existing-problem saves issue only one request and reject unconfirmed success', async (t) => {
  const draft = prepareSave({ ...form(), problemId: '7' });
  const mock = t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, '/api/attempts');
    return Response.json({ attempt: { id: 'wrong-id' } });
  });
  await assert.rejects(saveAttempt(draft), /did not confirm/);
  assert.equal(mock.mock.callCount(), 1);
});
