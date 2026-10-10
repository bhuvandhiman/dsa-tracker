import { Router } from 'express';
import { DomainError } from './domain.js';
import { contactReason, ownerId, ownerPage, requireOwnerMfa } from './owner-policy.js';
import { timedStage } from './request-metrics.js';

export function ownerRoutes({store,operations,authenticate,auth}){
  const router=Router();
  router.use(async(request,response,next)=>{
    response.set('Cache-Control','no-store');
    if(auth.mode!=='supabase'||!store)throw new DomainError(403,'Owner access is not available for this account.');
    if(request.get('Origin')?.startsWith('chrome-extension:'))throw new DomainError(403,'Open the owner dashboard on the Recall website.');
    const user=await timedStage('auth',()=>authenticate(request));
    if(request.get('X-Recall-Workspace')&&request.get('X-Recall-Workspace')!==user.id)throw new DomainError(409,'Recall account changed. Reload before continuing.');
    const access=await store.access(user.id);
    if(!access.enabled)throw new DomainError(403,'Owner access is not available for this account.');
    request.ownerUser=user;request.ownerAccess=access;
    try{requireOwnerMfa(request,user);}catch(error){await store.audit(user.id,'owner.mfa_required');throw error;}
    next();
  });
  const allowed=permission=>async(request,_response,next)=>{
    if(!request.ownerAccess.permissions.includes(permission))throw new DomainError(403,'This owner permission is not enabled.');
    await operations?.flush();next();
  };
  router.get('/overview',allowed('overview:read'),async(request,response)=>{
    await store.audit(request.ownerUser.id,'owner.overview_read');response.json({...await store.overview(),updatedAt:new Date().toISOString()});
  });
  router.get('/users',allowed('users:read'),async(request,response)=>{
    const page=ownerPage(request.query);await store.audit(request.ownerUser.id,'owner.users_read');response.json(await store.users(page));
  });
  router.get('/users/:id',allowed('users:read'),async(request,response)=>{
    const id=ownerId(request.params.id);await store.audit(request.ownerUser.id,'user.summary_read',id);response.json({user:await store.user(id)});
  });
  router.post('/users/:id/contact',allowed('contact:read'),async(request,response)=>{
    response.json(await store.contact(request.ownerUser.id,ownerId(request.params.id),contactReason(request.body)));
  });
  router.get('/extension',allowed('diagnostics:read'),async(request,response)=>{
    const page=ownerPage(request.query);await store.audit(request.ownerUser.id,'owner.diagnostics_read');response.json(await store.diagnostics(page));
  });
  router.get('/health',allowed('health:read'),async(request,response)=>{
    await store.audit(request.ownerUser.id,'owner.health_read');response.json({...await store.health(),collection:operations?.dropped()||{dropped:0,failures:0},updatedAt:new Date().toISOString()});
  });
  router.get('/activity',allowed('audit:read'),async(request,response)=>{
    const page=ownerPage(request.query);await store.audit(request.ownerUser.id,'owner.activity_read');response.json(await store.activity(page));
  });
  return router;
}
