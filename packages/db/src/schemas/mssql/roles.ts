import { mssqlTable, int, varchar } from 'drizzle-orm/mssql-core';

export const roles = mssqlTable('Roles', {
  id: int('id').primaryKey().identity(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  // SUPERADMIN | ADMIN | IT_MANAGER | TEAM_LEAD | ENGINEER | EXECUTIVE
});

export type Role = typeof roles.$inferSelect;
