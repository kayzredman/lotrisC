import {
  mssqlTable,
  varchar,
  int,
  datetime2,
  index,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { teams } from './teams';

/**
 * Per-tenant (and optionally per-team) SLA configuration.
 * teamId = NULL → tenant-level default.
 * teamId set → overrides default for that team.
 */
export const slaConfigs = mssqlTable(
  'SLA_Configs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    teamId: varchar('team_id', { length: 36 }).references(() => teams.id),

    /** Minutes before pickup SLA is considered breached */
    pickupSlaMinutes: int('pickup_sla_minutes').notNull().default(30),

    /** Minutes from assignment before resolution SLA is breached */
    resolutionSlaMinutes: int('resolution_sla_minutes').notNull().default(240), // 4 hours

    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
    updatedAt: datetime2('updated_at', { precision: 3 }).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_sla_configs_tenant').on(table.tenantId),
    tenantTeamIdx: index('idx_sla_configs_tenant_team').on(table.tenantId, table.teamId),
  }),
);

export type SlaConfig = typeof slaConfigs.$inferSelect;
export type NewSlaConfig = typeof slaConfigs.$inferInsert;
