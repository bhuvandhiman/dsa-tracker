import { createPool } from './db.js';
import { checkDatabaseConnection, reportDatabaseFailure } from './database-diagnostics.js';

let pool;
try {
  pool = createPool();
  if(!await checkDatabaseConnection(pool,{context:'check'}))process.exitCode=1;
} catch (error) {
  reportDatabaseFailure(error,'check');
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
