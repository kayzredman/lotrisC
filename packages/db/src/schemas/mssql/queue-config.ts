import { varchar, int, bit, datetime2 } from 'drizzle-orm/mssql-core';
import { mssqlTable } from 'drizzle-orm/mssql-core';

/**
 * Queue_Config — per-team queue configuration.
 * NULL team_id = tenant default (used for any team without an explicit row).
 * Rows with a team_id override the tenant default for that team.
 */
export const queueConfigs = mssqlTable('Queue_Config', {
  id: varchar('id', { length: 36 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 36 }).notNull(),
  teamId: varchar('team_id', { length: 36 }), // NULL = tenant default

  // How many open tickets an engineer can hold at once
  maxCapacityPerEngineer: int('max_capacity_per_engineer').default(10).notNull(),

  // Minutes before pickup SLA fires the auto-assignment job
  pickupSlaMinutes: int('pickup_sla_minutes').default(30).notNull(),

  // Minutes for resolution SLA (copied to ticket on assignment; authoritative here)
  resolutionSlaMinutes: int('resolution_sla_minutes').default(240).notNull(),

  // If false, no auto-assignment fires; manager is notified instead
  autoAssignEnabled: bit('auto_assign_enabled').default(1).notNull(),

  createdAt: datetime2('created_at', { precision: 3 }).notNull(),
  updatedAt: datetime2('updated_at', { precision: 3 }).notNull(),
});

export type QueueConfig = typeof queueConfigs.$inferSelect;
export type NewQueueConfig = typeof queueConfigs.$inferInsert;
