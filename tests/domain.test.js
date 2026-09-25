import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { attemptInput, problemInput, importInput, pageInput, patternInput, goalInput } from '../apps/api/src/domain.js';

const attempt = () => ({ requestId: randomUUID(), problemId: 1, assistance: 'independent', patternSlugs: ['binary-search'], attemptedAt: '2025-01-02T03:04:05.000Z' });
test('problem identity removes query strings and problem subpages', () => {
  const value = problemInput({ url: 'https://leetcode.com/problems/two-sum/description/?x=1#example', title: ' Two Sum ', patternSlugs: ['two-pointers', 'arrays-hashing', 'two-pointers'] });
  assert.deepEqual(value, { platform: 'leetcode', externalId: 'two-sum', url: 'https://leetcode.com/problems/two-sum/', title: 'Two Sum', difficulty: null, patternSlugs: ['arrays-hashing', 'two-pointers'] });
});
for (const url of ['https://leetcode.com.evil.test/problems/two-sum/', 'https://user@leetcode.com/problems/two-sum/', 'https://leetcode.com:444/problems/two-sum/', 'http://leetcode.com/problems/two-sum/', 'https://codeforces.com/problemset/problem/1/A', 'not a url']) {
  test(`reject unsupported problem URL: ${url}`, () => assert.throws(() => problemInput({ url, title: 'test' }), /LeetCode/));
}
test('assistance and explicitly selected patterns are required', () => {
  for (const assistance of ['independent', 'hint', 'solution']) assert.equal(attemptInput({ ...attempt(), assistance }).assistance, assistance);
  assert.throws(() => attemptInput({ ...attempt(), assistance: 'unknown' }), /assistance/);
  assert.throws(() => attemptInput({ ...attempt(), patternSlugs: [] }), /at least one/);
  assert.throws(() => attemptInput({ ...attempt(), patternSlugs: undefined }), /patternSlugs/);
});
test('attempt normalization preserves notes and does not infer additional patterns', () => {
  const input = { ...attempt(), notes: "Needed a hint; 'quotes' and <code> are plain text.", patternSlugs: ['stack', 'stack'] };
  const normalized = attemptInput(input);
  assert.deepEqual(normalized.patternSlugs, ['stack']);
  assert.equal(normalized.notes, input.notes);
  assert.equal(normalized.requestId, input.requestId);
});
for (const attemptedAt of ['2025-02-30T00:00:00.000Z', '2025-01-01', '2025-01-01T00:00:00', '2999-01-01T00:00:00.000Z']) {
  test(`reject invalid or ambiguous attempt date: ${attemptedAt}`, () => assert.throws(() => attemptInput({ ...attempt(), attemptedAt }), /attemptedAt/));
}
test('invalid IDs, excess notes and unexpected fields are rejected', () => {
  for (const problemId of [0, -1, 1.5, {}, '1 OR 1=1', 2147483648]) assert.throws(() => attemptInput({ ...attempt(), problemId }), /problem ID/);
  assert.throws(() => attemptInput({ ...attempt(), requestId: 'not-a-uuid' }), /UUID/);
  assert.throws(() => attemptInput({ ...attempt(), notes: 'a'.repeat(5001) }), /notes/);
  assert.throws(() => attemptInput({ ...attempt(), score: 100 }), /unsupported/);
  assert.throws(() => problemInput(null), /JSON object/);
});
test('history imports deduplicate IDs and do not accept fabricated attempt details', () => {
  assert.deepEqual(importInput({ problemIds: [2, 1, 2] }), [1, 2]);
  assert.throws(() => importInput({ problemIds: [] }), /1–100/);
  assert.throws(() => importInput({ problemIds: [1], assistance: 'independent' }), /unsupported/);
  assert.throws(() => importInput({ problemIds: Array(101).fill(1) }), /1–100/);
});
test('pagination is bounded and rejects repeated query parameters', () => {
  assert.deepEqual(pageInput({}), { limit: 50, offset: 0 });
  assert.deepEqual(pageInput({ limit: '10', offset: '20' }), { limit: 10, offset: 20 });
  for (const query of [{ limit: '101' }, { limit: '0' }, { offset: '-1' }, { limit: ['5', '10'] }, { surprise: 'yes' }]) assert.throws(() => pageInput(query));
  assert.deepEqual(patternInput({ patternSlugs: [] }), []);
});
test('goal configuration accepts only supported profiles and target sizes', () => {
  assert.deepEqual(goalInput({ profile: 'interview', target: 500 }), { profile: 'interview', target: 500 });
  assert.deepEqual(goalInput({ profile: 'deep', target: 1000 }), { profile: 'deep', target: 1000 });
  for (const input of [
    { profile: 'balanced', target: 500 },
    { profile: 'interview', target: 400 },
    { profile: 'interview', target: '500' },
  ]) assert.throws(() => goalInput(input), /profile|target/);
});
