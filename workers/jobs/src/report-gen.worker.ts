import { Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import { getPostgresDb, reportSchedules, reportJobs, reportConfig, eq, and, lte } from '@lotris/db';
import { v4 as uuid } from 'uuid';
import * as nodemailer from 'nodemailer';
import * as fs from 'node:fs';
import * as path from 'node:path';
// Workers instantiate these services with `new` (no NestJS DI).
// Safe because both services depend only on @lotris/db helpers.
import { ReportsPdfService } from '../../../apps/api/src/modules/reports/reports-pdf.service';
import { ReportsExcelService } from '../../../apps/api/src/modules/reports/reports-excel.service';

/**
 * ReportGen Worker — processes scheduled reports and generates PDF/Excel files.
 *
 * Handles two job types:
 *   PROCESS_SCHEDULES — hourly scan; finds due schedules, enqueues GENERATE_REPORT jobs
 *   GENERATE_REPORT   — generates the actual file, updates reportJobs, emails recipients
 *
 * Idempotent:
 *   - PROCESS_SCHEDULES uses dedup key report-schedule-check:{tenantId}:{YYYYMMDDHH}
 *   - GENERATE_REPORT checks if job is still in PROCESSING state before writing the file
 */

interface GenerateReportJobData {
  jobId: string;
  tenantId: string;
  reportType: string;
  format: string;
  dateFrom?: string;
  dateTo?: string;
  teamId?: string | null;
  recipients: string[];
  brandName: string;
  attachmentSizeLimitMb: number;
}

// ── Tenant config fetch (no NestJS DI — use raw DB query) ──────────────────

async function getTenantReportConfig(tenantId: string): Promise<{
  brandName: string;
  attachmentSizeLimitMb: number;
  defaultTimezone: string;
  defaultRecipients: string[];
}> {
  const pg = getPostgresDb();
  const rows = await pg
    .select()
    .from(reportConfig)
    .where(eq(reportConfig.tenantId, tenantId))
    .limit(1);

  const row = rows[0];
  let defaultRecipients: string[] = [];
  if (row?.defaultRecipients) {
    try { defaultRecipients = JSON.parse(row.defaultRecipients) as string[]; } catch { /* ignore */ }
  }

  return {
    brandName: row?.brandName ?? 'Lotris',
    attachmentSizeLimitMb: row?.attachmentSizeLimitMb ?? 10,
    defaultTimezone: row?.defaultTimezone ?? 'UTC',
    defaultRecipients,
  };
}

// ── Next run computation ────────────────────────────────────────────────────

function computeNextRunAt(frequency: string): Date {
  const now = new Date();
  if (frequency === 'WEEKLY') {
    const d = new Date(now);
    const day = d.getUTCDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    d.setUTCDate(d.getUTCDate() + daysUntilMonday);
    d.setUTCHours(8, 0, 0, 0);
    return d;
  }
  if (frequency === 'MONTHLY') {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() + 1, 1);
    d.setUTCHours(8, 0, 0, 0);
    return d;
  }
  // QUARTERLY
  const d = new Date(now);
  const nextQStart = (Math.floor(d.getUTCMonth() / 3) + 1) * 3;
  if (nextQStart >= 12) {
    d.setUTCFullYear(d.getUTCFullYear() + 1, 0, 1);
  } else {
    d.setUTCMonth(nextQStart, 1);
  }
  d.setUTCHours(8, 0, 0, 0);
  return d;
}

// ── Dedup recipients ────────────────────────────────────────────────────────

function mergeRecipients(scheduleRecipients: string[], defaultRecipients: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const email of [...defaultRecipients, ...scheduleRecipients]) {
    const lower = email.toLowerCase().trim();
    if (lower && !seen.has(lower)) {
      seen.add(lower);
      result.push(lower);
    }
  }
  return result;
}

// ── Email dispatch ──────────────────────────────────────────────────────────

async function emailReport(
  filePath: string,
  recipients: string[],
  brandName: string,
  reportType: string,
  sizeLimitMb: number,
): Promise<void> {
  if (!recipients.length) return;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM ?? 'noreply@lotris.io';

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn(`[report-gen] SMTP not configured — skipping email for ${filePath}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const subject = `${brandName} — ${reportType.replace(/_/g, ' ')} Report`;

  let fileSizeMb = 0;
  try { fileSizeMb = fs.statSync(filePath).size / (1024 * 1024); } catch { return; }

  if (fileSizeMb <= sizeLimitMb) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';

    await transporter.sendMail({
      from: smtpFrom,
      to: recipients,
      subject,
      text: `Please find the ${reportType.replace(/_/g, ' ')} report attached.`,
      attachments: [{ filename: path.basename(filePath), path: filePath, contentType: mime }],
    });
  } else {
    await transporter.sendMail({
      from: smtpFrom,
      to: recipients,
      subject,
      text: `Your ${reportType.replace(/_/g, ' ')} report exceeds the attachment size limit (${sizeLimitMb} MB). Log in to download it.`,
    });
  }
}

// ── Worker factory ──────────────────────────────────────────────────────────

export function createReportGenWorker(connection: IORedis, reportGenQueue: import('bullmq').Queue): Worker {
  return new Worker(
    'report-gen',
    async (job: Job) => {
      if (job.name === 'PROCESS_SCHEDULES') {
        await processSchedules(reportGenQueue);
        return;
      }

      if (job.name === 'GENERATE_REPORT') {
        await generateReport(job.data as GenerateReportJobData);
        return;
      }
    },
    { connection, concurrency: 2 },
  );
}

// ── PROCESS_SCHEDULES handler ───────────────────────────────────────────────

async function processSchedules(reportGenQueue: import('bullmq').Queue): Promise<void> {
  const pg = getPostgresDb();
  const now = new Date();

  // Fetch all active due schedules across all tenants
  const dueSchedules = await pg
    .select()
    .from(reportSchedules)
    .where(
      and(
        eq(reportSchedules.isActive, 'true'),
        lte(reportSchedules.nextRunAt, now),
      ),
    )
    .limit(500);

  if (dueSchedules.length === 0) return;

  console.log(`[report-gen] Found ${dueSchedules.length} due schedule(s)`);

  for (const schedule of dueSchedules) {
    const tenantId = schedule.tenantId;
    const config = await getTenantReportConfig(tenantId);

    let scheduleRecipients: string[] = [];
    try { scheduleRecipients = JSON.parse(schedule.recipients) as string[]; } catch { /* ignore */ }

    const allRecipients = mergeRecipients(scheduleRecipients, config.defaultRecipients);

    // Create a reportJobs row
    const jobId = uuid();
    await pg.insert(reportJobs).values({
      id: jobId,
      tenantId,
      reportType: schedule.reportType,
      format: schedule.format,
      status: 'PROCESSING',
      requestedBy: schedule.createdBy ?? 'system',
    });

    // Enqueue a GENERATE_REPORT job with dedup key to prevent duplicate enqueues
    // The queue is imported from index.ts — passed via closure from createReportGenWorker
    // (we use the module-level export to avoid circular deps at module load time)
    const hourTag = now.toISOString().slice(0, 13).replace(/[^0-9]/g, '');
    const dedupKey = `report-schedule-check:${tenantId}:${hourTag}:${schedule.id}`;
    await reportGenQueue.add(
      'GENERATE_REPORT',
      {
        jobId,
        tenantId,
        reportType: schedule.reportType,
        format: schedule.format,
        teamId: schedule.teamId,
        recipients: allRecipients,
        brandName: config.brandName,
        attachmentSizeLimitMb: config.attachmentSizeLimitMb,
      } satisfies GenerateReportJobData,
      {
        jobId: dedupKey,
        removeOnComplete: { count: 20 },
        removeOnFail: { count: 10 },
      },
    );

    // Advance nextRunAt
    const nextRunAt = computeNextRunAt(schedule.frequency);
    await pg
      .update(reportSchedules)
      .set({ lastRunAt: now, nextRunAt })
      .where(eq(reportSchedules.id, schedule.id));
  }
}

// ── GENERATE_REPORT handler ─────────────────────────────────────────────────

async function generateReport(data: GenerateReportJobData): Promise<void> {
  const pg = getPostgresDb();

  // Verify job is still PROCESSING (idempotency guard)
  const existing = await pg
    .select({ status: reportJobs.status })
    .from(reportJobs)
    .where(and(eq(reportJobs.id, data.jobId), eq(reportJobs.tenantId, data.tenantId)))
    .limit(1);

  if (!existing[0] || existing[0].status !== 'PROCESSING') {
    console.log(`[report-gen] Job ${data.jobId} already processed — skipping`);
    return;
  }

  try {
    let filePath: string;

    if (data.format === 'EXCEL') {
      const svc = new ReportsExcelService();
      filePath = await svc.generate(data.tenantId, data.reportType, data.dateFrom, data.dateTo, data.teamId ?? undefined, data.brandName);
    } else {
      const svc = new ReportsPdfService();
      filePath = await svc.generate(data.tenantId, data.reportType, data.dateFrom, data.dateTo, data.teamId ?? undefined, data.brandName);
    }

    await pg
      .update(reportJobs)
      .set({ status: 'DONE', filePath, completedAt: new Date() })
      .where(and(eq(reportJobs.id, data.jobId), eq(reportJobs.tenantId, data.tenantId)));

    await emailReport(filePath, data.recipients, data.brandName, data.reportType, data.attachmentSizeLimitMb);
  } catch (err) {
    console.error(`[report-gen] GENERATE_REPORT failed for job ${data.jobId}: ${err}`);
    await pg
      .update(reportJobs)
      .set({ status: 'FAILED', errorMsg: String(err), completedAt: new Date() })
      .where(and(eq(reportJobs.id, data.jobId), eq(reportJobs.tenantId, data.tenantId)));
    throw err; // Let BullMQ handle retries
  }
}
