import {test} from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_MAX_BYTES, BACKUP_MAX_RECORDS, BACKUP_SIZE_ERROR, backupFileText, backupLimitError } from '../apps/shared/backup-limits.js';
import { backupSummary } from '../apps/web/src/workflow-model.js';
import { restoreBackup } from '../apps/api/src/backup.js';
import { createApp } from '../apps/api/src/app.js';

const backupWith = attempts => ({format:'recall-backup',version:1,migrations:[],tables:{attempts}});

test('download and restore limits include formatted UTF-8 bytes and accept the exact boundary',()=>{
  const backup=backupWith([{notes:''}]);
  const remaining=BACKUP_MAX_BYTES-Buffer.byteLength(backupFileText(backup));
  backup.tables.attempts[0].notes='n'.repeat(remaining);
  assert.equal(Buffer.byteLength(backupFileText(backup)),BACKUP_MAX_BYTES);
  assert.equal(backupLimitError(backup),'');
  assert.equal(backupSummary(backup).attempts,1);
  backup.tables.attempts[0].notes+='é';
  assert.equal(Buffer.byteLength(backupFileText(backup)),BACKUP_MAX_BYTES+2);
  assert.throws(()=>backupSummary(backup),{message:BACKUP_SIZE_ERROR});
});

test('export and restore share the row budget and reject excess before database work',async()=>{
  const backup=backupWith(Array(BACKUP_MAX_RECORDS).fill({}));
  assert.equal(backupSummary(backup).records,BACKUP_MAX_RECORDS);
  backup.tables.attempts.push({});
  assert.throws(()=>backupSummary(backup),/200,000 rows/);
  await assert.rejects(restoreBackup({query:()=>assert.fail('Oversized backups must not touch the database')},backup),{status:413});
});

test('HTTP restore accepts a downloaded backup over 10 MB and reports the common maximum',async t=>{
  let restores=0;
  const server=createApp({repository:{restoreBackup:async backup=>{restores++;return {restored:true,records:backup.tables.attempts.length};}}}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/api/workspace/restore`;
  const backup=backupWith([{notes:'n'.repeat(11*1024*1024)}]);
  assert.equal(backupSummary(backup).attempts,1);
  const restore=body=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body});
  const accepted=await restore(backupFileText(backup));
  assert.equal(accepted.status,200);assert.deepEqual(await accepted.json(),{restored:true,records:1});
  const rejected=await restore(backupFileText(backupWith([{notes:'n'.repeat(BACKUP_MAX_BYTES)}])));
  assert.equal(rejected.status,413);assert.deepEqual(await rejected.json(),{error:BACKUP_SIZE_ERROR});assert.equal(restores,1);
});
