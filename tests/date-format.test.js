import test from 'node:test';
import assert from 'node:assert/strict';
import {formatPracticeDate} from '../apps/web/src/date-format.js';

test('practice dates keep the existing India day boundary regardless of browser timezone',()=>{
  assert.equal(formatPracticeDate('2026-10-10T20:00:00Z',{year:'numeric',month:'2-digit',day:'2-digit',hour:undefined,minute:undefined}),'11/10/2026');
  assert.match(formatPracticeDate('2026-10-10T20:00:00Z',{dateStyle:'medium',timeStyle:'short'}),/11 Oct 2026/);
});
test('missing and malformed timestamps do not crash pages or turn into 1970 dates',()=>{
  for(const value of [null,undefined,'','bad-date'])assert.equal(formatPracticeDate(value,{fallback:'Date unavailable'}),'Date unavailable');
});
