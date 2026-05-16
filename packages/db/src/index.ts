// MSSQL schemas
export * from './schemas/mssql';

// PostgreSQL schemas
export * from './schemas/postgres';

// DB clients
export { getMssqlDb, getMssqlPool, type MssqlDb } from './client/mssql';
export { getPostgresDb, type PostgresDb } from './client/postgres';

// Re-export drizzle query helpers so consumers don't need drizzle-orm as a direct dep
export {
  eq, ne, and, or, not,
  gt, gte, lt, lte,
  isNull, isNotNull,
  inArray, notInArray,
  count, sum, avg, max, min,
  asc, desc,
  sql,
} from 'drizzle-orm';
