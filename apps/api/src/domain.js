import { retentionUnits } from './pattern-catalog.js';
import { mapTopics } from './platforms/leetcode-topics.js';
import { identifyLeetCodeProblem } from './platforms/leetcode.js';

export class DomainError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function invalid(message) { throw new DomainError(400, message); }
function object(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('A JSON object is required.');
  if (Object.keys(value).some((key) => !fields.includes(key))) invalid('Request contains unsupported fields.');
}
export function positiveId(value) {
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) value = Number(value);
  if (!Number.isInteger(value) || value < 1 || value > 2147483647) invalid('A positive integer problem ID is required.');
  return value;
}
export function patterns(value) {
  if (!Array.isArray(value) || value.length > 15 || value.some((slug) => typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100)) invalid('patternSlugs must be an array of up to 15 pattern slugs.');
  return [...new Set(value)].sort();
}
export function problemInput(body) {
  object(body, ['url', 'title', 'difficulty', 'patternSlugs', 'placement']);
  const problem = typeof body.url === 'string' && body.url.length <= 2000 && identifyLeetCodeProblem(body.url);
  if (!problem) invalid('Provide an HTTPS LeetCode problem URL.');
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 200) invalid('title must contain 1–200 characters.');
  if (body.difficulty != null && !['easy', 'medium', 'hard'].includes(body.difficulty)) invalid('difficulty must be easy, medium, hard, or null.');
  return { ...problem, title: body.title.trim(), difficulty: body.difficulty ?? null, patternSlugs: patterns(body.patternSlugs ?? []), ...(body.placement !== undefined ? {placement:placementInput({unit:body.placement})} : {}) };
}
export function attemptInput(body) {
  object(body, ['requestId', 'problemId', 'assistance', 'patternSlugs', 'notes', 'attemptedAt']);
  if (typeof body.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) invalid('requestId must be a version 4 UUID; reuse it only when retrying the same attempt.');
  if (!['independent', 'hint', 'solution'].includes(body.assistance)) invalid('assistance must be independent, hint, or solution.');
  const selected = patterns(body.patternSlugs);
  if (!selected.length) invalid('Select at least one pattern actually used.');
  const notes = body.notes ?? '';
  if (typeof notes !== 'string' || notes.length > 5000) invalid('notes must be text of at most 5000 characters.');
  // A canonical UTC timestamp avoids silently interpreting local dates or invalid calendar dates.
  const value = body.attemptedAt;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) invalid('attemptedAt must be a UTC timestamp like 2026-09-22T09:00:00.000Z.');
  if (Date.parse(value) > Date.now() + 60000) invalid('attemptedAt cannot be in the future.');
  return { requestId: body.requestId.toLowerCase(), problemId: positiveId(body.problemId), assistance: body.assistance, patternSlugs: selected, notes, attemptedAt: value };
}
export function importInput(body) {
  object(body, ['problemIds']);
  if (!Array.isArray(body.problemIds) || !body.problemIds.length || body.problemIds.length > 100) invalid('problemIds must contain 1–100 problem IDs.');
  return [...new Set(body.problemIds.map(positiveId))].sort((a, b) => a - b);
}
export function patternInput(body) { object(body, ['patternSlugs']); return patterns(body.patternSlugs); }
export function pageInput(query) {
  object(query, ['limit', 'offset']);
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);
  if ((query.limit !== undefined && (typeof query.limit !== 'string' || !/^\d+$/.test(query.limit))) || !Number.isInteger(limit) || limit < 1 || limit > 100) invalid('limit must be between 1 and 100.');
  if ((query.offset !== undefined && (typeof query.offset !== 'string' || !/^\d+$/.test(query.offset))) || !Number.isInteger(offset) || offset < 0 || offset > 1000000) invalid('offset must be between 0 and 1000000.');
  return { limit, offset };
}


export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) invalid('A version 4 UUID is required.');
  return value.toLowerCase();
}
export function revisionInput(body) {
  object(body, ['revision']);
  return positiveId(body.revision);
}
export function correctionInput(body) {
  object(body, ['revision', 'assistance', 'patternSlugs', 'notes', 'attemptedAt', 'practiceUnit']);
  const { revision, practiceUnit, ...fields } = body;
  const validated = attemptInput({ ...fields, requestId: '00000000-0000-4000-8000-000000000000', problemId: 1 });
  const { assistance, patternSlugs, notes, attemptedAt } = validated;
  return { revision: positiveId(revision), assistance, patternSlugs, notes, attemptedAt, ...(practiceUnit !== undefined ? {practiceUnit: placementInput({unit:practiceUnit})} : {}) };
}
export function libraryInput(query) {
  const { q = '', pattern = '', category = '', status = 'all', ...pagination } = query;
  if (typeof category !== 'string' || category.length > 100) invalid('Invalid category filter.');
  if (typeof q !== 'string' || q.length > 200) invalid('Search must be at most 200 characters.');
  if (typeof pattern !== 'string' || pattern.length > 100) invalid('Invalid pattern filter.');
  if (!['all', 'done', 'practiced', 'unpracticed', 'historical'].includes(status)) invalid('Invalid library status.');
  return { ...pageInput(pagination), q: q.trim(), pattern, category, status };
}

export function captureInput(body) {
  object(body, ['requestId', 'url', 'title', 'topics', 'selectedTopics', 'assistance', 'attemptedAt', 'practiceUnit', 'approachSource', 'captureSource', 'submissionId']);
  const topicList = value => {
    if (!Array.isArray(value) || value.length > 30 || value.some(t => typeof t !== 'string' || !t.trim() || t.length > 100)) invalid('Topics must contain up to 30 short names.');
    return [...new Set(value.map(t => t.trim()))].sort();
  };
  const topics = topicList(body.topics ?? []);
  const selected = topicList(body.selectedTopics ?? []);
  if (selected.some(t => !topics.includes(t))) invalid('Selected topics must belong to this problem.');
  const possible = mapTopics(topics);
  const used = selected.length ? mapTopics(selected) : possible;
  const problem = problemInput({ url: body.url, title: body.title, patternSlugs: possible.length ? possible : ['uncategorized'] });
  const attempt = attemptInput({ requestId: body.requestId, problemId: 1, assistance: body.assistance,
    attemptedAt: body.attemptedAt, patternSlugs: (used.length ? used : ['uncategorized']) });
  const { requestId, assistance, attemptedAt, patternSlugs, notes } = attempt;
  const fields = { requestId, assistance, attemptedAt, patternSlugs, notes };
  if (body.practiceUnit !== undefined) placementInput({unit:body.practiceUnit});
  if (body.approachSource !== undefined && !['inferred','confirmed'].includes(body.approachSource)) invalid('Invalid approach source.');
  if (body.captureSource !== undefined && !['manual','accepted'].includes(body.captureSource)) invalid('Invalid capture source.');
  if (body.submissionId != null && !/^\d{1,30}$/.test(body.submissionId)) invalid('Invalid submission identity.');
  return { problem, attempt: { ...fields, practiceUnit:body.practiceUnit??null, approachSource:body.approachSource||'inferred', captureSource:body.captureSource||'manual', submissionId:body.submissionId??null, selectedTopics:selected, patternSource: selected.length ? 'explicit' : 'inferred' } };
}

export function legacyInput(body) {
  object(body, ['runId','installationId','username','problems','complete']);
  const installationId = uuid(body.runId ?? body.installationId);
  if (typeof body.username !== 'string' || !body.username.trim() || body.username.length > 100) invalid('A signed-in LeetCode username is required.');
  if (typeof body.complete !== 'boolean') invalid('complete must be boolean.');
  if (!Array.isArray(body.problems) || body.problems.length > 10 || (!body.problems.length && !body.complete)) invalid('Send 1–10 problems per batch, or an empty completion batch.');
  const problems = body.problems.map(value => {
    object(value, ['url','title','difficulty','topics']);
    if (!Array.isArray(value.topics) || value.topics.length > 30 || value.topics.some(t=>typeof t!=='string'||!t.trim()||t.length>100)) invalid('Invalid problem topics.');
    const slugs = mapTopics(value.topics);
    return problemInput({url:value.url,title:value.title,difficulty:value.difficulty,patternSlugs:slugs.length?slugs:['uncategorized']});
  });
  return { installationId, username:body.username.trim(), problems, complete:body.complete };
}

export function placementInput(body) {
  object(body,['unit']);
  if(body.unit!==null&&!retentionUnits.some(u=>u.slug===body.unit)) invalid('Choose a valid primary pattern.');
  return body.unit;
}
export function recentInput(body) {
  object(body,['runId','installationId','username','submissions']);
  const installationId=uuid(body.runId ?? body.installationId);
  if(typeof body.username!=='string'||!body.username.trim()||body.username.length>100) invalid('Invalid LeetCode username.');
  if(!Array.isArray(body.submissions)||body.submissions.length>20) invalid('At most 20 recent submissions are accepted.');
  const submissions=body.submissions.map(row=>{
    object(row,['submissionId','submittedAt','url','title','difficulty','topics']);
    if(typeof row.submissionId!=='string'||!/^\d{1,30}$/.test(row.submissionId)) invalid('Invalid submission ID.');
    if(typeof row.submittedAt!=='string'||!Number.isFinite(Date.parse(row.submittedAt))||new Date(row.submittedAt).toISOString()!==row.submittedAt||Date.parse(row.submittedAt)>Date.now()+60000||Date.parse(row.submittedAt)<946684800000) invalid('Invalid submission timestamp.');
    if(!Array.isArray(row.topics)||row.topics.length>30||row.topics.some(t=>typeof t!=='string'||t.length>100)) invalid('Invalid problem topics.');
    return {...problemInput({url:row.url,title:row.title,difficulty:row.difficulty,patternSlugs:mapTopics(row.topics)}),submissionId:row.submissionId,submittedAt:row.submittedAt};
  });
  return {installationId,username:body.username,submissions};
}
