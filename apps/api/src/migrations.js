import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { classifyProblem, retentionUnits } from './pattern-catalog.js';

export async function migrate(pool) {
  const directory = new URL('../migrations/', import.meta.url);
  const files = (await readdir(directory)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize migration runners; the lock is released on commit or rollback.
    await client.query('SELECT pg_advisory_xact_lock(71420621)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const applied = new Map((await client.query('SELECT name, checksum FROM schema_migrations')).rows.map((row) => [row.name, row.checksum]));
    const added = [];
    for (const file of files) {
      const sql = (await readFile(new URL(file, directory), 'utf8')).replaceAll('\r\n', '\n');
      const checksum = createHash('sha256').update(sql).digest('hex');
      if (applied.has(file)) {
        if (applied.get(file) !== checksum) throw new Error(`Applied migration changed: ${file}. Add a new migration instead.`);
        continue;
      }
      await client.query(sql);
      if (file === '006_practice_strength.sql') {
        const rows = (await client.query(`SELECT a.id,a.pattern_source,p.platform,p.external_id AS "externalId",
          (SELECT unit_slug FROM problem_placements WHERE problem_id=p.id) AS "placementOverride",
          ARRAY(SELECT pattern_slug FROM problem_patterns WHERE problem_id=p.id) AS "patternSlugs",
          ARRAY(SELECT pattern_slug FROM attempt_patterns WHERE attempt_id=a.id) AS used
          FROM attempts a JOIN problems p ON p.id=a.problem_id`)).rows;
        for (const row of rows) {
          const specific=row.pattern_source==='explicit'?row.used.filter(slug=>retentionUnits.some(u=>u.slug===slug)):[];
          const unit=specific.length===1?specific[0]:classifyProblem(row).unit;
          await client.query('UPDATE attempts SET practice_unit=$2,approach_source=$3 WHERE id=$1',[row.id,unit,specific.length===1?'confirmed':'inferred']);
        }
      }
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [file, checksum]);
      added.push(file);
    }
    await client.query('COMMIT');
    return added;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
