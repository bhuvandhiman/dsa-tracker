import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {migrate} from '../apps/api/src/migrations.js';
import {createRepository} from '../apps/api/src/repository.js';
import {createApp} from '../apps/api/src/app.js';
import {problemInput,attemptInput,recentInput} from '../apps/api/src/domain.js';
test('practice strength preserves history, deduplicates imports and replays corrections',{timeout:60000},async t=>{
  const connectionString=process.env.TEST_DATABASE_URL||process.env.DATABASE_URL;
  const admin=new pg.Pool({connectionString});const schema='retention_test_'+randomUUID().replaceAll('-','');
  await admin.query('CREATE SCHEMA '+schema);
  const pool=new pg.Pool({connectionString,options:'-c search_path='+schema});
  let server;
  t.after(async()=>{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await pool.end();await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.end();});
  await migrate(pool);const repo=createRepository(pool);
  const p=(await repo.createProblem(problemInput({url:'https://leetcode.com/problems/coin-change/',title:'My Coin Change',patternSlugs:['dynamic-programming']}))).problem;
  await repo.importHistory([p.id]);
  await repo.setGoal({profile:'interview',target:300});
  const beforeSql=await repo.retention();
  const queueSaved=(await pool.query('SELECT queue_snapshot FROM workspace_goal')).rows[0].queue_snapshot;
  assert.equal(queueSaved.version,beforeSql.goal.policyVersion);
  assert.ok(queueSaved.items['category:dynamic-programming']);
  const afterRestart=await createRepository(pool).retention();
  assert.deepEqual(afterRestart.categories.map(c=>c.slug),beforeSql.categories.map(c=>c.slug));
  assert.deepEqual((await pool.query('SELECT queue_snapshot FROM workspace_goal')).rows[0].queue_snapshot,queueSaved);
  const sql=(await repo.createProblem(problemInput({
    url:'https://leetcode.com/problems/employees-earning-more-than-their-managers/',
    title:'Employees Earning More Than Their Managers',
    difficulty:'easy',
    patternSlugs:['database'],
  }))).problem;
  await repo.importHistory([sql.id]);
  const afterSql=await repo.retention();
  assert.equal(afterSql.excluded.database,1);
  assert.equal(afterSql.excluded.total,1);
  assert.equal(afterSql.categories.find(category=>category.slug==='other').count,0);
  assert.equal(afterSql.goal.actual,beforeSql.goal.actual);
  assert.equal(afterSql.goal.credited,beforeSql.goal.credited);
  assert.equal((await repo.library({q:'',category:'other',status:'done',limit:20,offset:0})).total,0);
  assert.equal((await repo.listProblems({limit:20,offset:0})).some(problem=>problem.id===sql.id),true);
  const attempt=attemptInput({requestId:randomUUID(),problemId:p.id,assistance:'solution',patternSlugs:['dynamic-programming'],notes:'Keep original note',attemptedAt:'2026-01-01T12:00:00.000Z'});
  await repo.createAttempt(attempt);
  const installationId=randomUUID();
  const raw={installationId,username:'alice',submissions:[{submissionId:'123',submittedAt:attempt.attemptedAt,url:p.url,title:'Provider Coin Change',topics:['Array','Dynamic Programming']}]};
  const parallel=await Promise.all([repo.importRecent(recentInput(raw)),repo.importRecent(recentInput(raw))]);
  assert.equal(parallel.reduce((n,r)=>n+r.added,0),1);
  const history=await repo.problemHistory(p.id,{limit:20,offset:0});assert.equal(history.attempts.length,1);assert.equal(history.attempts[0].notes,attempt.notes);assert.equal(history.legacy,true);assert.equal(history.problem.title,p.title);
  const getUnit=async slug=>(await repo.retention()).categories.flatMap(c=>c.children).find(u=>u.slug===slug);
  let unit=await getUnit('knapsack-unbounded');assert.equal(unit.distinctSolved,1);assert.equal(unit.assessed,true);
  assert.equal((await getUnit('knapsack-01')).assessed,false);
  const previous=unit.retention;
  await repo.correctAttempt(attempt.requestId,{revision:1,assistance:'independent',patternSlugs:attempt.patternSlugs,notes:attempt.notes,attemptedAt:attempt.attemptedAt});
  assert.ok((await getUnit('knapsack-unbounded')).retention>previous);
  await repo.setPlacement(p.id,'dynamic-programming-general');
  await assert.rejects(repo.setPlacement(p.id,'knapsack-01'),{status:400});
  assert.equal((await repo.listAttempts({limit:20,offset:0}))[0].practiceUnit,'knapsack-unbounded');
  assert.equal((await getUnit('knapsack-unbounded')).assessed,true);
  await repo.setPlacement(p.id,null);
  await repo.removeAttempt(attempt.requestId,2);
  assert.equal((await repo.problemHistory(p.id,{limit:20,offset:0})).attempts[0].imported,true);
  await repo.importRecent(recentInput({...raw,installationId:randomUUID()}));assert.equal((await repo.summary()).uniqueProblems,2);
  await assert.rejects(repo.importRecent(recentInput({...raw,username:'bob'})),{status:409});
  await repo.setPlacement(p.id,'dynamic-programming-general');assert.equal((await getUnit('knapsack-unbounded')).assessed,false);assert.equal((await getUnit('dynamic-programming-general')).assessed,true);
  assert.equal((await repo.library({q:'',category:'dynamic-programming-general',status:'done',limit:20,offset:0})).total,1);
  await repo.updateProblem(p.id,{...problemInput({url:p.url,title:p.title,patternSlugs:['dynamic-programming'],placement:'dynamic-programming-general'})});
  assert.equal((await getUnit('dynamic-programming-general')).assessed,true);
  await repo.setPlacement(p.id,null);assert.equal((await getUnit('knapsack-unbounded')).assessed,true);
  await repo.importRecent(recentInput({installationId:randomUUID(),username:'alice',submissions:[{...raw.submissions[0],submissionId:'456',url:'https://leetcode.com/problems/target-sum/',title:'Target Sum'}]}));assert.equal((await repo.summary()).uniqueProblems,3);
  server=createApp({repository:repo}).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const origin='http://127.0.0.1:'+server.address().port+'/api';
  assert.equal((await fetch(origin+'/retention')).status,200);
  assert.equal((await fetch(origin+'/retention/preferences/nope',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({preference:'low'})})).status,404);
  assert.equal((await fetch(origin+'/problems/'+p.id+'/placement',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({unit:'dynamic-programming-general'})})).status,200);
  assert.equal((await fetch(origin+'/imports/recent/'+installationId)).status,200);
});


test('thresholds survive API refresh, revision, correction, restore and goal switches',{timeout:60000},async t=>{
  const admin=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL||process.env.DATABASE_URL});
  const schema='threshold_test_'+randomUUID().replaceAll('-','');await admin.query('CREATE SCHEMA '+schema);
  const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL||process.env.DATABASE_URL,options:'-c search_path='+schema});
  let restoredPool,restoredSchema;
  t.after(async()=>{await pool.end();if(restoredPool)await restoredPool.end();await admin.query('DROP SCHEMA '+schema+' CASCADE');if(restoredSchema)await admin.query('DROP SCHEMA '+restoredSchema+' CASCADE');await admin.end();});
  await migrate(pool);let repo=createRepository(pool);await repo.setGoal({profile:'interview',target:500});
  const ids=[];
  for(let i=0;i<7;i++) {
    const created=(await repo.createProblem(problemInput({url:'https://leetcode.com/problems/threshold-fixture-'+i+'/',title:'Threshold fixture '+i,difficulty:'medium',patternSlugs:['hash-table']}))).problem;
    await repo.setPlacement(created.id,'hashing',true);ids.push(created.id);
  }
  const unit=data=>data.categories.find(c=>c.slug==='arrays-hashing').children.find(u=>u.slug==='hashing');
  const baseline=unit(await repo.retention());
  assert.equal(baseline.capabilitySignals.retention,null);
  await repo.importHistory(ids);
  let current=unit(await repo.retention());assert.equal(current.queueGate.coverage.earned,3);
  assert.ok(current.rankingPriority<baseline.rankingPriority);
  repo=createRepository(pool);
  const restarted=unit(await repo.retention());assert.deepEqual(restarted.queueGate.coverage,current.queueGate.coverage);
  assert.equal(restarted.rankingPriority,current.rankingPriority);
  await repo.importHistory(ids);assert.equal(unit(await repo.retention()).queueGate.coverage.earned,3);
  restoredSchema='threshold_restore_'+randomUUID().replaceAll('-','');
  await admin.query('CREATE SCHEMA '+restoredSchema);
  restoredPool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL||process.env.DATABASE_URL,options:'-c search_path='+restoredSchema});
  await migrate(restoredPool);const restoredRepo=createRepository(restoredPool);
  await restoredRepo.restoreBackup(await repo.backup());
  assert.deepEqual(unit(await restoredRepo.retention()).queueGate.coverage,restarted.queueGate.coverage);
  assert.equal(unit(await restoredRepo.retention()).rankingPriority,restarted.rankingPriority);
  const requests=[];const at=new Date(Date.now()-60000).toISOString();const anchor=current.rankingPriority;
  for(let i=0;i<4;i++) {
    const attempt=attemptInput({requestId:randomUUID(),problemId:ids[i],assistance:'independent',patternSlugs:['hash-table'],attemptedAt:at});
    requests.push(attempt);await repo.createAttempt(attempt);await repo.createAttempt(attempt);
    current=unit(await repo.retention());
    assert.equal(current.capabilitySignals.retention,current.strength);
    assert.ok(current.capabilitySignals.retention>0);
    const filled=0.65*current.capabilitySignals.foundation+0.35*current.capabilitySignals.retention;
    assert.ok(current.capabilitySignals.coverageMark>=filled);
    if(i<3) {assert.equal(current.queueGate.practice.earned,i+1);assert.equal(current.rankingPriority,anchor);}
  }
  assert.equal(current.completedPracticeBlocks,1);assert.equal(current.queueGate.practice.earned,0);
  assert.ok(current.rankingPriority<anchor);
  const parallel=await Promise.all([repo.retention(),repo.retention(),createRepository(pool).retention()]);
  assert.ok(parallel.every(data=>unit(data).rankingPriority===current.rankingPriority));
  const beforeCorrection=current.rankingPriority;
  for(const attempt of requests)await repo.correctAttempt(attempt.requestId,{revision:1,assistance:'independent',patternSlugs:['hash-table'],notes:'',attemptedAt:new Date(Date.now()-60*86400000).toISOString()});
  current=unit(await repo.retention());assert.equal(current.completedPracticeBlocks,1);assert.ok(current.rankingPriority>beforeCorrection);
  await repo.removeAttempt(requests[3].requestId,2);
  current=unit(await repo.retention());assert.equal(current.completedPracticeBlocks,0);assert.equal(current.queueGate.practice.earned,3);
  await repo.restoreAttempt(requests[3].requestId,3);
  current=unit(await repo.retention());assert.equal(current.completedPracticeBlocks,1);
  await repo.setGoal({profile:'deep',target:500});await repo.setGoal({profile:'interview',target:500});
  assert.equal((await pool.query('SELECT queue_snapshot FROM workspace_goal')).rows[0].queue_snapshot,null);
  current=unit(await repo.retention());assert.equal(current.queueGate.coverage.earned,0);
  const snapshot=(await pool.query('SELECT queue_snapshot FROM workspace_goal')).rows[0].queue_snapshot;
  await repo.setGoal({profile:'interview',target:500});
  assert.deepEqual((await pool.query('SELECT queue_snapshot FROM workspace_goal')).rows[0].queue_snapshot,snapshot);
  assert.equal((await repo.problemHistory(ids[0],{limit:20,offset:0})).attempts.length,1);
});
