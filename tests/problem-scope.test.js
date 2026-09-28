import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dsaExclusion, isDsaTrackingProblem, splitDsaTrackingProblems } from '../apps/api/src/problem-scope.js';

test('LeetCode Database-tagged problems stay stored but outside DSA tracking', () => {
  const sql = { id: 1, patternSlugs: ['database'] };
  const dsa = { id: 2, patternSlugs: ['arrays-hashing', 'sorting'] };
  assert.equal(dsaExclusion(sql), 'database');
  assert.equal(isDsaTrackingProblem(sql), false);
  assert.equal(isDsaTrackingProblem(dsa), true);
  assert.deepEqual(splitDsaTrackingProblems([sql, dsa]), {
    tracked: [dsa],
    excluded: { total: 1, database: 1 },
  });
});
