import { createApp } from './app.js';
import { createPool } from './db.js';
import { createRepository } from './repository.js';

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const host = process.env.HOST || '127.0.0.1';
const pool = process.env.DATABASE_URL ? createPool() : null;
const server = createApp({ repository: pool ? createRepository(pool) : null }).listen(port, host);
server.once('listening', () => {
  console.log(`API listening on http://${host}:${port}`);
});
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; if (pool) pool.end(); });
function shutdown() {
  server.close(async () => { if (pool) await pool.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
