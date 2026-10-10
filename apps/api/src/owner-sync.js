import { ownerId } from './owner-policy.js';
import { normalizeProfileName, hasProfileName } from '../../shared/profile.js';

export function indexedAccount(user){
  const name=normalizeProfileName(typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name.slice(0,100):'');
  return {id:ownerId(user.id),email:typeof user.email==='string'?user.email.slice(0,320):'',name:hasProfileName(name)?name:'',emailVerified:Boolean(user.email_confirmed_at),createdAt:typeof user.created_at==='string'&&Number.isFinite(Date.parse(user.created_at))?new Date(user.created_at).toISOString():null};
}
export function createOwnerDirectory(auth,key,fetchImpl=fetch){
  async function read(path){
    let response,data;try{response=await fetchImpl(`${auth.url}/auth/v1/admin/${path}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},redirect:'error',signal:AbortSignal.timeout(10000)});if(response.ok)data=await response.json();}catch{/* Provider responses never reach logs. */}
    if(!response?.ok||!data||typeof data!=='object')throw new Error('Account directory is unavailable. Check the server-only Supabase key and retry.');
    return data;
  }
  return {
    async account(id){return indexedAccount(await read(`users/${ownerId(id)}`));},
    async sync(store){
      let count=0;
      for(let page=1;page<=10000;page++){
        const data=await read(`users?page=${page}&per_page=100`);
        if(!Array.isArray(data.users)||data.users.length>100)throw new Error('Account directory returned an invalid page.');
        for(const raw of data.users){const user=indexedAccount(raw);await store.observe(user);await store.summary(user.id);count++;}
        if(data.users.length<100){await store.synchronized();await store.audit(null,'directory.sync',null,`${count} account summaries synchronized through server CLI.`);return count;}
      }
      throw new Error('Account directory exceeded the sync limit. Sync was not marked complete.');
    },
  };
}
