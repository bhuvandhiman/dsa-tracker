import pg from 'pg';

// No connection is opened by importing this module.
export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('Set DATABASE_URL in apps/api/.env before checking PostgreSQL.');
  const pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
  pool.on('error', (error) => console.error(`Idle PostgreSQL connection failed: ${error.code || 'connection error'}`));
  return pool;
}
