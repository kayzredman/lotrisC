import { mssqlTable, varchar, bigint, datetime2, nvarchar, index } from 'drizzle-orm/mssql-core';

export const auditLogs = mssqlTable(
  'Audit_Logs',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().identity(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }),
    entityId: varchar('entity_id', { length: 36 }),
    details: nvarchar('details', { length: 'max' }),
    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_audit_tenant').on(table.tenantId),
    tenantCreatedIdx: index('idx_audit_tenant_created').on(table.tenantId, table.createdAt),
  }),
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
