import pg from 'pg';
import { reportDatabaseFailure } from './database-diagnostics.js';
export function databaseOptions(connectionString,env=process.env){
  let url;try{url=new URL(connectionString);}catch{throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');}
  if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
  if(url.hostname.endsWith('.pooler.supabase.com')&&url.port==='6543')throw new Error('Use the Supabase session pooler on port 5432. Transaction pooling cannot preserve Recall workspace isolation.');
  const encrypted=env.DEPLOYMENT_MODE==='hosted'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(encrypted){
    for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])url.searchParams.delete(key);
    return {connectionString:url.href,ssl:{rejectUnauthorized:true,...(env.DATABASE_CA_CERT?{ca:env.DATABASE_CA_CERT.replaceAll('\\n','\n')}:{})}};
  }
  return {connectionString};
}

// No connection is opened by importing this module.
export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw Object.assign(new Error('Set DATABASE_URL in apps/api/.env before checking PostgreSQL.'),{code:'DATABASE_URL_MISSING'});
  const pool = new pg.Pool({ ...databaseOptions(connectionString), max: 5, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
  pool.on('error', (error) => reportDatabaseFailure(error,'idle'));
  return pool;
}
