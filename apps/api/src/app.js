import express from 'express';
import { DomainError } from './domain.js';
import { dataRoutes } from './data-routes.js';
import { createAuthenticator } from './auth.js';
import { goalInput } from './domain.js';
import { createExtensionAuth } from './extension-auth.js';
import { deletionInput } from './account-lifecycle.js';
import { databaseFailure, reportDatabaseFailure } from './database-diagnostics.js';
import {createProfileUpdater,profileInput,profileSetup} from './account-profile.js';
import { BACKUP_MAX_BYTES, BACKUP_SIZE_ERROR } from '../../shared/backup-limits.js';
import {ownerRoutes} from './owner-routes.js';
import {diagnosticInput} from './owner-policy.js';
import {metricsMiddleware,timedStage} from './request-metrics.js';

export function createApp({ repository = null, auth = {mode:'local',configured:false}, repositoryForUser = null, authenticate = createAuthenticator(auth), extensionAuth = createExtensionAuth(auth), updateProfile=createProfileUpdater(auth), accountLifecycle=null, ownerStore=null,operations=null, installation = {},deployment={mode:'local',origin:null},webRoot=null, reportDatabaseError=reportDatabaseFailure } = {}) {
  if(deployment.mode==='hosted'&&(auth.mode!=='supabase'||!auth.configured))throw new Error('Hosted Recall requires configured Supabase authentication.');
  const app = express();
  app.disable('x-powered-by');
  app.use((request,response,next)=>{
    const loopback=['127.0.0.1','localhost','[::1]','::1'].includes(request.hostname);
    if(deployment.mode==='hosted'?request.hostname!==new URL(deployment.origin).hostname&&!(loopback&&request.path==='/api/health'):!loopback) return response.status(403).json({error:'This host is not allowed to access Recall.'});
    const origin=request.get('Origin');
    const trustedOrigin=deployment.mode==='hosted'?origin===deployment.origin:/^https?:\/\/(127\.0\.0\.1|localhost)(:(5173|4173|3001))?$/.test(origin||'');
    if(origin&&!trustedOrigin&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin))return response.status(403).json({error:'This origin is not allowed to access Recall.'});
    response.set('X-Content-Type-Options','nosniff');
    response.set('Referrer-Policy','strict-origin-when-cross-origin');response.set('X-Frame-Options','DENY');
    if(deployment.mode==='hosted'){
      response.set('Strict-Transport-Security','max-age=31536000');
      response.set('Content-Security-Policy',`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${auth.url}; img-src 'self' data:; media-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`);
    }
    next();
  });
  if(operations)app.use(metricsMiddleware(operations));
  app.use('/api/workspace/restore',express.json({limit:BACKUP_MAX_BYTES}));
  app.use(express.json({ limit: '16kb' }));

  // Liveness only: this does not claim that PostgreSQL is connected.
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', service: 'dsa-tracker-api' });
  });
  app.get('/api/auth/config',(_request,response)=>{
    response.set('Cache-Control','no-store');
    response.json({mode:auth.mode,configured:auth.configured,...(auth.configured?{url:auth.url,key:auth.key}:{}),installation,deployment});
  });
  for(const kind of ['login','refresh','connect'])app.post(`/api/auth/extension/${kind}`,async(request,response)=>{
    response.set('Cache-Control','no-store');
    const result=await timedStage('auth',()=>extensionAuth(kind,request.body));
    if(kind==='connect')operations?.connected(result.user,request.body.version);
    response.json(result);
  });

  app.use('/api/owner',ownerRoutes({store:ownerStore,operations,authenticate,auth}));
  const diagnosticLimits=new Map();

  // Match known data resources only, so unrelated URLs retain a JSON 404 even without a database.
  const routes = dataRoutes(repository);
  app.use('/api', async (request, response, next) => {
    if (!/^\/(account|session|setup|patterns|problems|attempts|imports|pattern-problems|practice-context|capture|retention|goal|workspace|ready|history|diagnostics)(\/|$)/.test(request.path)) return next();
    if(auth.mode==='supabase'){
      response.set('Cache-Control','no-store');
      const user=await timedStage('auth',()=>authenticate(request));
      if(request.get('X-Recall-Workspace')&&request.get('X-Recall-Workspace')!==user.id)throw new DomainError(409,'Recall account changed. Sign in again in extension Settings.');
      if(request.path==='/diagnostics'&&request.method==='POST'){
        const report=diagnosticInput(request.body);
        if(!ownerStore)return response.json({reported:false});
        if((diagnosticLimits.get(user.id)||0)>Date.now()-30000)throw new DomainError(429,'Wait before sending another diagnostic report.');
        diagnosticLimits.delete(user.id);diagnosticLimits.set(user.id,Date.now());if(diagnosticLimits.size>1000)diagnosticLimits.delete(diagnosticLimits.keys().next().value);
        if(await ownerStore.isErased(user.id))throw new DomainError(403,'This Recall account is being deleted.');
        await ownerStore.diagnostic({...report,userId:user.id,source:'client',outcome:'failure'});return response.json({reported:true});
      }
      if(!repositoryForUser)throw new DomainError(503,'Private workspace storage is not configured.');
      if(operations){
        const path=request.path,original=response.json.bind(response);let outcome;
        response.json=value=>{outcome={created:value?.created,added:value?.added};return original(value);};
        response.once('finish',()=>{
          const success=response.statusCode<400;
          const summary=success&&(['/session'].includes(path)||!['GET','HEAD'].includes(request.method)&&!path.startsWith('/account'));
          if(success&&(summary||['/retention','/history'].includes(path)))operations.observe(user,{summary,active:path!=='/session'});
          operations.outcome(user,path,response.statusCode,outcome,response.get('X-Recall-Request-ID'));
        });
      }
      const privateRepository=await repositoryForUser(user);
      if(request.path==='/account/profile'&&request.method==='PUT'){
        const updated=await timedStage('auth',()=>updateProfile(request,user,profileInput(request.body)));operations?.observe(updated);return response.json({user:updated});
      }
      if(request.path==='/account'&&request.method==='GET')return response.json({user,deletionAvailable:Boolean(accountLifecycle?.enabled)});
      if(request.path==='/account/export'&&request.method==='GET')return response.json({format:'recall-account-export',version:1,exportedAt:new Date().toISOString(),account:user,...await privateRepository.exportAccount()});
      if(request.path==='/account'&&request.method==='DELETE'){
        const password=deletionInput(request.body);
        if(!accountLifecycle?.enabled)throw new DomainError(503,'Account deletion is not configured yet.');
        const verified=await timedStage('auth',()=>extensionAuth('login',{email:user.email,password}));
        if(verified.user.id!==user.id)throw new DomainError(403,'Confirm the password for your signed-in Recall account.');
        const result=await accountLifecycle.remove(user);return response.status(result.pending?202:200).json(result);
      }
      if(request.path==='/session'&&request.method==='GET')return response.json({user,setup:profileSetup(await privateRepository.setup(),user),owner:ownerStore?await ownerStore.access(user.id):{enabled:false,permissions:[]}});
      if(request.path==='/setup'){
        if(request.method==='GET')return response.json(profileSetup(await privateRepository.setup(),user));
        if(request.method==='PUT'){
          const body=request.body;
          if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['profile','target','extensionAcknowledged','completed'].includes(k)))throw new DomainError(400,'Invalid setup choices.');
          for(const key of ['extensionAcknowledged','completed'])if(body[key]!==undefined&&typeof body[key]!=='boolean')throw new DomainError(400,'Invalid setup choices.');
          if(body.profile!==undefined||body.target!==undefined)goalInput({profile:body.profile,target:body.target});
          if(body.completed&&!profileSetup({},user).profileConfigured)throw new DomainError(400,'Create your profile before opening your workspace.');
          return response.json(profileSetup(await privateRepository.saveSetup(body),user));
        }
        return next();
      }
      return dataRoutes(privateRepository)(request,response,next);
    }
    if(request.get('X-Recall-Workspace')&&request.get('X-Recall-Workspace')!=='local')throw new DomainError(409,'Recall account mode changed. Reload extension Settings.');
    if(/^\/account(\/|$)/.test(request.path)||['/session','/setup'].includes(request.path))throw new DomainError(503,'Online accounts are not configured yet.');
    return routes(request, response, next);
  });

  if(webRoot){
    app.use((request,response,next)=>request.path.startsWith('/api')?next():express.static(webRoot,{index:false,dotfiles:'deny',setHeaders(response,path){response.set('Cache-Control',/[/\\]assets[/\\]/.test(path)?'public,max-age=31536000,immutable':'no-store');}})(request,response,next));
    for(const path of ['/','/home','/about','/privacy','/signup','/login','/forgot-password','/reset-password','/install-extension','/connect','/profile','/history','/dashboard','/patterns','/patterns/:slug','/settings','/setup','/owner','/owner/:section'])app.get(path,(_request,response)=>{response.set('Cache-Control','no-store');response.sendFile('index.html',{root:webRoot});});
  }
  app.use((_request, response) => response.status(404).json({ error: 'Route not found.' }));
  // Express requires all four parameters to recognize error middleware.
  app.use((error, _request, response, _next) => {
    if (error instanceof DomainError) return response.status(error.status).json({ error: error.message,...(error.publicCode==='OWNER_MFA_REQUIRED'?{code:error.publicCode}:{}) });
    const failure=databaseFailure(error);
    if (failure) {
      reportDatabaseError(error,'request');
      const message=deployment.mode==='hosted'?'Your workspace is temporarily unavailable. Please retry.':failure.reason==='schema'?'Database schema is not ready. Run npm run db:migrate.':'Database is unavailable. Check PostgreSQL and DATABASE_URL.';
      return response.status(503).json({ error: message });
    }
    const messages = {
      400: 'Invalid JSON body.',
      413: 'Request body too large.',
      415: 'Unsupported request encoding or charset.',
    };
    const status = Object.hasOwn(messages, error.status) ? error.status : 500;
    // SQL details, credentials and submitted notes can be embedded in errors.
    if (status === 500) console.error('Recall request failed: unexpected internal error.');
    response.status(status).json({ error: status===413&&_request.path==='/api/workspace/restore'?BACKUP_SIZE_ERROR:messages[status] || 'Internal server error.' });
  });
  return app;
}
