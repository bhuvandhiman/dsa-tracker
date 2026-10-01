import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {migrate} from '../apps/api/src/migrations.js';
import {createRepository} from '../apps/api/src/repository.js';
import {legacyInput,problemInput,attemptInput} from '../apps/api/src/domain.js';
test('legacy imports preserve attempts, deduplicate across reinstall, sort undated history last, and count patterns once',{timeout:60000},async t=>{
  const connectionString=process.env.TEST_DATABASE_URL||process.env.DATABASE_URL;
  assert.ok(connectionString);
  const admin=new pg.Pool({connectionString,connectionTimeoutMillis:5000});
  const schema='dsa_legacy_'+randomUUID().replaceAll('-','');
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool=new pg.Pool({connectionString,options:`-c search_path=${schema}`,connectionTimeoutMillis:5000});
  t.after(async()=>{await pool.end();try{await admin.query(`DROP SCHEMA "${schema}" CASCADE`);}finally{await admin.end();}});
  await migrate(pool);const repo=createRepository(pool);
  const existing=(await repo.createProblem(problemInput({url:'https://leetcode.com/problems/two-sum/',title:'My Two Sum',patternSlugs:['two-pointers']}))).problem;
  const first=attemptInput({requestId:randomUUID(),problemId:existing.id,assistance:'hint',patternSlugs:['arrays-hashing'],notes:'Keep this',attemptedAt:'2025-01-01T00:00:00.000Z'});
  await repo.createAttempt(first);await repo.createAttempt({...first,requestId:randomUUID(),assistance:'independent',attemptedAt:'2025-02-01T00:00:00.000Z'});
  await repo.setPlacement(existing.id,'two-pointers');
  const installationId=randomUUID();
  const raw={installationId,username:'alice',complete:false,problems:[{url:existing.url,title:'Provider title',difficulty:'easy',topics:['Array','Hash Table','Math']},{url:'https://leetcode.com/problems/3sum/',title:'3Sum',difficulty:'medium',topics:['Array','Two Pointers']}]};
  const body=legacyInput(raw);
  const parallel=await Promise.all([repo.importLegacy(body),repo.importLegacy(body)]);
  assert.equal(parallel.reduce((n,r)=>n+r.added,0),2);
  const saved=await repo.listProblems({limit:100,offset:0});assert.equal(saved.length,2);
  const old=saved.find(p=>p.id===existing.id);assert.equal(old.title,'My Two Sum');assert.deepEqual(old.patternSlugs,['arrays-hashing','hash-table','math','two-pointers']);assert.equal(old.placementOverride,'two-pointers');
  const summary=await repo.summary();assert.equal(summary.uniqueProblems,2);assert.equal(summary.attempts,2);
  assert.equal(summary.inventory.find(p=>p.slug==='arrays-hashing').count,0);assert.equal(summary.inventory.find(p=>p.slug==='two-pointers').count,2);
  assert.equal(summary.inventory.reduce((total,p)=>total+p.count,0),2);
  const primaryPage=await repo.library({q:'',category:'two-pointers',status:'all',limit:20,offset:0});
  assert.equal(primaryPage.total,2);assert.deepEqual(primaryPage.problems.map(p=>p.external_id).sort(),['3sum','two-sum']);
  const hashingPage=await repo.library({q:'',category:'hashing',status:'all',limit:20,offset:0});
  assert.equal(hashingPage.total,0); // manual placement and recorded approaches take precedence
  const history=await repo.problemHistory(existing.id,{limit:1,offset:0});assert.equal(history.attempts[0].assistance,'independent');assert.equal(history.more,true);assert.equal(history.legacy,true);
  const older=await repo.problemHistory(existing.id,{limit:1,offset:1});assert.equal(older.attempts[0].notes,'Keep this');assert.equal(older.more,false);assert.equal(older.legacy,true);
  assert.equal('attemptedAt' in older.problem,false);
  await assert.rejects(repo.importLegacy({...body,username:'bob'}),{status:409});
  await repo.importLegacy({...body,problems:[],complete:true});
  assert.equal((await repo.legacyStatus(installationId)).completed,true);
  const late=legacyInput({...raw,problems:[{url:'https://leetcode.com/problems/not-imported/',title:'Late',topics:[]}]});
  assert.equal((await repo.importLegacy(late)).added,0);assert.equal((await repo.summary()).uniqueProblems,2);
  await repo.importLegacy({...body,installationId:randomUUID(),complete:true});assert.equal((await repo.summary()).uniqueProblems,2);
  const newId=saved.find(p=>p.id!==existing.id).id;
  await repo.createAttempt({...first,requestId:randomUUID(),problemId:newId});assert.equal((await repo.summary()).uniqueProblems,2);
  assert.equal((await repo.library({q:'',pattern:'arrays-hashing',status:'done',limit:20,offset:0})).total,2);
  assert.deepEqual(old.providerTopics,['Array','Hash Table','Math']);
  const beforeRefresh=(await repo.backup()).tables;
  await repo.importLegacy(legacyInput({...raw,installationId:randomUUID(),complete:true,problems:[{...raw.problems[0],topics:['Hash-Table','Future Technique']}]}));
  const refreshed=await repo.problemHistory(existing.id,{limit:20,offset:0});
  assert.deepEqual(refreshed.problem.providerTopics,['Hash-Table','Future Technique']);
  assert.equal(refreshed.problem.placement.unit,'two-pointers');
  assert.equal(refreshed.problem.title,'My Two Sum');
  const afterRefresh=(await repo.backup()).tables;
  for(const table of ['attempts','attempt_patterns','historical_solves','problem_placements']) assert.deepEqual(afterRefresh[table],beforeRefresh[table]);
  assert.equal((await repo.summary()).uniqueProblems,2);
  await repo.importLegacy(legacyInput({...raw,installationId:randomUUID(),complete:true,problems:[
    {url:'https://leetcode.com/problems/longest-common-prefix/',title:'Longest Common Prefix',difficulty:'easy',topics:['String','Trie']},
    {url:'https://leetcode.com/problems/provider-hashing-fixture/',title:'Provider hashing fixture',difficulty:'medium',topics:['Array','Hash-Table','Future Technique']},
    {url:'https://leetcode.com/problems/provider-union-fixture/',title:'Provider union fixture',difficulty:'medium',topics:['Graph','Union-Find']},
    {url:'https://leetcode.com/problems/provider-empty-fixture/',title:'No provider topics',difficulty:'easy',topics:[]},
  ]}));
  const classified=await repo.listProblems({limit:100,offset:0});
  for(const [slug,unit] of [['longest-common-prefix','trie'],['provider-hashing-fixture','hashing'],['provider-union-fixture','union-find'],['provider-empty-fixture','other']]) {
    const problem=classified.find(p=>p.externalId===slug);
    assert.equal((await repo.problemHistory(problem.id,{limit:20,offset:0})).problem.placement.unit,unit);
  }
  const backup=await repo.backup();
  assert.deepEqual(backup.tables.problems.find(p=>p.external_id==='provider-hashing-fixture').provider_topics,['Array','Hash-Table','Future Technique']);
  assert.deepEqual(backup.tables.problems.find(p=>p.external_id==='provider-empty-fixture').provider_topics,[]);
});
