import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Report job history — tracks generated reports + their storage paths.
 */
export const reportJobs = pgTable('report_jobs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 36 }).notNull(),
  reportType: varchar('report_type', { length: 40 }).notNull(), // TICKET_SUMMARY | SLA_COMPLIANCE | KPI_REPORT | ENGINEER_PERF
  format: varchar('format', { length: 10 }).notNull().default('PDF'), // PDF | EXCEL
  status: varchar('status', { length: 20 }).notNull().default('QUEUED'), // QUEUED | PROCESSING | DONE | FAILED
  filePath: text('file_path'),
  requestedBy: varchar('requested_by', { length: 36 }).notNull(),
  dateFrom: varchar('date_from', { length: 20 }),
  dateTo: varchar('date_to', { length: 20 }),
  teamId: varchar('team_id', { length: 36 }),
  errorMsg: text('error_msg'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export type ReportJob = typeof reportJobs.$inferSelect;
export type NewReportJob = typeof reportJobs.$inferInsert;

/**
 * Scheduled report configuration.
 */
export const reportSchedules = pgTable('report_schedules', {
  id: varchar('id', { length: 36 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 36 }).notNull(),
  reportType: varchar('report_type', { length: 40 }).notNull(),
  format: varchar('format', { length: 10 }).notNull().default('PDF'),
  frequency: varchar('frequency', { length: 20 }).notNull(), // WEEKLY | MONTHLY | QUARTERLY
  recipients: text('recipients').notNull(), // JSON array of email strings
  teamId: varchar('team_id', { length: 36 }),
  isActive: varchar('is_active', { length: 5 }).notNull().default('true'),
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ReportSchedule = typeof reportSchedules.$inferSelect;
export type NewReportSchedule = typeof reportSchedules.$inferInsert;
