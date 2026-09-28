const excludedDsaTopics = Object.freeze({
  database: 'database',
});

export function dsaExclusion(problem) {
  const topics = new Set(problem.patternSlugs || []);
  if (topics.has(excludedDsaTopics.database)) return 'database';
  return null;
}

export function isDsaTrackingProblem(problem) {
  return dsaExclusion(problem) === null;
}

export function splitDsaTrackingProblems(problems) {
  const tracked = [];
  const excluded = { total: 0, database: 0 };
  for (const problem of problems) {
    const reason = dsaExclusion(problem);
    if (!reason) {
      tracked.push(problem);
      continue;
    }
    excluded.total += 1;
    excluded[reason] += 1;
  }
  return { tracked, excluded };
}
