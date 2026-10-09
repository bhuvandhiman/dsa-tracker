import test from 'node:test';
import assert from 'node:assert/strict';
import {authFeedback,signupOutcome,requireSignedIn,rememberAuthEmail,readAuthEmail,clearAuthEmail} from '../apps/web/src/auth-feedback.js';

test('obfuscated duplicate signup does not claim a confirmation email was sent',()=>{
  assert.equal(signupOutcome({data:{user:{id:'obfuscated-id',identities:[]},session:null},error:null}),'existing');
  for(const error of [{code:'user_already_exists'},{code:'email_exists'},{message:'User already registered'}])assert.equal(signupOutcome({data:{user:null,session:null},error}),'existing');
});

test('new and unconfirmed signups remain confirmable, while unknown responses avoid delivery claims',()=>{
  assert.equal(signupOutcome({data:{user:{id:'new-user',identities:[{provider:'email'}]},session:null}}),'confirmation');
  assert.equal(signupOutcome({data:{user:{id:'pending-user',email_confirmed_at:null,identities:[{provider:'email'}]},session:null}}),'confirmation');
  assert.equal(signupOutcome({data:{user:{id:'no-identities-field'},session:null}}),'unknown');
});

test('a real signup session takes precedence over missing/empty identities',()=>{
  assert.equal(signupOutcome({data:{user:{id:'user',identities:[]},session:{user:{id:'user'},access_token:'session-token'}}}),'signed-in');
});

test('failed and malformed signup responses cannot advance to verification',()=>{
  const failure={code:'over_email_send_rate_limit',message:'Rate limited'};
  assert.throws(()=>signupOutcome({data:{user:{id:'user',identities:[{}]}},error:failure}),error=>error===failure);
  for(const result of [undefined,{}, {data:{user:null,session:null}},{data:{user:{}}},{data:{session:{user:{id:'user'}}}}])assert.throws(()=>signupOutcome(result),/not confirmed|not completed/);
});

test('login success requires a session and exposes actionable credential/confirmation errors',()=>{
  for(const result of [{},{data:{session:null}},{data:{session:{access_token:'token'}}},{data:{session:{user:{id:'user'}}}}])assert.throws(()=>requireSignedIn(result),/not completed/);
  const error={code:'invalid_credentials'};assert.throws(()=>requireSignedIn({error}),value=>value===error);
  assert.match(authFeedback(error).message,/Email or password is incorrect/);
  assert.equal(authFeedback({code:'email_not_confirmed'}).unconfirmed,true);
  assert.equal(authFeedback({message:'Email not confirmed'}).unconfirmed,true);
  assert.match(authFeedback({message:'Invalid login credentials'}).message,/reset your password/);
});

test('email quotas, request limits and outages do not display success messages',()=>{
  for(const error of [{code:'over_email_send_rate_limit'},{code:'over_request_rate_limit'},{status:429}]){const feedback=authFeedback(error);assert.equal(feedback.cooldown,60);assert.match(feedback.message,/wait/i);}
  for(const error of [{status:503},{name:'AuthRetryableFetchError'},{name:'TimeoutError'},new TypeError('Failed to fetch')])assert.match(authFeedback(error).message,/Could not reach/);
  assert.match(authFeedback({code:'email_address_not_authorized'}).message,/not available/);
  assert.match(authFeedback({code:'signup_disabled'}).message,/temporarily unavailable/);
});

test('provider password requirements are retained and same-password errors are clear',()=>{
  const error={code:'weak_password',message:'Password should contain an uppercase letter and a number.'};
  assert.equal(authFeedback(error).message,error.message);assert.match(authFeedback({code:'same_password'}).message,/different password/);
});

test('form switching retains only the email in memory and reads are safe for StrictMode',()=>{
  clearAuthEmail();assert.equal(readAuthEmail(),'');rememberAuthEmail('  existing@example.test  ');
  assert.equal(readAuthEmail(),'existing@example.test');assert.equal(readAuthEmail(),'existing@example.test');clearAuthEmail();assert.equal(readAuthEmail(),'');
});
