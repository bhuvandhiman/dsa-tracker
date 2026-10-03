import { setTokenProvider } from './api.js';

let connecting=null;
export async function connectAuth(config){
  if(!config.configured){setTokenProvider(null);return null;}
  if(!connecting){
    connecting=import('@supabase/supabase-js').then(({createClient})=>{
      const client=createClient(config.url,config.key,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
      setTokenProvider(async()=>{const {data,error}=await client.auth.getSession();if(error)throw error;return data.session?.access_token||null;});
      return client;
    }).catch(error=>{connecting=null;throw error;});
  }
  return connecting;
}
export function authRedirect(kind='callback'){
  return `${window.location.origin}/?auth=${kind}#/${kind==='recovery'?'reset-password':'login'}`;
}
