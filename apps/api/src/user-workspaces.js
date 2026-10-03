import { migrate } from './migrations.js';
import { createRepository } from './repository.js';
import { DomainError } from './domain.js';
import { exportBackup } from './backup.js';

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
    return {query:(...args)=>raw.query(...args),release(){if(released)return;released=true;void raw.query('RESET search_path').then(()=>lifecycle?lifecycle.release(raw,schema):raw.release(),()=>raw.release(true));}};
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
    await scoped.query('CREATE TABLE IF NOT EXISTS recall_onboarding(singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK(singleton),extension_acknowledged BOOLEAN NOT NULL DEFAULT false,completed BOOLEAN NOT NULL DEFAULT false)');
    await scoped.query('INSERT INTO recall_onboarding(singleton) VALUES(true) ON CONFLICT DO NOTHING');
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
        const client=await scoped.connect();try{
          await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
          const state=(await client.query('SELECT extension_acknowledged AS "extensionAcknowledged",completed FROM recall_onboarding WHERE singleton=true')).rows[0];
          const goal=await createRepository({query:(...args)=>client.query(...args)}).goal();
          const workspace=await exportBackup(client);await client.query('COMMIT');return {setup:{...state,goal},workspace};
        }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
      },
      async readiness(){return {...await repository.readiness(),storage:'Private Recall workspace'};},
      async setup(){const state=(await scoped.query('SELECT extension_acknowledged AS "extensionAcknowledged",completed FROM recall_onboarding WHERE singleton=true')).rows[0];return {...state,goal:await repository.goal()};},
      async saveSetup(input){
        const client=await scoped.connect();
        try{
          await client.query('BEGIN');
          const transactional=createRepository({query:(...args)=>client.query(...args)});
          if(input.profile!==undefined)await transactional.setGoal({profile:input.profile,target:input.target});
          const goal=await transactional.goal();
          if(input.completed&&!goal.configured)throw new DomainError(400,'Choose a goal before completing setup.');
          const state=(await client.query('UPDATE recall_onboarding SET extension_acknowledged=COALESCE($1,extension_acknowledged),completed=COALESCE($2,completed) WHERE singleton=true RETURNING extension_acknowledged AS "extensionAcknowledged",completed',[input.extensionAcknowledged??null,input.completed??null])).rows[0];
          await client.query('COMMIT');return {...state,goal};
        }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
      },
    };
  };
}
