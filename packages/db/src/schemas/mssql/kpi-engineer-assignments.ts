import {
  mssqlTable,
  varchar,
  decimal,
  datetime2,
  index,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { users } from './users';
import { kpiDefinitions } from './kpi-definitions';

/**
 * KPI_Engineer_Assignments — which KPIs are active for an engineer in a review period,
 * with optional individual target overrides set by the Team Lead.
 *
 * measurementPeriod: MONTHLY | QUARTERLY | ANNUALLY
 */
export const kpiEngineerAssignments = mssqlTable(
  'KPI_Engineer_Assignments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    engineerId: varchar('engineer_id', { length: 36 }).notNull().references(() => users.id),
    kpiDefinitionId: varchar('kpi_definition_id', { length: 36 }).notNull().references(() => kpiDefinitions.id),

    // Review period, e.g. "2026-Q2" or "2026-05"
    periodKey: varchar('period_key', { length: 20 }).notNull(),
    measurementPeriod: varchar('measurement_period', { length: 20 }).notNull().default('MONTHLY'),

    // Override; null = use team target or definition default
    targetOverride: decimal('target_override', { precision: 10, scale: 2 }),

    assignedBy: varchar('assigned_by', { length: 36 }).notNull().references(() => users.id),
    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
  },
  (t) => ({
    tenantIdx: index('IX_KpiEngAssign_Tenant').on(t.tenantId),
    engineerPeriodIdx: index('IX_KpiEngAssign_EngineerPeriod').on(t.engineerId, t.periodKey),
    defPeriodIdx: index('IX_KpiEngAssign_DefPeriod').on(t.kpiDefinitionId, t.periodKey),
  }),
);

export type KpiEngineerAssignment = typeof kpiEngineerAssignments.$inferSelect;
export type NewKpiEngineerAssignment = typeof kpiEngineerAssignments.$inferInsert;
