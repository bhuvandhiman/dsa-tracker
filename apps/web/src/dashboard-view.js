export const VIEW_STORAGE_KEY = 'recall-dashboard-view';
import { dayString } from './dates.js';

export function readDashboardView(storage) {
  try { return storage.getItem(VIEW_STORAGE_KEY) === 'retention' ? 'retention' : 'coverage'; }
  catch { return 'coverage'; }
}

const evidence = item => item.summary || item;
const strength = item => evidence(item).displayStrength ?? evidence(item).strength ?? 0;
const evidenceRank = item => evidence(item).assessed ? 0 : evidence(item).experienced ? 1 : 2;
const originalOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

export function orderPatterns(items, view) {
  return [...items].sort((a, b) => {
    if (a.slug === 'other' || b.slug === 'other') return a.slug === b.slug ? 0 : a.slug === 'other' ? 1 : -1;
    if (view === 'coverage') {
      return (b.goal?.deficit ?? 0) - (a.goal?.deficit ?? 0) || originalOrder(a, b);
    }
    const rank = evidenceRank(a) - evidenceRank(b);
    if (rank) return rank;
    // Unknown dates and never-practiced patterns are not evidence of forgetting.
    if (!evidence(a).assessed) return originalOrder(a, b);
    return strength(a) - strength(b)
      || Date.parse(evidence(a).lastPracticedAt) - Date.parse(evidence(b).lastPracticedAt)
      || originalOrder(a, b);
  });
}

export function dashboardSections(categories, view, query = '') {
  const search = query.trim().toLowerCase();
  const matching = orderPatterns(categories, view).filter(category =>
    `${category.name} ${category.children.map(unit => unit.name).join(' ')}`.toLowerCase().includes(search));
  if (view === 'coverage') return [{ id: 'coverage', title: 'Pattern coverage', items: matching }];
  return [
    { id: 'dated', title: 'Dated practice', description: 'Weaker Practice Strength first; older practice breaks ties.', items: matching.filter(item => item.summary.assessed) },
    { id: 'unknown', title: 'Previous solves · dates unavailable', description: 'These patterns have experience, but their recency cannot be assessed.', items: matching.filter(item => !item.summary.assessed && item.summary.experienced) },
    { id: 'new', title: 'Not yet practiced', description: 'Coverage opportunities, without a retention assessment yet.', items: matching.filter(item => !item.summary.experienced) },
  ].filter(section => section.items.length);
}

export function highlightReason(category, view) {
  if (category.slug === 'other') return null;
  if (view === 'coverage') return category.goal?.deficit > 0 ? `${category.goal.deficit} remaining in your coverage goal` : null;
  const unit = evidence(category);
  return unit.assessed ? `Lower practice strength · last practiced ${dayString(unit.lastPracticedAt)}` : null;
}
