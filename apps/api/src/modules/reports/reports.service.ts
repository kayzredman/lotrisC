import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getPostgresDb, reportJobs, reportSchedules, eq, and, desc, lte } from '@lotris/db';
import { v4 as uuid } from 'uuid';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import type { TrpcAuth } from '@lotris/types';
import { ReportsPdfService } from './reports-pdf.service';
import { ReportsExcelService } from './reports-excel.service';
import type { GenerateReportDto, CreateScheduleDto } from './dto/index';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly pdfService: ReportsPdfService,
    private readonly excelService: ReportsExcelService,
  ) {}

  async generateReport(auth: TrpcAuth, dto: GenerateReportDto): Promise<{ jobId: string }> {
    const pg = getPostgresDb();
    const jobId = uuid();

    await pg.insert(reportJobs).values({
      id: jobId,
      tenantId: auth.tenantId,
      reportType: dto.reportType,
      format: dto.format,
      status: 'PROCESSING',
      requestedBy: auth.userId,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      teamId: dto.teamId,
    });

    // Generate synchronously (BullMQ off-loading available via ETL worker pattern)
    setImmediate(async () => {
      try {
        let filePath: string;
        if (dto.format === 'EXCEL') {
          filePath = await this.excelService.generate(auth.tenantId, dto.reportType, dto.dateFrom, dto.dateTo, dto.teamId);
        } else {
          filePath = await this.pdfService.generate(auth.tenantId, dto.reportType, dto.dateFrom, dto.dateTo, dto.teamId);
        }

        await pg
          .update(reportJobs)
          .set({ status: 'DONE', filePath, completedAt: new Date() })
          .where(and(eq(reportJobs.id, jobId), eq(reportJobs.tenantId, auth.tenantId)));
      } catch (err) {
        this.logger.error(`Report generation failed for job ${jobId}: ${err}`);
        await pg
          .update(reportJobs)
          .set({ status: 'FAILED', errorMsg: String(err), completedAt: new Date() })
          .where(and(eq(reportJobs.id, jobId), eq(reportJobs.tenantId, auth.tenantId)));
      }
    });

    return { jobId };
  }

  async listReports(auth: TrpcAuth) {
    const pg = getPostgresDb();
    return pg
      .select()
      .from(reportJobs)
      .where(eq(reportJobs.tenantId, auth.tenantId))
      .orderBy(desc(reportJobs.createdAt))
      .limit(50);
  }

  async getJobStatus(auth: TrpcAuth, jobId: string) {
    const pg = getPostgresDb();
    const rows = await pg
      .select()
      .from(reportJobs)
      .where(and(eq(reportJobs.id, jobId), eq(reportJobs.tenantId, auth.tenantId)))
      .limit(1);

    if (!rows[0]) throw new NotFoundException('Report job not found');
    return rows[0];
  }

  async getFilePath(auth: TrpcAuth, jobId: string): Promise<string> {
    const job = await this.getJobStatus(auth, jobId);
    if (job.status !== 'DONE' || !job.filePath) {
      throw new NotFoundException('Report file not available');
    }
    return job.filePath;
  }

  // ── Schedules ─────────────────────────────────────────────────────────────

  async createSchedule(auth: TrpcAuth, dto: CreateScheduleDto) {
    const pg = getPostgresDb();
    const id = uuid();
    const nextRunAt = this.computeNextRunAt(dto.frequency, 'UTC');
    await pg.insert(reportSchedules).values({
      id,
      tenantId: auth.tenantId,
      reportType: dto.reportType,
      format: dto.format,
      frequency: dto.frequency,
      recipients: dto.recipients,
      teamId: dto.teamId,
      createdBy: auth.userId,
      nextRunAt,
    });
    return { id };
  }

  async listSchedules(auth: TrpcAuth) {
    const pg = getPostgresDb();
    return pg
      .select()
      .from(reportSchedules)
      .where(eq(reportSchedules.tenantId, auth.tenantId))
      .orderBy(desc(reportSchedules.createdAt));
  }

  async deleteSchedule(auth: TrpcAuth, id: string): Promise<void> {
    const pg = getPostgresDb();
    await pg
      .delete(reportSchedules)
      .where(and(eq(reportSchedules.id, id), eq(reportSchedules.tenantId, auth.tenantId)));
  }

  // ── Scheduling helpers ────────────────────────────────────────────────────

  /**
   * Compute next run date for a given frequency.
   * WEEKLY  → next Monday 08:00 in the given timezone
   * MONTHLY → 1st of next month 08:00 in the given timezone
   * QUARTERLY → 1st of next quarter (Jan/Apr/Jul/Oct) 08:00 in the given timezone
   */
  computeNextRunAt(frequency: string, timezone = 'UTC'): Date {
    const now = new Date();
    // Work in UTC, then adjust for timezone offset
    const localHour = 8; // 08:00 local time

    if (frequency === 'WEEKLY') {
      const d = new Date(now);
      const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      d.setUTCDate(d.getUTCDate() + daysUntilMonday);
      d.setUTCHours(this.localHourToUtc(localHour, timezone), 0, 0, 0);
      return d;
    }

    if (frequency === 'MONTHLY') {
      const d = new Date(now);
      d.setUTCMonth(d.getUTCMonth() + 1, 1);
      d.setUTCHours(this.localHourToUtc(localHour, timezone), 0, 0, 0);
      return d;
    }

    // QUARTERLY
    const d = new Date(now);
    const currentMonth = d.getUTCMonth(); // 0-indexed
    const currentQuarterStartMonth = Math.floor(currentMonth / 3) * 3;
    const nextQuarterStartMonth = currentQuarterStartMonth + 3;
    if (nextQuarterStartMonth >= 12) {
      d.setUTCFullYear(d.getUTCFullYear() + 1, 0, 1);
    } else {
      d.setUTCMonth(nextQuarterStartMonth, 1);
    }
    d.setUTCHours(this.localHourToUtc(localHour, timezone), 0, 0, 0);
    return d;
  }

  /**
   * Advance nextRunAt after a schedule has fired (used by worker).
   */
  advanceNextRunAt(_current: Date, frequency: string, timezone = 'UTC'): Date {
    return this.computeNextRunAt(frequency, timezone);
  }

  /**
   * Fetch schedules due for the given tenant (nextRunAt <= now and isActive).
   */
  async processDueSchedules(tenantId: string): Promise<{ id: string; reportType: string; format: string; recipients: string; teamId?: string | null }[]> {
    const pg = getPostgresDb();
    const now = new Date();
    const rows = await pg
      .select({
        id: reportSchedules.id,
        reportType: reportSchedules.reportType,
        format: reportSchedules.format,
        frequency: reportSchedules.frequency,
        recipients: reportSchedules.recipients,
        teamId: reportSchedules.teamId,
      })
      .from(reportSchedules)
      .where(
        and(
          eq(reportSchedules.tenantId, tenantId),
          eq(reportSchedules.isActive, 'true'),
          lte(reportSchedules.nextRunAt, now),
        ),
      );

    // Advance nextRunAt for all due schedules
    for (const row of rows) {
      const next = this.computeNextRunAt(row.frequency, 'UTC');
      await pg
        .update(reportSchedules)
        .set({ lastRunAt: now, nextRunAt: next })
        .where(and(eq(reportSchedules.id, row.id), eq(reportSchedules.tenantId, tenantId)));
    }

    return rows;
  }

  /**
   * Send a report file to a list of recipients.
   * If the file exceeds sizeLimitMb, send a message noting the report is available
   * for download instead of attaching it.
   */
  async emailReportToRecipients(
    filePath: string,
    recipients: string[],
    sizeLimitMb: number,
    brandName: string,
    reportType: string,
  ): Promise<void> {
    if (!recipients.length) return;

    const smtpHost = process.env['SMTP_HOST'];
    const smtpPort = parseInt(process.env['SMTP_PORT'] ?? '587', 10);
    const smtpUser = process.env['SMTP_USER'];
    const smtpPass = process.env['SMTP_PASS'];
    const smtpFrom = process.env['SMTP_FROM'] ?? `noreply@lotris.io`;

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP not configured — skipping email dispatch for report');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    let fileSizeMb = 0;
    try {
      const stat = fs.statSync(filePath);
      fileSizeMb = stat.size / (1024 * 1024);
    } catch {
      this.logger.error(`Email dispatch: file not found at ${filePath}`);
      return;
    }

    const subject = `${brandName} — ${reportType.replace(/_/g, ' ')} Report`;

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
        text: `Your ${reportType.replace(/_/g, ' ')} report is ready but exceeds the attachment size limit (${sizeLimitMb} MB). Please log in to ${brandName} to download it.`,
      });
    }

    this.logger.log(`Report emailed to ${recipients.length} recipient(s)`);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private localHourToUtc(localHour: number, timezone: string): number {
    try {
      // Use Intl to determine the UTC offset for the given timezone at this moment
      const now = new Date();
      const localStr = now.toLocaleString('en-GB', { timeZone: timezone, hour: 'numeric', hour12: false });
      const utcStr = now.toLocaleString('en-GB', { timeZone: 'UTC', hour: 'numeric', hour12: false });
      const localH = parseInt(localStr, 10);
      const utcH = parseInt(utcStr, 10);
      const offsetH = utcH - localH; // positive = ahead of UTC
      return ((localHour + offsetH) % 24 + 24) % 24;
    } catch {
      return localHour; // fall back to treating localHour as UTC
    }
  }
}

