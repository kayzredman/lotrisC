/**
 * ETL Backfill Script — populates PostgreSQL analytics tables from MSSQL seed data.
 *
 * Runs syncTicketDay + syncSlaDay for each of the last 30 days for all tenants.
 * This is required after seeding MSSQL data so the dashboard (which reads Postgres) has data.
 *
 * Usage:
 *   cd apps/api
 *   ./node_modules/.bin/tsx src/scripts/etl-backfill.ts
 */
import 'dotenv/config';
import { v4 as uuid } from 'uuid';
import {
  getMssqlDb,
  getPostgresDb,
  analyticsTicketDaily,
  analyticsSlaDaily,
  analyticsEngineerPerf,
  tickets,
  users,
  kpiResults,
  eq,
  and,
  sql,
} from '@lotris/db';

const TENANT_ID = '10000001-0000-0000-0000-000000000001';

async function syncTicketDay(tenantId: string, dateStr: string): Promise<void> {
  const mssql = await getMssqlDb();
  const pg = getPostgresDb();

  const rows = await mssql
    .select({ status: tickets.status, count: sql<number>`COUNT(*)` })
    .from(tickets)
    .where(and(eq(tickets.tenantId, tenantId), sql`CAST(${tickets.createdAt} AS DATE) = ${dateStr}`))
    .groupBy(tickets.status);

  let totalCreated = 0, totalResolved = 0, totalEscalated = 0;
  for (const r of rows) {
    totalCreated += Number(r.count);
    if (r.status === 'RESOLVED' || r.status === 'CLOSED') totalResolved += Number(r.count);
    if (r.status === 'ESCALATED') totalEscalated += Number(r.count);
  }

  // Current open count (not day-scoped — point-in-time snapshot)
  const openRows = await mssql
    .select({ count: sql<number>`COUNT(*)` })
    .from(tickets)
    .where(and(
      eq(tickets.tenantId, tenantId),
      sql`${tickets.status} NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`,
    ));
  const totalOpen = Number(openRows[0]?.count ?? 0);

  const breachRows = await mssql
    .select({ count: sql<number>`COUNT(*)` })
    .from(tickets)
    .where(and(
      eq(tickets.tenantId, tenantId),
      sql`CAST(${tickets.createdAt} AS DATE) = ${dateStr}`,
      sql`${tickets.slaResolutionBreached} = 1`,
    ));
  const slaBreachCount = Number(breachRows[0]?.count ?? 0);

  const avgRows = await mssql
    .select({ avg: sql<string>`AVG(DATEDIFF(HOUR, ${tickets.createdAt}, ${tickets.resolvedAt}))` })
    .from(tickets)
    .where(and(
      eq(tickets.tenantId, tenantId),
      sql`CAST(${tickets.resolvedAt} AS DATE) = ${dateStr}`,
      sql`${tickets.resolvedAt} IS NOT NULL`,
    ));
  const avgResolutionHours = avgRows[0]?.avg ?? null;

  // Upsert ticket_daily
  const existing = await pg
    .select({ id: analyticsTicketDaily.id })
    .from(analyticsTicketDaily)
    .where(and(eq(analyticsTicketDaily.tenantId, tenantId), sql`${analyticsTicketDaily.date} = ${dateStr}`))
    .limit(1);

  if (existing.length > 0 && existing[0]) {
    await pg.update(analyticsTicketDaily)
      .set({ totalCreated, totalResolved, totalEscalated, totalOpen, slaBreachCount, avgResolutionHours: avgResolutionHours?.toString() ?? null, updatedAt: new Date() })
      .where(eq(analyticsTicketDaily.id, existing[0].id));
  } else {
    await pg.insert(analyticsTicketDaily).values({
      id: uuid(), tenantId, date: dateStr, totalCreated, totalResolved, totalEscalated, totalOpen, slaBreachCount, avgResolutionHours: avgResolutionHours?.toString() ?? null,
    });
  }

  // Upsert sla_daily
  const total = totalCreated;
  const compliancePct = total > 0 ? (((total - slaBreachCount) / total) * 100).toFixed(2) : '100.00';
  const slaExisting = await pg
    .select({ id: analyticsSlaDaily.id })
    .from(analyticsSlaDaily)
    .where(and(eq(analyticsSlaDaily.tenantId, tenantId), sql`${analyticsSlaDaily.date} = ${dateStr}`))
    .limit(1);

  if (slaExisting.length > 0 && slaExisting[0]) {
    await pg.update(analyticsSlaDaily)
      .set({ totalTickets: total, resolutionBreaches: slaBreachCount, compliancePct, updatedAt: new Date() })
      .where(eq(analyticsSlaDaily.id, slaExisting[0].id));
  } else {
    await pg.insert(analyticsSlaDaily).values({
      id: uuid(), tenantId, date: dateStr, totalTickets: total, pickupBreaches: 0, resolutionBreaches: slaBreachCount, compliancePct,
    });
  }

  if (totalCreated > 0) {
    console.log(`  [${dateStr}] created=${totalCreated} resolved=${totalResolved} open=${totalOpen} breaches=${slaBreachCount} sla=${compliancePct}%`);
  }
}

async function syncEngineerPerf(tenantId: string): Promise<void> {
  const mssql = await getMssqlDb();
  const pg = getPostgresDb();

  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  const weekKey = `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;

  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(new Date().setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const weekStartStr = monday.toISOString().split('T')[0]!;

  const engineerRows = await mssql
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, 1)));

  for (const eng of engineerRows) {
    const resolvedRows = await mssql
      .select({ count: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.assigneeId, eng.id),
        sql`${tickets.status} IN ('RESOLVED', 'CLOSED')`,
        sql`CAST(${tickets.resolvedAt} AS DATE) >= ${weekStartStr}`,
      ));
    const ticketsResolved = Number(resolvedRows[0]?.count ?? 0);

    const breachRows = await mssql
      .select({ count: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.assigneeId, eng.id),
        sql`${tickets.slaResolutionBreached} = 1`,
        sql`CAST(${tickets.createdAt} AS DATE) >= ${weekStartStr}`,
      ));
    const slaBreaches = Number(breachRows[0]?.count ?? 0);

    const avgRows = await mssql
      .select({ avg: sql<string>`AVG(DATEDIFF(HOUR, ${tickets.createdAt}, ${tickets.resolvedAt}))` })
      .from(tickets)
      .where(and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.assigneeId, eng.id),
        sql`${tickets.resolvedAt} IS NOT NULL`,
        sql`CAST(${tickets.resolvedAt} AS DATE) >= ${weekStartStr}`,
      ));
    const avgResolutionHours = avgRows[0]?.avg ?? null;

    const kpiRows = await mssql
      .select({ score: kpiResults.overallScore })
      .from(kpiResults)
      .where(and(eq(kpiResults.tenantId, tenantId), eq(kpiResults.engineerId, eng.id)))
      .orderBy(sql`${kpiResults.computedAt} DESC`)
      .limit(1);
    const kpiScore = kpiRows[0]?.score ?? null;

    const existing = await pg
      .select({ id: analyticsEngineerPerf.id })
      .from(analyticsEngineerPerf)
      .where(and(
        eq(analyticsEngineerPerf.tenantId, tenantId),
        eq(analyticsEngineerPerf.engineerId, eng.id),
        eq(analyticsEngineerPerf.weekKey, weekKey),
      ))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      await pg.update(analyticsEngineerPerf)
        .set({ ticketsResolved, slaBreaches, avgResolutionHours: avgResolutionHours?.toString() ?? null, kpiScore: kpiScore !== null ? String(kpiScore) : null, updatedAt: new Date() })
        .where(eq(analyticsEngineerPerf.id, existing[0].id));
    } else {
      await pg.insert(analyticsEngineerPerf).values({
        id: uuid(), tenantId, engineerId: eng.id, weekKey, ticketsResolved, tasksCompleted: 0, slaBreaches,
        avgResolutionHours: avgResolutionHours?.toString() ?? null,
        kpiScore: kpiScore !== null ? String(kpiScore) : null,
      });
    }

    if (ticketsResolved > 0 || slaBreaches > 0) {
      console.log(`  [engineer ${eng.id.slice(0, 8)}…] week=${weekKey} resolved=${ticketsResolved} breaches=${slaBreaches}`);
    }
  }
}

async function main() {
  console.log('🔄 ETL Backfill: syncing last 30 days MSSQL → PostgreSQL…\n');

  const today = new Date();
  const dates: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]!);
  }

  console.log(`📅 Syncing ticket analytics for ${dates.length} days (${dates[0]} → ${dates[dates.length - 1]})…`);
  for (const dateStr of dates) {
    await syncTicketDay(TENANT_ID, dateStr);
  }

  console.log('\n👤 Syncing engineer performance for current week…');
  await syncEngineerPerf(TENANT_ID);

  console.log('\n✅ ETL backfill complete. PostgreSQL analytics tables populated.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ ETL backfill failed:', err);
  process.exit(1);
});
