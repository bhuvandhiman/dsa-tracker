const DAY = 86400000;

export function matchesRetentionFilter(category, filter, now = Date.now()) {
  const unit = category.summary;
  if (filter === "all") return true;
  if (filter === "never") return !unit.experienced;
  if (filter === "legacy") {
    if (!unit.experienced || !unit.legacyDistinctSolved) return false;
    return unit.legacyDistinctSolved > (unit.datedDistinctSolved || 0);
  }
  if (!unit.assessed || !unit.lastPracticedAt) return false;
  const ageDays = Math.max(0, now - new Date(unit.lastPracticedAt).getTime()) / DAY;
  if (filter === "recent") return ageDays < 30;
  if (filter === "stale") return ageDays >= 30;
  return true;
}
