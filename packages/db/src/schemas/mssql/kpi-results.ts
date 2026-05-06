import {
  mssqlTable,
  varchar,
  decimal,
  datetime2,
  index,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { users } from './users';
import { kpiAgreements } from './kpi-agreements';

/**
 * KPI_Results — computed weighted scores per area and overall, per agreement period.
 * Written by the KpiScoringService on-demand and at period-end via BullMQ.
 */
export const kpiResults = mssqlTable(
  'KPI_Results',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    engineerId: varchar('engineer_id', { length: 36 }).notNull().references(() => users.id),
    agreementId: varchar('agreement_id', { length: 36 }).notNull().references(() => kpiAgreements.id),

    periodKey: varchar('period_key', { length: 20 }).notNull(),

    // Weighted score per area stored as JSON string: [{ areaId, areaName, score, weight }]
    areaScoresJson: varchar('area_scores_json', { length: 4000 }),

    // Overall weighted score (0–100)
    overallScore: decimal('overall_score', { precision: 5, scale: 2 }).notNull(),

    computedAt: datetime2('computed_at', { precision: 3 }).notNull(),
  },
  (t) => ({
    tenantIdx: index('IX_KpiResults_Tenant').on(t.tenantId),
    engineerPeriodIdx: index('IX_KpiResults_EngineerPeriod').on(t.engineerId, t.periodKey),
    agreementIdx: index('IX_KpiResults_Agreement').on(t.agreementId),
  }),
);

export type KpiResult = typeof kpiResults.$inferSelect;
export type NewKpiResult = typeof kpiResults.$inferInsert;
