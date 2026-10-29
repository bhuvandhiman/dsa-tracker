import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthCooldowns} from '../apps/web/src/auth-cooldowns.js';

test('auth deadlines survive a new form read and expire by elapsed wall time',()=>{
  let now=1000;const cooldowns=createAuthCooldowns(()=>now);
  cooldowns.block('login',60);
  assert.deepEqual(cooldowns.read('login'),{submit:60,resend:0});
  now=2000;assert.equal(cooldowns.read('login').submit,59);
  now=90000;assert.equal(cooldowns.read('login').submit,0);
});

test('wait times round up and a shorter retry does not shorten an existing deadline',()=>{
  let now=0;const cooldowns=createAuthCooldowns(()=>now);
  cooldowns.block('login',60);now=10001;
  cooldowns.block('login',5);
  assert.equal(cooldowns.remaining('login'),50);
  now=59999;assert.equal(cooldowns.remaining('login'),1);
  now=60000;assert.equal(cooldowns.remaining('login'),0);
});

test('normal action limits stay separate, while confirmation resends are shared between forms',()=>{
  const cooldowns=createAuthCooldowns(()=>0);
  cooldowns.block('login',60);
  assert.equal(cooldowns.read('signup').submit,0);
  assert.equal(cooldowns.read('forgot-password').submit,0);
  cooldowns.block('resend',60);
  assert.equal(cooldowns.read('login').resend,60);
  assert.equal(cooldowns.read('signup').resend,60);
  assert.equal(cooldowns.read('reset-password').submit,0);
});

test('email quotas block all related email sending without blocking login or password updates',()=>{
  let now=0;const cooldowns=createAuthCooldowns(()=>now);
  cooldowns.block('signup',60,{email:true});
  for(const action of ['signup','forgot-password','resend'])assert.equal(cooldowns.remaining(action),60);
  for(const action of ['login','reset-password'])assert.equal(cooldowns.remaining(action),0);
  now=60000;
  for(const action of ['signup','forgot-password','resend'])assert.equal(cooldowns.remaining(action),0);
});
