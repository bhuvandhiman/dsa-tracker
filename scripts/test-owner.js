// Isolated browser fixture. Authentication, MFA and users are simulated; no
// real accounts, secrets, email, database queries or grants are involved.
import express from 'express';
import {randomUUID} from 'node:crypto';
import {createApp} from '../apps/api/src/app.js';
import {createAuthenticator} from '../apps/api/src/auth.js';
import {OWNER_PERMISSIONS,maskEmail} from '../apps/api/src/owner-policy.js';
import {DomainError} from '../apps/api/src/domain.js';

const origin='http://127.0.0.1:8768',web='http://127.0.0.1:5173';
const user={id:'8c19f7f3-76eb-40c1-aa0a-cf0e4f9f02f1',email:'owner@example.test',created_at:'2026-10-01T10:00:00.000Z',email_confirmed_at:'2026-10-01T10:01:00.000Z',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'Ada Lovelace'},factors:[]};
let mfa=false,enabled=true,fail=false,contact=true,reads=0,challengeId;
const tokens=new Set(),events=[];
function session(){
  const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp:Date.now()/1000+3600,iss:origin+'/auth/v1',aud:'authenticated',role:'authenticated',aal:mfa?'aal2':'aal1',amr:mfa?[{method:'totp',timestamp:Math.floor(Date.now()/1000)}]:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]})).toString('base64url')}.fixture-signature`;
  tokens.add(jwt);return {access_token:jwt,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user};
}
const users=Array.from({length:46},(_,index)=>({id:index===0?user.id:randomUUID(),name:index===0?'Ada Lovelace':index===1?'Grace Hopper':`Practice user ${index+1}`,email:index===0?user.email:`learner${index+1}@example.test`,verified:index%6!==0,createdAt:new Date(Date.now()-index*86400000).toISOString(),profileReady:index%7!==0,goalReady:index%6!==0,onboarded:index%5!==0,extensionAcknowledged:index%5!==0,lastActive:index%3===0?new Date().toISOString():null,extensionVersion:index%4===0?'0.15.0':index%4===1?'0.14.0':null,extensionSeen:index%4<2?new Date().toISOString():null,problems:20+index,attempts:28+index,imported:10,firstSave:new Date().toISOString(),firstImport:new Date().toISOString(),summaryAt:new Date().toISOString()}));
const masked=row=>({...row,email:maskEmail(row.email)});
function check(){reads++;if(fail){fail=false;throw new DomainError(503,'Simulated owner storage outage. Retry to recover.');}}
const store={
  access:async()=>({enabled,permissions:[...OWNER_PERMISSIONS,...(contact?['contact:read']:[])]}),
  audit:async(actorId,action,targetId=null,reason=null)=>events.unshift({id:events.length+1,actorId,action,targetId,reason,createdAt:new Date().toISOString()}),
  overview:async()=>{check();return {totals:{registered:46,verified:38,profiles:35,goals:33,onboarded:29,connected:24,saved:21,imported:18,active:16},daily:Array.from({length:14},(_,index)=>({day:new Date(Date.now()-(13-index)*86400000).toISOString(),signups:[1,3,2,4,0,3,5,2,4,2,5,4,6,5][index]})),trackingSince:'2026-10-01T10:00:00Z',syncedAt:new Date().toISOString()};},
  users:async({q,status,limit,offset})=>{check();const rows=users.filter(row=>(!q||[row.id,row.name,row.email].some(v=>v.toLowerCase().includes(q.toLowerCase())))&&(status==='all'||status==='setup-pending'&&!row.onboarded||status==='connected'&&row.extensionSeen||status==='active'&&row.lastActive));return {users:rows.slice(offset,offset+limit).map(masked),total:rows.length,limit,offset};},
  user:async id=>{check();const row=users.find(row=>row.id===id);if(!row)throw new DomainError(404,'Account not found');return masked(row);},
  contact:async(actor,target,reason)=>{await store.audit(actor,'user.contact_reveal',target,reason);return {email:users.find(row=>row.id===target).email};},
  diagnostics:async()=>{check();return {totals:[{operation:'capture',outcome:'success',source:'server',count:92},{operation:'import',outcome:'success',source:'server',count:18},{operation:'import',outcome:'failure',source:'client',count:2}],versions:[{version:'0.15.0',users:14,lastSeen:new Date().toISOString()},{version:'0.14.0',users:10,lastSeen:new Date().toISOString()}],events:[{id:randomUUID(),userId:user.id,operation:'capture',outcome:'success',code:'CONFIRMED',source:'server',receivedAt:new Date().toISOString()},{id:randomUUID(),userId:users[1].id,operation:'import',outcome:'failure',code:'LEETCODE_SIGNED_OUT',source:'client',receivedAt:new Date().toISOString()}],total:2};},
  health:async()=>{check();return {database:{status:'connected',latencyMs:14,pool:{total:3,idle:2,waiting:0}},uptimeSeconds:3600,routes:[{route:'/retention',method:'GET',requests:121,averageMs:210,authMs:80,databaseMs:96,maxMs:812,slow:0,errors:0},{route:'/capture',method:'POST',requests:92,averageMs:162,authMs:80,databaseMs:56,maxMs:430,slow:0,errors:0}],hourly:[]};},
  activity:async({limit,offset})=>{check();return {events:events.slice(offset,offset+limit),total:events.length};},
};
const app=express();app.use(express.json());
app.use((req,res,next)=>{if(req.headers.origin===web){res.set('Access-Control-Allow-Origin',web);res.set('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');res.set('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');}if(req.method==='OPTIONS')return res.sendStatus(204);next();});
app.use('/auth/v1',(_req,res,next)=>{res.set('X-Supabase-Api-Version','2024-01-01');res.set('Access-Control-Expose-Headers','X-Supabase-Api-Version');next();});
app.post('/auth/v1/token',(req,res)=>{if(req.query.grant_type==='password'&&(req.body.email!==user.email||req.body.password!=='fixture-password'))return res.status(400).json({error:'invalid_grant',error_description:'Use the fixture credentials'});res.json(session());});
app.get('/auth/v1/user',(req,res)=>{if(!tokens.has(req.headers.authorization?.slice(7)))return res.status(401).json({error:'invalid_token'});res.json(user);});
app.post('/auth/v1/logout',(_req,res)=>res.json({}));
app.post('/auth/v1/factors',(_req,res)=>{const factor={id:randomUUID(),factor_type:'totp',friendly_name:'Recall owner',status:'unverified'};user.factors.push(factor);res.json({...factor,type:'totp',totp:{qr_code:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="20" y="100">Fixture QR code</text></svg>',secret:'FIXTURE-ONLY-KEY',uri:'otpauth://totp/fixture'}});});
app.delete('/auth/v1/factors/:id',(req,res)=>{user.factors=user.factors.filter(f=>f.id!==req.params.id);res.json({id:req.params.id});});
app.post('/auth/v1/factors/:id/challenge',(_req,res)=>{challengeId=randomUUID();res.json({id:challengeId,type:'totp',expires_at:Date.now()/1000+300});});
app.post('/auth/v1/factors/:id/verify',(req,res)=>{if(req.body.code!=='123456'||req.body.challenge_id!==challengeId)return res.status(400).json({code:'mfa_verification_failed',msg:'Invalid fixture code'});mfa=true;user.factors=user.factors.map(f=>({...f,status:'verified'}));res.json(session());});
app.get('/fixture',(_req,res)=>res.type('html').send(`<h1>Isolated owner fixture</h1><p>No real accounts or database. Sign in with owner@example.test / fixture-password. Authenticator code: 123456.</p><a href="${web}/#/login">Open test app</a><form method="POST" action="/fixture/fail"><button>Fail next owner read</button></form><form method="POST" action="/fixture/revoke"><button>Simulate revoked owner</button></form><form method="POST" action="/fixture/grant"><button>Restore fixture owner</button></form><a href="/fixture/metrics">Read request count</a>`));
app.post('/fixture/fail',(_req,res)=>{fail=true;res.redirect('/fixture');});
app.post('/fixture/revoke',(_req,res)=>{enabled=false;res.redirect(web+'/#/owner');});
app.post('/fixture/grant',(_req,res)=>{enabled=true;res.redirect('/fixture');});
app.get('/fixture/metrics',(_req,res)=>res.json({reads,events:events.length}));
const auth={mode:'supabase',configured:true,url:origin,key:'fixture-publishable-key'};
const recall=createApp({auth,authenticate:createAuthenticator(auth),ownerStore:store,repositoryForUser:async()=>({setup:async()=>({profileConfigured:true,completed:true,extensionAcknowledged:true,goal:{configured:true,profile:'interview',target:300}}),retention:async()=>{throw new DomainError(503,'Fixture has no real practice data. Open owner dashboard.');},solvedHistory:async()=>({problems:[],more:false})})});
app.use((req,res,next)=>{delete req.headers.origin;return recall(req,res,next);});
app.listen(8768,'127.0.0.1',()=>console.log(`Owner fixture ${origin}/fixture; Vite API_PROXY_TARGET=${origin}`));
