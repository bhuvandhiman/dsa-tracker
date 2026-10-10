import {DomainError} from './domain.js';
import {verifiedUser} from './auth.js';
import {normalizeProfileName,profileNameError,hasProfileName} from '../../shared/profile.js';

export function profileInput(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>key!=='name'))throw new DomainError(400,'Choose a name for your profile.');
  const error=profileNameError(body.name);
  if(error)throw new DomainError(400,error);
  return {name:normalizeProfileName(body.name)};
}

export function profileSetup(setup,user){return {...setup,profileConfigured:hasProfileName(user?.name)};}

export function createProfileUpdater(settings,fetchImpl=fetch){
  return async(request,owner,{name})=>{
    if(settings.mode!=='supabase'||!settings.configured)throw new DomainError(503,'Online profiles are not configured.');
    const authorization=request.get('Authorization');
    if(!/^Bearer [^\s]{1,8192}$/.test(authorization||''))throw new DomainError(401,'Sign in to update your profile.');
    let response;
    try{
      response=await fetchImpl(`${settings.url}/auth/v1/user`,{method:'PUT',headers:{Authorization:authorization,apikey:settings.key,'Content-Type':'application/json'},body:JSON.stringify({data:{full_name:name}}),signal:AbortSignal.timeout(8000),redirect:'error'});
    }catch{throw new DomainError(503,'Could not save your profile. Please try again.');}
    if(!response.ok){
      const status=response.status===429?429:[401,403].includes(response.status)?401:response.status>=500?503:400;
      throw new DomainError(status,status===429?'Profile updates are busy. Wait briefly, then retry.':status===401?'Your session expired. Please sign in again.':status===400?'Could not save that name. Please check it and try again.':'Could not save your profile. Please try again.');
    }
    let data;try{data=await response.json();}catch{throw new DomainError(503,'Could not confirm your profile was saved. Please try again.');}
    const user=verifiedUser(data);
    if(user.id!==owner.id||user.name!==name)throw new DomainError(503,'Could not confirm your profile was saved. Please try again.');
    return user;
  };
}
