import { drizzle } from 'drizzle-orm/mssql2';
import sql from 'mssql';
import { getEnv } from '@lotris/config';
import * as mssqlSchema from '../schemas/mssql';

let _pool: sql.ConnectionPool | null = null;

/**
 * Parse a mssql:// URL safely, handling '@' inside the password.
 * mssql v11 uses config objects, not URL strings.
 */
function parseMssqlUrl(urlStr: string): sql.config {
  // Strip the scheme
  const withoutScheme = urlStr.replace(/^mssql:\/\//, '');
  // Split at the LAST '@' to correctly handle '@' in passwords
  const lastAt = withoutScheme.lastIndexOf('@');
  const credentials = withoutScheme.substring(0, lastAt);
  const hostPart    = withoutScheme.substring(lastAt + 1);

  const colonInCreds = credentials.indexOf(':');
  const user     = credentials.substring(0, colonInCreds);
  const password = credentials.substring(colonInCreds + 1);

  const [hostPort, database] = hostPart.split('/');
  const [server, portStr]    = hostPort.split(':');

  return {
    server,
    port:     portStr ? parseInt(portStr, 10) : 1433,
    database: database ?? 'master',
    user,
    password,
    options:  { trustServerCertificate: true, encrypt: false },
  };
}

async function getPool(): Promise<sql.ConnectionPool> {
  if (!_pool) {
    _pool = await sql.connect(parseMssqlUrl(getEnv().DATABASE_URL_MSSQL));
  }
  return _pool;
}

/**
 * Returns a Drizzle MSSQL database instance.
 * The pool is created lazily and reused across calls.
 *
 * INVARIANT: Every query using this client MUST include a tenantId filter.
 */
export async function getMssqlDb() {
  const pool = await getPool();
  return drizzle(pool, { schema: mssqlSchema });
}

export type MssqlDb = Awaited<ReturnType<typeof getMssqlDb>>;
