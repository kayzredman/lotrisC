import { drizzle } from 'drizzle-orm/mssql2';
import sql from 'mssql';
import { getEnv } from '@lotris/config';
import * as mssqlSchema from '../schemas/mssql';

let _pool: sql.ConnectionPool | null = null;

/**
 * Parse a mssql:// or sqlserver:// URL safely, handling '@' inside the password
 * and semicolon-separated params (sqlserver:// format).
 * mssql v11 uses config objects, not URL strings.
 */
function parseMssqlUrl(urlStr: string): sql.config {
  // Strip scheme — supports both mssql:// and sqlserver://
  const withoutScheme = urlStr.replace(/^(mssql|sqlserver):\/\//, '');
  // Split at the LAST '@' to correctly handle '@' in passwords
  const lastAt = withoutScheme.lastIndexOf('@');
  const credentials = withoutScheme.substring(0, lastAt);
  const hostPart    = withoutScheme.substring(lastAt + 1);

  const colonInCreds = credentials.indexOf(':');
  const user     = decodeURIComponent(credentials.substring(0, colonInCreds));
  const password = decodeURIComponent(credentials.substring(colonInCreds + 1));

  let server: string;
  let port: number;
  let database: string;

  if (hostPart.includes(';')) {
    // sqlserver:// semicolon-param format: host:port;database=x;...
    const parts = hostPart.split(';');
    const hostSection = parts[0] ?? '';
    const params = parts.slice(1);
    const colonIdx = hostSection.indexOf(':');
    server   = colonIdx >= 0 ? hostSection.substring(0, colonIdx) : hostSection;
    port     = colonIdx >= 0 ? parseInt(hostSection.substring(colonIdx + 1), 10) : 1433;
    const dbParam = params.find(p => p.toLowerCase().startsWith('database='));
    database = dbParam ? (dbParam.split('=')[1] ?? 'master') : 'master';
  } else {
    // mssql:// slash format: host:port/database
    const slashIdx = hostPart.indexOf('/');
    const hostPort = slashIdx >= 0 ? hostPart.substring(0, slashIdx) : hostPart;
    database       = slashIdx >= 0 ? hostPart.substring(slashIdx + 1) : 'master';
    const colonIdx = hostPort.indexOf(':');
    server   = colonIdx >= 0 ? hostPort.substring(0, colonIdx) : hostPort;
    port     = colonIdx >= 0 ? parseInt(hostPort.substring(colonIdx + 1), 10) : 1433;
  }

  return {
    server,
    port,
    database,
    user,
    password,
    options: { trustServerCertificate: true, encrypt: false },
  };
}

async function getPool(): Promise<sql.ConnectionPool> {
  if (!_pool) {
    _pool = await sql.connect(parseMssqlUrl(getEnv().DATABASE_URL_MSSQL));
  }
  return _pool;
}

export async function getMssqlPool(): Promise<sql.ConnectionPool> {
  return getPool();
}

export async function getMssqlDb() {
  const pool = await getPool();
  return drizzle(pool, { schema: mssqlSchema });
}

export type MssqlDb = Awaited<ReturnType<typeof getMssqlDb>>;
