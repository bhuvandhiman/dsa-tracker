import { randomUUID } from 'node:crypto';
import { transaction } from './transaction.js';
import { workspaceSchema } from './user-workspaces.js';
import { DomainError } from './domain.js';
import { OWNER_PERMISSIONS, maskEmail, ownerId } from './owner-policy.js';

// This schema is deliberately separate from public and all practice workspaces.
// No HTTP route can grant roles, run SQL, or read notes/code/token payloads.
export function createOwnerStore(pool,{schema='recall_operations',workspacePrefix='recall_user_'}={}){
  if(!/^[a-z][a-z0-9_]{0,40}$/.test(schema))throw new Error('Invalid operations schema.');
  workspaceSchema(randomUUID(),workspacePrefix);
  const table=name=>`"${schema}".${name}`;
  let initialized;
  async function ensure(){
    if(!initialized)initialized=(async()=>{
      const present=(await pool.query('SELECT to_regclass($1) AS exists',[table('state')])).rows[0].exists;
      if(present){
        const version=(await pool.query(`SELECT to_jsonb(s)->>'schema_version' AS version FROM ${table('state')} s WHERE singleton=true`)).rows[0]?.version;
        if(version==='1')return;
        if(version&&version!=='1')throw new Error('Unsupported owner schema version.');
      }
      await transaction(pool,async client=>{
      await client.query('SELECT pg_advisory_xact_lock(71420623,hashtext($1))',[schema]);
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";
        REVOKE ALL ON SCHEMA "${schema}" FROM PUBLIC;
        CREATE TABLE IF NOT EXISTS ${table('owners')}(user_id UUID PRIMARY KEY,contact_access BOOLEAN NOT NULL DEFAULT false,granted_at TIMESTAMPTZ NOT NULL DEFAULT now());
        CREATE TABLE IF NOT EXISTS ${table('erased_accounts')}(user_id UUID PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS ${table('users')}(user_id UUID PRIMARY KEY,name TEXT NOT NULL DEFAULT '',email TEXT NOT NULL DEFAULT '',verified BOOLEAN NOT NULL DEFAULT false,created_at TIMESTAMPTZ,observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),profile_ready BOOLEAN NOT NULL DEFAULT false,goal_ready BOOLEAN NOT NULL DEFAULT false,onboarded BOOLEAN NOT NULL DEFAULT false,extension_acknowledged BOOLEAN NOT NULL DEFAULT false,last_active TIMESTAMPTZ,extension_version TEXT,extension_seen TIMESTAMPTZ,problems INTEGER,attempts INTEGER,imported INTEGER,first_save TIMESTAMPTZ,first_import TIMESTAMPTZ,summary_at TIMESTAMPTZ);
        CREATE INDEX IF NOT EXISTS owner_users_activity ON ${table('users')}(last_active DESC NULLS LAST,user_id);
        CREATE INDEX IF NOT EXISTS owner_users_created ON ${table('users')}(created_at DESC NULLS LAST,user_id);
        CREATE TABLE IF NOT EXISTS ${table('diagnostics')}(event_id UUID PRIMARY KEY,user_id UUID,operation TEXT NOT NULL,outcome TEXT NOT NULL,code TEXT NOT NULL,source TEXT NOT NULL,version TEXT,received_at TIMESTAMPTZ NOT NULL DEFAULT now());
        CREATE INDEX IF NOT EXISTS owner_diagnostics_time ON ${table('diagnostics')}(received_at DESC,event_id);
        CREATE TABLE IF NOT EXISTS ${table('audit')}(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id UUID,action TEXT NOT NULL,target_id UUID,reason TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
        CREATE INDEX IF NOT EXISTS owner_audit_time ON ${table('audit')}(created_at DESC,id DESC);
        CREATE TABLE IF NOT EXISTS ${table('request_buckets')}(hour TIMESTAMPTZ NOT NULL,route TEXT NOT NULL,method TEXT NOT NULL,status INTEGER NOT NULL,count INTEGER NOT NULL,total_ms DOUBLE PRECISION NOT NULL,auth_ms DOUBLE PRECISION NOT NULL,database_ms DOUBLE PRECISION NOT NULL,slow INTEGER NOT NULL,max_ms DOUBLE PRECISION NOT NULL,PRIMARY KEY(hour,route,method,status));
        CREATE TABLE IF NOT EXISTS ${table('state')}(singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK(singleton),tracking_since TIMESTAMPTZ NOT NULL DEFAULT now(),synced_at TIMESTAMPTZ,pruned_at TIMESTAMPTZ,schema_version INTEGER NOT NULL DEFAULT 1);
        ALTER TABLE ${table('state')} ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;
        INSERT INTO ${table('state')}(singleton) VALUES(true) ON CONFLICT DO NOTHING;`);
      // Defense in depth if this database is exposed through Supabase REST.
      for(const name of ['owners','erased_accounts','users','diagnostics','audit','request_buckets','state']){
        await client.query(`REVOKE ALL ON ${table(name)} FROM PUBLIC; ALTER TABLE ${table(name)} ENABLE ROW LEVEL SECURITY`);
        for(const role of ['anon','authenticated'])if((await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rowCount){
          await client.query(`REVOKE ALL ON SCHEMA "${schema}" FROM "${role}"; REVOKE ALL ON ${table(name)} FROM "${role}"`);
        }
      }
      });
    })().catch(error=>{initialized=null;throw error;});
    await initialized;
  }
  async function query(sql,args){await ensure();return pool.query(sql,args);}
  async function withAccount(id,work){
    await ensure();return transaction(pool,async client=>{
      await client.query('SELECT pg_advisory_xact_lock(71420624,hashtext($1))',[id]);return work(client);
    });
  }
  async function audit(actor,action,target=null,reason=null,client=null){
    await ensure();await (client||pool).query(`INSERT INTO ${table('audit')}(actor_id,action,target_id,reason) VALUES($1,$2,$3,$4)`,[actor,action,target,reason]);
  }
  async function isErased(id){
    if((await query(`SELECT 1 FROM ${table('erased_accounts')} WHERE user_id=$1`,[id])).rowCount)return true;
    const deletions=`"${workspacePrefix}control".deletions`;
    if(!(await query('SELECT to_regclass($1) AS exists',[deletions])).rows[0].exists)return false;
    return Boolean((await query(`SELECT 1 FROM ${deletions} WHERE user_id=$1`,[id])).rowCount);
  }
  async function observe(user){
    ownerId(user.id);
    await withAccount(user.id,client=>client.query(`INSERT INTO ${table('users')}(user_id,name,email,verified,created_at,profile_ready)
      SELECT $1,$2,$3,$4,$5,$6 WHERE NOT EXISTS(SELECT 1 FROM ${table('erased_accounts')} WHERE user_id=$1)
      ON CONFLICT(user_id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,verified=EXCLUDED.verified,created_at=COALESCE(EXCLUDED.created_at,${table('users')}.created_at),profile_ready=EXCLUDED.profile_ready`,[user.id,user.name||'',user.email||'',user.emailVerified===true,user.createdAt||null,Boolean(user.name)]));
  }
  const columns=`user_id AS id,name,verified,created_at AS "createdAt",profile_ready AS "profileReady",goal_ready AS "goalReady",onboarded,extension_acknowledged AS "extensionAcknowledged",last_active AS "lastActive",extension_version AS "extensionVersion",extension_seen AS "extensionSeen",problems,attempts,imported,first_save AS "firstSave",first_import AS "firstImport",summary_at AS "summaryAt",email`;
  function publicUser(row){if(!row)return null;const {email,...rest}=row;return {...rest,email:maskEmail(email)};}
  async function summary(id){
    if(await isErased(id))return;
    const workspace=workspaceSchema(id,workspacePrefix),qualified=name=>`"${workspace}".${name}`;
    const exists=(await query('SELECT to_regclass($1) AS exists',[qualified('recall_onboarding')])).rows[0].exists;
    if(!exists)return;
    // Counts only. No titles, notes, LeetCode usernames or attempt payloads leave the workspace.
    const row=(await pool.query(`SELECT o.completed,o.extension_acknowledged AS "extensionAcknowledged",
      EXISTS(SELECT 1 FROM ${qualified('workspace_goal')}) AS "goalReady",
      (SELECT count(*)::int FROM ${qualified('problems')}) AS problems,
      (SELECT count(*)::int FROM ${qualified('attempts')} WHERE deleted_at IS NULL) AS attempts,
      (SELECT count(*)::int FROM ${qualified('historical_solves')}) AS imported,
      (SELECT min(created_at) FROM ${qualified('attempts')} WHERE deleted_at IS NULL) AS "firstSave",
      (SELECT min(imported_at) FROM ${qualified('historical_solves')}) AS "firstImport"
      FROM ${qualified('recall_onboarding')} o WHERE singleton=true`)).rows[0];
    if(row)await query(`UPDATE ${table('users')} SET goal_ready=$2,onboarded=$3,extension_acknowledged=$4,problems=$5,attempts=$6,imported=$7,first_save=COALESCE(first_save,$8),first_import=COALESCE(first_import,$9),summary_at=now() WHERE user_id=$1`,[id,row.goalReady,row.completed,row.extensionAcknowledged,row.problems,row.attempts,row.imported,row.firstSave,row.firstImport]);
  }
  return {
    ensure,observe,summary,audit,isErased,
    async access(id){
      if(await isErased(id))return {enabled:false,permissions:[]};
      const row=(await query(`SELECT contact_access FROM ${table('owners')} WHERE user_id=$1 AND NOT EXISTS(SELECT 1 FROM ${table('erased_accounts')} WHERE user_id=$1)`,[id])).rows[0];
      return row?{enabled:true,permissions:[...OWNER_PERMISSIONS,...(row.contact_access?['contact:read']:[])]}:{enabled:false,permissions:[]};
    },
    async grant(id,{contact=false,reason='Owner access granted through server CLI.'}={}){
      ownerId(id);if(await isErased(id))throw new DomainError(400,'This account has been deleted.');
      await withAccount(id,async client=>{
        if((await client.query(`SELECT 1 FROM ${table('erased_accounts')} WHERE user_id=$1`,[id])).rowCount)throw new DomainError(400,'This account has been deleted.');
        await client.query(`INSERT INTO ${table('owners')}(user_id,contact_access) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET contact_access=EXCLUDED.contact_access`,[id,contact]);
        await audit(null,'owner.grant',id,reason,client);
      });
    },
    async revoke(id){ownerId(id);await ensure();await transaction(pool,async client=>{await client.query(`DELETE FROM ${table('owners')} WHERE user_id=$1`,[id]);await audit(null,'owner.revoke',id,'Owner access revoked through server CLI.',client);});},
    async forget(id){
      await withAccount(id,async client=>{
        await client.query(`INSERT INTO ${table('erased_accounts')}(user_id) VALUES($1) ON CONFLICT DO NOTHING`,[id]);
        await client.query(`DELETE FROM ${table('owners')} WHERE user_id=$1`,[id]);
        await client.query(`DELETE FROM ${table('users')} WHERE user_id=$1`,[id]);
        await client.query(`DELETE FROM ${table('diagnostics')} WHERE user_id=$1`,[id]);
        // Audit contains no email/name. Remove free-text support reasons for this account.
        await client.query(`UPDATE ${table('audit')} SET reason=NULL WHERE actor_id=$1 OR target_id=$1`,[id]);
      });
    },
    async active(id){await query(`UPDATE ${table('users')} SET last_active=now() WHERE user_id=$1`,[id]);},
    async connected(user,version){await observe(user);await query(`UPDATE ${table('users')} SET extension_seen=now(),extension_version=COALESCE($2,extension_version) WHERE user_id=$1`,[user.id,version||null]);},
    async diagnostic({eventId=randomUUID(),userId,operation,outcome='failure',code,source='server',version=null}){
      const insert=client=>client.query(`INSERT INTO ${table('diagnostics')}(event_id,user_id,operation,outcome,code,source,version) SELECT $1,$2,$3,$4,$5,$6,$7 WHERE NOT EXISTS(SELECT 1 FROM ${table('erased_accounts')} WHERE user_id=$2) ON CONFLICT DO NOTHING`,[eventId,userId||null,operation,outcome,code,source,version]);
      if(userId)await withAccount(userId,insert);else{await ensure();await insert(pool);}
    },
    async saveMetrics(rows){
      if(!rows.length)return;
      const values=rows.map(row=>({hour:row.hour,route:row.route,method:row.method,status:row.status,count:row.count,total_ms:row.total,auth_ms:row.auth,database_ms:row.database,slow:row.slow,max_ms:row.max}));
      await query(`INSERT INTO ${table('request_buckets')}(hour,route,method,status,count,total_ms,auth_ms,database_ms,slow,max_ms)
        SELECT * FROM jsonb_to_recordset($1::jsonb) AS b(hour TIMESTAMPTZ,route TEXT,method TEXT,status INTEGER,count INTEGER,total_ms DOUBLE PRECISION,auth_ms DOUBLE PRECISION,database_ms DOUBLE PRECISION,slow INTEGER,max_ms DOUBLE PRECISION)
        ON CONFLICT(hour,route,method,status) DO UPDATE SET count=${table('request_buckets')}.count+EXCLUDED.count,total_ms=${table('request_buckets')}.total_ms+EXCLUDED.total_ms,auth_ms=${table('request_buckets')}.auth_ms+EXCLUDED.auth_ms,database_ms=${table('request_buckets')}.database_ms+EXCLUDED.database_ms,slow=${table('request_buckets')}.slow+EXCLUDED.slow,max_ms=GREATEST(${table('request_buckets')}.max_ms,EXCLUDED.max_ms)`,[JSON.stringify(values)]);
    },
    async overview(){
      const totals=(await query(`SELECT count(*)::int AS registered,count(*) FILTER(WHERE verified)::int AS verified,count(*) FILTER(WHERE profile_ready)::int AS profiles,count(*) FILTER(WHERE goal_ready)::int AS goals,count(*) FILTER(WHERE onboarded)::int AS onboarded,count(*) FILTER(WHERE extension_seen IS NOT NULL)::int AS connected,count(*) FILTER(WHERE first_save IS NOT NULL)::int AS saved,count(*) FILTER(WHERE first_import IS NOT NULL)::int AS imported,count(*) FILTER(WHERE last_active>=now()-interval '7 days')::int AS active FROM ${table('users')}`)).rows[0];
      const daily=(await query(`SELECT to_char(day,'YYYY-MM-DD') AS day,count(u.user_id)::int AS signups FROM generate_series(((now() AT TIME ZONE 'UTC')::date-13)::timestamp,((now() AT TIME ZONE 'UTC')::date)::timestamp,interval '1 day') AS day LEFT JOIN ${table('users')} u ON u.created_at AT TIME ZONE 'UTC'>=day AND u.created_at AT TIME ZONE 'UTC'<day+interval '1 day' GROUP BY day ORDER BY day`)).rows;
      return {totals,daily,...(await query(`SELECT tracking_since AS "trackingSince",synced_at AS "syncedAt" FROM ${table('state')}`)).rows[0]};
    },
    async users({limit,offset,q,status}){
      const escaped=q.replace(/[\\%_]/g,'\\$&');
      const where=`($1='' OR name ILIKE $2 OR user_id::text ILIKE $2 OR email ILIKE $2) AND ($3='all' OR $3='setup-pending' AND NOT onboarded OR $3='connected' AND extension_seen IS NOT NULL OR $3='active' AND last_active>=now()-interval '7 days')`;
      const args=[q,`%${escaped}%`,status];
      const users=(await query(`SELECT ${columns} FROM ${table('users')} WHERE ${where} ORDER BY created_at DESC NULLS LAST,user_id LIMIT $4 OFFSET $5`,[...args,limit,offset])).rows.map(publicUser);
      const total=(await query(`SELECT count(*)::int AS total FROM ${table('users')} WHERE ${where}`,args)).rows[0].total;
      return {users,total,limit,offset};
    },
    async user(id){const row=publicUser((await query(`SELECT ${columns} FROM ${table('users')} WHERE user_id=$1`,[id])).rows[0]);if(!row)throw new DomainError(404,'Account summary not found.');return row;},
    async contact(actor,id,reason){
      await ensure();return transaction(pool,async client=>{
        if(!(await client.query(`SELECT 1 FROM ${table('owners')} WHERE user_id=$1 AND contact_access=true FOR SHARE`,[actor])).rowCount)throw new DomainError(403,'Contact access is not enabled for this owner.');
        const row=(await client.query(`SELECT email FROM ${table('users')} WHERE user_id=$1 FOR SHARE`,[id])).rows[0];if(!row)throw new DomainError(404,'Account summary not found.');
        await audit(actor,'user.contact_reveal',id,reason,client);return {email:row.email};
      });
    },
    async diagnostics({limit,offset}){
      const events=(await query(`SELECT event_id AS id,user_id AS "userId",operation,outcome,code,source,version,received_at AS "receivedAt" FROM ${table('diagnostics')} ORDER BY received_at DESC,event_id DESC LIMIT $1 OFFSET $2`,[limit,offset])).rows;
      const totals=(await query(`SELECT operation,outcome,source,count(*)::int AS count FROM ${table('diagnostics')} WHERE received_at>=now()-interval '7 days' GROUP BY operation,outcome,source ORDER BY operation,outcome,source`)).rows;
      const versions=(await query(`SELECT COALESCE(extension_version,'Unknown') AS version,count(*)::int AS users,max(extension_seen) AS "lastSeen" FROM ${table('users')} WHERE extension_seen IS NOT NULL GROUP BY extension_version ORDER BY users DESC`)).rows;
      const total=(await query(`SELECT count(*)::int AS total FROM ${table('diagnostics')}`)).rows[0].total;return {events,totals,versions,total,limit,offset};
    },
    async health(){
      const started=performance.now();await query('SELECT 1');const databaseMs=Math.round(performance.now()-started);
      const routes=(await query(`SELECT route,method,sum(count)::int AS requests,sum(count) FILTER(WHERE status>=500)::int AS errors,sum(count) FILTER(WHERE status=499)::int AS aborted,sum(slow)::int AS slow,round((sum(total_ms)/sum(count))::numeric)::int AS "averageMs",round((sum(auth_ms)/sum(count))::numeric)::int AS "authMs",round((sum(database_ms)/sum(count))::numeric)::int AS "databaseMs",round(max(max_ms)::numeric)::int AS "maxMs" FROM ${table('request_buckets')} WHERE hour>=now()-interval '24 hours' GROUP BY route,method ORDER BY requests DESC`)).rows;
      const hourly=(await query(`SELECT hour,sum(count)::int AS requests,COALESCE(sum(count) FILTER(WHERE status>=500),0)::int AS errors,round((sum(total_ms)/sum(count))::numeric)::int AS "averageMs" FROM ${table('request_buckets')} WHERE hour>=now()-interval '24 hours' GROUP BY hour ORDER BY hour`)).rows;
      return {database:{status:'connected',latencyMs:databaseMs,pool:{total:pool.totalCount??null,idle:pool.idleCount??null,waiting:pool.waitingCount??null}},routes,hourly,uptimeSeconds:Math.floor(process.uptime())};
    },
    async activity({limit,offset}){
      const events=(await query(`SELECT id,actor_id AS "actorId",action,target_id AS "targetId",reason,created_at AS "createdAt" FROM ${table('audit')} ORDER BY created_at DESC,id DESC LIMIT $1 OFFSET $2`,[limit,offset])).rows;
      const total=(await query(`SELECT count(*)::int AS total FROM ${table('audit')}`)).rows[0].total;return {events,total,limit,offset};
    },
    async synchronized(){await query(`UPDATE ${table('state')} SET synced_at=now()`);},
    async prune(){
      await ensure();await transaction(pool,async client=>{
        const claimed=await client.query(`UPDATE ${table('state')} SET pruned_at=now() WHERE pruned_at IS NULL OR pruned_at<now()-interval '1 day' RETURNING singleton`);if(!claimed.rowCount)return;
        await client.query(`DELETE FROM ${table('diagnostics')} WHERE received_at<now()-interval '30 days'; DELETE FROM ${table('request_buckets')} WHERE hour<now()-interval '30 days'; DELETE FROM ${table('audit')} WHERE created_at<now()-interval '90 days'`);
      });
    },
  };
}
