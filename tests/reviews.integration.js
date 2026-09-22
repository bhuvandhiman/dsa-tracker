import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrate } from '../apps/api/src/migrations.js';
import { createRepository } from '../apps/api/src/repository.js';
import { problemInput, attemptInput } from '../apps/api/src/domain.js';

test('review scheduling uses real latest attempts, bounded pages and exact elapsed-day boundaries', { timeout: 60000 }, async (t) => {
  const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  assert.ok(connectionString, 'Configure DATABASE_URL or TEST_DATABASE_URL.');
  const admin = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });
  const schema = `dsa_review_${randomUUID().replaceAll('-', '')}`;
  assert.match(schema, /^dsa_review_[a-f0-9]{32}$/);
  let pool; let created = false;
  t.after(async () => {
    if (pool) await pool.end();
    try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await admin.end(); }
  });
  await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
  pool = new pg.Pool({ connectionString, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
  await migrate(pool);
  const repo = createRepository(pool);
  const asOf = '2025-01-10T12:00:00.000Z';
  const list = (options = {}) => repo.listReviews({ limit: 10, offset: 0, view: 'due', asOf, ...options });
  assert.deepEqual(await list(), { totalTracked: 0, totalDue: 0, totalMatching: 0, reviews: [] });
  const ids = [];
  for (const slug of ['solution-problem', 'hint-problem', 'independent-problem', 'import-only']) {
    ids.push((await repo.createProblem(problemInput({ url: `https://leetcode.com/problems/${slug}/`, title: slug, patternSlugs: ['binary-search'] }))).problem.id);
  }
  await repo.importHistory([ids[3]]);
  assert.equal((await list()).totalTracked, 0);
  const save = (id, assistance, attemptedAt) => repo.createAttempt(attemptInput({ requestId: randomUUID(), problemId: id, assistance, attemptedAt, patternSlugs: ['arrays-hashing'] }));
  await save(ids[0], 'solution', '2025-01-09T12:00:00.000Z');
  await save(ids[1], 'hint', '2025-01-09T12:00:00.000Z');
  await save(ids[2], 'independent', '2025-01-01T12:00:00.000Z');
  let result = await list();
  assert.equal(result.totalTracked, 3); assert.equal(result.totalDue, 2);
  assert.deepEqual(result.reviews.map((row) => row.problemId), [ids[2], ids[0]]);
  assert.equal(new Date(result.reviews[1].dueAt).toISOString(), asOf);
  assert.deepEqual(result.reviews[1].patternSlugs, ['arrays-hashing']);
  assert.equal((await list({ asOf: '2025-01-10T11:59:59.999Z' })).totalDue, 1);
  const all = await list({ view: 'all' });
  assert.equal(all.totalMatching, 3);
  assert.equal(all.reviews[2].due, false);
  assert.equal(new Date(all.reviews[2].dueAt).toISOString(), '2025-01-12T12:00:00.000Z');
  assert.equal((await list({ limit: 1, offset: 1 })).reviews[0].problemId, ids[0]);
  assert.deepEqual((await list({ offset: 100 })).reviews, []);
  assert.equal((await list({ offset: 100 })).totalDue, 2);
  // New independent practice moves the date; entering an older solve later does not.
  const newest = await save(ids[0], 'independent', asOf);
  await save(ids[0], 'solution', '2025-01-02T12:00:00.000Z');
  result = await list({ view: 'all' });
  const changed = result.reviews.find((row) => row.problemId === ids[0]);
  assert.equal(changed.attemptId, newest.attempt.id);
  assert.equal(new Date(changed.dueAt).toISOString(), '2025-01-17T12:00:00.000Z');
  assert.equal(result.totalDue, 1);
  // A day is 24 elapsed hours even when PostgreSQL's session crosses daylight saving.
  await pool.query("SET TIME ZONE 'America/New_York'");
  await save(ids[0], 'solution', '2025-03-08T17:00:00.000Z');
  const dst = (await list({ view: 'all', asOf: '2025-03-09T17:00:00.000Z' })).reviews.find((row) => row.problemId === ids[0]);
  assert.equal(new Date(dst.dueAt).toISOString(), '2025-03-09T17:00:00.000Z');
  assert.equal(dst.due, true);
});
