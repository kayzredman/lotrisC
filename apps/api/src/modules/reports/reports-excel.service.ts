import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as os from 'os';
import { getPostgresDb, analyticsTicketDaily, analyticsSlaDaily, analyticsKpiSummary, analyticsEngineerPerf, eq, and, desc, sql } from '@lotris/db';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ReportsExcelService {
  private readonly logger = new Logger(ReportsExcelService.name);

  async generate(
    tenantId: string,
    reportType: string,
    dateFrom?: string,
    dateTo?: string,
    _teamId?: string,
  ): Promise<string> {
    const filePath = path.join(os.tmpdir(), `lotris-report-${uuid()}.xlsx`);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Lotris';
    workbook.created = new Date();

    switch (reportType) {
      case 'TICKET_SUMMARY':
        await this.buildTicketSummary(workbook, tenantId, dateFrom, dateTo);
        break;
      case 'SLA_COMPLIANCE':
        await this.buildSlaCompliance(workbook, tenantId, dateFrom, dateTo);
        break;
      case 'KPI_REPORT':
        await this.buildKpiReport(workbook, tenantId);
        break;
      case 'ENGINEER_PERF':
        await this.buildEngineerPerf(workbook, tenantId);
        break;
      default:
        workbook.addWorksheet('Report').addRow(['Unknown report type']);
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  private styleHeader(sheet: ExcelJS.Worksheet, columns: string[]): void {
    const headerRow = sheet.addRow(columns);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1a1a2e' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.columns = columns.map((h) => ({ header: h, width: Math.max(h.length + 4, 14) }));
    // Remove the automatically added header row since we added one manually
    sheet.spliceRows(1, 1);
  }

  private async buildTicketSummary(
    wb: ExcelJS.Workbook,
    tenantId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<void> {
    const pg = getPostgresDb();
    const from = dateFrom ?? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]!;
    const to = dateTo ?? new Date().toISOString().split('T')[0]!;

    const rows = await pg
      .select()
      .from(analyticsTicketDaily)
      .where(
        and(
          eq(analyticsTicketDaily.tenantId, tenantId),
          sql`${analyticsTicketDaily.date} >= ${from}`,
          sql`${analyticsTicketDaily.date} <= ${to}`,
        ),
      )
      .orderBy(analyticsTicketDaily.date);

    const sheet = wb.addWorksheet('Ticket Summary');
    const cols = ['Date', 'Created', 'Resolved', 'Escalated', 'Open', 'SLA Breaches', 'Avg Resolution (hrs)'];
    this.styleHeader(sheet, cols);

    for (const r of rows) {
      sheet.addRow([
        r.date,
        r.totalCreated,
        r.totalResolved,
        r.totalEscalated,
        r.totalOpen,
        r.slaBreachCount,
        r.avgResolutionHours != null ? parseFloat(r.avgResolutionHours) : '',
      ]);
    }
  }

  private async buildSlaCompliance(
    wb: ExcelJS.Workbook,
    tenantId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<void> {
    const pg = getPostgresDb();
    const from = dateFrom ?? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]!;
    const to = dateTo ?? new Date().toISOString().split('T')[0]!;

    const rows = await pg
      .select()
      .from(analyticsSlaDaily)
      .where(
        and(
          eq(analyticsSlaDaily.tenantId, tenantId),
          sql`${analyticsSlaDaily.date} >= ${from}`,
          sql`${analyticsSlaDaily.date} <= ${to}`,
        ),
      )
      .orderBy(analyticsSlaDaily.date);

    const sheet = wb.addWorksheet('SLA Compliance');
    const cols = ['Date', 'Total Tickets', 'Pickup Breaches', 'Resolution Breaches', 'Compliance %'];
    this.styleHeader(sheet, cols);

    for (const r of rows) {
      sheet.addRow([
        r.date,
        r.totalTickets,
        r.pickupBreaches,
        r.resolutionBreaches,
        r.compliancePct != null ? parseFloat(r.compliancePct) : '',
      ]);
    }
  }

  private async buildKpiReport(wb: ExcelJS.Workbook, tenantId: string): Promise<void> {
    const pg = getPostgresDb();
    const rows = await pg
      .select()
      .from(analyticsKpiSummary)
      .where(eq(analyticsKpiSummary.tenantId, tenantId))
      .orderBy(desc(analyticsKpiSummary.updatedAt))
      .limit(200);

    const sheet = wb.addWorksheet('KPI Report');
    const cols = ['Engineer ID', 'Period Key', 'Overall Score', 'Updated At'];
    this.styleHeader(sheet, cols);

    for (const r of rows) {
      sheet.addRow([
        r.engineerId,
        r.periodKey,
        r.overallScore != null ? parseFloat(r.overallScore) : '',
        r.updatedAt.toISOString(),
      ]);
    }
  }

  private async buildEngineerPerf(wb: ExcelJS.Workbook, tenantId: string): Promise<void> {
    const pg = getPostgresDb();
    const rows = await pg
      .select()
      .from(analyticsEngineerPerf)
      .where(eq(analyticsEngineerPerf.tenantId, tenantId))
      .orderBy(desc(analyticsEngineerPerf.updatedAt))
      .limit(200);

    const sheet = wb.addWorksheet('Engineer Performance');
    const cols = ['Engineer ID', 'Week', 'Tickets Resolved', 'Tasks Completed', 'SLA Breaches', 'Avg Resolution (hrs)', 'KPI Score'];
    this.styleHeader(sheet, cols);

    for (const r of rows) {
      sheet.addRow([
        r.engineerId,
        r.weekKey,
        r.ticketsResolved,
        r.tasksCompleted,
        r.slaBreaches,
        r.avgResolutionHours != null ? parseFloat(r.avgResolutionHours) : '',
        r.kpiScore != null ? parseFloat(r.kpiScore) : '',
      ]);
    }
  }
}
