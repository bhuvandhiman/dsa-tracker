import test from 'node:test';
import assert from 'node:assert/strict';
import {transaction} from '../apps/api/src/transaction.js';

test('transactions preserve the original error and discard clients when rollback fails',async()=>{
  const original=new Error('Original failure'),queries=[],releases=[];
  const pool={connect:async()=>({query:async sql=>{queries.push(sql);if(sql==='ROLLBACK')throw new Error('Rollback failed');},release:discard=>releases.push(discard)})};
  await assert.rejects(transaction(pool,async()=>{throw original;}),error=>error===original);
  assert.deepEqual(queries,['BEGIN','ROLLBACK']);assert.deepEqual(releases,[true]);
});
test('snapshot reads commit and release; failed commits roll back',async()=>{
  for(const fail of [false,true]){
    const queries=[],releases=[];
    const pool={connect:async()=>({query:async sql=>{queries.push(sql);if(fail&&sql==='COMMIT')throw new Error('Commit failed');},release:discard=>releases.push(discard)})};
    const operation=transaction(pool,async()=>42,{readOnly:true});
    if(fail)await assert.rejects(operation,/Commit failed/);else assert.equal(await operation,42);
    assert.deepEqual(queries,['BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY','COMMIT',...(fail?['ROLLBACK']:[])]);assert.deepEqual(releases,[false]);
  }
});
