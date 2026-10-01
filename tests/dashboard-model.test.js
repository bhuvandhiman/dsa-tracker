import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceLabel, filterPatterns, orderedPatterns, percent } from '../apps/web/src/dashboard-model.js';

const item = (slug, order, { assessed = false, solved = 0, strength = null, gap = 0 } = {}) => ({ slug, name:slug, order, goal:{deficit:gap}, summary:{assessed,distinctSolved:solved,strength,lastPracticedAt:'2026-09-01T00:00:00Z'} });
test('coverage uses remaining target gaps, keeps unclassified last, and preserves input', () => {
  const input = [item('a',0,{gap:2}),item('other',3,{gap:50}),item('b',1,{gap:9})];
  assert.deepEqual(orderedPatterns(input,'coverage').map(row => row.slug),['b','a','other']);
  assert.deepEqual(input.map(row => row.slug),['a','other','b']);
});
test('retention separates dated, undated, and unpracticed evidence and sorts weaker dated first', () => {
  const input = [item('new',0),item('undated',1,{solved:20}),item('strong',2,{assessed:true,solved:1,strength:70}),item('weak',3,{assessed:true,solved:1,strength:10})];
  assert.deepEqual(orderedPatterns(input,'retention').map(row => row.slug),['weak','strong','undated','new']);
  assert.equal(evidenceLabel(input[1].summary),'Experience · dates unknown');
  assert.equal(evidenceLabel(input[0].summary),'No practice yet');
});
test('retention orders child evidence directly and uses catalog ties', () => {
  assert.deepEqual(orderedPatterns([{slug:'b',order:1,assessed:true,strength:20},{slug:'a',order:0,assessed:true,strength:20}], 'retention').map(row => row.slug),['a','b']);
});
test('search finds parent categories through child names and handles whitespace and no matches', () => {
  const input = [{name:'Dynamic programming',children:[{name:'0/1 Knapsack'}]},{name:'Trees',children:[]}];
  assert.deepEqual(filterPatterns(input,' KNAPSACK '),[input[0]]);
  assert.deepEqual(filterPatterns(input,'absent'),[]);
  assert.deepEqual(filterPatterns(input,''),input);
});
test('progress values stay bounded and invalid values do not become invented scores', () => {
  assert.equal(percent(null),0); assert.equal(percent(-1),0); assert.equal(percent(500),100); assert.equal(percent(49.2),49.2);
});
