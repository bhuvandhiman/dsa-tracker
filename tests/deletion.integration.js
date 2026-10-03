import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createAccountLifecycle } from '../apps/api/src/account-lifecycle.js';
import { createUserWorkspaces,workspaceSchema,scopedPool } from '../apps/api/src/user-workspaces.js';

test('account deletion waits for active work, isolates neighbors and recovers a durable tombstone',{timeout:60000},async t=>{
  const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL||process.env.DATABASE_URL,max:3,connectionTimeoutMillis:5000});
  const prefix=`dsa_del_${randomUUID().replaceAll('-','').slice(0,8)}_`,a={id:randomUUID()},b={id:randomUUID()},schemas=[workspaceSchema(a.id,prefix),workspaceSchema(b.id,prefix),prefix+'control'];let fail=true,calls=0;
  t.after(async()=>{try{for(const schema of schemas){assert.match(schema,/^dsa_del_[a-f0-9]{8}_([a-f0-9]{32}|control)$/);await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}}finally{await pool.end();}});
  const lifecycle=createAccountLifecycle(pool,{prefix,removeIdentity:async id=>{assert.equal(id,a.id);calls++;if(fail)throw new Error('Simulated Auth outage');}}),repositories=createUserWorkspaces(pool,{prefix,lifecycle});
  const [first,second]=await Promise.all([repositories(a),repositories(b)]);await first.saveSetup({profile:'interview',target:300});await second.saveSetup({profile:'deep',target:500});
  const exported=await first.exportAccount();assert.equal(exported.setup.goal.target,300);assert.equal(exported.workspace.format,'recall-backup');
  const active=await scopedPool(pool,schemas[0],lifecycle).connect();
  const deletion=lifecycle.remove(a);await new Promise(resolve=>setTimeout(resolve,50));assert.equal(calls,0);active.release();
  assert.deepEqual(await deletion,{deleted:false,pending:true});assert.equal(calls,1);
  await assert.rejects(first.goal(),{status:403});assert.equal((await second.goal()).target,500);
  assert.ok((await pool.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schemas[0]])).rowCount);
  fail=false;const restarted=createAccountLifecycle(pool,{prefix,removeIdentity:async id=>assert.equal(id,a.id)});assert.deepEqual(await restarted.resume(),{completed:1,pending:0});
  assert.equal((await pool.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schemas[0]])).rowCount,0);
  await assert.rejects(first.readiness(),{status:403});await assert.rejects(createUserWorkspaces(pool,{prefix,lifecycle:restarted})(a),{status:403});
  assert.equal((await second.goal()).target,500);assert.equal((await pool.query(`SELECT state FROM "${schemas[2]}".deletions WHERE user_id=$1`,[a.id])).rows[0].state,'complete');
});

test('a database cleanup failure after Auth deletion remains recoverable without restoring access',{timeout:60000},async t=>{
  const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL||process.env.DATABASE_URL,max:3,connectionTimeoutMillis:5000});
  const prefix=`dsa_del_${randomUUID().replaceAll('-','').slice(0,8)}_`,user={id:randomUUID()},schema=workspaceSchema(user.id,prefix),control=prefix+'control';let failDrop=true,identityDeleted=false,providerCalls=0;
  t.after(async()=>{try{for(const name of [schema,control]){assert.match(name,/^dsa_del_[a-f0-9]{8}_([a-f0-9]{32}|control)$/);await pool.query(`DROP SCHEMA IF EXISTS "${name}" CASCADE`);}}finally{await pool.end();}});
  const interruptedPool={query:(...args)=>pool.query(...args),async connect(){const raw=await pool.connect();return {query(...args){if(failDrop&&String(args[0]).startsWith('DROP SCHEMA'))throw new Error('Simulated cleanup outage');return raw.query(...args);},release:(...args)=>raw.release(...args)};}};
  const removeIdentity=async id=>{assert.equal(id,user.id);identityDeleted=true;providerCalls++;};
  const lifecycle=createAccountLifecycle(interruptedPool,{prefix,removeIdentity}),repository=await createUserWorkspaces(interruptedPool,{prefix,lifecycle})(user);
  await repository.saveSetup({profile:'interview',target:300});
  assert.deepEqual(await lifecycle.remove(user),{deleted:false,pending:true});assert.equal(identityDeleted,true);
  assert.equal((await pool.query(`SELECT state FROM "${control}".deletions WHERE user_id=$1`,[user.id])).rows[0].state,'pending');
  assert.equal((await pool.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schema])).rowCount,1);await assert.rejects(repository.goal(),{status:403});
  failDrop=false;const restarted=createAccountLifecycle(interruptedPool,{prefix,removeIdentity});assert.deepEqual(await restarted.resume(),{completed:1,pending:0});
  assert.equal(providerCalls,2);assert.equal((await pool.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schema])).rowCount,0);await assert.rejects(repository.setup(),{status:403});
});
