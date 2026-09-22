import { Router } from 'express';
import { DomainError, attemptInput, problemInput, patternInput, positiveId, importInput, pageInput, reviewInput } from './domain.js';
import { reviewDays } from './review-policy.js';

export function dataRoutes(repository) {
  const router = Router();
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (!repository) return next(new DomainError(503, 'Database is not configured. Set DATABASE_URL and run npm run db:migrate.'));
    next();
  });
  router.get('/patterns', async (_request, response) => response.json({ patterns: await repository.listPatterns() }));
  router.get('/reviews', async (request, response) => {
    const page = reviewInput(request.query);
    const asOf = new Date().toISOString();
    response.json({ ...await repository.listReviews({ ...page, asOf }), ...page, asOf, policy: { days: reviewDays } });
  });
  router.get('/problems', async (request, response) => {
    const page = pageInput(request.query);
    response.json({ problems: await repository.listProblems(page), ...page });
  });
  router.post('/problems', async (request, response) => {
    const result = await repository.createProblem(problemInput(request.body));
    response.status(result.created ? 201 : 200).json(result);
  });
  router.put('/problems/:id/patterns', async (request, response) => {
    response.json({ problem: await repository.setProblemPatterns(positiveId(request.params.id), patternInput(request.body)) });
  });
  router.get('/attempts', async (request, response) => {
    const page = pageInput(request.query);
    response.json({ attempts: await repository.listAttempts(page), persistence: true, ...page });
  });
  router.post('/attempts', async (request, response) => {
    const result = await repository.createAttempt(attemptInput(request.body));
    response.status(result.created ? 201 : 200).json(result);
  });
  router.get('/imports', async (request, response) => {
    const page = pageInput(request.query);
    response.json({ imports: await repository.listHistory(page), ...page });
  });
  router.post('/imports', async (request, response) => response.json(await repository.importHistory(importInput(request.body))));
  return router;
}
