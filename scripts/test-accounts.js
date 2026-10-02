// Isolated UI fixture: fake authentication and in-memory setup, no real accounts.
import express from 'express';
import { createApp } from '../apps/api/src/app.js';
import { DomainError } from '../apps/api/src/domain.js';

const origin='http://127.0.0.1:8766',web='http://127.0.0.1:5175';
const user={id:'45cd664a-c96c-4e3a-829c-9ced5dd40eaf',email:'fixture@example.test',email_confirmed_at:'2026-10-03T00:00:00Z',aud:'authenticated',role:'authenticated',user_metadata:{}};
const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,iss:origin+'/auth/v1',aud:'authenticated',role:'authenticated'})).toString('base64url')}.fixture-signature`;
const session={access_token:jwt,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user};
let setup={completed:false,extensionAcknowledged:false,goal:{configured:false}},failSetup=false;
const app=express();app.use(express.json());app.use((req,res,next)=>{if(req.headers.origin===web){res.set('Access-Control-Allow-Origin',web);res.set('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');res.set('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');}if(req.method==='OPTIONS')return res.sendStatus(204);next();});
app.post('/auth/v1/signup',(_req,res)=>res.json({user,session:null}));
app.post('/auth/v1/token',(req,res)=>{if(req.query.grant_type==='password'&&req.body.password!=='fixture-password')return res.status(400).json({error:'invalid_grant',error_description:'Invalid login credentials'});res.json(session);});
app.get('/auth/v1/user',(_req,res)=>res.json(user));app.put('/auth/v1/user',(_req,res)=>res.json(user));
for(const path of ['recover','resend','logout'])app.post('/auth/v1/'+path,(_req,res)=>res.json({}));
app.get('/auth/v1/authorize',(req,res)=>{const redirect=new URL(req.query.redirect_to);if(redirect.origin!==web)return res.sendStatus(400);redirect.searchParams.set('code','fixture-auth-code');res.redirect(redirect.href);});
app.get('/fixture',(_req,res)=>res.type('html').send('<h1>Recall account fixture</h1><p>Simulated accounts only. No real sign-in, email, Google or database calls.</p><a href="http://127.0.0.1:5175/#/signup">Open signup</a><form method="POST" action="/fixture/reset"><button>Reset fixture setup</button></form><form method="POST" action="/fixture/fail"><button>Fail next setup save</button></form>'));
app.post('/fixture/reset',(_req,res)=>{setup={completed:false,extensionAcknowledged:false,goal:{configured:false}};res.redirect('/fixture');});
app.post('/fixture/fail',(_req,res)=>{failSetup=true;res.redirect('/fixture');});
const recall=createApp({auth:{mode:'supabase',configured:true,url:origin,key:'fixture-publishable-key'},installation:{downloadUrl:'/downloads/recall-extension.zip'},authenticate:async req=>{if(req.get('Authorization')!==`Bearer ${jwt}`)throw new DomainError(401,'Please sign in again.');return user;},repositoryForUser:async()=>({setup:async()=>setup,saveSetup:async body=>{if(failSetup){failSetup=false;throw new DomainError(503,'Fixture save failed. Try again.');}if(body.profile)setup.goal={configured:true,profile:body.profile,target:body.target};if(body.extensionAcknowledged!==undefined)setup.extensionAcknowledged=body.extensionAcknowledged;if(body.completed!==undefined)setup.completed=body.completed;return setup;},retention:async()=>{throw new DomainError(503,'Fixture dashboard has no real practice data.');}})});
app.use((req,res,next)=>{delete req.headers.origin;return recall(req,res,next);});
app.listen(8766,'127.0.0.1',()=>console.log(`Account fixture: ${origin}/fixture; use Vite at ${web} with API_PROXY_TARGET=${origin}`));
