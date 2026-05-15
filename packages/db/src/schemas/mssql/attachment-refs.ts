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
 * Stores metadata for files attached to tickets.
 * Actual file bytes live in S3/blob storage — only the reference is stored here.
 */
export const attachmentRefs = mssqlTable(
  'Attachment_Refs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    ticketId: varchar('ticket_id', { length: 36 }).notNull().references(() => tickets.id),
    uploadedBy: varchar('uploaded_by', { length: 36 }).notNull().references(() => users.id),

    /** S3 object key or Azure blob path */
    storageKey: varchar('storage_key', { length: 1000 }).notNull(),
    originalName: nvarchar('original_name', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 127 }).notNull(),

    /** File size in bytes */
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),

    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
  },
  (table) => ({
    ticketIdx: index('idx_attachment_refs_ticket').on(table.ticketId),
    tenantTicketIdx: index('idx_attachment_refs_tenant_ticket').on(table.tenantId, table.ticketId),
  }),
);

export type AttachmentRef = typeof attachmentRefs.$inferSelect;
export type NewAttachmentRef = typeof attachmentRefs.$inferInsert;
