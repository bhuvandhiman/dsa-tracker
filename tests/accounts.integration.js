import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createUserWorkspaces, workspaceSchema } from '../apps/api/src/user-workspaces.js';
import { captureInput } from '../apps/api/src/domain.js';

test('account workspaces isolate solves, goals, captures, backups and pooled errors',{timeout:60000},async t=>{
  const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL||process.env.DATABASE_URL,max:2,connectionTimeoutMillis:5000});
  const prefix=`dsa_auth_${randomUUID().replaceAll('-','').slice(0,8)}_`,a={id:randomUUID()},b={id:randomUUID()},schemas=[workspaceSchema(a.id,prefix),workspaceSchema(b.id,prefix)];
  t.after(async()=>{try{for(const schema of schemas){assert.match(schema,/^dsa_auth_[a-f0-9]{8}_[a-f0-9]{32}$/);await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}}finally{await pool.end();}});
  const repositoryForUser=createUserWorkspaces(pool,{prefix});
  const [first,second]=await Promise.all([repositoryForUser(a),repositoryForUser(b)]);
  assert.equal((await first.setup()).completed,false);
  const payload=captureInput({requestId:randomUUID(),url:'https://leetcode.com/problems/two-sum/',title:'Two Sum',difficulty:'easy',topics:['Array','Hash Table'],selectedTopics:['Hash Table'],classification:{mode:'topics'},assistance:'independent',attemptedAt:'2026-10-02T10:00:00.000Z',username:'account-a'});
  const saved=await first.capture(payload);
  assert.equal((await first.listProblems({limit:100,offset:0})).length,1);
  assert.equal((await second.listProblems({limit:100,offset:0})).length,0);
  await assert.rejects(second.setPlacement(saved.attempt.problem.id,'graph-dfs',true),{status:404});
  assert.equal((await second.captureStatus(payload)).status,'missing');
  await first.saveSetup({profile:'interview',target:300});
  assert.equal((await second.goal()).configured,false);
  await assert.rejects(second.saveSetup({completed:true,extensionAcknowledged:true}),{status:400});
  assert.equal((await second.setup()).extensionAcknowledged,false);
  await first.saveSetup({extensionAcknowledged:true,completed:true});
  assert.equal((await first.setup()).completed,true);
  assert.deepEqual((await first.exportAccount()).setup,await first.setup());
  const backupA=await first.backup(),backupB=await second.backup();
  assert.equal(JSON.stringify(backupA).includes('two-sum'),true);
  assert.equal(JSON.stringify(backupB).includes('two-sum'),false);
  // Reused pools and concurrent calls after a rollback cannot leak a schema.
  const again=await repositoryForUser(b);
  assert.equal((await again.listProblems({limit:100,offset:0})).length,0);
  assert.equal((await first.captureStatus(payload)).status,'saved');
  assert.equal((await again.setup()).completed,false);
  assert.notEqual((await pool.query('SHOW search_path')).rows[0].search_path,schemas[0]);
});
