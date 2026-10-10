import { DomainError } from './domain.js';

export const OWNER_PERMISSIONS=['overview:read','users:read','diagnostics:read','health:read','audit:read'];
export const OWNER_MFA_SECONDS=900;
const verifiedSessions=new WeakMap();
const validId=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

// Called ONLY after Supabase's /user endpoint has validated this exact bearer.
// Merely decoding an incoming JWT, or trusting user_metadata, never grants access.
export function rememberVerifiedSession(request,providerUser,settings,authorization){
  try{
    const token=authorization.slice(7);
    const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));
    const audience=claims.aud==='authenticated'||Array.isArray(claims.aud)&&claims.aud.includes('authenticated');
    if(claims.sub!==providerUser.id||claims.iss!==`${settings.url}/auth/v1`||!audience||claims.role!=='authenticated'||!Number.isFinite(claims.exp)||claims.exp*1000<=Date.now())return;
    const totp=Array.isArray(claims.amr)?claims.amr.filter(item=>item.method==='totp'&&Number.isFinite(item.timestamp)).sort((a,b)=>b.timestamp-a.timestamp)[0]:null;
    verifiedSessions.set(request,{userId:providerUser.id,aal:claims.aal,totpAt:totp?.timestamp,hasFactor:Array.isArray(providerUser.factors)&&providerUser.factors.some(f=>f.factor_type==='totp'&&f.status==='verified')});
  }catch{/* Ordinary accounts may use opaque tokens; privileged access fails closed. */}
}
export function requireOwnerMfa(request,user,now=Date.now()){
  const session=verifiedSessions.get(request),age=now/1000-session?.totpAt;
  if(session?.userId!==user.id||session.aal!=='aal2'||!session.hasFactor||!Number.isFinite(age)||age< -30||age>OWNER_MFA_SECONDS){
    throw Object.assign(new DomainError(403,'Verify an authenticator code to open owner data.'),{publicCode:'OWNER_MFA_REQUIRED'});
  }
}
export function ownerId(value){if(!validId(value))throw new DomainError(400,'Use a valid Supabase account ID.');return value.toLowerCase();}
export function ownerPage(query){
  if(Object.keys(query).some(k=>!['q','offset','limit','status'].includes(k)))throw new DomainError(400,'Invalid owner filters.');
  const limit=query.limit===undefined?25:Number(query.limit),offset=query.offset===undefined?0:Number(query.offset),q=query.q??'',status=query.status??'all';
  if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||offset>1000000||typeof q!=='string'||q.length>100||!['all','setup-pending','connected','active'].includes(status))throw new DomainError(400,'Invalid owner filters.');
  return {limit,offset,q:q.trim(),status};
}
export function contactReason(body){
  if(!body||Object.keys(body).some(k=>k!=='reason')||typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>300||[...body.reason].some(char=>char.charCodeAt(0)<32))throw new DomainError(400,'Enter a support reason between 10 and 300 characters.');
  return body.reason.trim();
}
export function maskEmail(value){
  if(typeof value!=='string'||!value.includes('@'))return 'Unavailable';
  const [local,domain]=value.split('@');return `${local.slice(0,1)}•••@${domain}`;
}
export const DIAGNOSTIC_OPERATIONS=['connection','capture','import','dashboard'];
export const DIAGNOSTIC_CODES=['TIMEOUT','NETWORK','SIGNED_OUT','LEETCODE_SIGNED_OUT','RATE_LIMIT','UNKNOWN'];
export function diagnosticInput(body){
  if(!body||Object.keys(body).some(k=>!['operation','code','eventId','version'].includes(k))||!DIAGNOSTIC_OPERATIONS.includes(body.operation)||!DIAGNOSTIC_CODES.includes(body.code)||!validId(body.eventId)||body.version!==undefined&&!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(body.version))throw new DomainError(400,'Invalid diagnostic report.');
  return {operation:body.operation,code:body.code,eventId:body.eventId.toLowerCase(),version:body.version||null};
}
export function metricRoute(path){
  if(typeof path!=='string'||!path.startsWith('/api/'))return null;
  const parts=path.slice(5).split('/');
  if(!['auth','health','session','setup','account','patterns','problems','attempts','imports','pattern-problems','practice-context','capture','retention','goal','workspace','ready','history','owner','diagnostics'].includes(parts[0]))return null;
  const known=new Set(['config','extension','login','refresh','connect','profile','export','backup','restore','recent','legacy','reconcile','history','removed','difficulty','placement','patterns','overview','users','health','activity','contact','diagnostics']);
  return '/'+parts.map((part,i)=>i===0||known.has(part)?part:':id').slice(0,4).join('/');
}
