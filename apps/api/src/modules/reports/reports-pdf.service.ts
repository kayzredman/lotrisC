import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import PDFDocument from 'pdfkit';
import { getPostgresDb, analyticsTicketDaily, analyticsSlaDaily, analyticsKpiSummary, analyticsEngineerPerf, eq, and, desc, sql } from '@lotris/db';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ReportsPdfService {
  private readonly logger = new Logger(ReportsPdfService.name);

  async generate(
    tenantId: string,
    reportType: string,
    dateFrom?: string,
    dateTo?: string,
    _teamId?: string,
    brandName = 'Lotris',
  ): Promise<string> {
    const filePath = path.join(os.tmpdir(), `lotris-report-${uuid()}.pdf`);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    this.writeHeader(doc, reportType, brandName);

    switch (reportType) {
      case 'TICKET_SUMMARY':
        await this.writeTicketSummary(doc, tenantId, dateFrom, dateTo);
        break;
      case 'SLA_COMPLIANCE':
        await this.writeSlaCompliance(doc, tenantId, dateFrom, dateTo);
        break;
      case 'KPI_REPORT':
        await this.writeKpiReport(doc, tenantId, dateFrom, dateTo);
        break;
      case 'ENGINEER_PERF':
        await this.writeEngineerPerf(doc, tenantId, dateFrom, dateTo);
        break;
      default:
        doc.text('Unknown report type.');
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  private writeHeader(doc: PDFKit.PDFDocument, reportType: string, brandName = 'Lotris'): void {
    doc
      .fontSize(20)
      .fillColor('#1a1a2e')
      .text(`${brandName} — IT Help Desk Report`, { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(14)
      .fillColor('#666')
      .text(this.labelFor(reportType), { align: 'center' });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor('#999')
      .text(`Generated: ${new Date().toUTCString()}`, { align: 'center' });
    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').stroke();
    doc.moveDown(1);
  }

  private labelFor(type: string): string {
    const labels: Record<string, string> = {
      TICKET_SUMMARY: 'Ticket Summary Report',
      SLA_COMPLIANCE: 'SLA Compliance Report',
      KPI_REPORT: 'KPI Performance Report',
      ENGINEER_PERF: 'Engineer Performance Report',
    };
    return labels[type] ?? type;
  }

  private async writeTicketSummary(
    doc: PDFKit.PDFDocument,
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

    const totals = rows.reduce(
      (acc, r) => ({
        created: acc.created + (r.totalCreated ?? 0),
        resolved: acc.resolved + (r.totalResolved ?? 0),
        escalated: acc.escalated + (r.totalEscalated ?? 0),
        breaches: acc.breaches + (r.slaBreachCount ?? 0),
      }),
      { created: 0, resolved: 0, escalated: 0, breaches: 0 },
    );

    doc.fontSize(12).fillColor('#333').text(`Period: ${from} to ${to}`).moveDown(0.5);
    doc.fontSize(11).text(`Total Tickets Created: ${totals.created}`);
    doc.text(`Total Tickets Resolved: ${totals.resolved}`);
    doc.text(`Total Escalated: ${totals.escalated}`);
    doc.text(`SLA Breaches: ${totals.breaches}`);

    const slaRate =
      totals.created > 0
        ? (((totals.created - totals.breaches) / totals.created) * 100).toFixed(1)
        : '100.0';
    doc.text(`SLA Compliance Rate: ${slaRate}%`);

    doc.moveDown(1);
    doc.fontSize(11).fillColor('#1a1a2e').text('Daily Breakdown', { underline: true }).moveDown(0.5);

    for (const r of rows.slice(0, 20)) {
      doc
        .fontSize(9)
        .fillColor('#555')
        .text(
          `${r.date}  |  Created: ${r.totalCreated}  Resolved: ${r.totalResolved}  Breaches: ${r.slaBreachCount}`,
        );
    }
    if (rows.length > 20) {
      doc.fontSize(9).fillColor('#999').text(`... and ${rows.length - 20} more days.`);
    }
  }

  private async writeSlaCompliance(
    doc: PDFKit.PDFDocument,
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

    doc.fontSize(12).fillColor('#333').text(`Period: ${from} to ${to}`).moveDown(0.5);

    const avgCompliance =
      rows.length > 0
        ? (rows.reduce((s, r) => s + parseFloat(r.compliancePct ?? '100'), 0) / rows.length).toFixed(1)
        : '100.0';

    doc.fontSize(11).text(`Average SLA Compliance: ${avgCompliance}%`).moveDown(1);
    doc.fontSize(11).fillColor('#1a1a2e').text('Daily SLA Summary', { underline: true }).moveDown(0.5);

    for (const r of rows.slice(0, 20)) {
      const pct = r.compliancePct ?? '—';
      doc
        .fontSize(9)
        .fillColor('#555')
        .text(`${r.date}  |  Compliance: ${pct}%  Breaches: ${r.resolutionBreaches}  Total: ${r.totalTickets}`);
    }
  }

  private async writeKpiReport(
    doc: PDFKit.PDFDocument,
    tenantId: string,
    _dateFrom?: string,
    _dateTo?: string,
  ): Promise<void> {
    const pg = getPostgresDb();
    const rows = await pg
      .select()
      .from(analyticsKpiSummary)
      .where(eq(analyticsKpiSummary.tenantId, tenantId))
      .orderBy(desc(analyticsKpiSummary.updatedAt))
      .limit(50);

    doc.fontSize(12).fillColor('#333').text('KPI Performance Summary').moveDown(0.5);
    doc.fontSize(11).fillColor('#1a1a2e').text('Latest KPI Scores by Engineer + Period', { underline: true }).moveDown(0.5);

    if (rows.length === 0) {
      doc.fontSize(10).fillColor('#999').text('No KPI data available for this period.');
      return;
    }

    for (const r of rows.slice(0, 30)) {
      doc
        .fontSize(9)
        .fillColor('#555')
        .text(`Engineer: ${r.engineerId}  |  Period: ${r.periodKey}  |  Score: ${r.overallScore}`);
    }
  }

  private async writeEngineerPerf(
    doc: PDFKit.PDFDocument,
    tenantId: string,
    _dateFrom?: string,
    _dateTo?: string,
  ): Promise<void> {
    const pg = getPostgresDb();
    const rows = await pg
      .select()
      .from(analyticsEngineerPerf)
      .where(eq(analyticsEngineerPerf.tenantId, tenantId))
      .orderBy(desc(analyticsEngineerPerf.updatedAt))
      .limit(50);

    doc.fontSize(12).fillColor('#333').text('Engineer Performance Report').moveDown(0.5);
    doc.fontSize(11).fillColor('#1a1a2e').text('Recent Weekly Snapshots', { underline: true }).moveDown(0.5);

    if (rows.length === 0) {
      doc.fontSize(10).fillColor('#999').text('No performance data available.');
      return;
    }

    for (const r of rows.slice(0, 30)) {
      doc
        .fontSize(9)
        .fillColor('#555')
        .text(
          `Week: ${r.weekKey}  |  Engineer: ${r.engineerId}  |  Resolved: ${r.ticketsResolved}  Breaches: ${r.slaBreaches}  KPI: ${r.kpiScore ?? '—'}`,
        );
    }
  }
}
