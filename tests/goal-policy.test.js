import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyGoalOrdering, buildGoalMatrix, goalCoverage } from '../apps/api/src/goal-policy.js';

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

test('every positively weighted subpattern keeps a base target', () => {
  for (const profile of ['interview', 'deep']) {
    for (const target of [300, 500, 1000]) {
      const matrix = buildGoalMatrix(profile, target);
      for (const category of matrix) {
        for (const unit of category.units) assert.ok(unit.target >= 1, `${profile} ${target} ${unit.slug} should have a base target`);
      }
    }
  }
});

test('larger goals add difficulty depth instead of multiplying one fixed mix', () => {
  for (const profile of ['interview', 'deep']) {
    const hardShare = [];
    const easyShare = [];
    for (const target of [300, 500, 1000]) {
      const matrix = buildGoalMatrix(profile, target);
      const difficulty = matrix.flatMap(category => category.units).reduce((total, unit) => {
        total.easy += unit.difficulty.easy;
        total.hard += unit.difficulty.hard;
        return total;
      }, { easy: 0, hard: 0 });
      easyShare.push(difficulty.easy / target);
      hardShare.push(difficulty.hard / target);
    }
    assert.ok(easyShare[0] > easyShare[1] && easyShare[1] > easyShare[2]);
    assert.ok(hardShare[0] < hardShare[1] && hardShare[1] < hardShare[2]);
  }
});

test('larger and deeper goals reserve proportionally more room for advanced subpatterns', () => {
  const advancedShare = (profile, target, categorySlug, slugs) => {
    const category = buildGoalMatrix(profile, target).find(item => item.slug === categorySlug);
    const advanced = category.units.filter(unit => slugs.includes(unit.slug)).reduce((sum, unit) => sum + unit.target, 0);
    return advanced / category.target;
  };
  const treeAdvanced = ['segment-tree', 'fenwick-tree'];
  const dpAdvanced = ['interval-dp', 'state-machine-dp', 'multidimensional-dp'];
  assert.ok(advancedShare('interview', 300, 'trees', treeAdvanced) < advancedShare('interview', 1000, 'trees', treeAdvanced));
  assert.ok(advancedShare('interview', 300, 'dynamic-programming', dpAdvanced) < advancedShare('interview', 1000, 'dynamic-programming', dpAdvanced));
  assert.ok(advancedShare('interview', 500, 'trees', treeAdvanced) < advancedShare('deep', 500, 'trees', treeAdvanced));
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
  assert.ok(unit.actual.easy > unit.difficulty.easy);
  assert.equal(unit.creditedByDifficulty.easy, unit.difficulty.easy);
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

test('configured goals combine profile-specific deficits with practice weakness without changing practice strength', () => {
  const retention = [
    {
      slug: 'arrays-hashing', name: 'Arrays & Hashing', priority: 40, order: 0,
      children: [
        { slug: 'hashing', priority: 35, order: 0 },
        { slug: 'prefix-sum', priority: 70, order: 1 },
        { slug: 'arrays-hashing-general', priority: 20, order: 2 },
      ],
    },
    {
      slug: 'dynamic-programming', name: 'Dynamic Programming', priority: 55, order: 11,
      children: [
        { slug: 'dp-1d', priority: 50, order: 0 },
        { slug: 'dp-2d', priority: 60, order: 1 },
        { slug: 'knapsack-01', priority: 30, order: 2 },
        { slug: 'knapsack-unbounded', priority: 30, order: 3 },
        { slug: 'sequence-dp', priority: 45, order: 4 },
        { slug: 'interval-dp', priority: 80, order: 5 },
        { slug: 'state-machine-dp', priority: 75, order: 6 },
        { slug: 'multidimensional-dp', priority: 85, order: 7 },
        { slug: 'dynamic-programming-general', priority: 25, order: 8 },
      ],
    },
    { slug: 'other', name: 'Needs classification', priority: null, order: 99, children: [] },
  ];
  const problems = [
    ...Array.from({ length: 12 }, (_, index) => solved(index + 1, 'arrays-hashing', 'hashing', 'easy')),
    ...Array.from({ length: 10 }, (_, index) => solved(index + 100, 'dynamic-programming', 'dp-1d', 'medium')),
  ];
  const interview = applyGoalOrdering(retention, goalCoverage(problems, { profile: 'interview', target: 300 }));
  const deep = applyGoalOrdering(retention, goalCoverage(problems, { profile: 'deep', target: 300 }));

  assert.deepEqual(interview.slice(0, 2).map(category => category.slug), ['arrays-hashing', 'dynamic-programming']);
  assert.deepEqual(deep.slice(0, 2).map(category => category.slug), ['dynamic-programming', 'arrays-hashing']);
  assert.equal(interview.at(-1).slug, 'other');
  assert.equal(deep.at(-1).slug, 'other');
  assert.notDeepEqual(interview.slice(0, 2).map(category => category.dashboardPriority), deep.slice(0, 2).map(category => category.dashboardPriority));
  assert.deepEqual(
    interview.flatMap(category => category.children).map(unit => [unit.slug, unit.priority]).sort(),
    deep.flatMap(category => category.children).map(unit => [unit.slug, unit.priority]).sort(),
  );
  const dp = deep.find(category => category.slug === 'dynamic-programming');
  assert.ok(dp.children[0].goal.deficit > 0);
});

test('practice weakness can move a slightly smaller goal gap ahead', () => {
  const goal = {
    categories: [
      { slug: 'arrays-hashing', deficit: 8, units: [] },
      { slug: 'graphs', deficit: 7, units: [] },
    ],
  };
  const ordered = applyGoalOrdering([
    { slug: 'arrays-hashing', priority: 10, order: 0, children: [] },
    { slug: 'graphs', priority: 95, order: 10, children: [] },
  ], goal);
  assert.equal(ordered[0].slug, 'graphs');
  assert.equal(ordered[0].priority, 95);
});

test('a rare completely weak topic cannot outrank a much larger profile gap', () => {
  const goal = {
    categories: [
      { slug: 'dynamic-programming', deficit: 20, units: [] },
      { slug: 'bit-manipulation', deficit: 6, units: [] },
    ],
  };
  const ordered = applyGoalOrdering([
    { slug: 'dynamic-programming', priority: 25, order: 11, children: [] },
    { slug: 'bit-manipulation', priority: 95, order: 15, children: [] },
  ], goal);
  assert.equal(ordered[0].slug, 'dynamic-programming');
});
