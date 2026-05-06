import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getEnv } from '@lotris/config';
import * as postgresSchema from '../schemas/postgres';

let _client: postgres.Sql | null = null;

function getClient(): postgres.Sql {
  if (!_client) {
    _client = postgres(getEnv().DATABASE_URL_POSTGRES, {
      max: 10,
      idle_timeout: 20,
    });
  }
  return _client;
}

/**
 * Returns a Drizzle PostgreSQL database instance (analytics DB — read-only from API).
 * Write path is the ETL worker only.
 */
export function getPostgresDb() {
  return drizzle(getClient(), { schema: postgresSchema });
}

export type PostgresDb = ReturnType<typeof getPostgresDb>;
