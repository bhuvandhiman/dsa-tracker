import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchesRetentionFilter} from '../apps/web/src/retentionFilters.js';

const now=Date.parse('2026-01-31T12:00:00Z');
const day=86400000;
const category=(summary)=>({summary});

test('retention filters use factual dated-practice and experience states',()=>{
  const recent=category({experienced:true,assessed:true,lastPracticedAt:new Date(now-5*day).toISOString(),legacyDistinctSolved:0,datedDistinctSolved:4});
  const stale=category({experienced:true,assessed:true,lastPracticedAt:new Date(now-30*day).toISOString(),legacyDistinctSolved:0,datedDistinctSolved:4});
  const never=category({experienced:false,assessed:false,lastPracticedAt:null,legacyDistinctSolved:0,datedDistinctSolved:0});
  assert.equal(matchesRetentionFilter(recent,'recent',now),true);
  assert.equal(matchesRetentionFilter(recent,'stale',now),false);
  assert.equal(matchesRetentionFilter(stale,'recent',now),false);
  assert.equal(matchesRetentionFilter(stale,'stale',now),true);
  assert.equal(matchesRetentionFilter(never,'never',now),true);
  assert.equal(matchesRetentionFilter(never,'recent',now),false);
});

test('mostly legacy requires more undated solved problems than dated ones',()=>{
  const mostlyLegacy=category({experienced:true,assessed:true,lastPracticedAt:new Date(now).toISOString(),legacyDistinctSolved:4,datedDistinctSolved:2});
  const evenSplit=category({experienced:true,assessed:true,lastPracticedAt:new Date(now).toISOString(),legacyDistinctSolved:2,datedDistinctSolved:2});
  const datedOnly=category({experienced:true,assessed:true,lastPracticedAt:new Date(now).toISOString(),legacyDistinctSolved:0,datedDistinctSolved:3});
  assert.equal(matchesRetentionFilter(mostlyLegacy,'legacy',now),true);
  assert.equal(matchesRetentionFilter(evenSplit,'legacy',now),false);
  assert.equal(matchesRetentionFilter(datedOnly,'legacy',now),false);
});
