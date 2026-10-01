import test from 'node:test';
import assert from 'node:assert/strict';
import { backupSummary, subpatternQuery, nextProblemSort, safeProblemUrl } from '../apps/web/src/workflow-model.js';
import { readRoute } from '../apps/web/src/navigation.js';
import { historyInput, libraryInput, placementChangeInput } from '../apps/api/src/domain.js';

test('removed history and problem URLs fall back to the dashboard',()=>{
  assert.equal(readRoute('#/history').page,'dashboard');
  assert.equal(readRoute('#/history?q=two-sum').page,'dashboard');
  assert.equal(readRoute('#/settings').page,'settings');
  assert.notEqual(readRoute('#/problems/12').page,'problems');
});

test('subpattern sorting preserves scope, orders on the server and bounds pagination',()=>{
  for (const [field,direction,order] of [['difficulty','asc','difficulty-asc'],['difficulty','desc','difficulty-desc'],['practiced','asc','oldest-practice'],['practiced','desc','recent-practice']]) {
    const query=new URLSearchParams(subpatternQuery('hashing',{field,direction},25));
    assert.equal(query.get('category'),'hashing');assert.equal(query.get('sort'),order);
    assert.equal(query.get('offset'),'25');assert.equal(query.get('limit'),'25');
    assert.equal(libraryInput(Object.fromEntries(query)).sort,order);
  }
  assert.equal(new URLSearchParams(subpatternQuery('trees',{field:'difficulty',direction:'asc'},-1)).get('offset'),'0');
  assert.deepEqual(nextProblemSort({field:'difficulty',direction:'asc'},'difficulty'),{field:'difficulty',direction:'desc'});
  assert.deepEqual(nextProblemSort({field:'difficulty',direction:'desc'},'difficulty'),{field:'difficulty',direction:null});
  assert.deepEqual(nextProblemSort({field:'difficulty',direction:null},'difficulty'),{field:'difficulty',direction:'asc'});
  assert.equal(new URLSearchParams(subpatternQuery('hashing',{field:'practiced',direction:null})).get('sort'),'newest');
  assert.deepEqual(nextProblemSort({field:'difficulty',direction:'desc'},'practiced'),{field:'practiced',direction:'asc'});
});

test('external problem links reject script URLs, foreign hosts and disguised LeetCode hosts',()=>{
  assert.equal(safeProblemUrl('https://leetcode.com/problems/two-sum/'),'https://leetcode.com/problems/two-sum/');
  for(const value of ['javascript:alert(1)','https://leetcode.com.evil.test/problems/two-sum','https://evil.test/problems/two-sum','http://leetcode.com/problems/two-sum/']) assert.equal(safeProblemUrl(value),null);
});

test('backup preview rejects invalid formats and reports real record counts',()=>{
  const backup={format:'recall-backup',version:1,migrations:[],tables:{problems:[{},{}],attempts:[{}],patterns:[{}]}};
  assert.deepEqual(backupSummary(backup),{records:4,problems:2,attempts:1});
  assert.throws(()=>backupSummary({...backup,version:2}),/version 1/);
  assert.throws(()=>backupSummary({...backup,tables:{problems:'wrong'}}),/invalid/);
});

test('history filtering validates assistance and paginates after applying search',()=>{
  assert.deepEqual(historyInput({q:' Two Sum ',assistance:'hint',limit:'25',offset:'25'}),{q:'Two Sum',assistance:'hint',limit:25,offset:25});
  assert.deepEqual(historyInput({limit:'25'}),{limit:25,offset:0});
  assert.throws(()=>historyInput({assistance:'unknown'}),/assistance/);
  assert.throws(()=>historyInput({q:'x'.repeat(201)}),/200/);
  assert.throws(()=>historyInput({unexpected:'field'}),/unsupported/);
});

test('manual placement is explicit and still restricted to catalog patterns',()=>{
  assert.deepEqual(placementChangeInput({unit:'hashing'}),{unit:'hashing',manual:false});
  assert.deepEqual(placementChangeInput({unit:'binary-search',manual:true}),{unit:'binary-search',manual:true});
  assert.throws(()=>placementChangeInput({unit:'not-a-pattern',manual:true}),/valid primary pattern/);
  assert.throws(()=>placementChangeInput({unit:'hashing',manual:'true'}),/boolean/);
  assert.throws(()=>placementChangeInput({unit:'hashing',extra:true}),/unsupported/);
});
