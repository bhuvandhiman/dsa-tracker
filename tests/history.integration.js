import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {createUserWorkspaces,workspaceSchema} from '../apps/api/src/user-workspaces.js';
import {problemInput,attemptInput,recentInput,legacyInput} from '../apps/api/src/domain.js';

test('solved history orders unique dated problems, follows edits/removal and isolates accounts',{timeout:60000},async t=>{
  const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL||process.env.DATABASE_URL,max:2,connectionTimeoutMillis:5000});
  const prefix=`dsa_hist_${randomUUID().replaceAll('-','').slice(0,8)}_`,owners=[{id:randomUUID()},{id:randomUUID()}],schemas=owners.map(owner=>workspaceSchema(owner.id,prefix));
  t.after(async()=>{try{for(const schema of schemas){assert.match(schema,/^dsa_hist_[a-f0-9]{8}_[a-f0-9]{32}$/);await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}}finally{await pool.end();}});
  const repositoryForUser=createUserWorkspaces(pool,{prefix});
  const repo=await repositoryForUser(owners[0]),other=await repositoryForUser(owners[1]);
  const page=()=>repo.solvedHistory({limit:25,offset:0});
  assert.deepEqual(await page(),{problems:[],more:false});
  async function problem(slug,topics=['arrays-hashing']){return (await repo.createProblem(problemInput({url:`https://leetcode.com/problems/${slug}/`,title:slug,difficulty:'easy',patternSlugs:topics}))).problem;}
  const a=await problem('two-sum'),b=await problem('valid-parentheses',['stack']),sql=await problem('sql-fixture',['database']);
  async function record(p,at){const input=attemptInput({requestId:randomUUID(),problemId:p.id,assistance:'independent',patternSlugs:p.patternSlugs,attemptedAt:at});await repo.createAttempt(input);return input;}
  await record(a,'2026-10-01T12:00:00.000Z');
  const latestA=await record(a,'2026-10-03T12:00:00.000Z');
  const latestB=await record(b,'2026-10-02T12:00:00.000Z');
  await record(sql,'2026-10-09T12:00:00.000Z');
  await repo.importLegacy(legacyInput({runId:randomUUID(),username:'alice',complete:true,problems:[{url:'https://leetcode.com/problems/undated-fixture/',title:'Undated',topics:['Array'],difficulty:'medium'}]}));
  let feed=await page();
  assert.deepEqual(feed.problems.map(p=>p.id),[a.id,b.id]);assert.equal(feed.problems.length,2);
  assert.equal(feed.problems[0].solvedAt.toISOString(),'2026-10-03T12:00:00.000Z');
  assert.deepEqual((await other.solvedHistory({limit:25,offset:0})).problems,[]);
  await repo.importRecent(recentInput({runId:randomUUID(),username:'alice',submissions:[{url:a.url,title:a.title,topics:['Array'],difficulty:'easy',submissionId:'1001',submittedAt:'2026-10-04T12:00:00.000Z'},{url:b.url,title:b.title,topics:['Stack'],difficulty:'easy',submissionId:'1002',submittedAt:'2026-10-04T12:00:00.000Z'}]}));
  assert.deepEqual((await page()).problems.map(p=>p.id),[b.id,a.id],'Equal dates have stable problem ID ordering');
  const first=await repo.solvedHistory({limit:1,offset:0}),second=await repo.solvedHistory({limit:1,offset:1});
  assert.equal(first.more,true);assert.equal(second.more,false);assert.deepEqual([...first.problems,...second.problems].map(p=>p.id),[b.id,a.id]);
  assert.deepEqual(await repo.solvedHistory({limit:25,offset:50}),{problems:[],more:false});
  // A re-solve moves a single row to the top; removing it reveals its previous date.
  const newest=await record(a,'2026-10-05T12:00:00.000Z');
  assert.deepEqual((await page()).problems.map(p=>p.id),[a.id,b.id]);
  await repo.removeAttempt(newest.requestId,1);
  assert.deepEqual((await page()).problems.map(p=>p.id),[b.id,a.id]);
  await repo.removeAttempt(latestA.requestId,1);
  await repo.correctAttempt(latestB.requestId,{revision:1,assistance:'independent',patternSlugs:['stack'],notes:'',attemptedAt:'2026-10-06T12:00:00.000Z'});
  assert.equal((await page()).problems[0].solvedAt.toISOString(),'2026-10-06T12:00:00.000Z');
  const removed=await record(await problem('only-recording'),'2026-10-08T12:00:00.000Z');
  assert.equal((await page()).problems[0].title,'only-recording');
  await repo.removeAttempt(removed.requestId,1);
  assert.equal((await page()).problems.some(p=>p.title==='only-recording'),false);
  await repo.restoreAttempt(removed.requestId,2);
  assert.equal((await page()).problems[0].title,'only-recording');
});
