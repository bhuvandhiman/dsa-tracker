import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

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
