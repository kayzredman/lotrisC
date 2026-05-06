import { pgTable, varchar, integer, decimal, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Per-engineer performance snapshot for a given week (ISO week key: "2026-W18").
 * Written by ETL worker on resolve/task-complete events.
 */
export const analyticsEngineerPerf = pgTable(
  'analytics_engineer_perf',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    engineerId: varchar('engineer_id', { length: 36 }).notNull(),
    weekKey: varchar('week_key', { length: 10 }).notNull(), // e.g. "2026-W18"
    ticketsResolved: integer('tickets_resolved').notNull().default(0),
    tasksCompleted: integer('tasks_completed').notNull().default(0),
    slaBreaches: integer('sla_breaches').notNull().default(0),
    avgResolutionHours: decimal('avg_resolution_hours', { precision: 10, scale: 2 }),
    kpiScore: decimal('kpi_score', { precision: 6, scale: 2 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqEngineerWeek: uniqueIndex('IX_AEP_EngineerWeek').on(t.tenantId, t.engineerId, t.weekKey),
  }),
);

export type AnalyticsEngineerPerf = typeof analyticsEngineerPerf.$inferSelect;
export type NewAnalyticsEngineerPerf = typeof analyticsEngineerPerf.$inferInsert;
