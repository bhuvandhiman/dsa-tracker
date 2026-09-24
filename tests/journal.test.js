import assert from 'node:assert/strict';
import { test } from 'node:test';
import { correctionInput, libraryInput, revisionInput, uuid } from '../apps/api/src/domain.js';
const valid = { revision: 1, assistance: 'hint', patternSlugs: ['arrays-hashing'], notes: '', attemptedAt: '2025-01-01T00:00:00.000Z' };
test('corrections validate editable fields and reject identity or revision mistakes', () => {
  assert.deepEqual(correctionInput(valid), valid);
  for (const bad of [{ ...valid, revision: 0 }, { ...valid, revision: 1.5 }, { ...valid, problemId: 2 }, { ...valid, requestId: 'anything' }, { ...valid, assistance: 'unknown' }, { ...valid, patternSlugs: [] }, { ...valid, attemptedAt: 'yesterday' }, { ...valid, notes: 'x'.repeat(5001) }]) assert.throws(() => correctionInput(bad), { status: 400 });
  assert.throws(() => revisionInput({ revision: 1, other: true }), { status: 400 });
  assert.throws(() => uuid('not-a-uuid'), { status: 400 });
});
test('library filtering remains bounded and rejects unexpected query shapes', () => {
  assert.deepEqual(libraryInput({}), { limit: 50, offset: 0, q: '', pattern: '', category: '', status: 'all' });
  assert.equal(libraryInput({ q: '  Two Sum  ', status: 'historical' }).q, 'Two Sum');
  for (const query of [{ limit: '101' }, { offset: '-1' }, { q: ['a', 'b'] }, { q: 'x'.repeat(201) }, { pattern: {} }, { category: [] }, { category: 'x'.repeat(101) }, { status: 'solved' }, { unknown: 'yes' }]) assert.throws(() => libraryInput(query), { status: 400 });
});
