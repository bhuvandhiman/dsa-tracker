import { DomainError } from './domain.js';
import { createAuthenticator } from './auth.js';

// Passwords are forwarded once to the configured Auth project, never stored.
export function createExtensionAuth(settings,fetchImpl=fetch){
  const verify=createAuthenticator(settings,fetchImpl);
  return async (kind,body)=>{
    if(settings.mode!=='supabase'||!settings.configured)throw new DomainError(400,'Recall is using its local workspace.');
    if(kind==='connect'){
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>key!=='accessToken')||typeof body.accessToken!=='string'||!body.accessToken||body.accessToken.length>8192)throw new DomainError(400,'Invalid website connection.');
      // Supabase verifies the bearer before we read its expiry. Never transfer
      // the website refresh token: the website remains its only refresh owner.
      const user=await verify({get:()=>`Bearer ${body.accessToken}`});
      let claims;try{claims=JSON.parse(Buffer.from(body.accessToken.split('.')[1],'base64url').toString());}catch{throw new DomainError(401,'Open Recall and sign in to reconnect.');}
      if(claims?.sub!==user.id||!Number.isFinite(claims.exp)||claims.exp*1000<=Date.now())throw new DomainError(401,'Open Recall and sign in to reconnect.');
      return {user,accessToken:body.accessToken,expiresAt:claims.exp*1000,project:settings.url,source:'website'};
    }
    if(!['login','refresh'].includes(kind))throw new DomainError(400,'Invalid sign-in request.');
    const keys=kind==='login'?['email','password']:['refreshToken'];
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!keys.includes(key)))throw new DomainError(400,'Invalid sign-in request.');
    if(kind==='login'&&(typeof body.email!=='string'||body.email.length>320||!body.email.includes('@')||typeof body.password!=='string'||!body.password||body.password.length>4096))throw new DomainError(400,'Enter your Recall email and password.');
    if(kind==='refresh'&&(typeof body.refreshToken!=='string'||!body.refreshToken||body.refreshToken.length>8192))throw new DomainError(401,'Sign into Recall in extension Settings.');
    let response,data;
    try{
      response=await fetchImpl(`${settings.url}/auth/v1/token?grant_type=${kind==='login'?'password':'refresh_token'}`,{method:'POST',headers:{apikey:settings.key,'Content-Type':'application/json'},body:JSON.stringify(kind==='login'?{email:body.email.trim(),password:body.password}:{refresh_token:body.refreshToken}),signal:AbortSignal.timeout(10000),redirect:'error'});
      data=await response.json();
    }catch{throw new DomainError(503,'Recall sign-in is unavailable. Try again.');}
    if(!response.ok)throw new DomainError(response.status===429?429:response.status>=500?503:401,response.status===429?'Too many sign-in attempts. Wait before retrying.':response.status>=500?'Recall sign-in is unavailable. Try again.':kind==='login'?'Check your email and password, and confirm your email before signing in.':'Your extension session expired. Sign in again in Settings.');
    if(typeof data?.access_token!=='string'||!data.access_token||data.access_token.length>8192||typeof data.refresh_token!=='string'||!data.refresh_token||data.refresh_token.length>8192||!Number.isFinite(data.expires_in)||data.expires_in<=0)throw new DomainError(503,'Sign-in returned an invalid session. Try again.');
    const user=await verify({get:()=>`Bearer ${data.access_token}`});
    return {user,accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt:Date.now()+data.expires_in*1000,project:settings.url};
  };
}
