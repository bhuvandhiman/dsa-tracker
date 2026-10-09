// Isolated UI fixture: fake authentication and in-memory setup, no real accounts.
import express from 'express';
import { createApp } from '../apps/api/src/app.js';
import { DomainError } from '../apps/api/src/domain.js';
import {overview} from '../apps/api/src/retention-policy.js';
import {goalCoverage,applyGoalOrdering} from '../apps/api/src/goal-policy.js';

const origin='http://127.0.0.1:8766',web='http://127.0.0.1:5175';
const user={id:'45cd664a-c96c-4e3a-829c-9ced5dd40eaf',email:'fixture@example.test',email_confirmed_at:'2026-10-03T00:00:00Z',aud:'authenticated',role:'authenticated',user_metadata:{}};
const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,iss:origin+'/auth/v1',aud:'authenticated',role:'authenticated'})).toString('base64url')}.fixture-signature`;
const session={access_token:jwt,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user};
let setup={completed:false,extensionAcknowledged:false,goal:{configured:false}},failSetup=false,deleted=false,workspaceUnavailable=false;
let performanceMode=false,startupFailures=0,sessionDelay=0,retentionDelay=0;
const metrics={sessionReads:0,retentionReads:0};
const backup={format:'recall-backup',version:1,exportedAt:new Date().toISOString(),tables:{}};
const app=express();app.use(express.json());app.use((req,res,next)=>{if(req.headers.origin===web){res.set('Access-Control-Allow-Origin',web);res.set('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');res.set('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');}if(req.method==='OPTIONS')return res.sendStatus(204);next();});
app.use('/auth/v1',(_req,res,next)=>{res.set('X-Supabase-Api-Version','2024-01-01');res.set('Access-Control-Expose-Headers','X-Supabase-Api-Version');next();});
app.post('/auth/v1/signup',(req,res)=>{
  if(req.body.email==='duplicate-error@example.test')return res.status(422).json({code:'user_already_exists',msg:'User already registered'});
  if(req.body.email==='rate-limit@example.test')return res.status(429).json({code:'over_email_send_rate_limit',msg:'Email rate limit exceeded'});
  if(req.body.email==='offline@example.test')return res.status(503).json({code:'unexpected_failure',msg:'Fixture service unavailable'});
  if(req.body.password==='weak-password')return res.status(422).json({code:'weak_password',msg:'Password should contain an uppercase letter and a number.'});
  const existing=req.body.email==='existing@example.test';
  res.json({user:{...user,email:req.body.email,email_confirmed_at:null,identities:existing?[]:[{id:user.id,user_id:user.id,provider:'email',identity_data:{email:req.body.email}}]},session:null});
});
app.post('/auth/v1/token',(req,res)=>{
  if(req.query.grant_type==='password'&&req.body.email==='unconfirmed@example.test')return res.status(400).json({code:'email_not_confirmed',error:'email_not_confirmed',error_description:'Email not confirmed'});
  if(req.query.grant_type==='password'&&req.body.password!=='fixture-password')return res.status(400).json({error:'invalid_grant',error_description:'Invalid login credentials'});
  if(req.query.grant_type==='pkce')return setTimeout(()=>{
    if(req.body.auth_code==='fixture-expired-code')return res.status(400).json({error:'invalid_grant',error_description:'Confirmation link expired'});
    res.json(session);
  },2000);
  res.json(session);
});
app.get('/auth/v1/user',(_req,res)=>res.json(user));app.put('/auth/v1/user',(_req,res)=>res.json(user));
for(const path of ['recover','resend','logout'])app.post('/auth/v1/'+path,(_req,res)=>res.json({}));
app.get('/auth/v1/authorize',(req,res)=>{const redirect=new URL(req.query.redirect_to);if(redirect.origin!==web)return res.sendStatus(400);redirect.searchParams.set('code','fixture-auth-code');res.redirect(redirect.href);});
app.get('/fixture',(_req,res)=>res.type('html').send('<h1>Recall account fixture</h1><p>Simulated accounts only. No real sign-in, email, Google or database calls.</p><a href="http://127.0.0.1:5175/#/signup">Open signup</a><form method="POST" action="/fixture/reset"><button>Reset fixture setup</button></form><form method="POST" action="/fixture/fail"><button>Fail next setup save</button></form>'));
app.get('/fixture/confirm',(_req,res)=>res.redirect(web+'/?auth=callback&code=fixture-auth-code#/login'));
app.get('/fixture/expired',(_req,res)=>res.redirect(web+'/?auth=callback&code=fixture-expired-code#/login'));
app.post('/fixture/reset',(_req,res)=>{setup={completed:false,extensionAcknowledged:false,goal:{configured:false}};res.redirect('/fixture');});
app.post('/fixture/fail',(_req,res)=>{failSetup=true;res.redirect('/fixture');});
app.get('/fixture/workspace',(_req,res)=>res.type('html').send('<h1>Workspace outage fixture</h1><p>Simulated failure only. No real account or database changes.</p><form method="POST" action="/fixture/unavailable"><button>Simulate unavailable workspace</button></form><form method="POST" action="/fixture/available"><button>Restore simulated workspace</button></form>'));
app.post('/fixture/unavailable',(_req,res)=>{workspaceUnavailable=true;res.redirect(web+'/#/reset-password');});
app.post('/fixture/available',(_req,res)=>{workspaceUnavailable=false;res.redirect(web+'/#/login');});
app.post('/fixture/complete',(_req,res)=>{deleted=false;setup={completed:true,extensionAcknowledged:true,goal:{configured:true,profile:'interview',target:300}};res.json({fixture:true,setup});});
app.post('/fixture/performance',(req,res)=>{
  performanceMode=true;startupFailures=req.body.failures??1;sessionDelay=req.body.sessionDelay??0;retentionDelay=req.body.retentionDelay??2000;
  metrics.sessionReads=0;metrics.retentionReads=0;
  deleted=false;setup={completed:true,extensionAcknowledged:true,goal:{configured:true,profile:'interview',target:300}};
  res.json({fixture:true});
});
app.get('/fixture/metrics',(_req,res)=>res.json(metrics));
app.use('/api/session',(_req,res,next)=>{
  metrics.sessionReads++;
  if(startupFailures>0){startupFailures--;return res.status(503).json({error:'Simulated cold workspace. Please try again.'});}
  if(sessionDelay)return setTimeout(next,sessionDelay);
  next();
});
app.get('/api/retention',(_req,res,next)=>{
  if(!performanceMode)return next();
  metrics.retentionReads++;
  const result=overview([],[]),goal=goalCoverage([],setup.goal);
  setTimeout(()=>res.json({...result,goal,categories:applyGoalOrdering(result.categories,goal)}),retentionDelay);
});
const recall=createApp({auth:{mode:'supabase',configured:true,url:origin,key:'fixture-publishable-key'},installation:{downloadUrl:'/downloads/recall-extension.zip'},authenticate:async req=>{if(deleted||req.get('Authorization')!==`Bearer ${jwt}`)throw new DomainError(401,'Please sign in again.');return user;},extensionAuth:async(_kind,body)=>{if(body.password!=='fixture-password')throw new DomainError(401,'Incorrect fixture password.');return {user};},accountLifecycle:{enabled:true,remove:async()=>{deleted=true;return {deleted:true,pending:false};}},repositoryForUser:async()=>{if(workspaceUnavailable)throw new DomainError(503,'Simulated workspace unavailable.');return {setup:async()=>setup,exportAccount:async()=>({setup,workspace:backup}),backup:async()=>backup,readiness:async()=>({status:'ready',storage:'Simulated fixture workspace',account:'fixture',timeZone:'Asia/Calcutta'}),removedAttempts:async()=>[],saveSetup:async body=>{if(failSetup){failSetup=false;throw new DomainError(503,'Fixture save failed. Try again.');}if(body.profile)setup.goal={configured:true,profile:body.profile,target:body.target};if(body.extensionAcknowledged!==undefined)setup.extensionAcknowledged=body.extensionAcknowledged;if(body.completed!==undefined)setup.completed=body.completed;return setup;},retention:async()=>{throw new DomainError(503,'Fixture dashboard has no real practice data.');}};}});
app.use((req,res,next)=>{delete req.headers.origin;return recall(req,res,next);});
app.listen(8766,'127.0.0.1',()=>console.log(`Account fixture: ${origin}/fixture; use Vite at ${web} with API_PROXY_TARGET=${origin}`));
