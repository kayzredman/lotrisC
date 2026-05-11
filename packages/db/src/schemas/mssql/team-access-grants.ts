import { mssqlTable, varchar, datetime2, index, uniqueIndex } from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { users } from './users';
import { teams } from './teams';

/**
 * team_access_grants — allows a Team Lead (grantee) to view tickets
 * belonging to a team other than their own (target_team).
 * Granted and revoked by ADMIN or SUPERADMIN.
 */
export const teamAccessGrants = mssqlTable(
  'TeamAccessGrants',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    granteeUserId: varchar('grantee_user_id', { length: 36 }).notNull().references(() => users.id),
    targetTeamId: varchar('target_team_id', { length: 36 }).notNull().references(() => teams.id),
    grantedBy: varchar('granted_by', { length: 36 }).notNull().references(() => users.id),
    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_tag_tenant').on(table.tenantId),
    granteeIdx: index('idx_tag_grantee').on(table.granteeUserId),
    targetIdx: index('idx_tag_target_team').on(table.targetTeamId),
    // One grant per grantee per team
    uniqueGrant: uniqueIndex('uq_tag_grantee_team').on(table.granteeUserId, table.targetTeamId),
  }),
);

export type TeamAccessGrant = typeof teamAccessGrants.$inferSelect;
export type NewTeamAccessGrant = typeof teamAccessGrants.$inferInsert;
