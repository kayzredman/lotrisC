import {
  mssqlTable,
  varchar,
  bigint,
  datetime2,
  nvarchar,
  index,
} from 'drizzle-orm/mssql-core';
import { tickets } from './tickets';
import { users } from './users';
import { tenants } from './tenants';

/**
 * Immutable audit trail of every status change and field edit on a ticket.
 * Written by the TicketLifecycleService on every mutation.
 */
export const ticketHistory = mssqlTable(
  'Ticket_History',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().identity(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    ticketId: varchar('ticket_id', { length: 36 }).notNull().references(() => tickets.id),
    actorId: varchar('actor_id', { length: 36 }).references(() => users.id),

    /** e.g. STATUS_CHANGED, ASSIGNED, COMMENT_ADDED, FIELD_EDITED */
    eventType: varchar('event_type', { length: 100 }).notNull(),

    fromValue: nvarchar('from_value', { length: 500 }),
    toValue: nvarchar('to_value', { length: 500 }),

    /** JSON blob for structured changes */
    metadata: nvarchar('metadata', { length: 2000 }),

    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
  },
  (table) => ({
    ticketIdx: index('idx_ticket_history_ticket').on(table.ticketId),
    tenantTicketIdx: index('idx_ticket_history_tenant_ticket').on(table.tenantId, table.ticketId),
    tenantCreatedIdx: index('idx_ticket_history_tenant_created').on(table.tenantId, table.createdAt),
  }),
);

export type TicketHistoryRow = typeof ticketHistory.$inferSelect;
export type NewTicketHistoryRow = typeof ticketHistory.$inferInsert;
