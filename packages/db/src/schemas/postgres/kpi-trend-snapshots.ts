import { pgTable, uuid, varchar, numeric, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * KPI trend snapshot per engineer per metric per period.
 * Written by the kpi-trend BullMQ worker every 30 minutes.
 * Used for sparklines and amber/red flag projection in the KPI dashboard.
 */
export const kpiTrendSnapshots = pgTable(
  'kpi_trend_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    engineerId: uuid('engineer_id').notNull(),
    kpiDefId: uuid('kpi_def_id').notNull(),
    periodKey: varchar('period_key', { length: 20 }).notNull(), // e.g. '2026-Q2'
    snapshotAt: timestamp('snapshot_at', { withTimezone: true }).defaultNow().notNull(),
    actualToDate: numeric('actual_to_date', { precision: 10, scale: 4 }),
    projectedEop: numeric('projected_eop', { precision: 10, scale: 4 }),
    target: numeric('target', { precision: 10, scale: 4 }),
    warningLevel: varchar('warning_level', { length: 10 }).notNull().default('NONE'),
  },
  (t) => ({
    lookupIdx: index('idx_kpi_trend_lookup').on(t.tenantId, t.engineerId, t.kpiDefId, t.periodKey),
    warningIdx: index('idx_kpi_trend_warning').on(t.tenantId, t.periodKey, t.warningLevel),
  }),
);

export type KpiTrendSnapshot = typeof kpiTrendSnapshots.$inferSelect;
export type NewKpiTrendSnapshot = typeof kpiTrendSnapshots.$inferInsert;
