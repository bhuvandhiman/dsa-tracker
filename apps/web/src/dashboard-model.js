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

export function priorityProgress(item) {
  if (item.slug === 'other') return null;
  if(item.priorityDetails&&Number.isFinite(item.priorityProgress)) return percent(item.priorityProgress);
  if(item.goal)return null;
  const score=Number.isFinite(item.queuePriority)?item.queuePriority:item.priority;
  return Number.isFinite(score)?percent(2*Math.floor(score/2)):null;
}

export function priorityExplanation(item) {
  const d=item.priorityDetails;
  if(d) return `${d.profileName}: coverage gap ${d.coverageContribution.toFixed(1)} + practice need ${d.practiceContribution.toFixed(1)} = ${d.score.toFixed(1)} attention points. Ranking band: ${d.bandScore} points. ${d.actualGap} actual goal credits remaining; ${d.committedGap} used by the practice-block queue. Similar scores share a ${d.bufferCredits}-point band and use catalog order. Bars share a ${d.scale}-point scale at this level. More fill means more attention needed.`;
  return 'Practice-only priority: based on practice evidence committed through completed blocks, with earned holds and gradual recency decay. Similar scores share a two-point band. More fill means more attention needed.';
}

export function priorityScore(item) {
  if(item.slug==='other')return null;
  if(item.priorityDetails)return item.priorityDetails.bandScore;
  if(item.goal)return null;
  const score=Number.isFinite(item.queuePriority)?item.queuePriority:item.priority;
  return Number.isFinite(score)?2*Math.floor(score/2):null;
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
