import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackupFileReader } from '../apps/web/src/backup-file-reader.js';
import { BACKUP_MAX_BYTES } from '../apps/shared/backup-limits.js';

const backup = title => ({format:'recall-backup',version:1,migrations:[],tables:{problems:[{title}],attempts:[]}});
function deferredFile(name) {
  let resolve;
  const file={name,size:100,text:()=>new Promise(done=>{resolve=done;})};
  return {file,finish:value=>resolve(value)};
}

test('a slow previous file cannot replace a newer validated selection',async()=>{
  const reader=createBackupFileReader(),first=deferredFile('first.json'),second=deferredFile('second.json');
  const readFirst=reader.read(first.file),readSecond=reader.read(second.file);
  second.finish(JSON.stringify(backup('Second')));
  const selection=await readSecond;
  assert.equal(selection.fileName,'second.json');
  assert.equal(selection.value.tables.problems[0].title,'Second');
  first.finish(JSON.stringify(backup('First')));
  assert.equal(await readFirst,null);
});

test('previous file failures cannot erase a newer selection or report its error',async()=>{
  const reader=createBackupFileReader(),first=deferredFile('broken.json');
  const pending=reader.read(first.file);
  const current=await reader.read({name:'valid.json',size:100,text:async()=>JSON.stringify(backup('Current'))});
  assert.equal(current.error,'');
  first.finish('{invalid');
  assert.equal(await pending,null);
});

test('cancelled file reads do not complete and invalid current files cannot restore',async()=>{
  const reader=createBackupFileReader(),file=deferredFile('cancelled.json');
  const pending=reader.read(file.file);reader.cancel();file.finish(JSON.stringify(backup('Cancelled')));
  assert.equal(await pending,null);
  const invalid=await reader.read({name:'invalid.json',size:100,text:async()=>'{invalid'});
  assert.equal(invalid.fileName,'invalid.json');assert.equal(invalid.reading,false);
  assert.equal(invalid.value,null);assert.equal(invalid.summary,null);assert.match(invalid.error,/valid JSON/);
  let read=false;
  const oversized=await reader.read({name:'oversized.json',size:BACKUP_MAX_BYTES+1,text:async()=>{read=true;return '';}});
  assert.equal(read,false);assert.equal(oversized.value,null);assert.match(oversized.error,/20 MB/);
});
