export function subpatternQuery(slug, sort, offset = 0) {
  const order = !sort.direction ? 'newest' : sort.field === 'practiced' ? (sort.direction === 'asc' ? 'oldest-practice' : 'recent-practice') : `difficulty-${sort.direction === 'desc' ? 'desc' : 'asc'}`;
  return new URLSearchParams({category:slug,sort:order,offset:String(Number.isInteger(offset) && offset >= 0 && offset <= 1000000 ? offset : 0),limit:'25'}).toString();
}

export function nextProblemSort(current, field) {
  return {field, direction:current.field !== field || !current.direction ? 'asc' : current.direction === 'asc' ? 'desc' : null};
}

export function safeProblemUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && ['leetcode.com','www.leetcode.com'].includes(url.hostname) && /^\/problems\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/|$)/.test(url.pathname) ? url.href : null;
  } catch { return null; }
}

export function backupSummary(value) {
  if (!value || value.format !== 'recall-backup' || value.version !== 1 || !value.tables || !Array.isArray(value.migrations)) throw new Error('Choose a Recall version 1 JSON backup.');
  const entries = Object.entries(value.tables);
  if (!entries.length || entries.some(([,rows])=>!Array.isArray(rows))) throw new Error('Backup tables are invalid.');
  return {records:entries.reduce((sum,[,rows])=>sum+rows.length,0),problems:value.tables.problems?.length || 0,attempts:value.tables.attempts?.length || 0};
}


export function validPageOffset(offset,total,limit=25) {
  return Math.min(offset,Math.max(0,Math.ceil(total/limit)-1)*limit);
}

export function undatedPracticeLabel(problem) {
  return problem.historical||problem.practiced?'Dates unknown':'Not yet';
}
