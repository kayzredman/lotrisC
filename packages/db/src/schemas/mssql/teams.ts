import { mssqlTable, varchar, int, bit, datetime2, nvarchar, index } from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';

export const teams = mssqlTable(
  'Teams',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    name: nvarchar('name', { length: 255 }).notNull(),
    maxTicketsPerEngineer: int('max_tickets_per_engineer').notNull().default(5),
    pickupSlaMins: int('pickup_sla_minutes').notNull().default(30),
    isActive: bit('is_active').notNull().default(1),
    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
    updatedAt: datetime2('updated_at', { precision: 3 }).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_teams_tenant').on(table.tenantId),
  }),
);

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
