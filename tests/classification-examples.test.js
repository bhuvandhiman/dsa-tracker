import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyProblem,candidateUnits,patternInventory} from '../apps/api/src/pattern-catalog.js';
import {goalCoverage} from '../apps/api/src/goal-policy.js';
import {overview} from '../apps/api/src/retention-policy.js';

// Raw tag combinations observed in the user's import. Expected defaults are
// reviewed product choices, never a claim that only one valid solution exists.
const examples=[
 ['word-ladder',['Hash Table','String','Breadth-First Search','Bidirectional Search'],'graph-bfs'],
 ['minimum-genetic-mutation',['Hash Table','String','Breadth-First Search','Bidirectional Search'],'graph-bfs'],
 ['rotting-oranges',['Array','Breadth-First Search','Matrix'],'graph-bfs'],
 ['nearest-exit-from-entrance-in-maze',['Array','Breadth-First Search','Matrix'],'graph-bfs'],
 ['find-closest-node-to-given-two-nodes',['Depth-First Search','Graph Theory'],'graph-dfs'],
 ['keys-and-rooms',['Depth-First Search','Breadth-First Search','Graph Theory'],'graphs-general'],
 ['flood-fill',['Array','Depth-First Search','Breadth-First Search','Matrix'],'graphs-general'],
 ['course-schedule-ii',['Depth-First Search','Breadth-First Search','Graph Theory','Topological Sort'],'topological-sort'],
 ['path-with-minimum-effort',['Array','Binary Search','Depth-First Search','Breadth-First Search','Union-Find','Heap (Priority Queue)','Matrix',"Dijkstra's Algorithm"],'shortest-path'],
 ['merge-intervals',['Array','Sorting','Quicksort'],'intervals'],
 ['insert-interval',['Array'],'intervals'],
 ['remove-covered-intervals',['Array','Sorting'],'intervals'],
 ['minimum-number-of-arrows-to-burst-balloons',['Array','Greedy','Sorting'],'intervals'],
 ['non-overlapping-intervals',['Array','Dynamic Programming','Greedy','Sorting'],'intervals'],
 ['interval-list-intersections',['Array','Two Pointers','Sweep Line'],'two-pointers'],
 ['my-calendar-ii',['Array','Binary Search','Design','Segment Tree','Prefix Sum','Ordered Set'],'segment-tree'],
 ['burst-balloons',['Array','Dynamic Programming'],'interval-dp'],
 ['coin-change',['Array','Dynamic Programming','Breadth-First Search'],'graph-bfs'],
 ['binary-tree-right-side-view',['Tree','Depth-First Search','Breadth-First Search','Binary Tree'],'trees-general'],
 ['new-tree-bfs',['Tree','Breadth-First Search'],'tree-bfs'],
 ['new-hash',['Array','Hash Table'],'hashing'],
];
const input=(slug,tags,id=1)=>({id,platform:'leetcode',externalId:slug,providerTopics:tags,patternSlugs:[],historicallySolved:true,difficulty:'medium'});
test('reviewed imported examples classify identically regardless of provider order or stale collapsed tags',()=>{
 for(const [slug,tags,expected] of examples){
  const p=input(slug,tags);
  assert.equal(classifyProblem(p).unit,expected,slug);
  assert.equal(classifyProblem({...p,providerTopics:[...tags].reverse(),patternSlugs:['math']}).unit,expected,slug);
  assert.deepEqual(p.providerTopics,tags);
  assert.equal(classifyProblem({...p,placementOverride:'hashing'}).unit,'hashing',slug);
 }
});
test('ambiguous traversal keeps General first and retains alternatives; refinements do not displace clear techniques',()=>{
 assert.deepEqual(candidateUnits(input('keys-and-rooms',['Graph Theory','Depth-First Search','Breadth-First Search'])).map(c=>c.unit),['graphs-general','graph-dfs','graph-bfs']);
 assert.ok(candidateUnits(input('interval-list-intersections',['Array','Two Pointers','Sweep Line'])).some(c=>c.unit==='intervals'));
 assert.ok(candidateUnits(input('coin-change',['Array','Dynamic Programming','Breadth-First Search'])).some(c=>c.unit==='knapsack-unbounded'));
 assert.equal(classifyProblem(input('unknown',['Future Technique'])).unit,'other');
});
test('coverage conserves solved identities while practice evidence follows recorded approaches',()=>{
 const problems=examples.map(([slug,tags],index)=>{const p=input(slug,tags,index+1);return {...p,placement:classifyProblem(p)};});
 assert.equal(patternInventory(problems).reduce((sum,c)=>sum+c.count,0),problems.length);
 const coverage=goalCoverage(problems,{profile:'interview',target:300});
 assert.equal(coverage.actual,problems.length);
 assert.equal(coverage.categories.flatMap(c=>c.units).reduce((sum,u)=>sum+u.actual.easy+u.actual.medium+u.actual.hard+u.actual.unknown,0),problems.length);
 const recorded=[{problemId:1,practiceUnit:'hashing',assistance:'independent',at:'2026-10-01T10:00:00Z'}];
 const result=overview(problems,recorded,{},Date.parse('2026-10-02T10:00:00Z'));
 assert.equal(result.categories.reduce((sum,c)=>sum+c.summary.coverageSolved,0),problems.length);
 const bfs=result.categories.find(c=>c.slug==='graphs').children.find(c=>c.slug==='graph-bfs');
 assert.equal(bfs.coverageSolved,5);
 const hashing=result.categories.find(c=>c.slug==='arrays-hashing').children.find(c=>c.slug==='hashing');
 assert.equal(hashing.coverageSolved,1);
 assert.equal(hashing.datedDistinctSolved,1);
 assert.equal(hashing.distinctSolved,2);
});
