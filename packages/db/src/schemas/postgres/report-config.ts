import { pgTable, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Tenant-level report configuration.
 * One row per tenant (UNIQUE tenant_id). All fields are optional overrides;
 * ReportsConfigService merges with hardcoded defaults for any null fields.
 */
export const reportConfig = pgTable('report_config', {
  id: varchar('id', { length: 36 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 36 }).notNull().unique(),
  brandName: varchar('brand_name', { length: 120 }),          // PDF/Excel header company name
  defaultTimezone: varchar('default_timezone', { length: 60 }), // IANA tz string, e.g. 'Africa/Lagos'
  attachmentSizeLimitMb: integer('attachment_size_limit_mb'),  // switch to link above this size
  retentionDays: integer('retention_days'),                    // 0 = never purge
  defaultRecipients: text('default_recipients'),               // JSON array of email strings
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ReportConfig = typeof reportConfig.$inferSelect;
export type NewReportConfig = typeof reportConfig.$inferInsert;

/** Merged config with defaults applied for null fields */
export interface ReportConfigDefaults {
  brandName: string;
  defaultTimezone: string;
  attachmentSizeLimitMb: number;
  retentionDays: number;
  defaultRecipients: string[];
}
