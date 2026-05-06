import { pgTable, varchar, integer, decimal, timestamp, date, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Daily rollup of ticket activity per tenant + date.
 * Written by ETL worker on ticket status changes.
 */
export const analyticsTicketDaily = pgTable(
  'analytics_ticket_daily',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    date: date('date').notNull(),
    totalCreated: integer('total_created').notNull().default(0),
    totalResolved: integer('total_resolved').notNull().default(0),
    totalEscalated: integer('total_escalated').notNull().default(0),
    totalOpen: integer('total_open').notNull().default(0),
    slaBreachCount: integer('sla_breach_count').notNull().default(0),
    avgResolutionHours: decimal('avg_resolution_hours', { precision: 10, scale: 2 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqTenantDate: uniqueIndex('IX_AtD_TenantDate').on(t.tenantId, t.date),
  }),
);

export type AnalyticsTicketDaily = typeof analyticsTicketDaily.$inferSelect;
export type NewAnalyticsTicketDaily = typeof analyticsTicketDaily.$inferInsert;
