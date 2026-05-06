import {
  mssqlTable,
  varchar,
  decimal,
  nvarchar,
  datetime2,
  index,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { users } from './users';
import { kpiAgreementMetrics } from './kpi-agreement-metrics';
import { kpiDefinitions } from './kpi-definitions';

/**
 * KPI_Actuals — individual data points recorded against a metric in an agreement.
 *
 * source: TICKET_RESOLVE | TASK_COMPLETE | MANUAL
 *
 * For TICKET_RESOLVE: sourceRefId = ticket.id
 * For TASK_COMPLETE:  sourceRefId = task.id
 * For MANUAL:         sourceRefId = null
 */
export const kpiActuals = mssqlTable(
  'KPI_Actuals',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    engineerId: varchar('engineer_id', { length: 36 }).notNull().references(() => users.id),
    metricId: varchar('metric_id', { length: 36 }).notNull().references(() => kpiAgreementMetrics.id),
    kpiDefinitionId: varchar('kpi_definition_id', { length: 36 }).references(() => kpiDefinitions.id),

    value: decimal('value', { precision: 10, scale: 2 }).notNull(),
    source: varchar('source', { length: 30 }).notNull().default('MANUAL'),
    sourceRefId: varchar('source_ref_id', { length: 36 }), // ticket.id or task.id

    note: nvarchar('note', { length: 1000 }),

    recordedAt: datetime2('recorded_at', { precision: 3 }).notNull(),
  },
  (t) => ({
    tenantIdx: index('IX_KpiActuals_Tenant').on(t.tenantId),
    engineerIdx: index('IX_KpiActuals_Engineer').on(t.engineerId),
    metricIdx: index('IX_KpiActuals_Metric').on(t.metricId),
  }),
);

export type KpiActual = typeof kpiActuals.$inferSelect;
export type NewKpiActual = typeof kpiActuals.$inferInsert;
