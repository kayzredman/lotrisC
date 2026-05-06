import {
  mssqlTable,
  varchar,
  int,
  decimal,
  nvarchar,
  index,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { kpiAgreements } from './kpi-agreements';

/**
 * KPI_Agreement_Areas — named KPI areas within an agreement (e.g. "Product Quality").
 * Each area has a weight; all areas within an agreement must total 100.
 */
export const kpiAgreementAreas = mssqlTable(
  'KPI_Agreement_Areas',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    agreementId: varchar('agreement_id', { length: 36 }).notNull().references(() => kpiAgreements.id),

    name: nvarchar('name', { length: 200 }).notNull(),
    weight: decimal('weight', { precision: 5, scale: 2 }).notNull(), // % of overall score
    sortOrder: int('sort_order').notNull().default(0),
  },
  (t) => ({
    agreementIdx: index('IX_KpiAgreementAreas_Agreement').on(t.agreementId),
  }),
);

export type KpiAgreementArea = typeof kpiAgreementAreas.$inferSelect;
export type NewKpiAgreementArea = typeof kpiAgreementAreas.$inferInsert;
