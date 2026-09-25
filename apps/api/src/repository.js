import { overview, practiceDay } from './retention-policy.js';
import { createHash } from 'node:crypto';
import { DomainError } from './domain.js';
import { candidateUnits, classifyProblem, patternInventory, unitForPlacement, retentionUnits } from './pattern-catalog.js';

const problemSelect = `SELECT p.id, p.platform, p.external_id AS "externalId", p.title, p.url, p.difficulty,
  (SELECT unit_slug FROM problem_placements WHERE problem_id=p.id) AS "placementOverride",
  COALESCE((SELECT json_agg(pp.pattern_slug ORDER BY pp.pattern_slug) FROM problem_patterns pp WHERE pp.problem_id=p.id), '[]') AS "patternSlugs",
  EXISTS(SELECT 1 FROM historical_solves h WHERE h.problem_id=p.id) AS "historicallySolved"
  FROM problems p`;
const attemptSelect = `SELECT a.id, a.revision, a.practice_unit AS "practiceUnit", a.approach_source AS "approachSource", a.capture_source AS "captureSource", a.selected_topics AS "selectedTopics", a.pattern_source AS "patternSource", a.assistance, a.notes, a.attempted_at AS "attemptedAt", a.created_at AS "createdAt",
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
  async function lockAccount(client,username) {
    await client.query('INSERT INTO workspace_account(username) VALUES($1) ON CONFLICT DO NOTHING',[username]);
    const saved=(await client.query('SELECT username FROM workspace_account FOR UPDATE')).rows[0];
    if(saved.username!==username)throw new DomainError(409,'Use the original LeetCode account: '+saved.username);
  }
  async function classifiedProblems() {
    const rows = (await pool.query(problemSelect)).rows;
    return rows.map(problem => ({...problem, placement:classifyProblem(problem)}));
  }
  return {
    async practiceContext(problem) {
      const saved=(await pool.query(problemSelect+' WHERE p.platform=$1 AND p.external_id=$2',[problem.platform,problem.externalId])).rows[0];
      return {units:retentionUnits,practiceUnit:classifyProblem(saved||problem).unit};
    },
    async retention() {
      const problems=await classifiedProblems();
      const events=(await pool.query(`SELECT problem_id AS "problemId",attempted_at AS at,assistance,practice_unit AS "practiceUnit" FROM attempts WHERE deleted_at IS NULL UNION ALL SELECT i.problem_id,i.submitted_at,'unknown',NULL FROM imported_submissions i WHERE NOT EXISTS(SELECT 1 FROM attempts a WHERE a.problem_id=i.problem_id AND a.deleted_at IS NULL AND (a.submission_id=i.submission_id OR (a.attempted_at AT TIME ZONE 'Asia/Calcutta')::date=(i.submitted_at AT TIME ZONE 'Asia/Calcutta')::date))`)).rows;
      return overview(problems,events);
    },
    async setPlacement(id,unit) {
      return transaction(async client=>{
        if(!(await client.query('SELECT id FROM problems WHERE id=$1 FOR UPDATE',[id])).rowCount) throw new DomainError(404,'Problem not found.');
        const problem=(await client.query(problemSelect+' WHERE p.id=$1',[id])).rows[0];
        if(unit&&!candidateUnits(problem).some(candidate=>candidate.unit===unit)) throw new DomainError(400,'Choose an approach supported by this problem\'s LeetCode topics.');
        await client.query('DELETE FROM problem_placements WHERE problem_id=$1',[id]);
        if(unit) await client.query('INSERT INTO problem_placements VALUES($1,$2)',[id,unit]);
        return {saved:true};
      });
    },
    async recentStatus(id) {
      return (await pool.query('SELECT username,completed FROM recent_imports WHERE installation_id=$1',[id])).rows[0]||{completed:false};
    },
    async importRecent({installationId,username,submissions}) {
      return transaction(async client=>{
        await lockAccount(client,username);
        const legacy=(await client.query('SELECT username FROM legacy_imports WHERE installation_id=$1',[installationId])).rows[0];
        if(legacy&&legacy.username!==username) throw new DomainError(409,'Use the same LeetCode account as your legacy import.');
        await client.query('INSERT INTO recent_imports(installation_id,username) VALUES($1,$2) ON CONFLICT DO NOTHING',[installationId,username]);
        const job=(await client.query('SELECT * FROM recent_imports WHERE installation_id=$1 FOR UPDATE',[installationId])).rows[0];
        if(job.username!==username) throw new DomainError(409,'This initialization belongs to a different account.');
        if(job.completed) return {completed:true,added:0};
        let added=0;
        for(const p of submissions) {
          await requirePatterns(client,p.patternSlugs);
          const created=await client.query('INSERT INTO problems(platform,external_id,title,url,difficulty) VALUES($1,$2,$3,$4,$5) ON CONFLICT(platform,external_id) DO NOTHING RETURNING id',[p.platform,p.externalId,p.title,p.url,p.difficulty]);
          const id=created.rows[0]?.id||(await client.query('SELECT id FROM problems WHERE platform=$1 AND external_id=$2',[p.platform,p.externalId])).rows[0].id;
          if(created.rowCount) for(const slug of p.patternSlugs) await client.query('INSERT INTO problem_patterns VALUES($1,$2)',[id,slug]);
          const saved=await client.query('INSERT INTO imported_submissions VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING submission_id',[username,p.submissionId,id,p.submittedAt]);
          if(!saved.rowCount) {
            const old=(await client.query('SELECT problem_id,submitted_at FROM imported_submissions WHERE username=$1 AND submission_id=$2',[username,p.submissionId])).rows[0];
            if(old.problem_id!==id||new Date(old.submitted_at).toISOString()!==p.submittedAt) throw new DomainError(409,'Submission identity changed. Nothing was imported.');
          }
          added+=saved.rowCount;
        }
        await client.query('UPDATE recent_imports SET completed=true WHERE installation_id=$1',[installationId]);
        return {completed:true,added};
      });
    },
    async legacyStatus(id) {
      return (await pool.query('SELECT username,completed FROM legacy_imports WHERE installation_id=$1',[id])).rows[0] || {completed:false};
    },
    async importLegacy({installationId,username,problems,complete}) {
      return transaction(async client => {
        await lockAccount(client,username);
        await client.query('INSERT INTO legacy_imports(installation_id,username) VALUES($1,$2) ON CONFLICT DO NOTHING',[installationId,username]);
        const job=(await client.query('SELECT username,completed FROM legacy_imports WHERE installation_id=$1 FOR UPDATE',[installationId])).rows[0];
        if (job.username!==username) throw new DomainError(409,'This import belongs to a different LeetCode account. Sign back into '+job.username+'.');
        if (job.completed) return {completed:true,added:0};
        let added=0;
        for (const p of problems) {
          await requirePatterns(client,p.patternSlugs);
          const created=await client.query(`INSERT INTO problems(platform,external_id,title,url,difficulty) VALUES($1,$2,$3,$4,$5)
            ON CONFLICT(platform,external_id) DO NOTHING RETURNING id`,[p.platform,p.externalId,p.title,p.url,p.difficulty]);
          const id=created.rowCount?created.rows[0].id:(await client.query('SELECT id FROM problems WHERE platform=$1 AND external_id=$2',[p.platform,p.externalId])).rows[0].id;
          // Existing recorded details and possible approaches stay exactly as entered.
          if(created.rowCount) for(const slug of p.patternSlugs) await client.query('INSERT INTO problem_patterns VALUES($1,$2)',[id,slug]);
          added+=(await client.query('INSERT INTO historical_solves(problem_id) VALUES($1) ON CONFLICT DO NOTHING',[id])).rowCount;
        }
        if(complete) await client.query('UPDATE legacy_imports SET completed=true WHERE installation_id=$1',[installationId]);
        return {completed:complete,added};
      });
    },
    async problemHistory(id,{limit,offset}) {
      const problem=(await pool.query(`${problemSelect} WHERE p.id=$1`,[id])).rows[0];
      if(!problem) throw new DomainError(404,'Problem not found.');
      const attempts=(await pool.query(attemptSelect+' WHERE a.problem_id=$1 AND a.deleted_at IS NULL ORDER BY a.attempted_at DESC,a.created_at DESC,a.id DESC',[id])).rows;
      const importedUnit=classifyProblem(problem).unit;
      const recordedDays=new Set(attempts.map(a=>practiceDay(a.attemptedAt)));
      const seen=new Set();
      const imported=(await pool.query('SELECT submission_id AS id,submitted_at AS "attemptedAt" FROM imported_submissions WHERE problem_id=$1 ORDER BY submitted_at DESC',[id])).rows.filter(a=>{const day=practiceDay(a.attemptedAt);if(recordedDays.has(day)||seen.has(day))return false;seen.add(day);return true;}).map(a=>({...a,id:'import-'+a.id,assistance:'unknown',imported:true,practiceUnit:importedUnit,approachSource:'inferred',patternSlugs:[],notes:''}));
      const history=[...attempts,...imported].sort((a,b)=>new Date(b.attemptedAt)-new Date(a.attemptedAt)||String(b.id).localeCompare(String(a.id)));
      return {problem,attempts:history.slice(offset,offset+limit),more:history.length>offset+limit,legacy:problem.historicallySolved};
    },
    async capture(input) {
      const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
      // Older extension drafts must still recover a committed save after an upgrade.
      const a = input.attempt;
      const legacyHash = !a.practiceUnit && a.approachSource === 'inferred' && a.captureSource === 'manual' && !a.submissionId
        ? createHash('sha256').update(JSON.stringify({problem:input.problem,attempt:{requestId:a.requestId,assistance:a.assistance,attemptedAt:a.attemptedAt,patternSlugs:a.patternSlugs,notes:a.notes,patternSource:a.patternSource}})).digest('hex') : null;
      return transaction(async client => {
        const p = input.problem, a = input.attempt;
        await requirePatterns(client, [...new Set([...p.patternSlugs, ...a.patternSlugs])]);
        await client.query(`INSERT INTO problems(platform,external_id,title,url,difficulty) VALUES($1,$2,$3,$4,$5)
          ON CONFLICT(platform,external_id) DO NOTHING`,[p.platform,p.externalId,p.title,p.url,p.difficulty]);
        const id=(await client.query('SELECT id FROM problems WHERE platform=$1 AND external_id=$2',[p.platform,p.externalId])).rows[0].id;
        const inserted=await client.query(`INSERT INTO attempts(id,problem_id,assistance,notes,attempted_at,request_hash,pattern_source,practice_unit,approach_source,capture_source,submission_id,selected_topics)
          VALUES($1,$2,$3,'',$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO NOTHING RETURNING id`,[a.requestId,id,a.assistance,a.attemptedAt,hash,a.patternSource,a.practiceUnit||classifyProblem(p).unit,a.approachSource,a.captureSource,a.submissionId,JSON.stringify(a.selectedTopics)]);
        if (!inserted.rowCount) {
          const old=(await client.query('SELECT request_hash,deleted_at FROM attempts WHERE id=$1',[a.requestId])).rows[0];
          if (old.deleted_at || (old.request_hash !== hash && old.request_hash !== legacyHash)) throw new DomainError(409,'This recording ID was already used. Refresh the panel before making a new recording.');
        } else {
          for (const slug of p.patternSlugs) await client.query('INSERT INTO problem_patterns VALUES($1,$2) ON CONFLICT DO NOTHING',[id,slug]);
          for (const slug of a.patternSlugs) await client.query('INSERT INTO attempt_patterns VALUES($1,$2)',[a.requestId,slug]);
        }
        return { created: Boolean(inserted.rowCount), attempt: (await client.query(`${attemptSelect} WHERE a.id=$1`,[a.requestId])).rows[0] };
      });
    },
    async summary() {
      const stats = (await pool.query(`SELECT
        (SELECT count(*)::int FROM problems) AS problems,
        (SELECT count(*)::int FROM (SELECT problem_id FROM attempts WHERE deleted_at IS NULL UNION SELECT problem_id FROM historical_solves UNION SELECT problem_id FROM imported_submissions) done) AS "uniqueProblems",
        count(*)::int AS attempts, count(DISTINCT problem_id)::int AS practiced,
        count(*) FILTER (WHERE assistance='independent')::int AS independent,
        (SELECT count(*)::int FROM historical_solves) AS historical
        FROM attempts WHERE deleted_at IS NULL`)).rows[0];
      const patterns = (await pool.query(`SELECT p.slug, p.name,
        (SELECT count(*)::int FROM problem_patterns pp WHERE pp.pattern_slug=p.slug) AS catalog,
        (SELECT count(DISTINCT a.problem_id)::int FROM attempt_patterns ap JOIN attempts a ON a.id=ap.attempt_id
          WHERE ap.pattern_slug=p.slug AND a.deleted_at IS NULL AND a.pattern_source='explicit') AS practiced
        FROM patterns p ORDER BY p.name`)).rows;
      const inventory = patternInventory(await classifiedProblems());
      return { ...stats, patterns, inventory };
    },
    async library({ limit, offset, q, pattern = '', status, category = '' }) {
      const classified = await classifiedProblems();
      const details = new Map(classified.map(p=>[p.id,p]));
      const categoryIds = classified.filter(p=>p.placement.category===category || p.placement.subpattern===category || unitForPlacement(p.placement)===category || (category==='knapsack'&&p.placement.subpattern?.startsWith('knapsack-'))).map(p=>p.id);
      if(category) {
        const unitSlugs=retentionUnits.filter(u=>u.slug===category||u.category===category).map(u=>u.slug);
        const practiced=(await pool.query('SELECT DISTINCT problem_id FROM attempts WHERE deleted_at IS NULL AND practice_unit=ANY($1::text[])',[unitSlugs])).rows;
        categoryIds.push(...practiced.map(r=>r.problem_id));
      }
      const result = await pool.query(`WITH catalog AS (
        SELECT p.*,
          (EXISTS(SELECT 1 FROM attempts a WHERE a.problem_id=p.id AND a.deleted_at IS NULL) OR EXISTS(SELECT 1 FROM imported_submissions i WHERE i.problem_id=p.id)) AS practiced,
          EXISTS(SELECT 1 FROM historical_solves h WHERE h.problem_id=p.id) AS historical,
          GREATEST(
            (SELECT max(a.attempted_at) FROM attempts a WHERE a.problem_id=p.id AND a.deleted_at IS NULL),
            (SELECT max(i.submitted_at) FROM imported_submissions i WHERE i.problem_id=p.id)
          ) AS "lastPracticedAt",
          COALESCE((SELECT json_agg(pp.pattern_slug ORDER BY pp.pattern_slug) FROM problem_patterns pp WHERE pp.problem_id=p.id),'[]') AS "patternSlugs"
        FROM problems p WHERE ($6::text='' OR p.id=ANY($7::int[])) AND ($1::text='' OR strpos(lower(p.title || ' ' || p.external_id),lower($1))>0)
          AND ($2::text='' OR EXISTS(SELECT 1 FROM problem_patterns pp WHERE pp.problem_id=p.id AND pp.pattern_slug=$2)
            OR EXISTS(SELECT 1 FROM attempts a JOIN attempt_patterns ap ON ap.attempt_id=a.id WHERE a.problem_id=p.id AND a.deleted_at IS NULL AND ap.pattern_slug=$2))
      ), matching AS (SELECT * FROM catalog WHERE $3='all' OR ($3='done' AND (practiced OR historical)) OR ($3='practiced' AND practiced) OR ($3='unpracticed' AND NOT practiced) OR ($3='historical' AND historical))
      SELECT (SELECT count(*)::int FROM matching) AS total,
        COALESCE((SELECT json_agg(page ORDER BY page.id DESC) FROM (SELECT * FROM matching ORDER BY id DESC LIMIT $4 OFFSET $5) page),'[]') AS problems`, [q, pattern, status, limit, offset, category, categoryIds]);
      const resultPage = result.rows[0];
      resultPage.problems = resultPage.problems.map(p=>{
        const detail=details.get(p.id);
        return {...p,placement:detail.placement,candidates:candidateUnits(detail)};
      });
      return resultPage;
    },
    async updateProblem(id, input) {
      return transaction(async client => {
        const old = (await client.query('SELECT * FROM problems WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (!old) throw new DomainError(404, 'Problem not found.');
        if (old.platform !== input.platform || old.external_id !== input.externalId) throw new DomainError(400, 'The problem URL identity cannot be changed.');
        await requirePatterns(client, input.patternSlugs);
        await client.query('UPDATE problems SET title=$2,difficulty=$3 WHERE id=$1',[id,input.title,input.difficulty]);
        await client.query('DELETE FROM problem_patterns WHERE problem_id=$1',[id]);
        for (const slug of input.patternSlugs) await client.query('INSERT INTO problem_patterns VALUES ($1,$2)',[id,slug]);
        if(input.placement !== undefined) {
          await client.query('DELETE FROM problem_placements WHERE problem_id=$1',[id]);
          if(input.placement) await client.query('INSERT INTO problem_placements VALUES($1,$2)',[id,input.placement]);
        }
        return (await client.query(`${problemSelect} WHERE p.id=$1`,[id])).rows[0];
      });
    },
    async correctAttempt(id, input) {
      return transaction(async client => {
        const old = (await client.query('SELECT revision,pattern_source FROM attempts WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[id])).rows[0];
        if (!old) throw new DomainError(404, 'Attempt not found.');
        if (old.revision !== input.revision) throw new DomainError(409, 'This attempt changed. Close this editor and refresh history before trying again.');
        await requirePatterns(client,input.patternSlugs);
        const previous = (await client.query('SELECT pattern_slug FROM attempt_patterns WHERE attempt_id=$1 ORDER BY pattern_slug',[id])).rows.map(row=>row.pattern_slug);
        const source = old.pattern_source === 'inferred' && JSON.stringify(previous) === JSON.stringify(input.patternSlugs) ? 'inferred' : 'explicit';
        await client.query(`UPDATE attempts SET assistance=$2,notes=$3,attempted_at=$4,revision=revision+1,pattern_source=$5,practice_unit=COALESCE($6,practice_unit),approach_source=CASE WHEN $6 IS NULL THEN approach_source ELSE 'confirmed' END WHERE id=$1`,[id,input.assistance,input.notes,input.attemptedAt,source,input.practiceUnit??null]);
        await client.query('DELETE FROM attempt_patterns WHERE attempt_id=$1',[id]);
        for (const slug of input.patternSlugs) await client.query('INSERT INTO attempt_patterns VALUES ($1,$2)',[id,slug]);
        return (await client.query(`${attemptSelect} WHERE a.id=$1`,[id])).rows[0];
      });
    },
    async removeAttempt(id, revision) {
      return transaction(async client => {
        const old = (await client.query('SELECT revision,deleted_at FROM attempts WHERE id=$1 FOR UPDATE',[id])).rows[0];
        if (!old) throw new DomainError(404, 'Attempt not found.');
        if (old.deleted_at) return { removed: true };
        if (old.revision !== revision) throw new DomainError(409, 'This attempt changed. Refresh history before removing it.');
        await client.query('UPDATE attempts SET deleted_at=now(),revision=revision+1 WHERE id=$1',[id]);
        return { removed: true };
      });
    },
    async removeImport(id) {
      await pool.query('DELETE FROM historical_solves WHERE problem_id=$1',[id]);
      return { removed: true };
    },
    async listPatterns() { return (await pool.query('SELECT slug, name FROM patterns ORDER BY name')).rows; },
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
    async listAttempts({ limit, offset }) { return (await pool.query(`${attemptSelect} WHERE a.deleted_at IS NULL ORDER BY a.attempted_at DESC, a.id DESC LIMIT $1 OFFSET $2`, [limit, offset])).rows; },
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
          const existing = (await client.query('SELECT request_hash, deleted_at FROM attempts WHERE id=$1', [input.requestId])).rows[0];
          if (existing.deleted_at) throw new DomainError(409, 'This attempt was removed. Use a new requestId for a new attempt.');
          if (existing.request_hash !== hash) throw new DomainError(409, 'requestId already belongs to a different attempt. Use a new UUID for a new attempt.');
        } else {
          const problem=(await client.query(problemSelect+' WHERE p.id=$1',[input.problemId])).rows[0];
          await client.query('UPDATE attempts SET practice_unit=$2 WHERE id=$1',[input.requestId,classifyProblem(problem).unit]);
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
