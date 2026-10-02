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
    slug: category.slug, name: category.name, ...category.difficulty[bucket],
  })).filter(item => item.target > 0);
  return {
    patterns,
    credited: patterns.reduce((sum, item) => sum + item.credited, 0),
    target: patterns.reduce((sum, item) => sum + item.target, 0),
  };
}


// Threshold placement and counters come from the queue policy, never a UI projection.
export function priorityBarModel(item) {
  if(item.slug==='other')return null;
  const evidence=item.summary||item;
  const signals=item.prioritySignals;
  if(!signals) {
    if(item.goal)return null;
    return {focusWidth:0,retentionWidth:percent(Number.isFinite(item.queuePriority)?item.queuePriority:100),releaseMark:null,coverage:null,practice:evidence.practiceBlock||null,assessed:Boolean(evidence.assessed),held:false};
  }
  const coverage=item.queueGate?.coverage||{active:item.goal?.deficit>0,earned:signals.releaseCredits,required:signals.releaseTarget};
  return {focusWidth:0.65*percent(signals.focusPush),retentionWidth:0.35*percent(signals.retentionPush),releaseMark:coverage.active&&Number.isFinite(signals.releaseMark)?percent(signals.releaseMark):null,coverage,practice:item.queueGate?.practice||evidence.practiceBlock||null,assessed:Boolean(signals.retentionAssessed),held:Boolean(item.queueGate?.held)};
}
