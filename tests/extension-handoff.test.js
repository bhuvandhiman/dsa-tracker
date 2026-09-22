import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extensionDraft } from '../apps/web/src/attempt-form.js';
import { leetcodeProblem } from '../apps/web/src/adapters/leetcode.js';

test('extension link prefills only problem metadata, leaving practice evidence explicit', () => {
  const { form, message } = extensionDraft('?problem=' + encodeURIComponent('https://leetcode.com/problems/two-sum/description/?envId=test#code'));
  assert.equal(form.url, 'https://leetcode.com/problems/two-sum/');
  assert.equal(form.title, 'Two Sum');
  assert.equal(form.assistance, '');
  assert.deepEqual(form.patternSlugs, []);
  assert.equal(form.notes, '');
  assert.equal(form.problemId, '');
  assert.equal(message.severity, 'info');
});

test('invalid launch links show guidance without populating the form', () => {
  for (const url of ['javascript:alert(1)', 'https://leetcode.com.evil.test/problems/a/', 'https://leetcode.com/problems/-a/', 'https://leetcode.com/problems/a--b/', 'https://u:p@leetcode.com/problems/a/', 'https://leetcode.com:444/problems/a/', 'http://leetcode.com/problems/a/', 'https://codeforces.com/problemset/problem/1/A', '']) {
    const { form, message } = extensionDraft('?problem=' + encodeURIComponent(url));
    assert.equal(form.url, '', url);
    assert.equal(message.severity, 'warning', url);
  }
});

test('ordinary dashboard visits have no launch message or metadata', () => {
  const { form, message } = extensionDraft('?unrelated=value');
  assert.equal(message, null);
  assert.equal(form.title, '');
});

test('LeetCode adapter exposes a stable provider identity', () => {
  assert.deepEqual(leetcodeProblem('https://leetcode.com/problems/3sum/solutions/42'), { platform: 'leetcode', externalId: '3sum', url: 'https://leetcode.com/problems/3sum/' });
  assert.equal(leetcodeProblem('not a URL'), null);
});
