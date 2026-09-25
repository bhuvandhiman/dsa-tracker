import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildGoalMatrix, goalCoverage } from '../apps/api/src/goal-policy.js';

const solved = (id, category, subpattern, difficulty) => ({
  id,
  difficulty,
  placement: { category, subpattern },
});

test('every goal matrix allocates exactly the selected total', () => {
  for (const profile of ['interview', 'deep']) {
    for (const target of [300, 500, 1000]) {
      const matrix = buildGoalMatrix(profile, target);
      assert.equal(matrix.reduce((sum, category) => sum + category.target, 0), target);
      for (const category of matrix) {
        assert.equal(category.units.reduce((sum, unit) => sum + unit.target, 0), category.target);
        for (const unit of category.units) {
          assert.equal(Object.values(unit.difficulty).reduce((sum, value) => sum + value, 0), unit.target);
        }
      }
    }
  }
});

test('easy surplus cannot hide medium or hard deficits', () => {
  const matrix = buildGoalMatrix('interview', 300);
  const arrays = matrix.find(category => category.slug === 'arrays-hashing');
  const hashing = arrays.units.find(unit => unit.slug === 'hashing');
  const problems = [];
  let id = 1;
  for (let index = 0; index < hashing.difficulty.easy + 20; index++) problems.push(solved(id++, 'arrays-hashing', 'hashing', 'easy'));
  for (let index = 0; index < Math.max(0, hashing.difficulty.medium - 1); index++) problems.push(solved(id++, 'arrays-hashing', 'hashing', 'medium'));
  const result = goalCoverage(problems, { profile: 'interview', target: 300 });
  const unit = result.categories.find(category => category.slug === 'arrays-hashing').units.find(value => value.slug === 'hashing');
  assert.equal(unit.creditedByDifficulty.easy, hashing.difficulty.easy);
  assert.equal(unit.deficitByDifficulty.medium, hashing.difficulty.medium ? 1 : 0);
  assert.ok(unit.deficit >= unit.deficitByDifficulty.medium + unit.deficitByDifficulty.hard);
});

test('one solved problem gives one placement credit and unknown difficulty gives no guessed credit', () => {
  const problems = [
    solved(1, 'arrays-hashing', 'hashing', 'medium'),
    solved(2, 'arrays-hashing', 'hashing', null),
    solved(3, 'graphs', 'graph-bfs', 'hard'),
  ];
  const result = goalCoverage(problems, { profile: 'interview', target: 300 });
  const hashing = result.categories.find(category => category.slug === 'arrays-hashing').units.find(unit => unit.slug === 'hashing');
  assert.equal(hashing.actual.medium, 1);
  assert.equal(hashing.actual.unknown, 1);
  assert.equal(hashing.credited, Math.min(1, hashing.difficulty.medium));
  assert.equal(result.unknownDifficulty, 1);
});

test('re-solves cannot inflate goal coverage once solved identities are deduplicated', () => {
  const unique = [solved(1, 'dynamic-programming', 'dp-1d', 'medium')];
  const result = goalCoverage(unique, { profile: 'deep', target: 500 });
  const unit = result.categories.find(category => category.slug === 'dynamic-programming').units.find(value => value.slug === 'dp-1d');
  assert.equal(unit.actual.medium, 1);
  assert.equal(unit.credited, 1);
});

