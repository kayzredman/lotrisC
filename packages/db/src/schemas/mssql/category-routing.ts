import {
  mssqlTable,
  varchar,
  int,
  datetime2,
  index,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { teams } from './teams';

/**
 * CategoryRouting — maps a named ticket category to a team for auto-routing.
 * One row per (tenant_id, category) pair; UNIQUE constraint enforced in DB.
 *
 * Used by the public web form intake and the intake service to route
 * SELF_SERVICE tickets to the correct team without manual triage.
 */
export const categoryRouting = mssqlTable(
  'CategoryRouting',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),

    /** Category label must match the web form category options exactly */
    category: varchar('category', { length: 100 }).notNull(),

    /** Team this category routes to */
    teamId: varchar('team_id', { length: 36 }).notNull().references(() => teams.id),

    /** Default priority applied to tickets created via this category (1=CRITICAL … 4=LOW) */
    defaultPriority: int('default_priority').notNull().default(3),

    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
    updatedAt: datetime2('updated_at', { precision: 3 }).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_cr_tenant').on(table.tenantId),
    tenantCategoryIdx: index('idx_cr_tenant_category').on(table.tenantId, table.category),
  }),
);

export type CategoryRouting = typeof categoryRouting.$inferSelect;
export type NewCategoryRouting = typeof categoryRouting.$inferInsert;
