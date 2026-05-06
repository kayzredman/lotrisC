import { pgTable, varchar, integer, decimal, timestamp, date, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Daily SLA compliance summary per tenant.
 * Written by ETL worker; one row per (tenantId, date).
 */
export const analyticsSlaDaily = pgTable(
  'analytics_sla_daily',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    date: date('date').notNull(),
    totalTickets: integer('total_tickets').notNull().default(0),
    pickupBreaches: integer('pickup_breaches').notNull().default(0),
    resolutionBreaches: integer('resolution_breaches').notNull().default(0),
    compliancePct: decimal('compliance_pct', { precision: 6, scale: 2 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqTenantDate: uniqueIndex('IX_ASD_TenantDate').on(t.tenantId, t.date),
  }),
);

export type AnalyticsSlaDaily = typeof analyticsSlaDaily.$inferSelect;
export type NewAnalyticsSlaDaily = typeof analyticsSlaDaily.$inferInsert;
