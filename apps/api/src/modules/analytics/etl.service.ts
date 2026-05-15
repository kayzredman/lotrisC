import { Injectable, Logger } from '@nestjs/common';
import {
  getPostgresDb,
  getMssqlDb,
  analyticsTicketDaily,
  analyticsEngineerPerf,
  analyticsSlaDaily,
  tickets,
  users,
  kpiResults,
  eq,
  and,
  sql,
} from '@lotris/db';
import { v4 as uuid } from 'uuid';

@Injectable()
export class EtlService {
  private readonly logger = new Logger(EtlService.name);

  /**
   * Sync a single day's ticket analytics for a tenant.
   * Upserts a row in analytics_ticket_daily.
   */
  async syncTicketDay(tenantId: string, dateStr: string): Promise<void> {
    this.logger.log(`ETL syncTicketDay tenantId=${tenantId} date=${dateStr}`);
    const mssql = await getMssqlDb();
    const pg = getPostgresDb();

    // Count ticket activity for the day from MSSQL
    const rows = await mssql
      .select({
        status: tickets.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(and(eq(tickets.tenantId, tenantId), sql`CAST(${tickets.createdAt} AS DATE) = ${dateStr}`))
      .groupBy(tickets.status);

    let totalCreated = 0;
    let totalResolved = 0;
    let totalEscalated = 0;

    for (const r of rows) {
      totalCreated += Number(r.count);
      if (r.status === 'RESOLVED' || r.status === 'CLOSED') totalResolved += Number(r.count);
      if (r.status === 'ESCALATED') totalEscalated += Number(r.count);
    }

    // Open tickets total (current state, not day-scoped)
    const openRows = await mssql
      .select({ count: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          sql`${tickets.status} NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`,
        ),
      );
    const totalOpen = Number(openRows[0]?.count ?? 0);

    // SLA breach count for the day
    const breachRows = await mssql
      .select({ count: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          sql`CAST(${tickets.createdAt} AS DATE) = ${dateStr}`,
          sql`${tickets.slaResolutionBreached} = 1`,
        ),
      );
    const slaBreachCount = Number(breachRows[0]?.count ?? 0);

    // Avg resolution hours for the day
    const avgRows = await mssql
      .select({ avg: sql<string>`AVG(DATEDIFF(HOUR, ${tickets.createdAt}, ${tickets.resolvedAt}))` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          sql`CAST(${tickets.resolvedAt} AS DATE) = ${dateStr}`,
          sql`${tickets.resolvedAt} IS NOT NULL`,
        ),
      );
    const avgResolutionHours = avgRows[0]?.avg ?? null;

    // Upsert into PostgreSQL
    const existing = await pg
      .select({ id: analyticsTicketDaily.id })
      .from(analyticsTicketDaily)
      .where(and(eq(analyticsTicketDaily.tenantId, tenantId), sql`${analyticsTicketDaily.date} = ${dateStr}`))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      await pg
        .update(analyticsTicketDaily)
        .set({
          totalCreated,
          totalResolved,
          totalEscalated,
          totalOpen,
          slaBreachCount,
          avgResolutionHours: avgResolutionHours?.toString() ?? null,
          updatedAt: new Date(),
        })
        .where(eq(analyticsTicketDaily.id, existing[0].id));
    } else {
      await pg.insert(analyticsTicketDaily).values({
        id: uuid(),
        tenantId,
        date: dateStr,
        totalCreated,
        totalResolved,
        totalEscalated,
        totalOpen,
        slaBreachCount,
        avgResolutionHours: avgResolutionHours?.toString() ?? null,
      });
    }

    // Also upsert SLA daily
    await this.syncSlaDay(tenantId, dateStr, totalCreated, slaBreachCount);
  }

  private async syncSlaDay(
    tenantId: string,
    dateStr: string,
    totalTickets: number,
    breachCount: number,
  ): Promise<void> {
    const pg = getPostgresDb();
    const compliancePct =
      totalTickets > 0
        ? (((totalTickets - breachCount) / totalTickets) * 100).toFixed(2)
        : '100.00';

    const existing = await pg
      .select({ id: analyticsSlaDaily.id })
      .from(analyticsSlaDaily)
      .where(and(eq(analyticsSlaDaily.tenantId, tenantId), sql`${analyticsSlaDaily.date} = ${dateStr}`))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      await pg
        .update(analyticsSlaDaily)
        .set({
          totalTickets,
          resolutionBreaches: breachCount,
          compliancePct,
          updatedAt: new Date(),
        })
        .where(eq(analyticsSlaDaily.id, existing[0].id));
    } else {
      await pg.insert(analyticsSlaDaily).values({
        id: uuid(),
        tenantId,
        date: dateStr,
        totalTickets,
        pickupBreaches: 0,
        resolutionBreaches: breachCount,
        compliancePct,
      });
    }
  }

  /**
   * Sync engineer performance for the current ISO week.
   */
  async syncEngineerPerf(tenantId: string, engineerId: string): Promise<void> {
    const weekKey = (() => {
      const d = new Date();
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
    })();

    const mssql = await getMssqlDb();
    const pg = getPostgresDb();

    const weekStart = this.isoWeekStart();
    const weekStartStr = weekStart.toISOString().split('T')[0]!;

    // Resolved tickets this week
    const resolvedRows = await mssql
      .select({ count: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          eq(tickets.assigneeId, engineerId),
          sql`${tickets.status} IN ('RESOLVED', 'CLOSED')`,
          sql`CAST(${tickets.resolvedAt} AS DATE) >= ${weekStartStr}`,
        ),
      );
    const ticketsResolved = Number(resolvedRows[0]?.count ?? 0);

    const breachRows = await mssql
      .select({ count: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          eq(tickets.assigneeId, engineerId),
          sql`${tickets.slaResolutionBreached} = 1`,
          sql`CAST(${tickets.createdAt} AS DATE) >= ${weekStartStr}`,
        ),
      );
    const slaBreaches = Number(breachRows[0]?.count ?? 0);

    const avgRows = await mssql
      .select({ avg: sql<string>`AVG(DATEDIFF(HOUR, ${tickets.createdAt}, ${tickets.resolvedAt}))` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          eq(tickets.assigneeId, engineerId),
          sql`${tickets.resolvedAt} IS NOT NULL`,
          sql`CAST(${tickets.resolvedAt} AS DATE) >= ${weekStartStr}`,
        ),
      );
    const avgResolutionHours = avgRows[0]?.avg ?? null;

    // Latest KPI score from kpi_results (most recent period)
    const kpiRows = await mssql
      .select({ score: kpiResults.overallScore })
      .from(kpiResults)
      .where(and(eq(kpiResults.tenantId, tenantId), eq(kpiResults.engineerId, engineerId)))
      .orderBy(sql`${kpiResults.computedAt} DESC`)
      .limit(1);
    const kpiScore = kpiRows[0]?.score ?? null;

    const existing = await pg
      .select({ id: analyticsEngineerPerf.id })
      .from(analyticsEngineerPerf)
      .where(
        and(
          eq(analyticsEngineerPerf.tenantId, tenantId),
          eq(analyticsEngineerPerf.engineerId, engineerId),
          eq(analyticsEngineerPerf.weekKey, weekKey),
        ),
      )
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      await pg
        .update(analyticsEngineerPerf)
        .set({
          ticketsResolved,
          slaBreaches,
          avgResolutionHours: avgResolutionHours?.toString() ?? null,
          kpiScore: kpiScore !== null ? String(kpiScore) : null,
          updatedAt: new Date(),
        })
        .where(eq(analyticsEngineerPerf.id, existing[0].id));
    } else {
      await pg.insert(analyticsEngineerPerf).values({
        id: uuid(),
        tenantId,
        engineerId,
        weekKey,
        ticketsResolved,
        tasksCompleted: 0,
        slaBreaches,
        avgResolutionHours: avgResolutionHours?.toString() ?? null,
        kpiScore: kpiScore !== null ? String(kpiScore) : null,
      });
    }
  }

  /**
   * Full-batch daily sync for all tenants.
   * Called by BullMQ etl-sync repeatable job.
   */
  async runDailyBatch(): Promise<void> {
    const mssql = await getMssqlDb();
    const today = new Date().toISOString().split('T')[0]!;

    // Get all distinct tenantIds
    const tenantRows = await mssql
      .select({ tenantId: tickets.tenantId })
      .from(tickets)
      .groupBy(tickets.tenantId);

    for (const { tenantId } of tenantRows) {
      await this.syncTicketDay(tenantId, today);

      // Sync all active engineers for this tenant
      const engineerRows = await mssql
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.isActive, 1)));

      for (const eng of engineerRows) {
        await this.syncEngineerPerf(tenantId, eng.id);
      }
    }

    this.logger.log(`ETL daily batch complete for ${tenantRows.length} tenants`);
  }

  private isoWeekStart(): Date {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
}
