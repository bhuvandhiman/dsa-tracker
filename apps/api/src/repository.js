import { createHash } from 'node:crypto';
import { DomainError } from './domain.js';
import { reviewDays } from './review-policy.js';

const problemSelect = `SELECT p.id, p.platform, p.external_id AS "externalId", p.title, p.url, p.difficulty,
  COALESCE((SELECT json_agg(pp.pattern_slug ORDER BY pp.pattern_slug) FROM problem_patterns pp WHERE pp.problem_id=p.id), '[]') AS "patternSlugs",
  EXISTS(SELECT 1 FROM historical_solves h WHERE h.problem_id=p.id) AS "historicallySolved"
  FROM problems p`;
const attemptSelect = `SELECT a.id, a.assistance, a.notes, a.attempted_at AS "attemptedAt", a.created_at AS "createdAt",
  json_build_object('id', p.id, 'platform', p.platform, 'externalId', p.external_id, 'title', p.title, 'url', p.url) AS problem,
  COALESCE((SELECT json_agg(ap.pattern_slug ORDER BY ap.pattern_slug) FROM attempt_patterns ap WHERE ap.attempt_id=a.id), '[]') AS "patternSlugs"
  FROM attempts a JOIN problems p ON p.id=a.problem_id`;

export function createRepository(pool) {
  async function transaction(work) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  async function requirePatterns(client, slugs) {
    const { rows } = await client.query('SELECT slug FROM patterns WHERE slug = ANY($1::text[])', [slugs]);
    if (rows.length !== slugs.length) throw new DomainError(400, 'One or more patterns do not exist. Use GET /api/patterns.');
  }
  async function requireProblem(client, id) {
    if (!(await client.query('SELECT id FROM problems WHERE id=$1', [id])).rowCount) throw new DomainError(404, 'Problem not found.');
  }
  return {
    async listPatterns() { return (await pool.query('SELECT slug, name FROM patterns ORDER BY name')).rows; },
    async listReviews({ limit, offset, view, asOf }) {
      // Choose the latest practiced time, not the most recently entered backfill.
      // Equal practice times use creation time, then UUID, for a stable tie-break.
      const { rows } = await pool.query(`WITH latest AS (
        SELECT DISTINCT ON (a.problem_id) a.* FROM attempts a
        ORDER BY a.problem_id, a.attempted_at DESC, a.created_at DESC, a.id DESC
      ), scheduled AS (
        SELECT a.id AS "attemptId", a.problem_id AS "problemId", p.title, p.url,
          a.assistance, a.attempted_at AS "attemptedAt",
          CASE a.assistance WHEN 'solution' THEN $1::int WHEN 'hint' THEN $2::int ELSE $3::int END AS "intervalDays",
          a.attempted_at + (CASE a.assistance WHEN 'solution' THEN $1::int WHEN 'hint' THEN $2::int ELSE $3::int END * 24) * INTERVAL '1 hour' AS "dueAt",
          COALESCE((SELECT json_agg(ap.pattern_slug ORDER BY ap.pattern_slug) FROM attempt_patterns ap WHERE ap.attempt_id=a.id), '[]') AS "patternSlugs"
        FROM latest a JOIN problems p ON p.id=a.problem_id
      ), matching AS (
        SELECT *, "dueAt" <= $4::timestamptz AS due FROM scheduled
        WHERE $5::text='all' OR "dueAt" <= $4::timestamptz
      ) SELECT
        (SELECT COUNT(*)::int FROM scheduled) AS "totalTracked",
        (SELECT COUNT(*)::int FROM scheduled WHERE "dueAt" <= $4::timestamptz) AS "totalDue",
        (SELECT COUNT(*)::int FROM matching) AS "totalMatching",
        COALESCE((SELECT json_agg(page ORDER BY page."dueAt", page."problemId") FROM (
          SELECT * FROM matching ORDER BY "dueAt", "problemId" LIMIT $6 OFFSET $7
        ) page), '[]') AS reviews`,
      [reviewDays.solution, reviewDays.hint, reviewDays.independent, asOf, view, limit, offset]);
      return rows[0];
    },
    async listProblems({ limit, offset }) { return (await pool.query(`${problemSelect} ORDER BY p.id DESC LIMIT $1 OFFSET $2`, [limit, offset])).rows; },
    async createProblem(input) {
      return transaction(async (client) => {
        await requirePatterns(client, input.patternSlugs);
        const inserted = await client.query(`INSERT INTO problems (platform, external_id, title, url, difficulty)
          VALUES ($1,$2,$3,$4,$5) ON CONFLICT (platform, external_id) DO NOTHING RETURNING id`,
        [input.platform, input.externalId, input.title, input.url, input.difficulty]);
        const created = inserted.rowCount === 1;
        const id = created ? inserted.rows[0].id : (await client.query('SELECT id FROM problems WHERE platform=$1 AND external_id=$2', [input.platform, input.externalId])).rows[0].id;
        if (created) {
          for (const slug of input.patternSlugs) await client.query('INSERT INTO problem_patterns (problem_id, pattern_slug) VALUES ($1,$2)', [id, slug]);
        }
        return { created, problem: (await client.query(`${problemSelect} WHERE p.id=$1`, [id])).rows[0] };
      });
    },
    async setProblemPatterns(id, slugs) {
      return transaction(async (client) => {
        // Serialize replacements on the same problem so concurrent PUTs cannot merge accidentally.
        if (!(await client.query('SELECT id FROM problems WHERE id=$1 FOR UPDATE', [id])).rowCount) throw new DomainError(404, 'Problem not found.');
        await requirePatterns(client, slugs);
        await client.query('DELETE FROM problem_patterns WHERE problem_id=$1', [id]);
        for (const slug of slugs) await client.query('INSERT INTO problem_patterns (problem_id, pattern_slug) VALUES ($1,$2)', [id, slug]);
        return (await client.query(`${problemSelect} WHERE p.id=$1`, [id])).rows[0];
      });
    },
    async listAttempts({ limit, offset }) { return (await pool.query(`${attemptSelect} ORDER BY a.attempted_at DESC, a.id DESC LIMIT $1 OFFSET $2`, [limit, offset])).rows; },
    async createAttempt(input) {
      const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
      return transaction(async (client) => {
        await requireProblem(client, input.problemId);
        await requirePatterns(client, input.patternSlugs);
        const inserted = await client.query(`INSERT INTO attempts (id, problem_id, assistance, notes, attempted_at, request_hash)
          VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING RETURNING id`,
        [input.requestId, input.problemId, input.assistance, input.notes, input.attemptedAt, hash]);
        const created = inserted.rowCount === 1;
        if (!created) {
          const existing = (await client.query('SELECT request_hash FROM attempts WHERE id=$1', [input.requestId])).rows[0];
          if (existing.request_hash !== hash) throw new DomainError(409, 'requestId already belongs to a different attempt. Use a new UUID for a new attempt.');
        } else {
          for (const slug of input.patternSlugs) await client.query('INSERT INTO attempt_patterns (attempt_id, pattern_slug) VALUES ($1,$2)', [input.requestId, slug]);
        }
        return { created, attempt: (await client.query(`${attemptSelect} WHERE a.id=$1`, [input.requestId])).rows[0] };
      });
    },
    async importHistory(ids) {
      return transaction(async (client) => {
        const found = await client.query('SELECT id FROM problems WHERE id=ANY($1::int[])', [ids]);
        if (found.rowCount !== ids.length) throw new DomainError(404, 'One or more problems do not exist. Add them to the catalog first.');
        let imported = 0;
        for (const id of ids) imported += (await client.query('INSERT INTO historical_solves (problem_id) VALUES ($1) ON CONFLICT DO NOTHING', [id])).rowCount;
        return { imported, alreadyImported: ids.length - imported };
      });
    },
    async listHistory({ limit, offset }) {
      return (await pool.query(`SELECT h.problem_id AS "problemId", p.title, p.url, p.platform, h.imported_at AS "importedAt"
        FROM historical_solves h JOIN problems p ON p.id=h.problem_id ORDER BY h.imported_at DESC, h.problem_id DESC LIMIT $1 OFFSET $2`, [limit, offset])).rows;
    },
  };
}
