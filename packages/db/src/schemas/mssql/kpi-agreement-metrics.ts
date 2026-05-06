import {
  mssqlTable,
  varchar,
  int,
  decimal,
  nvarchar,
  index,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { kpiAgreementAreas } from './kpi-agreement-areas';
import { kpiDefinitions } from './kpi-definitions';

/**
 * KPI_Agreement_Metrics — individual metric rows within a KPI area.
 *
 * measurementPeriod: MONTHLY | QUARTERLY | ANNUALLY
 *
 * Weights across all metrics in an area should total 100.
 * actualScore is populated by the actuals-ingestion service (auto or manual).
 */
export const kpiAgreementMetrics = mssqlTable(
  'KPI_Agreement_Metrics',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    areaId: varchar('area_id', { length: 36 }).notNull().references(() => kpiAgreementAreas.id),

    // Optional link to a global KPI definition (null for custom narrative rows)
    kpiDefinitionId: varchar('kpi_definition_id', { length: 36 }).references(() => kpiDefinitions.id),

    description: nvarchar('description', { length: 2000 }).notNull(),
    measurementPeriod: varchar('measurement_period', { length: 20 }).notNull().default('MONTHLY'),

    weight: decimal('weight', { precision: 5, scale: 2 }).notNull(),
    targetScore: decimal('target_score', { precision: 10, scale: 2 }).notNull(),
    actualScore: decimal('actual_score', { precision: 10, scale: 2 }),

    sortOrder: int('sort_order').notNull().default(0),
  },
  (t) => ({
    areaIdx: index('IX_KpiAgreementMetrics_Area').on(t.areaId),
    definitionIdx: index('IX_KpiAgreementMetrics_Definition').on(t.kpiDefinitionId),
  }),
);

export type KpiAgreementMetric = typeof kpiAgreementMetrics.$inferSelect;
export type NewKpiAgreementMetric = typeof kpiAgreementMetrics.$inferInsert;
