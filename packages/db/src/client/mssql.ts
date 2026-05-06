import { drizzle } from 'drizzle-orm/mssql2';
import sql from 'mssql';
import { getEnv } from '@lotris/config';
import * as mssqlSchema from '../schemas/mssql';

let _pool: sql.ConnectionPool | null = null;

async function getPool(): Promise<sql.ConnectionPool> {
  if (!_pool) {
    _pool = await sql.connect(getEnv().DATABASE_URL_MSSQL);
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
