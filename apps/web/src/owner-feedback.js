export function ownerMfaError(error){
  const code=error?.code;
  if(['mfa_verification_failed','mfa_verification_rejected','mfa_challenge_expired'].includes(code))return 'That code could not be verified. Enter a fresh six-digit code and retry.';
  if(error instanceof TypeError||error?.name==='AuthRetryableFetchError'||['NETWORK_ERROR','REQUEST_TIMEOUT','request_timeout'].includes(code)||error?.status===0||error?.status>=500)return 'Could not reach the verification service. Check your connection and retry.';
  if(error?.status===429||code==='over_request_rate_limit')return 'Too many verification attempts. Wait a moment before trying again.';
  if(error?.name==='AuthSessionMissingError'||['session_not_found','session_expired','bad_jwt','refresh_token_not_found'].includes(code)||error?.status===401)return 'Your sign-in session has expired. Sign in again, then verify your authenticator.';
  if(code==='mfa_factor_not_found')return 'This authenticator is no longer available. Reload this page to check your current authenticators.';
  return 'Verification is unavailable right now. Please retry. If it continues, sign in again.';
}
