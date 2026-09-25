import assert from 'node:assert/strict';
import {test} from 'node:test';
import {candidateUnits, classifyProblem, patternInventory, categories} from '../apps/api/src/pattern-catalog.js';
const problem = (externalId, patternSlugs=[]) => ({platform:'leetcode',externalId,patternSlugs});
test('primary patterns override broad provider tags without changing them',()=>{
  const input=problem('3sum',['arrays-hashing','sorting','two-pointers']);
  assert.equal(classifyProblem(input).category,'two-pointers');
  assert.deepEqual(input.patternSlugs,['arrays-hashing','sorting','two-pointers']);
  assert.equal(classifyProblem(problem('minimum-window-substring',['strings','arrays-hashing'])).category,'sliding-window');
  assert.equal(classifyProblem(problem('coin-change',['arrays-hashing','dynamic-programming'])).subpattern,'knapsack-unbounded');
  assert.equal(classifyProblem(problem('minimum-genetic-mutation',['graphs'])).subpattern,'graph-bfs');
  assert.equal(classifyProblem(problem('number-of-islands',['matrix','graphs'])).subpattern,'graph-dfs');
});
test('fallback is deterministic and never invents a graph or DP subtype',()=>{
  assert.equal(classifyProblem(problem('unknown',['arrays-hashing','sliding-window'])).category,'sliding-window');
  assert.equal(classifyProblem(problem('unknown',['dynamic-programming'])).subpattern,null);
  assert.equal(classifyProblem(problem('unknown',['graphs'])).subpattern,null);
  assert.equal(classifyProblem(problem('unknown',[])).category,'other');
  assert.equal(classifyProblem({...problem('coin-change',['math']),platform:'codeforces'}).category,'math');
});
test('candidate choices stay within curated mappings and LeetCode topics',()=>{
  const ambiguous=problem('single-number',['arrays-hashing','bit-manipulation']);
  assert.deepEqual(candidateUnits(ambiguous).map(unit=>unit.unit),['bit-manipulation','arrays-hashing-general']);
  assert.equal(classifyProblem(ambiguous).unit,'bit-manipulation');
  assert.deepEqual(candidateUnits(problem('power-of-two',['bit-manipulation','math'])).map(unit=>unit.unit),['bit-manipulation','math']);
  const exact=candidateUnits(problem('coin-change',['dynamic-programming','arrays-hashing']));
  assert.equal(exact[0].unit,'knapsack-unbounded');
  assert.equal(exact[0].source,'curated');
  assert.deepEqual(candidateUnits(problem('unknown',['recursion'])),[]);
  assert.equal(classifyProblem(problem('unknown',['recursion'])).category,'other');
});
test('each problem contributes to exactly one major pattern, with nested counts',()=>{
  const problems=[problem('3sum'),problem('coin-change'),problem('target-sum'),problem('unknown')].map(p=>({...p,placement:classifyProblem(p)}));
  const inventory=patternInventory(problems);
  assert.equal(categories.length,16);
  assert.equal(inventory.reduce((n,p)=>n+p.count,0),4);
  const dp=inventory.find(p=>p.slug==='dynamic-programming');
  assert.equal(dp.count,2);
  assert.equal(dp.children.filter(p=>p.slug.startsWith('knapsack-')).reduce((n,p)=>n+p.count,0),2);
});
