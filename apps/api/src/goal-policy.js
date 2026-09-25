import { navigationCategories, unitsFor, unitForPlacement } from './pattern-catalog.js';

export const GOAL_POLICY_VERSION = '2026-09-26.v1';
export const GOAL_TARGETS = Object.freeze([300, 500, 1000]);

export const GOAL_PROFILES = Object.freeze({
  interview: Object.freeze({
    id: 'interview',
    name: 'Interview Focused',
    description: 'Puts more of the target on patterns that appear frequently in general coding-interview preparation.',
  }),
  deep: Object.freeze({
    id: 'deep',
    name: 'Deep Understanding',
    description: 'Keeps interview-relevant coverage while reserving more room for advanced and lower-frequency patterns.',
  }),
});

// These are Recall policy weights, not externally published interview frequencies.
// The evidence and rationale for this version live in docs/goal-policy-evidence.md.
const categoryWeights = Object.freeze({
  interview: Object.freeze({
    'arrays-hashing': 0.15,
    'two-pointers': 0.06,
    'sliding-window': 0.06,
    stack: 0.06,
    'binary-search': 0.06,
    'linked-list': 0.04,
    trees: 0.08,
    trie: 0.015,
    heap: 0.05,
    backtracking: 0.04,
    graphs: 0.08,
    'dynamic-programming': 0.12,
    greedy: 0.07,
    intervals: 0.04,
    math: 0.05,
    'bit-manipulation': 0.025,
  }),
  deep: Object.freeze({
    'arrays-hashing': 0.09,
    'two-pointers': 0.055,
    'sliding-window': 0.055,
    stack: 0.055,
    'binary-search': 0.055,
    'linked-list': 0.05,
    trees: 0.09,
    trie: 0.03,
    heap: 0.05,
    backtracking: 0.06,
    graphs: 0.10,
    'dynamic-programming': 0.11,
    greedy: 0.06,
    intervals: 0.04,
    math: 0.06,
    'bit-manipulation': 0.04,
  }),
});

const difficultyMix = Object.freeze({
  interview: Object.freeze({ easy: 0.22, medium: 0.63, hard: 0.15 }),
  deep: Object.freeze({ easy: 0.18, medium: 0.57, hard: 0.25 }),
});

const unitWeights = Object.freeze({
  'arrays-hashing': Object.freeze({ hashing: 0.62, 'prefix-sum': 0.25, 'arrays-hashing-general': 0.13 }),
  stack: Object.freeze({ 'monotonic-stack': 0.36, 'stack-general': 0.64 }),
  trees: Object.freeze({ 'tree-dfs': 0.29, 'tree-bfs': 0.16, bst: 0.19, 'segment-tree': 0.08, 'fenwick-tree': 0.05, 'trees-general': 0.23 }),
  graphs: Object.freeze({ 'graph-bfs': 0.16, 'graph-dfs': 0.18, 'union-find': 0.13, 'topological-sort': 0.14, 'shortest-path': 0.18, mst: 0.08, 'graphs-general': 0.13 }),
  'dynamic-programming': Object.freeze({ 'dp-1d': 0.18, 'dp-2d': 0.17, 'knapsack-01': 0.11, 'knapsack-unbounded': 0.08, 'sequence-dp': 0.18, 'interval-dp': 0.08, 'state-machine-dp': 0.08, 'multidimensional-dp': 0.05, 'dynamic-programming-general': 0.07 }),
});

function allocate(total, entries) {
  if (!Number.isInteger(total) || total < 0) throw new Error('Allocation total must be a non-negative integer.');
  const positive = entries.filter(([, weight]) => weight > 0);
  const weightTotal = positive.reduce((sum, [, weight]) => sum + weight, 0);
  if (!weightTotal) return Object.fromEntries(entries.map(([key]) => [key, 0]));
  const rows = positive.map(([key, weight], index) => {
    const exact = total * weight / weightTotal;
    return { key, index, value: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let left = total - rows.reduce((sum, row) => sum + row.value, 0);
  rows.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < left; index++) rows[index % rows.length].value++;
  rows.sort((a, b) => a.index - b.index);
  const result = Object.fromEntries(entries.map(([key]) => [key, 0]));
  for (const row of rows) result[row.key] = row.value;
  return result;
}

function unitWeightEntries(category) {
  const units = unitsFor(category);
  const configured = unitWeights[category.slug];
  if (!configured) return units.map(unit => [unit.slug, 1]);
  return units.map(unit => [unit.slug, configured[unit.slug] ?? 0]);
}

export function buildGoalMatrix(profile, target) {
  if (!GOAL_PROFILES[profile]) throw new Error('Unknown goal profile.');
  if (!GOAL_TARGETS.includes(target)) throw new Error('Unsupported goal target.');
  const categories = navigationCategories.filter(category => category.slug !== 'other');
  const categoryTargets = allocate(target, categories.map(category => [category.slug, categoryWeights[profile][category.slug] ?? 0]));
  return categories.map(category => {
    const categoryTarget = categoryTargets[category.slug];
    const units = unitsFor(category);
    const unitTargets = allocate(categoryTarget, unitWeightEntries(category));
    return {
      slug: category.slug,
      name: category.name,
      target: categoryTarget,
      units: units.map(unit => ({
        slug: unit.slug,
        name: unit.name,
        target: unitTargets[unit.slug],
        difficulty: allocate(unitTargets[unit.slug], Object.entries(difficultyMix[profile])),
      })),
    };
  });
}

function difficulty(value) {
  return ['easy', 'medium', 'hard'].includes(value) ? value : null;
}

function summarizeUnit(unit, solved) {
  const actual = { easy: 0, medium: 0, hard: 0, unknown: 0 };
  for (const problem of solved) {
    const bucket = difficulty(problem.difficulty);
    actual[bucket || 'unknown']++;
  }
  const creditedByDifficulty = {
    easy: Math.min(actual.easy, unit.difficulty.easy),
    medium: Math.min(actual.medium, unit.difficulty.medium),
    hard: Math.min(actual.hard, unit.difficulty.hard),
  };
  const credited = creditedByDifficulty.easy + creditedByDifficulty.medium + creditedByDifficulty.hard;
  const deficitByDifficulty = {
    easy: Math.max(0, unit.difficulty.easy - actual.easy),
    medium: Math.max(0, unit.difficulty.medium - actual.medium),
    hard: Math.max(0, unit.difficulty.hard - actual.hard),
  };
  return {
    ...unit,
    actual,
    credited,
    creditedByDifficulty,
    deficit: unit.target - credited,
    deficitByDifficulty,
    coverage: unit.target ? 100 * credited / unit.target : 100,
    aboveTarget: Math.max(0, actual.easy + actual.medium + actual.hard - unit.target),
  };
}

export function goalCoverage(problems, { profile, target }) {
  const matrix = buildGoalMatrix(profile, target);
  const byUnit = new Map();
  for (const problem of problems) {
    const unit = unitForPlacement(problem.placement);
    if (!byUnit.has(unit)) byUnit.set(unit, []);
    byUnit.get(unit).push(problem);
  }
  const categories = matrix.map(category => {
    const units = category.units.map(unit => summarizeUnit(unit, byUnit.get(unit.slug) || []));
    const credited = units.reduce((sum, unit) => sum + unit.credited, 0);
    const actual = units.reduce((sum, unit) => sum + unit.actual.easy + unit.actual.medium + unit.actual.hard, 0);
    const unknownDifficulty = units.reduce((sum, unit) => sum + unit.actual.unknown, 0);
    const difficulty = ['easy', 'medium', 'hard'].reduce((result, bucket) => {
      result[bucket] = {
        target: units.reduce((sum, unit) => sum + unit.difficulty[bucket], 0),
        actual: units.reduce((sum, unit) => sum + unit.actual[bucket], 0),
        credited: units.reduce((sum, unit) => sum + unit.creditedByDifficulty[bucket], 0),
        deficit: units.reduce((sum, unit) => sum + unit.deficitByDifficulty[bucket], 0),
      };
      return result;
    }, {});
    return {
      slug: category.slug,
      name: category.name,
      target: category.target,
      credited,
      actual,
      unknownDifficulty,
      deficit: category.target - credited,
      coverage: category.target ? 100 * credited / category.target : 100,
      difficulty,
      units,
    };
  });
  const credited = categories.reduce((sum, category) => sum + category.credited, 0);
  const actual = categories.reduce((sum, category) => sum + category.actual, 0);
  const unknownDifficulty = categories.reduce((sum, category) => sum + category.unknownDifficulty, 0);
  return {
    configured: true,
    policyVersion: GOAL_POLICY_VERSION,
    profile,
    profileName: GOAL_PROFILES[profile].name,
    target,
    credited,
    actual,
    unknownDifficulty,
    deficit: target - credited,
    coverage: target ? 100 * credited / target : 100,
    categories,
  };
}

export function unconfiguredGoal() {
  return {
    configured: false,
    policyVersion: GOAL_POLICY_VERSION,
    profiles: Object.values(GOAL_PROFILES),
    targets: GOAL_TARGETS,
  };
}

