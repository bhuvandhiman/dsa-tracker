const duplicateCodes=new Set(['user_already_exists','email_exists']);
export function existingAccountError(error){
  return duplicateCodes.has(error?.code)||/^user already registered\.?$/i.test(error?.message||'');
}

export function signupOutcome(result){
  if(result?.error){if(existingAccountError(result.error))return 'existing';throw result.error;}
  const data=result?.data;
  if(data?.session){requireSignedIn(result);return 'signed-in';}
  if(!data?.user?.id)throw new Error('Account creation was not confirmed. Please try again.');
  // Supabase returns an obfuscated user with no identities for a repeated signup.
  // It has not sent another confirmation email: https://github.com/supabase/auth/blob/master/internal/api/signup.go
  if(Array.isArray(data.user.identities))return data.user.identities.length===0?'existing':'confirmation';
  return 'unknown';
}

export function requireSignedIn(result){
  if(result?.error)throw result.error;
  if(!result?.data?.session?.access_token||!result.data.session.user?.id)throw new Error('Sign-in was not completed. Please try again.');
}

export function authFeedback(error){
  const code=error?.code;
  if(existingAccountError(error))return {message:'An account with this email already exists. Log in instead.'};
  if(code==='email_not_confirmed'||/^email not confirmed\.?$/i.test(error?.message||''))return {message:'Confirm your email before logging in. You can resend the confirmation link below.',unconfirmed:true};
  if(code==='invalid_credentials'||/^invalid login credentials\.?$/i.test(error?.message||''))return {message:'Email or password is incorrect. Try again, or reset your password.'};
  if(code==='over_email_send_rate_limit')return {message:'Too many email requests. Please wait before requesting another link.',cooldown:60};
  if(code==='over_request_rate_limit'||error?.status===429)return {message:'Too many attempts. Please wait a few minutes, then try again.',cooldown:60};
  if(['signup_disabled','email_provider_disabled'].includes(code))return {message:'Email registration or sign-in is temporarily unavailable. Please try again later.'};
  if(code==='email_address_not_authorized')return {message:'Email delivery is not available for this address. Please try again later.'};
  if(code==='same_password')return {message:'Choose a different password from your current one.'};
  if(error?.status>=500||['AuthRetryableFetchError','AbortError','TimeoutError'].includes(error?.name)||error instanceof TypeError&&/fetch|network/i.test(error.message))return {message:'Could not reach the sign-in service. Please try again.'};
  return {message:error?.message||'Something went wrong. Please try again.'};
}

// Keep the email when switching forms, without putting it in URLs or storage.
let nextEmail='';
export function rememberAuthEmail(email){nextEmail=email.trim();}
export function readAuthEmail(){return nextEmail;}
export function clearAuthEmail(){nextEmail='';}
