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
  object(body, ['url', 'title', 'difficulty', 'patternSlugs']);
  const problem = typeof body.url === 'string' && body.url.length <= 2000 && identifyLeetCodeProblem(body.url);
  if (!problem) invalid('Provide an HTTPS LeetCode problem URL.');
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 200) invalid('title must contain 1–200 characters.');
  if (body.difficulty != null && !['easy', 'medium', 'hard'].includes(body.difficulty)) invalid('difficulty must be easy, medium, hard, or null.');
  return { ...problem, title: body.title.trim(), difficulty: body.difficulty ?? null, patternSlugs: patterns(body.patternSlugs ?? []) };
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

export function reviewInput(query) {
  const { view = 'due', ...pagination } = query;
  if (!['due', 'all'].includes(view)) invalid('view must be due or all.');
  return { ...pageInput(pagination), view };
}
