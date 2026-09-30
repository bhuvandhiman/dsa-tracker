import { DomainError } from './domain.js';

// Dependency order, fixed identifiers: backup input never becomes SQL identifiers.
const tables = [
  ['patterns', ['slug']], ['problems', ['id']], ['problem_patterns', ['problem_id','pattern_slug']],
  ['attempts', ['id']], ['attempt_patterns', ['attempt_id','pattern_slug']], ['historical_solves', ['problem_id']],
  ['problem_placements', ['problem_id']], ['legacy_imports', ['installation_id']], ['recent_imports', ['installation_id']],
  ['imported_submissions', ['username','submission_id']], ['retention_preferences', ['target']],
  ['workspace_account', ['singleton']], ['workspace_goal', ['singleton']],
];

export async function exportBackup(client) {
  const data = {};
  // PostgreSQL JSON preserves sub-millisecond timestamps that pg's Date parser would truncate.
  for (const [table] of tables) data[table] = (await client.query(`SELECT COALESCE(json_agg(to_jsonb(record)), '[]'::json) AS records FROM ${table} record`)).rows[0].records;
  const migrations = (await client.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows;
  return { format: 'recall-backup', version: 1, exportedAt: new Date().toISOString(), migrations, tables: data };
}

export async function restoreBackup(client, backup) {
  if (!backup || backup.format !== 'recall-backup' || backup.version !== 1 || !backup.tables || !Array.isArray(backup.migrations)) throw new DomainError(400, 'Choose a Recall version 1 backup.');
  const migrations = (await client.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows;
  if (JSON.stringify(migrations) !== JSON.stringify(backup.migrations)) throw new DomainError(409, 'Backup schema differs. Use the same Recall version to restore.');
  if (Object.keys(backup.tables).length !== tables.length || tables.some(([table]) => !Array.isArray(backup.tables[table]))) throw new DomainError(400, 'Backup is incomplete.');
  let count = 0;
  for (const [table, keys] of tables) {
    const rows = backup.tables[table];
    count += rows.length;
    if (count > 200000) throw new DomainError(413, 'Backup exceeds 200,000 rows.');
    const columns = (await client.query('SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 ORDER BY ordinal_position', [table])).rows.map(row => row.column_name);
    if (rows.some(row => !row || typeof row !== 'object' || Array.isArray(row) || columns.some(column => !Object.hasOwn(row,column)) || Object.keys(row).some(column => !columns.includes(column)))) throw new DomainError(400, `Invalid ${table} records.`);
    for (let offset = 0; offset < rows.length; offset += 500) {
      const batch = JSON.stringify(rows.slice(offset, offset + 500));
      // Refuse collisions rather than overwriting newer practice or another account.
      const join = keys.map(key => `stored.${key}=incoming.${key}`).join(' AND ');
      const conflicts = await client.query(`SELECT 1 FROM ${table} stored JOIN json_populate_recordset(NULL::${table},$1) incoming ON ${join} WHERE to_jsonb(stored) IS DISTINCT FROM to_jsonb(incoming) LIMIT 1`, [batch]);
      if (conflicts.rowCount) throw new DomainError(409, `Existing ${table} records differ. Restore into an empty workspace; no records were changed.`);
      await client.query(`INSERT INTO ${table} (${columns.join(',')}) ${table==='problems'?'OVERRIDING SYSTEM VALUE':''} SELECT ${columns.join(',')} FROM json_populate_recordset(NULL::${table},$1) ON CONFLICT DO NOTHING`, [batch]);
    }
  }
  await client.query("SELECT setval(pg_get_serial_sequence('problems','id'),COALESCE((SELECT max(id) FROM problems),1),(SELECT count(*)>0 FROM problems))");
  return { restored: true, records: count };
}
