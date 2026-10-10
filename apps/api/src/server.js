import { createApp } from './app.js';
import { createPool } from './db.js';
import { createRepository } from './repository.js';
import { authSettings } from './auth.js';
import { createUserWorkspaces } from './user-workspaces.js';
import { accountAdminKey, createAccountAdmin, createAccountLifecycle } from './account-lifecycle.js';
import { deploymentSettings } from './deployment.js';
import { fileURLToPath } from 'node:url';
import { accessSync } from 'node:fs';
import { checkDatabaseConnection, reportDatabaseFailure } from './database-diagnostics.js';
import { createOwnerStore } from './owner-store.js';
import { createOwnerOperations } from './owner-operations.js';
import { measurePool } from './request-metrics.js';

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const deployment=deploymentSettings();
const host = process.env.HOST || (deployment.mode==='hosted'?'0.0.0.0':'127.0.0.1');
if (deployment.mode==='local'&&!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('Local Recall requires a loopback HOST.');
const webRoot=deployment.mode==='hosted'?fileURLToPath(new URL('../../web/dist/',import.meta.url)):null;
if(webRoot)accessSync(new URL('../../web/dist/index.html',import.meta.url));
const pool = process.env.DATABASE_URL ? createPool() : null;
const auth=authSettings();
const adminKey=accountAdminKey();
const measured=pool?measurePool(pool):null;
const ownerStore=pool&&auth.mode==='supabase'?createOwnerStore(measured):null;
const operations=ownerStore?createOwnerOperations(ownerStore,{onError:()=>console.error('Recall operational collection failed; practice data is unaffected.')}):null;
const lifecycle=pool&&auth.mode==='supabase'?createAccountLifecycle(measured,{removeIdentity:adminKey?createAccountAdmin(auth,adminKey):null,onDelete:id=>ownerStore.forget(id)}):null;
const installation={storeUrl:process.env.EXTENSION_STORE_URL||'',videoUrl:process.env.EXTENSION_VIDEO_URL||'',downloadUrl:'/downloads/recall-extension.zip'};
const server = createApp({ repository: measured ? createRepository(measured) : null,auth,repositoryForUser:measured?createUserWorkspaces(measured,{lifecycle}):null,accountLifecycle:lifecycle,ownerStore,operations,installation,deployment,webRoot }).listen(port, host);
let recovering=false;
async function recoverDeletions(){if(!lifecycle?.enabled||recovering)return;recovering=true;try{await lifecycle.resume();}catch(error){reportDatabaseFailure(error,'recovery');}finally{recovering=false;}}
void recoverDeletions();const recoveryTimer=setInterval(()=>{void recoverDeletions();},300000);recoveryTimer.unref();
const metricsTimer=operations?setInterval(()=>{void operations.flush().catch(()=>console.error('Recall operational retention failed.'));},60000):null;metricsTimer?.unref();
server.once('listening', () => {
  console.log(`API listening on http://${host}:${port}`);
  if(pool)void checkDatabaseConnection(pool);
});
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; if (pool) pool.end(); });
function shutdown() {
  clearInterval(recoveryTimer);
  clearInterval(metricsTimer);
  server.close(async () => { try{await operations?.flush();}finally{if (pool) await pool.end();process.exit(0);} });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
