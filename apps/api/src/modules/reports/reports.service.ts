import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getPostgresDb, reportJobs, reportSchedules, eq, and, desc } from '@lotris/db';
import { v4 as uuid } from 'uuid';
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
    await pg.insert(reportSchedules).values({
      id,
      tenantId: auth.tenantId,
      reportType: dto.reportType,
      format: dto.format,
      frequency: dto.frequency,
      recipients: dto.recipients,
      teamId: dto.teamId,
      createdBy: auth.userId,
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
}
