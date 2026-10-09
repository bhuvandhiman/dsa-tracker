import { migrate } from './migrations.js';
import { createRepository } from './repository.js';
import { DomainError } from './domain.js';
import { exportBackup } from './backup.js';
import { transaction } from './transaction.js';
import { unconfiguredGoal } from './goal-policy.js';

export async function readWorkspaceSetup(pool){
  // One consistent read and one scoped checkout, rather than separate
  // onboarding/goal queries with repeated account locks and search_path setup.
  const row=(await pool.query(`SELECT o.extension_acknowledged AS "extensionAcknowledged",o.completed,
    g.profile,g.target,g.policy_version AS "policyVersion",g.updated_at AS "updatedAt"
    FROM recall_onboarding o LEFT JOIN workspace_goal g ON g.singleton=true WHERE o.singleton=true`)).rows[0];
  const {extensionAcknowledged,completed,profile,target,policyVersion,updatedAt}=row;
  return {extensionAcknowledged,completed,goal:profile?{configured:true,profile,target,policyVersion,updatedAt}:unconfiguredGoal()};
}

export function workspaceSchema(userId,prefix='recall_user_'){
  if(!/^[a-z][a-z0-9_]{0,20}$/.test(prefix)||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId||''))throw new Error('Invalid workspace identity.');
  return prefix+userId.toLowerCase().replaceAll('-','');
}

// Every checkout selects ONLY the verified user's schema. There is no public
// fallback, including for imports, backups, retry IDs, corrections and goals.
export function scopedPool(pool,schema,lifecycle=null){
  if(!/^[a-z][a-z0-9_]{0,62}$/.test(schema))throw new Error('Invalid workspace schema.');
  async function connect(){
    const raw=lifecycle?await lifecycle.acquire(schema):await pool.connect();
    try{if(lifecycle)await lifecycle.assertActive(raw,schema);await raw.query(`SET search_path TO "${schema}"`);}catch(error){if(lifecycle)await lifecycle.release(raw,schema);else raw.release(true);throw error;}
    let released=false;
    return {query:(...args)=>raw.query(...args),release(discard=false){if(released)return;released=true;if(discard){raw.release(true);return;}void raw.query('RESET search_path').then(()=>lifecycle?lifecycle.release(raw,schema):raw.release(),()=>raw.release(true));}};
  }
  return {connect,async query(...args){const client=await connect();try{return await client.query(...args);}finally{client.release();}}};
}

export function createUserWorkspaces(pool,{prefix='recall_user_',lifecycle=null}={}){
  const initializing=new Map(),ready=new Map();
  async function initialize(schema){
    if(lifecycle)await lifecycle.withWorkspace(schema,raw=>raw.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`));
    else await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    const scoped=scopedPool(pool,schema,lifecycle);
    await migrate(scoped);
    await scoped.query('CREATE TABLE IF NOT EXISTS recall_onboarding(singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK(singleton),extension_acknowledged BOOLEAN NOT NULL DEFAULT false,completed BOOLEAN NOT NULL DEFAULT false); INSERT INTO recall_onboarding(singleton) VALUES(true) ON CONFLICT DO NOTHING');
  }
  return async user=>{
    const schema=workspaceSchema(user.id,prefix);
    // Migrate on first access after startup. Bound the ready cache; repositories
    // share the original pool and never create a pool per account.
    if(!ready.has(schema)){
      if(!initializing.has(schema))initializing.set(schema,initialize(schema).then(()=>{ready.set(schema,true);if(ready.size>64)ready.delete(ready.keys().next().value);}).finally(()=>initializing.delete(schema)));
      await initializing.get(schema);
    }else{ready.delete(schema);ready.set(schema,true);}
    const scoped=scopedPool(pool,schema,lifecycle),repository=createRepository(scoped);
    return {...repository,
      async exportAccount(){
        return transaction(scoped,async client=>{
          const setup=await readWorkspaceSetup(client);
          const workspace=await exportBackup(client);return {setup,workspace};
        },{readOnly:true});
      },
      async readiness(){return {...await repository.readiness(),storage:'Private Recall workspace'};},
      setup:()=>readWorkspaceSetup(scoped),
      async saveSetup(input){
        return transaction(scoped,async client=>{
          const transactional=createRepository({query:(...args)=>client.query(...args)});
          if(input.profile!==undefined)await transactional.setGoal({profile:input.profile,target:input.target});
          const goal=await transactional.goal();
          if(input.completed&&!goal.configured)throw new DomainError(400,'Choose a goal before completing setup.');
          const state=(await client.query('UPDATE recall_onboarding SET extension_acknowledged=COALESCE($1,extension_acknowledged),completed=COALESCE($2,completed) WHERE singleton=true RETURNING extension_acknowledged AS "extensionAcknowledged",completed',[input.extensionAcknowledged??null,input.completed??null])).rows[0];
          return {...state,goal};
        });
      },
    };
  };
}
