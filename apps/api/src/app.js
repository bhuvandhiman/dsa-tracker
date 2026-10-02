import express from 'express';
import { DomainError } from './domain.js';
import { dataRoutes } from './data-routes.js';
import { createAuthenticator } from './auth.js';
import { goalInput } from './domain.js';

export function createApp({ repository = null, auth = {mode:'local',configured:false}, repositoryForUser = null, authenticate = createAuthenticator(auth), installation = {} } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((request,response,next)=>{
    if(!['127.0.0.1','localhost','[::1]','::1'].includes(request.hostname)) return response.status(403).json({error:'Recall accepts loopback hosts only.'});
    const origin=request.get('Origin');
    if(origin && !/^https?:\/\/(127\.0\.0\.1|localhost)(:(5173|4173|3001))?$/.test(origin) && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) return response.status(403).json({error:'This origin is not allowed to access Recall.'});
    response.set('X-Content-Type-Options','nosniff');
    next();
  });
  app.use('/api/workspace/restore',express.json({limit:'20mb'}));
  app.use(express.json({ limit: '16kb' }));

  // Liveness only: this does not claim that PostgreSQL is connected.
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', service: 'dsa-tracker-api' });
  });
  app.get('/api/auth/config',(_request,response)=>{
    response.set('Cache-Control','no-store');
    response.json({mode:auth.mode,configured:auth.configured,...(auth.configured?{url:auth.url,key:auth.key}:{}),installation});
  });

  // Match known data resources only, so unrelated URLs retain a JSON 404 even without a database.
  const routes = dataRoutes(repository);
  app.use('/api', async (request, response, next) => {
    if (!/^\/(session|setup|patterns|problems|attempts|imports|pattern-problems|practice-context|capture|retention|goal|workspace|ready)(\/|$)/.test(request.path)) return next();
    if(auth.mode==='supabase'){
      response.set('Cache-Control','no-store');
      const user=await authenticate(request);
      if(!repositoryForUser)throw new DomainError(503,'Private workspace storage is not configured.');
      const privateRepository=await repositoryForUser(user);
      if(request.path==='/session'&&request.method==='GET')return response.json({user,setup:await privateRepository.setup()});
      if(request.path==='/setup'){
        if(request.method==='GET')return response.json(await privateRepository.setup());
        if(request.method==='PUT'){
          const body=request.body;
          if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['profile','target','extensionAcknowledged','completed'].includes(k)))throw new DomainError(400,'Invalid setup choices.');
          for(const key of ['extensionAcknowledged','completed'])if(body[key]!==undefined&&typeof body[key]!=='boolean')throw new DomainError(400,'Invalid setup choices.');
          if(body.profile!==undefined||body.target!==undefined)goalInput({profile:body.profile,target:body.target});
          if(body.completed&&(body.extensionAcknowledged!==true))throw new DomainError(400,'Acknowledge extension installation before finishing setup.');
          return response.json(await privateRepository.saveSetup(body));
        }
        return next();
      }
      return dataRoutes(privateRepository)(request,response,next);
    }
    if(['/session','/setup'].includes(request.path))throw new DomainError(503,'Online accounts are not configured yet.');
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
