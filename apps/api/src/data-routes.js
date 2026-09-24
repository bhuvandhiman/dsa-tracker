import { mapTopics } from './platforms/leetcode-topics.js';
import { Router } from 'express';
import { DomainError, attemptInput, problemInput, patternInput, positiveId, importInput, pageInput, uuid, revisionInput, correctionInput, libraryInput, captureInput, legacyInput, recentInput, placementInput } from './domain.js';

export function dataRoutes(repository) {
  const router = Router();
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (!repository) return next(new DomainError(503, 'Database is not configured. Set DATABASE_URL and run npm run db:migrate.'));
    next();
  });
  router.get('/imports/legacy/:id',async(request,response)=>response.json(await repository.legacyStatus(uuid(request.params.id))));
  router.post('/imports/legacy',async(request,response)=>response.json(await repository.importLegacy(legacyInput(request.body))));
  router.get('/problems/:id/history',async(request,response)=>response.json(await repository.problemHistory(positiveId(request.params.id),pageInput(request.query))));
  router.post('/capture', async (request,response) => {
    const result=await repository.capture(captureInput(request.body));
    response.status(result.created ? 201 : 200).json(result);
  });
  router.post('/practice-context', async (request,response)=> {
    if(!request.body||!Array.isArray(request.body.topics)||request.body.topics.length>30||request.body.topics.some(t=>typeof t!=='string'||t.length>100))throw new DomainError(400,'Invalid problem topics.');
    const p=problemInput({url:request.body.url,title:request.body.title||'Problem',patternSlugs:mapTopics(request.body.topics||[])});
    response.json(await repository.practiceContext(p));
  });
  router.get('/retention',async(_request,response)=>response.json(await repository.retention()));
  router.put('/problems/:id/placement',async(request,response)=>response.json(await repository.setPlacement(positiveId(request.params.id),placementInput(request.body))));
  router.get('/imports/recent/:id',async(request,response)=>response.json(await repository.recentStatus(uuid(request.params.id))));
  router.post('/imports/recent',async(request,response)=>response.json(await repository.importRecent(recentInput(request.body))));
  router.get('/pattern-problems', async (request,response) => response.json(await repository.library(libraryInput(request.query))));
  router.put('/problems/:id', async (request,response) => response.json({ problem: await repository.updateProblem(positiveId(request.params.id),problemInput(request.body)) }));
  router.put('/attempts/:id', async (request,response) => response.json({ attempt: await repository.correctAttempt(uuid(request.params.id),correctionInput(request.body)) }));
  router.delete('/attempts/:id', async (request,response) => response.json(await repository.removeAttempt(uuid(request.params.id),revisionInput(request.body))));
  router.delete('/imports/:id', async (request,response) => response.json(await repository.removeImport(positiveId(request.params.id))));
  router.get('/patterns', async (_request, response) => response.json({ patterns: await repository.listPatterns() }));
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
