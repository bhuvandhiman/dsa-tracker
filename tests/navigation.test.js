import test from 'node:test';
import assert from 'node:assert/strict';
import { patternLink, readRoute } from '../apps/web/src/navigation.js';

test('patterns and dashboard are separate routes with direct detail links', () => {
  assert.equal(readRoute('#/dashboard').page,'dashboard');
  assert.deepEqual(readRoute('#/patterns/trees'),{page:'patterns',slug:'trees',query:''});
  assert.deepEqual(readRoute('#/patterns'),{page:'patterns',slug:null,query:''});
  assert.equal(readRoute('#main').page,'dashboard');
});
test('detail links retain search context across reload and return navigation', () => {
  const route = readRoute(patternLink('dynamic-programming','0/1 knapsack'));
  assert.equal(route.slug,'dynamic-programming');
  assert.equal(route.query,'0/1 knapsack');
  assert.equal(readRoute(patternLink(null,route.query)).query,'0/1 knapsack');
});
test('malformed detail URLs resolve safely to a missing pattern', () => {
  assert.equal(readRoute('#/patterns/%E0%A4%A').slug,'__invalid__');
});
