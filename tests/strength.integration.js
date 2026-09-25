import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {migrate} from '../apps/api/src/migrations.js';
import {createRepository} from '../apps/api/src/repository.js';
import {captureInput,correctionInput,legacyInput,recentInput} from '../apps/api/src/domain.js';
async function database(t) {
  const admin=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL||process.env.DATABASE_URL,connectionTimeoutMillis:5000});
  const schema='strength_test_'+randomUUID().replaceAll('-','');
  await admin.query('CREATE SCHEMA '+schema);
  const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL||process.env.DATABASE_URL,options:'-c search_path='+schema,connectionTimeoutMillis:5000});
  t.after(async()=>{await pool.end();await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.end();});
  return pool;
}
test('upgrade snapshots old approaches without rewriting assistance, notes, tags or timestamps',async t=>{
  const pool=await database(t);
  await pool.query('CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,checksum TEXT NOT NULL)');
  for(const file of ['001_domain.sql','002_attempt_corrections.sql','003_extension_capture.sql','004_legacy_imports.sql','005_retention.sql']) {
    const sql=(await readFile(new URL('../apps/api/migrations/'+file,import.meta.url),'utf8')).replaceAll('\r\n','\n');
    await pool.query(sql);await pool.query('INSERT INTO schema_migrations VALUES($1,$2)',[file,createHash('sha256').update(sql).digest('hex')]);
  }
  const id=(await pool.query("INSERT INTO problems(platform,external_id,title,url) VALUES('leetcode','word-ladder','Word Ladder','https://leetcode.com/problems/word-ladder/') RETURNING id")).rows[0].id;
  await pool.query("INSERT INTO problem_patterns VALUES($1,'graphs')",[id]);
  const inferred=randomUUID(),explicit=randomUUID();
  for(const [attempt,source,pattern] of [[inferred,'inferred','graphs'],[explicit,'explicit','union-find']]) {
    await pool.query("INSERT INTO attempts(id,problem_id,assistance,notes,attempted_at,request_hash,pattern_source) VALUES($1,$2,'hint','Keep this note','2025-01-01T12:00:00Z',$3,$4)",[attempt,id,'a'.repeat(64),source]);
    await pool.query('INSERT INTO attempt_patterns VALUES($1,$2)',[attempt,pattern]);
  }
  assert.deepEqual(await migrate(pool),['006_practice_strength.sql']);
  const repo=createRepository(pool),attempts=await repo.listAttempts({limit:20,offset:0});
  assert.equal(attempts.find(a=>a.id===inferred).practiceUnit,'graph-bfs');
  assert.equal(attempts.find(a=>a.id===inferred).approachSource,'inferred');
  assert.equal(attempts.find(a=>a.id===explicit).practiceUnit,'union-find');
  assert.equal(attempts.find(a=>a.id===explicit).approachSource,'confirmed');
  for(const a of attempts){assert.equal(a.notes,'Keep this note');assert.equal(a.assistance,'hint');assert.equal(new Date(a.attemptedAt).toISOString(),'2025-01-01T12:00:00.000Z');}
  await repo.setPlacement(id,'graphs-general');
  assert.deepEqual((await repo.listAttempts({limit:20,offset:0})).map(a=>a.practiceUnit),attempts.map(a=>a.practiceUnit));
  assert.deepEqual(await migrate(pool),[]);
});
test('confirmed capture, imports and corrections preserve one approach and independent primary placement',async t=>{
  const pool=await database(t);await migrate(pool);const repo=createRepository(pool);
  const raw={requestId:randomUUID(),url:'https://leetcode.com/problems/word-ladder/',title:'My Word Ladder',topics:['Breadth-First Search','Graph'],selectedTopics:['Graph'],assistance:'hint',attemptedAt:'2025-01-01T19:00:00.000Z',practiceUnit:'graph-dfs',approachSource:'confirmed',captureSource:'accepted',submissionId:'6789'};
  const first=await repo.capture(captureInput(raw));
  assert.equal(first.attempt.practiceUnit,'graph-dfs');assert.equal(first.attempt.captureSource,'accepted');assert.deepEqual(first.attempt.selectedTopics,['Graph']);
  assert.equal((await repo.capture(captureInput(raw))).created,false);
  await repo.setPlacement(first.attempt.problem.id,'graphs-general');
  assert.equal((await repo.practiceContext({platform:'leetcode',externalId:'word-ladder'})).practiceUnit,'graphs-general');
  const provider={url:raw.url,title:'Provider title',topics:['Graph'],difficulty:'hard'};
  const runId=randomUUID();
  await repo.importLegacy(legacyInput({runId,username:'alice',problems:[provider],complete:true}));
  await repo.importRecent(recentInput({runId,username:'alice',submissions:[{...provider,submissionId:'6789',submittedAt:raw.attemptedAt}]}));
  await repo.importLegacy(legacyInput({runId:randomUUID(),username:'alice',problems:[provider],complete:true}));
  const units=()=>repo.retention().then(r=>r.categories.flatMap(c=>c.children));
  let rows=await units();assert.equal(rows.find(u=>u.slug==='graph-dfs').assessed,true);assert.equal(rows.find(u=>u.slug==='graphs-general').assessed,false);
  const saved=(await repo.problemHistory(first.attempt.problem.id,{limit:20,offset:0}));
  assert.equal(saved.problem.title,raw.title);assert.equal(saved.attempts.length,1);assert.equal(saved.legacy,true);
  const correction=correctionInput({revision:1,assistance:'solution',patternSlugs:first.attempt.patternSlugs,notes:'Corrected note',attemptedAt:raw.attemptedAt,practiceUnit:'graph-bfs'});
  await repo.correctAttempt(first.attempt.id,correction);
  rows=await units();assert.equal(rows.find(u=>u.slug==='graph-bfs').assessed,true);assert.equal(rows.find(u=>u.slug==='graph-dfs').assessed,false);
  assert.equal((await repo.library({category:'graph-bfs',limit:10,offset:0,q:'',status:'all'})).problems[0].id,first.attempt.problem.id);
  assert.equal((await repo.problemHistory(first.attempt.problem.id,{limit:20,offset:0})).attempts[0].notes,'Corrected note');
  await assert.rejects(repo.importLegacy(legacyInput({runId:randomUUID(),username:'bob',problems:[provider],complete:true})),{status:409});
  await assert.rejects(repo.correctAttempt(first.attempt.id,correction),{status:409});
});

test('pre-upgrade frozen captures recover their original hash without duplicate attempts',async t=>{
  const pool=await database(t);await migrate(pool);const repo=createRepository(pool);
  const raw={requestId:randomUUID(),url:'https://leetcode.com/problems/two-sum/',title:'Two Sum',topics:['Array','Hash Table'],selectedTopics:[],assistance:'hint',attemptedAt:'2025-01-01T00:00:00.000Z'};
  const input=captureInput(raw),a=input.attempt;
  const saved=await repo.capture(input);
  const oldInput={problem:input.problem,attempt:{requestId:a.requestId,assistance:a.assistance,attemptedAt:a.attemptedAt,patternSlugs:a.patternSlugs,notes:a.notes,patternSource:a.patternSource}};
  await pool.query('UPDATE attempts SET request_hash=$2 WHERE id=$1',[saved.attempt.id,createHash('sha256').update(JSON.stringify(oldInput)).digest('hex')]);
  assert.equal((await repo.capture(captureInput(raw))).created,false);
  assert.equal((await repo.listAttempts({limit:20,offset:0})).length,1);
  await assert.rejects(repo.capture(captureInput({...raw,assistance:'solution'})),{status:409});
});
