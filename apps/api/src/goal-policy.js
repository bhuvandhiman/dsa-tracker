import { navigationCategories, unitsFor, unitForPlacement } from './pattern-catalog.js';
import { practicePolicy } from './practice-policy.js';

export const GOAL_POLICY_VERSION = '2026-10-02.v8';
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

// Larger goals intentionally add depth instead of scaling the same matrix.
// The exact mixes are Recall policy. See docs/goal-policy-evidence.md.
const difficultyMix = Object.freeze({
  interview: Object.freeze({
    300: Object.freeze({ easy: 0.26, medium: 0.64, hard: 0.10 }),
    500: Object.freeze({ easy: 0.22, medium: 0.63, hard: 0.15 }),
    1000: Object.freeze({ easy: 0.18, medium: 0.60, hard: 0.22 }),
  }),
  deep: Object.freeze({
    300: Object.freeze({ easy: 0.22, medium: 0.60, hard: 0.18 }),
    500: Object.freeze({ easy: 0.18, medium: 0.57, hard: 0.25 }),
    1000: Object.freeze({ easy: 0.14, medium: 0.56, hard: 0.30 }),
  }),
});

const unitWeights = Object.freeze({
  'arrays-hashing': Object.freeze({ hashing: 0.62, 'prefix-sum': 0.25, 'arrays-hashing-general': 0.13 }),
  stack: Object.freeze({ 'monotonic-stack': 0.36, 'stack-general': 0.64 }),
  trees: Object.freeze({ 'tree-dfs': 0.29, 'tree-bfs': 0.16, bst: 0.19, 'segment-tree': 0.08, 'fenwick-tree': 0.05, 'trees-general': 0.23 }),
  graphs: Object.freeze({ 'graph-bfs': 0.16, 'graph-dfs': 0.18, 'union-find': 0.13, 'topological-sort': 0.14, 'shortest-path': 0.18, mst: 0.08, 'graphs-general': 0.13 }),
  'dynamic-programming': Object.freeze({ 'dp-1d': 0.18, 'dp-2d': 0.17, 'knapsack-01': 0.11, 'knapsack-unbounded': 0.08, 'sequence-dp': 0.18, 'interval-dp': 0.08, 'state-machine-dp': 0.08, 'multidimensional-dp': 0.05, 'dynamic-programming-general': 0.07 }),
});

// These multipliers control how quickly advanced subpatterns enter the target.
// A 300-problem interview goal keeps them deliberately small; larger/deeper
// goals reserve a larger share without making rare techniques equal to core ones.
const depthMultipliers = Object.freeze({
  interview: Object.freeze({
    300: Object.freeze({
      'segment-tree': 0.35,
      'fenwick-tree': 0.25,
      mst: 0.50,
      'interval-dp': 0.55,
      'state-machine-dp': 0.70,
      'multidimensional-dp': 0.35,
    }),
    500: Object.freeze({
      'segment-tree': 0.70,
      'fenwick-tree': 0.60,
      mst: 0.75,
      'interval-dp': 0.75,
      'state-machine-dp': 0.85,
      'multidimensional-dp': 0.65,
    }),
    1000: Object.freeze({}),
  }),
  deep: Object.freeze({
    300: Object.freeze({
      'segment-tree': 0.70,
      'fenwick-tree': 0.65,
      mst: 0.80,
      'interval-dp': 0.80,
      'state-machine-dp': 0.90,
      'multidimensional-dp': 0.75,
    }),
    500: Object.freeze({}),
    1000: Object.freeze({
      'segment-tree': 1.20,
      'fenwick-tree': 1.20,
      mst: 1.15,
      'interval-dp': 1.15,
      'state-machine-dp': 1.10,
      'multidimensional-dp': 1.20,
    }),
  }),
});

function allocate(total, entries, { minimumOne = false } = {}) {
  if (!Number.isInteger(total) || total < 0) throw new Error('Allocation total must be a non-negative integer.');
  const positive = entries.filter(([, weight]) => weight > 0);
  const weightTotal = positive.reduce((sum, [, weight]) => sum + weight, 0);
  if (!weightTotal) return Object.fromEntries(entries.map(([key]) => [key, 0]));
  const base = minimumOne && total >= positive.length ? 1 : 0;
  const distributable = total - base * positive.length;
  const rows = positive.map(([key, weight], index) => {
    const exact = distributable * weight / weightTotal;
    return { key, index, value: base + Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let left = total - rows.reduce((sum, row) => sum + row.value, 0);
  rows.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < left; index++) rows[index % rows.length].value++;
  rows.sort((a, b) => a.index - b.index);
  const result = Object.fromEntries(entries.map(([key]) => [key, 0]));
  for (const row of rows) result[row.key] = row.value;
  return result;
}

function unitWeightEntries(category, profile, target) {
  const units = unitsFor(category);
  const configured = unitWeights[category.slug];
  if (!configured) return units.map(unit => [unit.slug, 1]);
  const multipliers = depthMultipliers[profile][target];
  return units.map(unit => [unit.slug, (configured[unit.slug] ?? 0) * (multipliers[unit.slug] ?? 1)]);
}

export function buildGoalMatrix(profile, target) {
  if (!GOAL_PROFILES[profile]) throw new Error('Unknown goal profile.');
  if (!GOAL_TARGETS.includes(target)) throw new Error('Unsupported goal target.');
  const categories = navigationCategories.filter(category => category.slug !== 'other');
  const categoryTargets = allocate(target, categories.map(category => [category.slug, categoryWeights[profile][category.slug] ?? 0]));
  return categories.map(category => {
    const categoryTarget = categoryTargets[category.slug];
    const units = unitsFor(category);
    const unitTargets = allocate(categoryTarget, unitWeightEntries(category, profile, target), { minimumOne: true });
    return {
      slug: category.slug,
      name: category.name,
      target: categoryTarget,
      units: units.map(unit => ({
        slug: unit.slug,
        name: unit.name,
        target: unitTargets[unit.slug],
        difficulty: allocate(unitTargets[unit.slug], Object.entries(difficultyMix[profile][target])),
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

function practicePriority(item) {
  return Number.isFinite(item?.queuePriority) ? item.queuePriority : Number.isFinite(item?.priority) ? item.priority : -1;
}

function remainingGoalGap(item) {
  return Math.max(0,Number(item?.goal?.deficit)||0);
}

// Profile-weighted targets keep important patterns prominent. Coverage accounts
// for 65% of attention, while practice weakness contributes 35% even after the
// solve goal is met, so completed but neglected patterns still need revision.
const PRACTICE_ATTENTION_SHARE = 0.35;

function practiceNeed(item) {
  const priority = practicePriority(item);
  if (priority < 0) return 1;
  return Math.min(1, Math.max(0, priority / 100));
}

function attentionScore(item) {
  const gap = remainingGoalGap(item);
  const target = Math.max(gap, Number(item?.goal?.target) || 0);
  return (1 - PRACTICE_ATTENTION_SHARE) * gap + PRACTICE_ATTENTION_SHARE * target * practiceNeed(item);
}

function withPriorityProgress(item,importance,profileName,previous,scale) {
  const score = attentionScore(item);
  const gap=remainingGoalGap(item),target=Math.max(gap,Number(item.goal?.target)||0);
  const scored=item.slug!=='other'&&Boolean(item.goal);
  const evidence=item.summary||item;
  const coverage=item.goal?.coverage??(target?100*(1-gap/target):0);
  const strength=evidence.displayStrength??(Number.isFinite(item.priority)?100-item.priority:0);
  const progress=Math.max(0,Math.min(100,0.65*coverage+0.35*strength));
  const credited=item.goal?.credited??target-gap,blocks=evidence.completedPracticeBlocks||0;
  const validMemory=previous&&['anchor','credited','blocks','gap'].every(key=>Number.isFinite(previous[key])&&previous[key]>=0);
  previous=validMemory?previous:null;
  const evidenceKey=evidence.queueEvidenceKey||null;
  const corrected=Boolean(previous&&(credited<(previous.lastCredited??previous.credited)||blocks<previous.blocks||(blocks===previous.blocks&&evidenceKey&&previous.evidenceKey&&evidenceKey!==previous.evidenceKey)));
  const gained=previous?Math.max(0,credited-previous.credited):0;
  const coverageRelease=Boolean(previous&&(gained>=practicePolicy.blockWeight||(gap===0&&previous.gap>0)));
  const practiceRelease=Boolean(previous&&blocks>previous.blocks);
  const release=!previous||corrected||coverageRelease||practiceRelease;
  const rankingPriority=release?score:Math.max(score,previous.anchor);
  // Bulk coverage keeps the unfinished remainder toward the following block.
  const baseline=coverageRelease&&!corrected&&gap>0?previous.credited+Math.floor(gained/practicePolicy.blockWeight)*practicePolicy.blockWeight:credited;
  const queueMemory=release?{anchor:score,credited:baseline,blocks,gap:target-baseline,lastCredited:credited,evidenceKey}:{...previous,anchor:rankingPriority,lastCredited:credited,evidenceKey};
  const earned=Math.max(0,credited-queueMemory.credited);
  const required=Math.min(practicePolicy.blockWeight,queueMemory.gap);
  const remaining=Math.min(gap,Math.max(0,required-earned));
  const coverageGate={active:gap>0,earned,required,remaining};
  const practiceGate=evidence.practiceBlock||{unit:null,earned:0,distinct:0,required:practicePolicy.blockWeight,minimumDistinct:practicePolicy.minimumDistinct};
  const queueGate={coverage:coverageGate,practice:practiceGate,held:rankingPriority>score+1e-9,reason:!previous?'initial':corrected?'correction':practiceRelease?'practice':coverageRelease?'coverage':'held'};
  const releaseMark=gap>0?Number((100*(score-0.65*remaining)/scale).toFixed(10)):null;
  const tier=importance>=0.5?'high':importance>=0.25?'medium':'lower';
  return {...item,dashboardPriority:score,
    rankingPriority,queueMemory,queueGate:scored?queueGate:null,
    prioritySignals:scored?{focusPush:100*gap/scale,retentionPush:100*target*practiceNeed(item)/scale,scale,retentionAssessed:Boolean(evidence.assessed),releaseCredits:earned,releaseTarget:required,releaseMark}:null,
    capabilitySignals:scored?{foundation:coverage,retention:evidence.assessed&&Number.isFinite(evidence.strength)?evidence.strength:null,foundationShare:0.65,retentionShare:0.35,coverageMark:gap>0&&target>0?Math.min(100,0.65*(coverage+100*remaining/target)+0.35*(evidence.assessed&&Number.isFinite(evidence.strength)?evidence.strength:0)):null}:null,
    patternProgress:scored?progress:null,
    emphasis:scored?{tier,label: `${tier==='lower'?'Lower':tier==='high'?'High':'Medium'} emphasis`,profileName:profileName||'Selected focus'}:null,
    priorityDetails:scored?{score,coverageContribution:0.65*gap,practiceContribution:0.35*target*practiceNeed(item),actualGap:gap,target,profileName:profileName||'Selected focus'}:null};
}

function compareGoalAttention(a, b) {
  if (a.slug === 'other') return b.slug === 'other' ? 0 : 1;
  if (b.slug === 'other') return -1;
  return Math.floor((b.rankingPriority??attentionScore(b)) / practicePolicy.bufferCredits) - Math.floor((a.rankingPriority??attentionScore(a)) / practicePolicy.bufferCredits)
    || (a.order ?? 0) - (b.order ?? 0);
}

// Practice Strength itself remains independent from Goal Coverage. This ordering
// only combines the two signals to decide which existing gap deserves more
// attention on the dashboard.
export function applyGoalOrdering(categories, goal, snapshot) {
  const byCategory = new Map(goal.categories.map(category => [category.slug, category]));
  const valid=snapshot?.version===GOAL_POLICY_VERSION&&snapshot.profile===goal.profile&&snapshot.target===goal.target;
  const memory=valid?snapshot.items||{}:{};
  const weights=categoryWeights[goal.profile]||{};
  const maximum=Math.max(1e-9,...Object.values(weights));
  const categoryScale=Math.max(1,...goal.categories.map(c=>Number(c.target)||c.deficit||0));
  return categories.map(category => {
    const categoryGoal = byCategory.get(category.slug) || null;
    const byUnit = new Map((categoryGoal?.units || []).map(unit => [unit.slug, unit]));
    const unitScale=Math.max(1,...(categoryGoal?.units||[]).map(u=>Number(u.target)||u.deficit||0));
    const importance=(weights[category.slug]??0)/maximum;
    const children = category.children
      .map(unit => withPriorityProgress({ ...unit, goal: byUnit.get(unit.slug) || null },importance*(byUnit.get(unit.slug)?.target||0)/unitScale,goal.profileName,memory['unit:'+unit.slug],unitScale))
      .sort(compareGoalAttention);
    return withPriorityProgress({
      ...category,
      goal: categoryGoal,
      children,
      attention: children[0]?.slug || null,
    },importance,goal.profileName,memory['category:'+category.slug],categoryScale);
  }).sort(compareGoalAttention);
}

export function goalQueueSnapshot(categories,goal) {
  return {version:GOAL_POLICY_VERSION,profile:goal.profile,target:goal.target,items:Object.fromEntries(categories.flatMap(c=>[...(c.goal?[['category:'+c.slug,c.queueMemory]]:[]),...c.children.filter(u=>u.goal).map(u=>['unit:'+u.slug,u.queueMemory])]))};
}

export function unconfiguredGoal() {
  return {
    configured: false,
    policyVersion: GOAL_POLICY_VERSION,
    profiles: Object.values(GOAL_PROFILES),
    targets: GOAL_TARGETS,
  };
}
