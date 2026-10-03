import { DomainError } from './domain.js';
import { workspaceSchema } from './user-workspaces.js';

const lockNamespace=71420622;
export function accountAdminKey(env=process.env){
  const key=env.SUPABASE_SECRET_KEY||'';
  if(!key)return '';
  let serviceRole=false;
  try{serviceRole=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='service_role';}catch{/* New secret keys are opaque. */}
  if(/\s/.test(key)||(!key.startsWith('sb_secret_')&&!serviceRole))throw new Error('SUPABASE_SECRET_KEY must be a server-only secret or service-role key.');
  return key;
}
export function deletionInput(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['password','confirmation'].includes(key))||body.confirmation!=='DELETE'||typeof body.password!=='string'||!body.password||body.password.length>4096)throw new DomainError(400,'Enter your current password and type DELETE to confirm.');
  return body.password;
}
export function createAccountAdmin(auth,key,fetchImpl=fetch){
  return async id=>{
    workspaceSchema(id);
    let response,data;
    try{response=await fetchImpl(`${auth.url}/auth/v1/admin/users/${id}`,{method:'DELETE',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({should_soft_delete:false}),redirect:'error',signal:AbortSignal.timeout(10000)});if(response.ok)return;data=await response.json();}
    catch{throw new DomainError(503,'Account deletion could not be confirmed.');}
    if(!response.ok&&!(response.status===404&&[data?.code,data?.error_code].includes('user_not_found')))throw new DomainError(503,'Account deletion could not be confirmed.');
  };
}

// A durable tombstone blocks late requests from recreating a deleted workspace.
// Auth and PostgreSQL cannot share a transaction; queued work resumes after failure.
export function createAccountLifecycle(pool,{prefix='recall_user_',removeIdentity=null}={}){
  workspaceSchema('00000000-0000-4000-8000-000000000001',prefix);
  const control=prefix+'control',table=`"${control}".deletions`;
  let initialized;
  async function ensure(){
    if(!initialized)initialized=(async()=>{
      const raw=await pool.connect();
      try{await raw.query('BEGIN');await raw.query('SELECT pg_advisory_xact_lock($1,hashtext($2))',[lockNamespace,control]);
        await raw.query(`CREATE SCHEMA IF NOT EXISTS "${control}"`);
        await raw.query(`CREATE TABLE IF NOT EXISTS ${table}(user_id UUID PRIMARY KEY, state TEXT NOT NULL CHECK(state IN ('pending','complete')),requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
        await raw.query('COMMIT');
      }catch(error){await raw.query('ROLLBACK');throw error;}finally{raw.release();}
    })().catch(error=>{initialized=null;throw error;});
    await initialized;
  }
  async function acquire(schema,shared=true){
    await ensure();const raw=await pool.connect();
    try{
      await raw.query(`SELECT pg_advisory_lock${shared?'_shared':''}($1,hashtext($2))`,[lockNamespace,schema]);
      return raw;
    }catch(error){raw.release(true);throw error;}
  }
  async function release(raw,schema,shared=true){
    try{await raw.query(`SELECT pg_advisory_unlock${shared?'_shared':''}($1,hashtext($2))`,[lockNamespace,schema]);raw.release();}catch{raw.release(true);}
  }
  async function assertActive(raw,schema){
    const id=schema.slice(prefix.length);if(!/^[a-f0-9]{32}$/.test(id))throw new Error('Invalid private workspace.');
    if((await raw.query(`SELECT 1 FROM ${table} WHERE replace(user_id::text,'-','')=$1`,[id])).rowCount)throw new DomainError(403,'This Recall account is being deleted.');
  }
  async function finish(raw,id){
    await removeIdentity(id);
    const schema=workspaceSchema(id,prefix);
    await raw.query('BEGIN');
    try{await raw.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await raw.query(`UPDATE ${table} SET state='complete' WHERE user_id=$1`,[id]);await raw.query('COMMIT');}
    catch(error){await raw.query('ROLLBACK');throw error;}
  }
  return {
    enabled:Boolean(removeIdentity),acquire,release,assertActive,
    async withWorkspace(schema,work){const raw=await acquire(schema);try{await assertActive(raw,schema);return await work(raw);}finally{await release(raw,schema);}},
    async remove(user){
      if(!removeIdentity)throw new DomainError(503,'Account deletion is not configured yet.');
      const schema=workspaceSchema(user.id,prefix),raw=await acquire(schema,false);
      try{
        await raw.query(`INSERT INTO ${table}(user_id,state) VALUES($1,'pending') ON CONFLICT DO NOTHING`,[user.id]);
        try{await finish(raw,user.id);return {deleted:true,pending:false};}catch{return {deleted:false,pending:true};}
      }finally{await release(raw,schema,false);}
    },
    async resume(){
      if(!removeIdentity)return {completed:0,pending:0};await ensure();
      const rows=(await pool.query(`SELECT user_id AS id FROM ${table} WHERE state='pending' ORDER BY requested_at LIMIT 10`)).rows;
      let completed=0;
      for(const {id} of rows){const schema=workspaceSchema(id,prefix),raw=await acquire(schema,false);try{
        if(!(await raw.query(`SELECT 1 FROM ${table} WHERE user_id=$1 AND state='pending'`,[id])).rowCount)continue;
        try{await finish(raw,id);completed++;}catch{/* Keep the tombstone for the next retry. */}
      }finally{await release(raw,schema,false);}}
      return {completed,pending:rows.length-completed};
    },
  };
}
