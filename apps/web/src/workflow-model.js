export function subpatternQuery(slug, sort, offset = 0) {
  const order = !sort.direction ? 'newest' : sort.field === 'practiced' ? (sort.direction === 'asc' ? 'oldest-practice' : 'recent-practice') : `difficulty-${sort.direction === 'desc' ? 'desc' : 'asc'}`;
  return new URLSearchParams({category:slug,sort:order,offset:String(Number.isInteger(offset) && offset >= 0 && offset <= 1000000 ? offset : 0),limit:'25'}).toString();
}

export function nextProblemSort(current, field) {
  return {field, direction:current.field !== field || !current.direction ? 'asc' : current.direction === 'asc' ? 'desc' : null};
}

export function localDateTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,23);
}

export function correctionPayload(attempt, fields) {
  const date = new Date(fields.attemptedAt);
  if (!Number.isFinite(date.getTime())) throw new Error('Choose a valid practice date.');
  if (!fields.patternSlugs.length) throw new Error('Select at least one pattern used.');
  return {revision:attempt.revision,assistance:fields.assistance,notes:fields.notes,patternSlugs:fields.patternSlugs,
    attemptedAt:date.toISOString(),...(fields.practiceUnit && fields.practiceUnit !== attempt.practiceUnit ? {practiceUnit:fields.practiceUnit} : {})};
}

export function safeProblemUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['leetcode.com','www.leetcode.com'].includes(url.hostname) && url.pathname.startsWith('/problems/') ? url.href : null;
  } catch { return null; }
}

export function backupSummary(value) {
  if (!value || value.format !== 'recall-backup' || value.version !== 1 || !value.tables || !Array.isArray(value.migrations)) throw new Error('Choose a Recall version 1 JSON backup.');
  const entries = Object.entries(value.tables);
  if (!entries.length || entries.some(([,rows])=>!Array.isArray(rows))) throw new Error('Backup tables are invalid.');
  return {records:entries.reduce((sum,[,rows])=>sum+rows.length,0),problems:value.tables.problems?.length || 0,attempts:value.tables.attempts?.length || 0};
}
