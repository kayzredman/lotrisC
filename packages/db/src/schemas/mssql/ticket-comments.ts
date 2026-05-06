import {
  mssqlTable,
  varchar,
  bit,
  datetime2,
  nvarchar,
  bigint,
  index,
} from 'drizzle-orm/mssql-core';
import { tickets } from './tickets';
import { users } from './users';
import { tenants } from './tenants';

export const ticketComments = mssqlTable(
  'Ticket_Comments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    ticketId: varchar('ticket_id', { length: 36 }).notNull().references(() => tickets.id),
    authorId: varchar('author_id', { length: 36 }).notNull().references(() => users.id),

    body: nvarchar('body', { length: 4000 }).notNull(),
    /** Internal comments are only visible to TEAM_LEAD and above */
    isInternal: bit('is_internal').notNull().default(0),

    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
    updatedAt: datetime2('updated_at', { precision: 3 }).notNull(),
  },
  (table) => ({
    ticketIdx: index('idx_ticket_comments_ticket').on(table.ticketId),
    tenantTicketIdx: index('idx_ticket_comments_tenant_ticket').on(table.tenantId, table.ticketId),
  }),
);

export type TicketComment = typeof ticketComments.$inferSelect;
export type NewTicketComment = typeof ticketComments.$inferInsert;
