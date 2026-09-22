import { createPool } from './db.js';
import { migrate } from './migrations.js';

let pool;
try {
  pool = createPool();
  const files = await migrate(pool);
  console.log(files.length ? `Applied: ${files.join(', ')}` : 'Database schema is up to date.');
} catch (error) {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
} finally { if (pool) await pool.end(); }
