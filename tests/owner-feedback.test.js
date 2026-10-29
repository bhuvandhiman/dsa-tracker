import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ownerMfaError} from '../apps/web/src/owner-feedback.js';

test('only authenticator-code errors ask the owner for a fresh code',()=>{
  for(const code of ['mfa_verification_failed','mfa_verification_rejected','mfa_challenge_expired'])assert.match(ownerMfaError({code,status:400}),/fresh six-digit code/);
  for(const error of [new TypeError('Failed to fetch'),{name:'AuthRetryableFetchError',status:503},{code:'request_timeout'},{status:500}]){
    assert.match(ownerMfaError(error),/connection and retry/);
    assert.doesNotMatch(ownerMfaError(error),/six-digit code/);
  }
});

test('owner verification explains rate limits, expired sessions and removed factors',()=>{
  assert.match(ownerMfaError({status:429}),/Wait a moment/);
  assert.match(ownerMfaError({name:'AuthSessionMissingError'}),/Sign in again/);
  assert.match(ownerMfaError({code:'session_expired'}),/Sign in again/);
  assert.match(ownerMfaError({code:'mfa_factor_not_found'}),/current authenticators/);
  assert.match(ownerMfaError(new Error('Private provider internals')),/Verification is unavailable/);
  assert.doesNotMatch(ownerMfaError(new Error('Private provider internals')),/Private provider internals/);
});
