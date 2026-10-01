export function orderedPatterns(items, view) {
  const evidence = item => item.summary || item;
  const group = item => evidence(item).assessed ? 0 : evidence(item).distinctSolved > 0 ? 1 : 2;
  return [...items].sort((a, b) => {
    if (a.slug === 'other' || b.slug === 'other') return Number(a.slug === 'other') - Number(b.slug === 'other');
    if (view === 'coverage') return (b.goal?.deficit || 0) - (a.goal?.deficit || 0) || (a.order || 0) - (b.order || 0);
    return group(a) - group(b) || (group(a) === 0 ? evidence(a).strength - evidence(b).strength || Date.parse(evidence(a).lastPracticedAt) - Date.parse(evidence(b).lastPracticedAt) : 0) || (a.order || 0) - (b.order || 0);
  });
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
