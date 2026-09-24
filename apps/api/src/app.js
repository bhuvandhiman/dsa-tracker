import express from 'express';
import { DomainError } from './domain.js';
import { dataRoutes } from './data-routes.js';

export function createApp({ repository = null } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  // Liveness only: this does not claim that PostgreSQL is connected.
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', service: 'dsa-tracker-api' });
  });

  // Match known data resources only, so unrelated URLs retain a JSON 404 even without a database.
  const routes = dataRoutes(repository);
  app.use('/api', (request, response, next) => {
    if (!/^\/(patterns|problems|attempts|imports|pattern-problems|practice-context|capture|retention)(\/|$)/.test(request.path)) return next();
    return routes(request, response, next);
  });

  app.use((_request, response) => response.status(404).json({ error: 'Route not found.' }));
  // Express requires all four parameters to recognize error middleware.
  app.use((error, _request, response, _next) => {
    if (error instanceof DomainError) return response.status(error.status).json({ error: error.message });
    if (['42P01', '42703'].includes(error.code)) return response.status(503).json({ error: 'Database schema is not ready. Run npm run db:migrate.' });
    if (['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', '28P01', '28000', '3D000', '57P01', '53300'].includes(error.code) || /timeout|Connection terminated/i.test(error.message)) {
      return response.status(503).json({ error: 'Database is unavailable. Check PostgreSQL and DATABASE_URL.' });
    }
    const messages = {
      400: 'Invalid JSON body.',
      413: 'Request body too large.',
      415: 'Unsupported request encoding or charset.',
    };
    const status = Object.hasOwn(messages, error.status) ? error.status : 500;
    if (status === 500) console.error(error);
    response.status(status).json({ error: messages[status] || 'Internal server error.' });
  });
  return app;
}
