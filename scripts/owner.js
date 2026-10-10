import { createPool } from '../apps/api/src/db.js';
import { authSettings } from '../apps/api/src/auth.js';
import { accountAdminKey } from '../apps/api/src/account-lifecycle.js';
import { createOwnerStore } from '../apps/api/src/owner-store.js';
import { createOwnerDirectory } from '../apps/api/src/owner-sync.js';
import { ownerId } from '../apps/api/src/owner-policy.js';

const [action,id,...flags]=process.argv.slice(2);
let pool;
try{
  if(!['grant','revoke','sync'].includes(action)||action==='sync'&&(id||flags.length)||action!=='sync'&&!id||flags.some(flag=>flag!=='--allow-contact')||action!=='grant'&&flags.length)throw new Error('Usage: npm run owner -- grant <Supabase-user-ID> [--allow-contact] | revoke <ID> | sync');
  const auth=authSettings();if(auth.mode!=='supabase')throw new Error('Owner access requires AUTH_MODE=supabase.');
  const key=accountAdminKey();if(action!=='revoke'&&!key)throw new Error('Set SUPABASE_SECRET_KEY on the server to verify and synchronize the account directory.');
  if(id)ownerId(id);
  pool=createPool();const store=createOwnerStore(pool);await store.ensure();
  if(action==='revoke'){await store.revoke(id);console.log('Owner access revoked.');}
  else{
    const directory=createOwnerDirectory(auth,key);
    if(action==='grant'){
      const user=await directory.account(id);if(!user.emailVerified)throw new Error('Verify this account’s email before granting owner access.');
      await store.observe(user);await store.summary(user.id);await store.grant(user.id,{contact:flags.includes('--allow-contact')});
      console.log('Owner access granted. Sign out/in, open Owner dashboard from the account menu, and verify MFA.');
    }else console.log(`Synchronized ${await directory.sync(store)} account summaries.`);
  }
}catch(error){console.error(error.message?.startsWith('Usage:')||error.message?.startsWith('Set ')||error.message?.startsWith('Owner ')||error.message?.startsWith('Verify ')||error.message?.startsWith('Account directory')?error.message:'Owner setup failed. Check server authentication and database configuration.');process.exitCode=1;}
finally{if(pool)await pool.end();}
