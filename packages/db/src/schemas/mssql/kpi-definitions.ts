import {
  mssqlTable,
  varchar,
  int,
  bit,
  datetime2,
  nvarchar,
  decimal,
  index,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';

/**
 * KPI_Definitions — global library of KPI metrics, managed by IT_MANAGER.
 *
 * metricType: PERCENTAGE | TIME_HOURS | TIME_MINUTES | COUNT | SCORE
 * direction:  HIGHER_BETTER | LOWER_BETTER
 * scope:      ORG | TEAM | INDIVIDUAL
 * status:     DRAFT | ACTIVE | ARCHIVED
 *
 * weight: contribution to composite score; active definitions must total 100 per tenant.
 */
export const kpiDefinitions = mssqlTable(
  'KPI_Definitions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),

    name: nvarchar('name', { length: 200 }).notNull(),
    description: nvarchar('description', { length: 2000 }),

    metricType: varchar('metric_type', { length: 30 }).notNull().default('PERCENTAGE'),
    direction: varchar('direction', { length: 20 }).notNull().default('HIGHER_BETTER'),
    scope: varchar('scope', { length: 20 }).notNull().default('INDIVIDUAL'),

    // Default target value (decimal for flexibility: 95.0%, 4.2 score, 30 count)
    defaultTarget: decimal('default_target', { precision: 10, scale: 2 }).notNull(),

    // Weight out of 100 across all active definitions in the tenant
    weight: decimal('weight', { precision: 5, scale: 2 }).notNull().default('0'),

    status: varchar('status', { length: 20 }).notNull().default('DRAFT'),

    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
    updatedAt: datetime2('updated_at', { precision: 3 }).notNull(),
  },
  (t) => ({
    tenantIdx: index('IX_KpiDefs_Tenant').on(t.tenantId),
    tenantStatusIdx: index('IX_KpiDefs_TenantStatus').on(t.tenantId, t.status),
  }),
);

export type KpiDefinition = typeof kpiDefinitions.$inferSelect;
export type NewKpiDefinition = typeof kpiDefinitions.$inferInsert;
