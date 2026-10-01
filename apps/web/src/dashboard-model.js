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
