import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrate } from '../apps/api/src/migrations.js';
import { createRepository } from '../apps/api/src/repository.js';
import { legacyInput, recentInput } from '../apps/api/src/domain.js';

async function fixture(t) {
  const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  assert.ok(connectionString, 'An isolated test database is required');
  const schema = 'recall_bulk_' + randomUUID().replaceAll('-', '');
  const admin = new pg.Pool({connectionString, connectionTimeoutMillis:5000});
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({connectionString, options:'-c search_path=' + schema, connectionTimeoutMillis:5000});
  t.after(async () => { await pool.end(); try { await admin.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await admin.end(); } });
  await migrate(pool);
  const queries = [];
  const tracked = {query:(...args) => pool.query(...args), async connect() {
    const client = await pool.connect();
    return {query:(...args) => { queries.push(args[0]); return client.query(...args); }, release:discard => client.release(discard)};
  }};
  return {pool, repo:createRepository(tracked), queries};
}
const problem = (index, overrides={}) => ({url:`https://leetcode.com/problems/bulk-fixture-${index}/`,title:`Bulk fixture ${index}`,difficulty:'easy',topics:['Array','Hash Table','Math'],...overrides});
const legacy = problems => legacyInput({runId:randomUUID(),username:'alice',complete:false,problems});
const recent = submissions => recentInput({runId:randomUUID(),username:'alice',submissions});
const submission = (index, overrides={}) => ({...problem(index),submissionId:String(index+100),submittedAt:'2025-01-01T12:00:00.000Z',...overrides});

test('bulk solved imports have constant query cost, including retries and existing problems', {timeout:60000}, async t => {
  const {repo,queries,pool} = await fixture(t);
  for (const count of [1,10]) {
    const batch = legacy(Array.from({length:count},(_,i) => problem(count*100+i)));
    queries.length=0;
    assert.equal((await repo.importLegacy(batch)).added,count);
    assert.equal(queries.length,10,'One and ten problems must use the same number of database round trips');
    queries.length=0;
    const replay=await repo.importLegacy(batch);
    assert.equal(replay.added,0); assert.equal(replay.alreadyPresent,count); assert.equal(queries.length,10);
    await repo.importLegacy({...batch,problems:[],complete:true});
    assert.equal((await repo.legacyStatus(batch.installationId)).completed,true);
    assert.equal((await repo.importLegacy(batch)).added,0);
  }
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM historical_solves')).rows[0].n,11);
});

test('repeated problems preserve first title/difficulty, last provider snapshot and all associations', {timeout:60000}, async t => {
  const {repo,pool}=await fixture(t);
  const batch=legacy([
    problem(1,{title:'First title',difficulty:undefined}),
    problem(1,{title:'Second title',difficulty:'hard',topics:['Stack']}),
    problem(1,{title:'Last title',difficulty:'medium',topics:[]}),
  ]);
  const result=await repo.importLegacy(batch);
  assert.equal(result.added,1); assert.equal(result.alreadyPresent,2);
  const row=(await pool.query('SELECT * FROM problems')).rows[0];
  assert.equal(row.title,'First title'); assert.equal(row.difficulty,'hard'); assert.deepEqual(row.provider_topics,[]);
  const slugs=(await pool.query('SELECT pattern_slug FROM problem_patterns ORDER BY pattern_slug')).rows.map(row=>row.pattern_slug);
  assert.deepEqual(slugs,['arrays-hashing','hash-table','math','stack','uncategorized']);
  await repo.setPlacement(row.id,'two-pointers',true);
  await repo.importLegacy(legacy([problem(1,{title:'Replacement',difficulty:'easy',topics:['Tree']})]));
  const saved=(await pool.query('SELECT * FROM problems')).rows[0];
  assert.equal(saved.title,'First title'); assert.equal(saved.difficulty,'hard'); assert.deepEqual(saved.provider_topics,['Tree']);
  assert.equal((await pool.query('SELECT unit_slug FROM problem_placements')).rows[0].unit_slug,'two-pointers');
});

test('bulk imports remain atomic for unknown patterns and overlapping concurrent batches', {timeout:60000}, async t => {
  const {repo,pool}=await fixture(t);
  const body=legacy([problem(1),problem(2)]);
  body.problems[1].patternSlugs=['nonexistent-fixture'];
  await assert.rejects(repo.importLegacy(body),{status:400});
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM problems')).rows[0].n,0);
  assert.equal((await repo.legacyStatus(body.installationId)).completed,false);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM legacy_imports')).rows[0].n,0);
  const results=await Promise.all([repo.importLegacy(legacy([problem(1),problem(2)])),repo.importLegacy(legacy([problem(2),problem(3)]))]);
  assert.equal(results.reduce((sum,result)=>sum+result.added,0),3);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM historical_solves')).rows[0].n,3);
  await assert.rejects(repo.importLegacy({...legacy([problem(4)]),username:'bob'}),{status:409});
});

test('recent imports use constant queries for repeated problems and deduplicate submission evidence', {timeout:60000}, async t => {
  const {repo,pool,queries}=await fixture(t);
  const rows=Array.from({length:20},(_,i)=>submission(i,{url:problem(1).url}));
  queries.length=0;
  assert.equal((await repo.importRecent(recent(rows))).added,20); assert.equal(queries.length,13);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM problems')).rows[0].n,1);
  queries.length=0;
  const replay=await repo.importRecent(recent([rows[0],rows[0]]));
  assert.equal(replay.added,0); assert.equal(replay.alreadyPresent,2); assert.equal(queries.length,13);
  const fresh=submission(99,{topics:[]});
  const duplicate=await repo.importRecent(recent([fresh,fresh]));
  assert.equal(duplicate.added,1); assert.equal(duplicate.alreadyPresent,1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM imported_submissions')).rows[0].n,21);
});

test('conflicting recent submission IDs roll back metadata and all new evidence', {timeout:60000}, async t => {
  const {repo}=await fixture(t);
  const original=submission(1);
  await repo.importRecent(recent([original]));
  const before=(await repo.backup()).tables;
  for (const rows of [
    [submission(2),{...original,submittedAt:'2025-01-02T12:00:00.000Z',topics:['Tree']}],
    [submission(2,{submissionId:original.submissionId})],
    [submission(3),submission(4,{submissionId:'103'})],
    [submission(3),submission(3,{submittedAt:'2025-01-03T12:00:00.000Z'})],
  ]) {
    await assert.rejects(repo.importRecent(recent(rows)),{status:409});
    assert.deepEqual((await repo.backup()).tables,before);
  }
  assert.equal((await repo.importRecent(recent([]))).completed,true);
});
