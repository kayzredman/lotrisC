import { pgTable, varchar, decimal, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Latest KPI summary per agreement period, per engineer.
 * Synced from kpi_results by ETL worker after each compute.
 */
export const analyticsKpiSummary = pgTable(
  'analytics_kpi_summary',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    engineerId: varchar('engineer_id', { length: 36 }).notNull(),
    periodKey: varchar('period_key', { length: 20 }).notNull(),
    overallScore: decimal('overall_score', { precision: 6, scale: 2 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqEngineerPeriod: uniqueIndex('IX_AKS_EngineerPeriod').on(t.tenantId, t.engineerId, t.periodKey),
  }),
);

export type AnalyticsKpiSummary = typeof analyticsKpiSummary.$inferSelect;
export type NewAnalyticsKpiSummary = typeof analyticsKpiSummary.$inferInsert;
