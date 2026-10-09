import { DomainError } from './domain.js';

const identity = problem => JSON.stringify([problem.platform, problem.externalId]);

// The caller owns the transaction and account lock. Fold repeated problems
// before upsert: PostgreSQL cannot update the same conflict row twice.
export async function upsertImportedProblems(client, problems) {
  if (!problems.length) return [];
  const unique = new Map();
  for (const problem of problems) {
    const key = identity(problem), existing = unique.get(key);
    if (existing) {
      existing.difficulty ??= problem.difficulty;
      if (Array.isArray(problem.providerTopics)) existing.provider_topics = problem.providerTopics;
      for (const slug of problem.patternSlugs) existing.patterns.add(slug);
    } else {
      unique.set(key, {
        platform: problem.platform, external_id: problem.externalId,
        title: problem.title, url: problem.url, difficulty: problem.difficulty ?? null,
        provider_topics: Array.isArray(problem.providerTopics) ? problem.providerTopics : null,
        patterns: new Set(problem.patternSlugs),
      });
    }
  }
  const entries = [...unique.values()];
  const slugs = [...new Set(entries.flatMap(problem => [...problem.patterns]))];
  const known = await client.query('SELECT slug FROM patterns WHERE slug = ANY($1::text[])', [slugs]);
  if (known.rows.length !== slugs.length) throw new DomainError(400, 'One or more patterns do not exist. Use GET /api/patterns.');

  // Existing titles, URLs, known difficulties, notes and manual placement stay
  // authoritative. Provider topics use the last supplied snapshot, as before.
  const saved = await client.query(`INSERT INTO problems(platform,external_id,title,url,difficulty,provider_topics)
    SELECT platform,external_id,title,url,difficulty,provider_topics
    FROM jsonb_to_recordset($1::jsonb) AS incoming(platform text,external_id text,title text,url text,difficulty text,provider_topics jsonb)
    ON CONFLICT(platform,external_id) DO UPDATE SET
      difficulty=COALESCE(problems.difficulty,EXCLUDED.difficulty),
      provider_topics=COALESCE(EXCLUDED.provider_topics,problems.provider_topics)
    RETURNING id,platform,external_id`, [JSON.stringify(entries.map(({ patterns: _patterns, ...row }) => row))]);
  const ids = new Map(saved.rows.map(row => [JSON.stringify([row.platform, row.external_id]), row.id]));
  if (ids.size !== unique.size || [...unique.keys()].some(key => !ids.has(key))) throw new Error('Imported problem identities were not confirmed.');
  const links = entries.flatMap(problem => [...problem.patterns].map(slug => ({problem_id: ids.get(JSON.stringify([problem.platform, problem.external_id])), pattern_slug: slug})));
  if (links.length) await client.query(`INSERT INTO problem_patterns(problem_id,pattern_slug)
    SELECT problem_id,pattern_slug FROM jsonb_to_recordset($1::jsonb) AS incoming(problem_id integer,pattern_slug text)
    ON CONFLICT DO NOTHING`, [JSON.stringify(links)]);
  return problems.map(problem => ids.get(identity(problem)));
}

export async function insertRecentEvidence(client, username, submissions, problemIds) {
  if (!submissions.length) return 0;
  const unique = new Map();
  for (let index = 0; index < submissions.length; index++) {
    const row = submissions[index], value = {submission_id: row.submissionId, problem_id: problemIds[index], submitted_at: row.submittedAt};
    const old = unique.get(row.submissionId);
    if (old && (old.problem_id !== value.problem_id || old.submitted_at !== value.submitted_at)) throw new DomainError(409, 'Submission identity changed. Nothing was imported.');
    unique.set(row.submissionId, value);
  }
  const added = await client.query(`INSERT INTO imported_submissions(username,submission_id,problem_id,submitted_at)
    SELECT $1,submission_id,problem_id,submitted_at FROM jsonb_to_recordset($2::jsonb)
      AS incoming(submission_id text,problem_id integer,submitted_at timestamptz)
    ON CONFLICT DO NOTHING RETURNING submission_id`, [username, JSON.stringify([...unique.values()])]);
  // Verify skipped conflicts too; reusing a submission ID for another problem
  // or date must roll back the entire batch, including metadata updates.
  const saved = await client.query('SELECT submission_id,problem_id,submitted_at FROM imported_submissions WHERE username=$1 AND submission_id=ANY($2::text[])', [username, [...unique.keys()]]);
  if (saved.rows.length !== unique.size || saved.rows.some(row => {
    const expected = unique.get(row.submission_id);
    return !expected || row.problem_id !== expected.problem_id || new Date(row.submitted_at).toISOString() !== expected.submitted_at;
  })) throw new DomainError(409, 'Submission identity changed. Nothing was imported.');
  return added.rowCount;
}
