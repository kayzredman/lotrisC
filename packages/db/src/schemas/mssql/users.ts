import { mssqlTable, varchar, int, bit, datetime2, nvarchar, index } from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { teams } from './teams';
import { roles } from './roles';

export const users = mssqlTable(
  'Users',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull(),
    fullName: nvarchar('full_name', { length: 255 }).notNull(),
    roleId: int('role_id').notNull().references(() => roles.id),
    teamId: varchar('team_id', { length: 36 }).references(() => teams.id),
    isActive: bit('is_active').notNull().default(1),
    isUnavailable: bit('is_unavailable').notNull().default(0),
    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
    updatedAt: datetime2('updated_at', { precision: 3 }).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_users_tenant').on(table.tenantId),
    tenantRoleIdx: index('idx_users_tenant_role').on(table.tenantId, table.roleId),
    tenantTeamIdx: index('idx_users_tenant_team').on(table.tenantId, table.teamId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
