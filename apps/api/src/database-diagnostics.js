// Only fixed descriptions reach logs. PostgreSQL errors can contain credentials,
// SQL, or account identifiers, so never print the original error here.
const failures = {
  DATABASE_URL_MISSING: ['configuration', 'Set DATABASE_URL to the database connection string.'],
  '28P01': ['credentials', 'Check the database password, URL encoding, and pooler username in DATABASE_URL.'],
  '28000': ['credentials', 'Check the database credentials and project access.'],
  ECONNREFUSED: ['connection', 'Check the database host and port; hosted DATABASE_URL must not point to localhost.'],
  ECONNRESET: ['connection', 'Check database availability and network access.'],
  ENOTFOUND: ['hostname', 'Copy the exact database hostname from Supabase Connect.'],
  EAI_AGAIN: ['hostname', 'Database DNS lookup failed; check the hostname and retry.'],
  ENETUNREACH: ['network', 'Check network access; use the Supabase session pooler on port 5432 for IPv4.'],
  EHOSTUNREACH: ['network', 'Check database network access and restrictions.'],
  ETIMEDOUT: ['timeout', 'Check database availability, network restrictions, and the pooler endpoint.'],
  '3D000': ['database', 'Check the database name in DATABASE_URL.'],
  '57P01': ['connection', 'The database is restarting or shutting down; retry when it is available.'],
  '53300': ['connections', 'Check the database connection limit and existing clients.'],
  '42501': ['permissions', 'The database role needs permission to create Recall schemas and tables.'],
  '42P01': ['schema', 'Check workspace migrations and database schema configuration.'],
  '42703': ['schema', 'Check workspace migrations and database schema configuration.'],
  SELF_SIGNED_CERT_IN_CHAIN: ['certificate', 'Set DATABASE_CA_CERT to the complete database CA certificate; keep TLS verification enabled.'],
  DEPTH_ZERO_SELF_SIGNED_CERT: ['certificate', 'Set DATABASE_CA_CERT to the complete database CA certificate; keep TLS verification enabled.'],
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: ['certificate', 'Check DATABASE_CA_CERT against the database certificate chain.'],
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: ['certificate', 'Check DATABASE_CA_CERT against the database certificate chain.'],
  CERT_HAS_EXPIRED: ['certificate', 'Check the database certificate validity and configured CA certificate.'],
  ERR_TLS_CERT_ALTNAME_INVALID: ['certificate', 'Check that DATABASE_URL uses the correct database hostname.'],
};

export function databaseFailure(error) {
  // AggregateError and wrapped errors may carry the useful code in a child.
  const pending = [error], visited = new Set();
  let timedOut = false;
  while (pending.length && visited.size < 20) {
    const current = pending.shift();
    if (!current || typeof current !== 'object' || visited.has(current)) continue;
    visited.add(current);
    if (Object.hasOwn(failures, current.code)) {
      const [reason, action] = failures[current.code];
      return {code: current.code, reason, action};
    }
    if (typeof current.message === 'string' && /tenant or user not found/i.test(current.message)) {
      return {code: 'POOLER_IDENTITY', reason: 'credentials', action: 'Copy the session pooler hostname and postgres.PROJECT_REF username from this project’s Supabase Connect dialog.'};
    }
    if (typeof current.message === 'string' && /timeout|Connection terminated/i.test(current.message)) timedOut = true;
    pending.push(current.cause);
    if (Array.isArray(current.errors)) pending.push(...current.errors.slice(0, 20));
  }
  return timedOut ? {code: 'ETIMEDOUT', reason: failures.ETIMEDOUT[0], action: failures.ETIMEDOUT[1]} : null;
}

export function reportDatabaseFailure(error, context = 'request') {
  const failure = databaseFailure(error);
  const location = ['request', 'startup', 'recovery', 'idle', 'check'].includes(context) ? context : 'request';
  console.error(`Recall database ${location} failed [${failure?.code || 'UNKNOWN'}]: ${failure?.action || 'Check DATABASE_URL, DATABASE_CA_CERT, and database availability.'}`);
}

export async function checkDatabaseConnection(pool, {context = 'startup', report = reportDatabaseFailure, log = console.log} = {}) {
  try {
    await pool.query('SELECT 1 AS connected');
    log('Recall database connection OK.');
    return true;
  } catch (error) {
    report(error, context);
    return false;
  }
}
