export function orderedPatterns(items) {
  return [...items].sort((a, b) => {
    if (a.slug === 'other' || b.slug === 'other') return Number(a.slug === 'other') - Number(b.slug === 'other');
    return (a.order || 0) - (b.order || 0);
  });
}

// The API already ranks coverage gaps using the selected goal and practice
// evidence. Preserve that order instead of replacing it with catalog order.
export function prioritizedPatterns(items) {
  return [...items].sort((a, b) => Number(a.slug === 'other') - Number(b.slug === 'other'));
}

export function filterPatterns(items, query) {
  const term = query.trim().toLocaleLowerCase();
  return items.filter(item => [item.name, ...(item.children || []).map(child => child.name)].some(name => name.toLocaleLowerCase().includes(term)));
}

export function evidenceLabel(item) {
  if (item.assessed) return 'Practice strength';
  return item.distinctSolved > 0 ? 'Experience · dates unknown' : 'No practice yet';
}

export function percent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export function classifiedSolves(item) {
  if (Number.isFinite(item.coverageSolved)) return item.coverageSolved;
  // Older API snapshots expose uncapped primary counts in goal.actual. Never
  // substitute recorded approach counts or capped difficulty credits.
  const actual=item.goal?.actual;
  if (Number.isFinite(actual)) return actual;
  if (actual && ['easy','medium','hard','unknown'].every(key=>Number.isFinite(actual[key])))
    return actual.easy+actual.medium+actual.hard+actual.unknown;
  return null;
}

export function patternProgress(item) {
  if (item.slug === 'other') return null;
  if(Number.isFinite(item.patternProgress))return percent(item.patternProgress);
  const evidence=item.summary||item,strength=evidence.displayStrength;
  if(!Number.isFinite(strength))return null;
  return item.goal&&Number.isFinite(item.goal.coverage)?percent(0.65*item.goal.coverage+0.35*strength):percent(strength);
}

export function retentionOverview(categories) {
  const patterns = categories.filter(item => item.slug !== 'other');
  const assessed = patterns.filter(item => item.summary.assessed && Number.isFinite(item.summary.strength));
  return {
    score: assessed.length ? assessed.reduce((sum, item) => sum + percent(item.summary.strength), 0) / assessed.length : null,
    dated: assessed.length,
    undated: patterns.filter(item => !item.summary.assessed && item.summary.distinctSolved > 0).length,
    total: patterns.length,
  };
}

export function difficultyCoverage(goal, bucket) {
  const patterns = (goal.categories || []).map(category => ({
    slug: category.slug, name: category.name, ...difficultyProgress(category, bucket),
  })).filter(item => item.target > 0);
  return {
    patterns,
    credited: patterns.reduce((sum, item) => sum + item.credited, 0),
    actual: patterns.reduce((sum, item) => sum + item.actual, 0),
    target: patterns.reduce((sum, item) => sum + item.target, 0),
  };
}


// Both segments are contributions to the SAME strength score. Goal coverage and
// focus affect the queue, never the strength fill. Old API snapshots already
// expose experienceScore, so they can be decomposed without fabricated evidence.
export function strengthBarModel(item) {
  if(item.slug==='other')return null;
  const evidence=item.summary||item;
  const assessed=Boolean(evidence.assessed&&Number.isFinite(evidence.strength));
  const score=assessed?percent(evidence.strength):null;
  const base=evidence.strengthComponents?.experience??evidence.experienceScore;
  if(!Number.isFinite(base))return null;
  const experienceWidth=Math.min(percent(base),score??100);
  const recentWidth=assessed?Math.max(0,score-experienceWidth):0;
  const practice=item.queueGate?.practice||evidence.practiceBlock||null;
  const required=Number.isFinite(practice?.required)&&practice.required>0?practice.required:null;
  const earned=required?Math.max(0,Math.min(required,Number(practice.earned)||0)):0;
  return {score,experienceWidth,recentWidth,assessed,practice,blocks:evidence.completedPracticeBlocks||0,
    steps:required?Array.from({length:Math.ceil(required)},(_,index)=>Math.max(0,Math.min(1,earned-index))):[]};
}

// Raw solve totals are display-only. Fill always uses the capped goal credits,
// including category totals whose subpattern balance may still have gaps.
export function difficultyProgress(goal, bucket) {
  const value=goal.difficulty?.[bucket];
  const target=typeof value==='number'?value:value?.target??0;
  const credited=typeof value==='number'?goal.creditedByDifficulty?.[bucket]??0:value?.credited??0;
  const raw=typeof value==='number'?goal.actual?.[bucket]:value?.actual;
  return {target,credited,actual:Number.isFinite(raw)?raw:credited,fill:target?percent(100*credited/target):0};
}

export function recommendationReason(item) {
  if(item.slug==='other')return 'Needs classification';
  if(item.queueGate?.held)return 'Queue held · block unfinished';
  const evidence=item.summary||item;
  const details=item.priorityDetails;
  if(details&&details.actualGap>0&&details.coverageContribution>=details.practiceContribution)return 'Coverage gap';
  if(!evidence.assessed)return evidence.distinctSolved>0?'Practice dates unknown':'Build experience';
  return details?.score===0?'Goal balanced':'Refresh practice';
}

export function practiceEvidenceLabel(item) {
  const total=item.distinctSolved;
  if(!Number.isFinite(total))return 'Practice evidence unavailable';
  const label=`${total} distinct practice ${total===1?'problem':'problems'}`;
  if(!Number.isFinite(item.datedDistinctSolved)||!Number.isFinite(item.legacyDistinctSolved))return label;
  return `${label} · ${item.datedDistinctSolved} dated · ${item.legacyDistinctSolved} dates unknown`;
}
