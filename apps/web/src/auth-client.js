import { abortable,setTokenProvider,setWorkspaceScope } from './api.js';

let connecting=null,project=null,client=null;
export async function connectAuth(config){
  if(!config.configured){client?.auth.stopAutoRefresh();client=null;project=null;connecting=null;setTokenProvider(null);setWorkspaceScope('local');return null;}
  const identity=config.url+'\0'+config.key;
  if(identity!==project){client?.auth.stopAutoRefresh();client=null;project=identity;connecting=null;setTokenProvider(null);setWorkspaceScope(null);}
  if(!connecting){
    connecting=abortable(import('@supabase/supabase-js'),AbortSignal.timeout(15000)).then(({createClient})=>{
      if(project!==identity)throw new Error('Recall account connection changed. Retry connection.');
      client=createClient(config.url,config.key,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true},global:{fetch:authFetch}});
      const current=client;
      setTokenProvider(async()=>{const {data,error}=await current.auth.getSession();if(error)throw error;return data.session?{token:data.session.access_token,scope:data.session.user.id}:null;});
      return client;
    }).catch(error=>{if(project===identity)connecting=null;throw error;});
  }
  return connecting;
}
export function authFetch(input,options={}){
  const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000);
  return fetch(input,{...options,signal});
}
export function authRedirect(kind='callback'){
  return `${window.location.origin}/?auth=${kind}#/${kind==='recovery'?'reset-password':'login'}`;
}

export async function initializedSession(client,signal){
  // getSession alone doesn't report a failed automatic URL exchange.
  const initialized=await abortable(client.auth.initialize(),signal);
  if(initialized.error)throw initialized.error;
  // The SDK ignores a PKCE code when this browser has no matching verifier.
  // Successful exchanges remove the code; a leftover code isn't a confirmed login.
  if(new URLSearchParams(globalThis.window?.location?.search).has('code'))throw new Error('Open the confirmation link in the browser where you signed up. If the link has expired, request a new one.');
  const {data,error}=await abortable(client.auth.getSession(),signal);
  if(error)throw error;
  return data.session;
}
