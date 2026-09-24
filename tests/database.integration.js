import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrate } from '../apps/api/src/migrations.js';
import { createRepository } from '../apps/api/src/repository.js';
import { attemptInput, problemInput } from '../apps/api/src/domain.js';

// Explicit opt-in: this file is not included by the default *.test.js glob.
test('PostgreSQL migrations, relationships, persistence and transaction boundaries', { timeout: 60000 }, async (t) => {
  const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  assert.ok(connectionString, 'Set TEST_DATABASE_URL or apps/api/.env DATABASE_URL, then run npm run test:db.');
  const admin = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });
  // Only this generated schema is created/dropped. Existing application tables are untouched.
  const schema = `dsa_test_${randomUUID().replaceAll('-', '')}`;
  assert.match(schema, /^dsa_test_[a-f0-9]{32}$/);
  let pool;
  let created = false;
  t.after(async () => {
    if (pool) await pool.end();
    try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
    finally { await admin.end(); }
  });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  pool = new pg.Pool({ connectionString, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000, max: 5 });
  assert.deepEqual(await migrate(pool), ['001_domain.sql', '002_attempt_corrections.sql', '003_extension_capture.sql', '004_legacy_imports.sql', '005_retention.sql', '006_practice_strength.sql']);
  assert.deepEqual(await migrate(pool), []);
  const repository = createRepository(pool);
  assert.equal((await repository.listPatterns()).length, 35);

  const input = problemInput({ url: 'https://leetcode.com/problems/two-sum/', title: "Two Sum ' quoted", patternSlugs: ['arrays-hashing', 'two-pointers'] });
  const first = await repository.createProblem(input);
  assert.equal(first.created, true);
  const id = first.problem.id;
  const duplicate = await repository.createProblem(input);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.problem.id, id);
  assert.deepEqual(first.problem.patternSlugs, ['arrays-hashing', 'two-pointers']);

  const invalidProblem = { ...input, externalId: 'invalid-new-problem', url: 'https://leetcode.com/problems/invalid-new-problem/', patternSlugs: ['does-not-exist'] };
  await assert.rejects(repository.createProblem(invalidProblem), /patterns do not exist/);
  assert.equal((await repository.listProblems({ limit: 100, offset: 0 })).length, 1);

  const attempt = attemptInput({ requestId: randomUUID(), problemId: id, assistance: 'hint', notes: "' ; DROP TABLE problems; -- is just a note", patternSlugs: ['arrays-hashing'], attemptedAt: '2025-01-01T12:00:00.000Z' });
  const saved = await repository.createAttempt(attempt);
  assert.equal(saved.created, true);
  assert.deepEqual(saved.attempt.patternSlugs, ['arrays-hashing']);
  assert.equal(saved.attempt.notes, attempt.notes);
  const retried = await Promise.all([repository.createAttempt(attempt), repository.createAttempt(attempt)]);
  assert.ok(retried.every((result) => result.created === false));
  await assert.rejects(repository.createAttempt({ ...attempt, assistance: 'solution' }), { status: 409 });
  assert.equal((await repository.listAttempts({ limit: 100, offset: 0 })).length, 1);

  await assert.rejects(repository.createAttempt({ ...attempt, requestId: randomUUID(), patternSlugs: ['missing-pattern'] }), { status: 400 });
  await assert.rejects(repository.createAttempt({ ...attempt, requestId: randomUUID(), problemId: 2147483647 }), { status: 404 });
  assert.equal((await repository.listAttempts({ limit: 100, offset: 0 })).length, 1);

  const anotherAttempt = { ...attempt, requestId: randomUUID(), assistance: 'independent', patternSlugs: ['arrays-hashing', 'two-pointers'] };
  const concurrent = await Promise.all([repository.createAttempt(anotherAttempt), repository.createAttempt(anotherAttempt)]);
  assert.equal(concurrent.filter((result) => result.created).length, 1);
  assert.equal((await repository.listAttempts({ limit: 100, offset: 0 })).length, 2);
  assert.equal((await repository.listAttempts({ limit: 1, offset: 1 })).length, 1);

  const changed = await repository.setProblemPatterns(id, ['binary-search']);
  assert.deepEqual(changed.patternSlugs, ['binary-search']);
  // Editing possible approaches cannot rewrite what was practiced previously.
  const original = (await repository.listAttempts({ limit: 100, offset: 0 })).find((row) => row.id === attempt.requestId);
  assert.deepEqual(original.patternSlugs, ['arrays-hashing']);
  await assert.rejects(repository.setProblemPatterns(id, ['missing-pattern']), { status: 400 });
  assert.deepEqual((await repository.listProblems({ limit: 10, offset: 0 }))[0].patternSlugs, ['binary-search']);

  assert.deepEqual(await repository.importHistory([id]), { imported: 1, alreadyImported: 0 });
  assert.deepEqual(await repository.importHistory([id]), { imported: 0, alreadyImported: 1 });
  const second = await repository.createProblem(problemInput({ url: 'https://leetcode.com/problems/valid-parentheses/', title: 'Valid Parentheses' }));
  await assert.rejects(repository.importHistory([second.problem.id, 2147483647]), { status: 404 });
  assert.equal((await repository.listHistory({ limit: 100, offset: 0 })).length, 1);
  assert.equal((await repository.listAttempts({ limit: 100, offset: 0 })).length, 2);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM problems')).rows[0].count, 2);

  // Reopening the connection verifies storage is PostgreSQL-backed rather than in memory.
  await pool.end();
  pool = new pg.Pool({ connectionString, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
  assert.equal((await createRepository(pool).listAttempts({ limit: 100, offset: 0 })).length, 2);
  assert.equal((await createRepository(pool).listHistory({ limit: 100, offset: 0 })).length, 1);
  await pool.query("UPDATE schema_migrations SET checksum='changed'");
  await assert.rejects(migrate(pool), /Applied migration changed/);
});
