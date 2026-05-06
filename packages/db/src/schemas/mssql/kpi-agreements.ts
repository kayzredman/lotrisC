import {
  mssqlTable,
  varchar,
  datetime2,
  index,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { users } from './users';

/**
 * KPI_Agreements — one agreement per engineer per review period.
 *
 * status: DRAFT → PENDING_REVIEW → ACTIVE → CLOSED
 *
 * Sign-off flow:
 *   1. Team Lead creates (DRAFT), adds areas + metric rows.
 *   2. Lead submits → PENDING_REVIEW; engineer is notified.
 *   3. Engineer accepts → ACTIVE; period tracking begins.
 *   4. At period end, scoring closes it → CLOSED.
 */
export const kpiAgreements = mssqlTable(
  'KPI_Agreements',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    engineerId: varchar('engineer_id', { length: 36 }).notNull().references(() => users.id),
    leadId: varchar('lead_id', { length: 36 }).notNull().references(() => users.id),

    periodKey: varchar('period_key', { length: 20 }).notNull(), // e.g. "2026-Q2"
    status: varchar('status', { length: 20 }).notNull().default('DRAFT'),

    submittedAt: datetime2('submitted_at', { precision: 3 }),
    acceptedAt: datetime2('accepted_at', { precision: 3 }),
    closedAt: datetime2('closed_at', { precision: 3 }),
    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
    updatedAt: datetime2('updated_at', { precision: 3 }).notNull(),
  },
  (t) => ({
    tenantIdx: index('IX_KpiAgreements_Tenant').on(t.tenantId),
    engineerPeriodIdx: index('IX_KpiAgreements_EngineerPeriod').on(t.engineerId, t.periodKey),
  }),
);

export type KpiAgreement = typeof kpiAgreements.$inferSelect;
export type NewKpiAgreement = typeof kpiAgreements.$inferInsert;
