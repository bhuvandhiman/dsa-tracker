import { DomainError } from './domain.js';

export function authSettings(env=process.env){
  const mode=env.AUTH_MODE || (env.SUPABASE_URL || env.SUPABASE_PUBLISHABLE_KEY?'supabase':'local');
  if(!['local','supabase'].includes(mode))throw new Error('AUTH_MODE must be local or supabase.');
  if(mode==='local')return {mode,configured:false};
  let url;
  try{url=new URL(env.SUPABASE_URL);}catch{throw new Error('Set a valid SUPABASE_URL before enabling accounts.');}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('SUPABASE_URL must be an HTTPS project origin.');
  const key=env.SUPABASE_PUBLISHABLE_KEY;
  if(typeof key!=='string'||!key||/\s/.test(key)||key.startsWith('sb_secret_'))throw new Error('Set a Supabase publishable key, never a secret/service-role key.');
  if(key.split('.').length===3){try{if(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role!=='anon')throw new Error();}catch{throw new Error('Use the public anon or publishable key.');}}
  return {mode,configured:true,url:url.origin,key};
}

export function createAuthenticator(settings,fetchImpl=fetch){
  return async request=>{
    const authorization=request.get('Authorization');
    if(!/^Bearer [^\s]{1,8192}$/.test(authorization||''))throw new DomainError(401,'Sign in to access your Recall workspace.');
    let response;
    try{response=await fetchImpl(`${settings.url}/auth/v1/user`,{headers:{Authorization:authorization,apikey:settings.key},signal:AbortSignal.timeout(8000),redirect:'error'});}catch{throw new DomainError(503,'Sign-in verification is unavailable. Please retry.');}
    if(!response.ok)throw new DomainError(response.status===429?429:response.status>=500?503:401,response.status===429?'Sign-in verification is busy. Wait briefly, then retry.':response.status>=500?'Sign-in verification is unavailable. Please retry.':'Your session expired. Please sign in again.');
    let user;try{user=await response.json();}catch{throw new DomainError(503,'Sign-in verification is unavailable. Please retry.');}
    if(!user||typeof user!=='object'||Array.isArray(user)||typeof user.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(user.id))throw new DomainError(503,'Sign-in verification returned an invalid account. Please retry.');
    if(!user.email_confirmed_at)throw new DomainError(401,'Verify your email before opening your workspace.');
    return {id:user.id.toLowerCase(),email:typeof user.email==='string'?user.email.slice(0,320):'',name:typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name.slice(0,100):''};
  };
}
