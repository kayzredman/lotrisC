import {
  mssqlTable,
  varchar,
  decimal,
  index,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { teams } from './teams';
import { kpiDefinitions } from './kpi-definitions';

/**
 * KPI_Team_Targets — per-team overrides on a KPI definition's default target.
 * When a row exists here, it takes precedence over kpi_definitions.default_target
 * for engineers in that team.
 */
export const kpiTeamTargets = mssqlTable(
  'KPI_Team_Targets',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    kpiDefinitionId: varchar('kpi_definition_id', { length: 36 }).notNull().references(() => kpiDefinitions.id),
    teamId: varchar('team_id', { length: 36 }).notNull().references(() => teams.id),

    targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
  },
  (t) => ({
    tenantIdx: index('IX_KpiTeamTargets_Tenant').on(t.tenantId),
    uniqueIdx: index('IX_KpiTeamTargets_DefTeam').on(t.kpiDefinitionId, t.teamId),
  }),
);

export type KpiTeamTarget = typeof kpiTeamTargets.$inferSelect;
export type NewKpiTeamTarget = typeof kpiTeamTargets.$inferInsert;
