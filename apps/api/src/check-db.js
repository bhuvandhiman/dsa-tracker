import { createPool } from './db.js';

let pool;
try {
  pool = createPool();
  const { rows } = await pool.query('SELECT 1 AS connected');
  console.log(`PostgreSQL connection OK: ${rows[0].connected}`);
} catch (error) {
  console.error(`PostgreSQL check failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
