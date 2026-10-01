import { applyGoalOrdering } from '../apps/api/src/goal-policy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { priorityProgress, difficultyCoverage, retentionOverview, evidenceLabel, filterPatterns, orderedPatterns, prioritizedPatterns, percent } from '../apps/web/src/dashboard-model.js';

const item = (slug, order, { assessed = false, solved = 0, strength = null, gap = 0 } = {}) => ({ slug, name:slug, order, goal:{deficit:gap}, summary:{assessed,distinctSolved:solved,strength,lastPracticedAt:'2026-09-01T00:00:00Z'} });
test('pattern picker uses catalog order, keeps unclassified last, and preserves input', () => {
  const input = [item('a',0,{gap:2}),item('other',3,{gap:50}),item('b',1,{gap:9})];
  assert.deepEqual(orderedPatterns(input).map(row => row.slug),['a','b','other']);
  assert.deepEqual(input.map(row => row.slug),['a','other','b']);
});
test('catalog order stays consistent across dated, undated, and unpracticed evidence', () => {
  const input = [item('new',0),item('undated',1,{solved:20}),item('strong',2,{assessed:true,solved:1,strength:70}),item('weak',3,{assessed:true,solved:1,strength:10})];
  assert.deepEqual(orderedPatterns(input).map(row => row.slug),['new','undated','strong','weak']);
  assert.equal(evidenceLabel(input[2].summary),'Practice strength');
  assert.equal(evidenceLabel(input[1].summary),'Experience · dates unknown');
  assert.equal(evidenceLabel(input[0].summary),'No practice yet');
});
test('child evidence uses the same catalog order despite different strength scores', () => {
  assert.deepEqual(orderedPatterns([{slug:'b',order:1,assessed:true,strength:10},{slug:'a',order:0,assessed:true,strength:90}]).map(row => row.slug),['a','b']);
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

test('display preserves API priority order for categories, subpatterns and search',()=>{
  const input=[item('other',99),item('big-gap',11,{gap:40}),item('small-gap',0,{gap:2}),item('completed',1)];
  const result=prioritizedPatterns(input);
  assert.deepEqual(result.map(row=>row.slug),['big-gap','small-gap','completed','other']);
  assert.deepEqual(input.map(row=>row.slug),['other','big-gap','small-gap','completed']);
  assert.deepEqual(prioritizedPatterns(result.slice(0,3)).map(row=>row.slug),['big-gap','small-gap','completed']);
  assert.deepEqual(filterPatterns(result,'gap').map(row=>row.slug),['big-gap','small-gap']);
});

test('frontend keeps goal-policy priorities even when they differ from catalog order',()=>{
  const goal={categories:[{slug:'arrays-hashing',deficit:2,units:[{slug:'hashing',deficit:0},{slug:'prefix-sum',deficit:2}]},{slug:'graphs',deficit:30,units:[]}]};
  const ranked=applyGoalOrdering([{slug:'arrays-hashing',order:0,priority:30,children:[{slug:'hashing',order:0,priority:95},{slug:'prefix-sum',order:1,priority:10}]},{slug:'graphs',order:10,priority:40,children:[]},{slug:'other',order:16,children:[]}],goal);
  assert.deepEqual(prioritizedPatterns(ranked).map(row=>row.slug),['graphs','arrays-hashing','other']);
  assert.deepEqual(prioritizedPatterns(ranked[1].children).map(row=>row.slug),['prefix-sum','hashing']);
});

test('retention overview averages only assessed pattern strengths and keeps absent dates unknown', () => {
  const categories = [
    {slug:'arrays',summary:{assessed:true,strength:60}},
    {slug:'trees',summary:{assessed:true,strength:20}},
    {slug:'dp',summary:{assessed:false,strength:null,distinctSolved:50}},
    {slug:'graphs',summary:{assessed:false,distinctSolved:0}},
    {slug:'other',summary:{assessed:true,strength:99}},
  ];
  assert.deepEqual(retentionOverview(categories),{score:40,dated:2,undated:1,total:4});
  assert.equal(retentionOverview(categories.slice(2,4)).score,null);
});

test('difficulty coverage keeps pattern-specific credits and excludes zero-target segments', () => {
  const goal={categories:[
    {slug:'arrays',name:'Arrays',difficulty:{easy:{target:10,credited:4,actual:30}}},
    {slug:'trees',name:'Trees',difficulty:{easy:{target:5,credited:5,actual:8}}},
    {slug:'empty',name:'Empty',difficulty:{easy:{target:0,credited:0}}},
  ]};
  const result=difficultyCoverage(goal,'easy');
  assert.equal(result.credited,9);assert.equal(result.target,15);
  assert.deepEqual(result.patterns.map(item=>[item.slug,item.credited,item.target]),[['arrays',4,10],['trees',5,5]]);
  assert.deepEqual(difficultyCoverage({},'hard'),{patterns:[],credited:0,target:0});
});

test('priority progress uses the API balance and preserves unscored states', () => {
  assert.equal(priorityProgress({slug:'graphs',priorityProgress:42.5,priority:95}),42.5);
  assert.equal(priorityProgress({slug:'graphs',priority:47.5}),50);
  assert.equal(priorityProgress({slug:'new',priority:null}),null);
  assert.equal(priorityProgress({slug:'other',priorityProgress:80,priority:20}),null);
});
