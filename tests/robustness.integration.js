import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {migrate} from '../apps/api/src/migrations.js';
import {createRepository} from '../apps/api/src/repository.js';
import {captureInput,legacyInput} from '../apps/api/src/domain.js';
import {exportBackup} from '../apps/api/src/backup.js';
import {BACKUP_MAX_BYTES,backupFileText} from '../apps/shared/backup-limits.js';
import {backupSummary} from '../apps/web/src/workflow-model.js';

async function database(t){
  const connectionString=process.env.TEST_DATABASE_URL||process.env.DATABASE_URL;
  const admin=new pg.Pool({connectionString,connectionTimeoutMillis:5000}),schema='robustness_test_'+randomUUID().replaceAll('-','');
  await admin.query('CREATE SCHEMA '+schema);
  const pool=new pg.Pool({connectionString,options:'-c search_path='+schema,connectionTimeoutMillis:5000});
  t.after(async()=>{await pool.end();await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.end();});
  await migrate(pool);return pool;
}
const raw=()=>({username:'alice',requestId:randomUUID(),url:'https://leetcode.com/problems/two-sum/',title:'Two Sum',topics:['Array','Hash Table'],selectedTopics:[],assistance:'independent',attemptedAt:'2025-01-01T00:00:00.123Z',practiceUnit:'hashing',approachSource:'confirmed'});
const provider={url:'https://leetcode.com/problems/two-sum/',title:'Two Sum',topics:['Hash Table'],difficulty:'easy'};

test('retries preserve newer provider metadata and concurrent same-owner retries create one recording',async t=>{
  const pool=await database(t),repo=createRepository(pool),input=captureInput(raw());
  const results=await Promise.all([repo.capture(input),repo.capture(input)]);
  assert.equal(results.filter(result=>result.created).length,1);
  await repo.importLegacy(legacyInput({runId:randomUUID(),username:'alice',problems:[provider],complete:true}));
  const before=(await pool.query('SELECT provider_topics,difficulty FROM problems')).rows[0];
  assert.deepEqual(before.provider_topics,['Hash Table']);
  assert.equal((await repo.capture(input)).created,false);
  assert.deepEqual((await pool.query('SELECT provider_topics,difficulty FROM problems')).rows[0],before);
  assert.equal((await repo.listAttempts({limit:10,offset:0})).length,1);
});

test('problem lists use one snapshot while an import commits between classification and pagination',async t=>{
  const pool=await database(t),repo=createRepository(pool);await repo.capture(captureInput(raw()));
  let imported=false;
  const concurrent=createRepository({connect:async()=>{
    const client=await pool.connect();return {release:discard=>client.release(discard),query:async(sql,params)=>{
      const result=await client.query(sql,params);
      if(!imported&&sql.startsWith('SELECT p.id')){imported=true;await repo.importLegacy(legacyInput({runId:randomUUID(),username:'alice',problems:[{...provider,url:'https://leetcode.com/problems/contains-duplicate/',title:'Contains Duplicate'}],complete:true}));}
      return result;
    }};
  }});
  const page=await concurrent.library({limit:10,offset:0});assert.equal(imported,true);assert.equal(page.total,1);assert.equal(page.problems.length,1);
  assert.equal((await repo.library({limit:10,offset:0})).total,2);
});

test('backup restores into an empty setup goal, ignores derived queue differences and rejects corrupt records atomically',async t=>{
  const source=await database(t),repo=createRepository(source);await repo.setGoal({profile:'interview',target:500});await repo.capture(captureInput(raw()));
  const backup=JSON.parse(JSON.stringify(await repo.backup())),target=await database(t),recovered=createRepository(target);
  await recovered.setGoal({profile:'deep',target:300});await recovered.restoreBackup(backup);
  assert.equal((await recovered.goal()).target,500);
  await target.query("UPDATE workspace_goal SET queue_snapshot='{}'::jsonb");await recovered.restoreBackup(backup);
  assert.deepEqual((await target.query('SELECT queue_snapshot FROM workspace_goal')).rows[0].queue_snapshot,{});
  for(const corrupt of [
    value=>value.tables.problems.push(structuredClone(value.tables.problems[0])),
    value=>{value.tables.problems[0].provider_topics={invalid:true};},
    value=>{value.tables.attempts[0].selected_topics=null;},
    value=>{value.tables.attempts[0].practice_unit='made-up-unit';},
    value=>{value.tables.problems[0].id='1';},
    value=>{value.tables.attempts[0].attempted_at='infinity';},
    value=>{value.tables.attempts[0].deleted_at='-infinity';},
    value=>{value.tables.attempts[0].attempted_at='2099-01-01T00:00:00Z';},
  ]){
    const invalid=structuredClone(backup);corrupt(invalid);await assert.rejects(recovered.restoreBackup(invalid),{status:400});
    assert.equal((await recovered.library({limit:10,offset:0})).total,1);assert.equal((await recovered.goal()).target,500);
  }
  await recovered.setGoal({profile:'deep',target:300});await assert.rejects(recovered.restoreBackup(backup),{status:409});assert.equal((await recovered.goal()).target,300);
  const empty=await database(t),fresh=createRepository(empty);await fresh.setGoal({profile:'deep',target:300});
  const invalid=structuredClone(backup);invalid.tables.attempts[0].assistance='invalid';await assert.rejects(fresh.restoreBackup(invalid),{status:400});
  assert.equal((await fresh.goal()).target,300);assert.equal((await fresh.library({limit:10,offset:0})).total,0);
});

test('a downloaded backup over 10 MB restores its recordings and rejects oversized snapshots without changes',async t=>{
  const source=await database(t),repo=createRepository(source),target=await database(t),recovered=createRepository(target);
  await repo.setGoal({profile:'interview',target:500});await repo.capture(captureInput(raw()));
  const problemId=(await source.query('SELECT id FROM problems')).rows[0].id;
  const addRecordings=count=>source.query(`INSERT INTO attempts(id,problem_id,assistance,notes,attempted_at,request_hash)
    SELECT gen_random_uuid(),$1,'independent',$2,'2025-01-01T00:00:00Z',repeat('a',64) FROM generate_series(1,$3)`,[problemId,'n'.repeat(5000),count]);
  await addRecordings(2200);
  const downloaded=backupFileText(await repo.backup());
  assert.ok(Buffer.byteLength(downloaded)>10*1024*1024);assert.ok(Buffer.byteLength(downloaded)<BACKUP_MAX_BYTES);
  const backup=JSON.parse(downloaded);assert.equal(backupSummary(backup).attempts,2201);
  await recovered.setGoal({profile:'deep',target:300});await recovered.restoreBackup(backup);
  assert.equal((await target.query('SELECT count(*)::int AS count FROM attempts')).rows[0].count,2201);
  assert.equal((await target.query('SELECT length(notes) AS length FROM attempts WHERE notes<>\'\' LIMIT 1')).rows[0].length,5000);
  assert.equal((await recovered.goal()).target,500);
  await addRecordings(2200);
  await assert.rejects(repo.backup(),{status:413});
  // The read-only account archive remains available outside restore budgets.
  const oversized=await exportBackup(source);
  await assert.rejects(recovered.restoreBackup(oversized),{status:413});
  assert.equal((await target.query('SELECT count(*)::int AS count FROM attempts')).rows[0].count,2201);
  assert.equal((await recovered.goal()).target,500);
});

test('a large workspace keeps distinct counts, capped goals and finite strength across repeated practice',async t=>{
  const pool=await database(t),repo=createRepository(pool);
  await pool.query(`INSERT INTO problems(platform,external_id,title,url,difficulty,provider_topics)
    SELECT 'leetcode','audit-volume-'||n,'Audit volume '||n,'https://leetcode.com/problems/audit-volume-'||n||'/','easy','["Array","Hash Table"]'::jsonb FROM generate_series(1,1000) n`);
  await pool.query("INSERT INTO problem_patterns SELECT id,'hash-table' FROM problems");
  await pool.query('INSERT INTO historical_solves(problem_id) SELECT id FROM problems');
  await pool.query(`INSERT INTO attempts(id,problem_id,assistance,notes,attempted_at,request_hash,pattern_source,practice_unit,approach_source)
    SELECT ('00000000-0000-4000-8000-'||lpad((p.id+1000*r)::text,12,'0'))::uuid,p.id,'independent','',now()-interval '1 day',repeat('a',64),'explicit','hashing','confirmed' FROM problems p CROSS JOIN generate_series(0,1) r`);
  for(const profile of ['interview','deep']){
    await repo.setGoal({profile,target:1000});const result=await repo.retention(),arrays=result.categories.find(row=>row.slug==='arrays-hashing');
    assert.equal(arrays.summary.coverageSolved,1000);assert.equal(arrays.goal.actual,1000);
    assert.ok(arrays.goal.credited<=arrays.goal.target);
    for(const item of result.categories.flatMap(row=>[row,...row.children])){assert.ok(Number.isFinite(item.rankingPriority));assert.ok(item.patternProgress===null||item.patternProgress>=0&&item.patternProgress<=100);}
  }
  const page=await repo.library({limit:25,offset:975,category:'hashing'});assert.equal(page.total,1000);assert.equal(page.problems.length,25);
  const summary=await repo.summary();assert.equal(summary.uniqueProblems,1000);assert.equal(summary.attempts,2000);
});
