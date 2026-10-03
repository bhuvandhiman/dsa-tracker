import assert from 'node:assert/strict';
import {test} from 'node:test';
import {once} from 'node:events';
import {databaseFailure,reportDatabaseFailure,checkDatabaseConnection} from '../apps/api/src/database-diagnostics.js';
import {createApp} from '../apps/api/src/app.js';
import {DomainError} from '../apps/api/src/domain.js';

test('database diagnostics distinguish credentials, DNS, TLS, permissions and connection failures',()=>{
  for(const [code,reason] of [['28P01','credentials'],['ENOTFOUND','hostname'],['ECONNREFUSED','connection'],['ENETUNREACH','network'],['ETIMEDOUT','timeout'],['SELF_SIGNED_CERT_IN_CHAIN','certificate'],['ERR_TLS_CERT_ALTNAME_INVALID','certificate'],['42501','permissions'],['42P01','schema']]){
    assert.equal(databaseFailure({code,message:'secret-password account fixture'}).reason,reason);
  }
  assert.equal(databaseFailure({code:'XX000',message:'Tenant or user not found: secret-password'}).code,'POOLER_IDENTITY');
  assert.equal(databaseFailure(new Error('Connection terminated due to connection timeout')).reason,'timeout');
  assert.equal(databaseFailure({code:'toString',message:'secret-password'}),null);
});

test('wrapped and aggregate connection errors keep the useful code and tolerate cycles',()=>{
  assert.equal(databaseFailure(new AggregateError([{code:'ENETUNREACH',message:'fixture-secret'}])).code,'ENETUNREACH');
  assert.equal(databaseFailure(new Error('query failed',{cause:{code:'28P01'}})).code,'28P01');
  const cycle={message:'fixture-secret'};cycle.cause=cycle;
  assert.equal(databaseFailure(cycle),null);
});

test('diagnostic logs never include error messages, SQL, passwords or untrusted context',t=>{
  const messages=[];t.mock.method(console,'error',message=>messages.push(message));
  for(const error of [{code:'28P01',message:'postgresql://user:fixture-secret@host',detail:'private SQL'}, {code:'XX000',message:'fixture-secret'}, {code:'fixture-secret',message:'fixture-secret'}])reportDatabaseFailure(error,'fixture-secret');
  assert.ok(messages.every(message=>!message.includes('fixture-secret')&&!message.includes('private SQL')));
  assert.match(messages[0],/request failed \[28P01\]/);
  assert.match(messages[1],/\[UNKNOWN\]/);
});

test('startup connection check is read-only and reports a failed probe without taking down the service',async()=>{
  const queries=[],messages=[],failures=[];
  assert.equal(await checkDatabaseConnection({query:async sql=>{queries.push(sql);}},{log:message=>messages.push(message)}),true);
  assert.deepEqual(queries,['SELECT 1 AS connected']);assert.deepEqual(messages,['Recall database connection OK.']);
  const error={code:'28P01',message:'fixture-secret'};
  assert.equal(await checkDatabaseConnection({query:async()=>{throw error;}},{log:()=>assert.fail('must not report success'),report:(value,context)=>failures.push({value,context})}),false);
  assert.deepEqual(failures,[{value:error,context:'startup'}]);
});

test('workspace failures produce private diagnostics and safe 503s while auth and liveness stay distinct',async t=>{
  let error;const reports=[];
  const server=createApp({auth:{mode:'supabase',configured:true,url:'https://fixture.supabase.co',key:'sb_publishable_fixture'},deployment:{mode:'hosted',origin:'https://127.0.0.1'},authenticate:async()=>{if(error instanceof DomainError)throw error;return {id:'fixture'};},repositoryForUser:async()=>{throw error;},reportDatabaseError:(value,context)=>reports.push({value,context})}).listen(0,'127.0.0.1');
  await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const code of ['28P01','ENOTFOUND','SELF_SIGNED_CERT_IN_CHAIN','42501','42P01']){
    error={code,message:'fixture-secret SQL and account-id'};
    const response=await fetch(base+'/api/session');assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{error:'Your workspace is temporarily unavailable. Please retry.'});
    assert.deepEqual(reports.at(-1),{value:error,context:'request'});
  }
  const count=reports.length;error=new DomainError(401,'Sign in');
  assert.equal((await fetch(base+'/api/session')).status,401);assert.equal(reports.length,count);
  assert.equal((await fetch(base+'/api/health')).status,200);
});
