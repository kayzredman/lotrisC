import type { ConnectionOptions } from 'bullmq';
import { Worker, Queue, type Job } from 'bullmq';
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
  desc,
} from '@lotris/db';
import { v4 as uuid } from 'uuid';

/**
 * ETL sync worker — daily full-batch sync of MSSQL analytics data into PostgreSQL.
 *
 * Job payload:
 *   { tenantId?: string; date?: string }
 */

interface EtlJobPayload {
  tenantId?: string;
  date?: string;
}

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

  const openRows = await mssql
    .select({ count: sql<number>`COUNT(*)` })
    .from(tickets)
    .where(and(eq(tickets.tenantId, tenantId), sql`${tickets.status} NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`));
  const totalOpen = Number(openRows[0]?.count ?? 0);

  const breachRows = await mssql
    .select({ count: sql<number>`COUNT(*)` })
    .from(tickets)
    .where(and(eq(tickets.tenantId, tenantId), sql`CAST(${tickets.createdAt} AS DATE) = ${dateStr}`, sql`${tickets.slaResolutionBreached} = 1`));
  const slaBreachCount = Number(breachRows[0]?.count ?? 0);

  const avgRows = await mssql
    .select({ avg: sql<string>`AVG(DATEDIFF(HOUR, ${tickets.createdAt}, ${tickets.resolvedAt}))` })
    .from(tickets)
    .where(and(eq(tickets.tenantId, tenantId), sql`CAST(${tickets.resolvedAt} AS DATE) = ${dateStr}`, sql`${tickets.resolvedAt} IS NOT NULL`));
  const avgResolutionHours = avgRows[0]?.avg ?? null;

  const existing = await pg
    .select({ id: analyticsTicketDaily.id })
    .from(analyticsTicketDaily)
    .where(and(eq(analyticsTicketDaily.tenantId, tenantId), sql`${analyticsTicketDaily.date} = ${dateStr}`))
    .limit(1);

  if (existing.length > 0 && existing[0]) {
    await pg.update(analyticsTicketDaily).set({ totalCreated, totalResolved, totalEscalated, totalOpen, slaBreachCount, avgResolutionHours: avgResolutionHours?.toString() ?? null, updatedAt: new Date() }).where(eq(analyticsTicketDaily.id, existing[0].id));
  } else {
    await pg.insert(analyticsTicketDaily).values({ id: uuid(), tenantId, date: dateStr, totalCreated, totalResolved, totalEscalated, totalOpen, slaBreachCount, avgResolutionHours: avgResolutionHours?.toString() ?? null });
  }

  // SLA daily upsert
  const total = totalCreated;
  const compliancePct = total > 0 ? (((total - slaBreachCount) / total) * 100).toFixed(2) : '100.00';
  const slaExisting = await pg.select({ id: analyticsSlaDaily.id }).from(analyticsSlaDaily).where(and(eq(analyticsSlaDaily.tenantId, tenantId), sql`${analyticsSlaDaily.date} = ${dateStr}`)).limit(1);
  if (slaExisting.length > 0 && slaExisting[0]) {
    await pg.update(analyticsSlaDaily).set({ totalTickets: total, resolutionBreaches: slaBreachCount, compliancePct, updatedAt: new Date() }).where(eq(analyticsSlaDaily.id, slaExisting[0].id));
  } else {
    await pg.insert(analyticsSlaDaily).values({ id: uuid(), tenantId, date: dateStr, totalTickets: total, pickupBreaches: 0, resolutionBreaches: slaBreachCount, compliancePct });
  }
}

async function runDailyBatch(): Promise<void> {
  const mssql = await getMssqlDb();
  const today = new Date().toISOString().split('T')[0]!;
  const tenantRows = await mssql.select({ tenantId: tickets.tenantId }).from(tickets).groupBy(tickets.tenantId);
  for (const { tenantId } of tenantRows) {
    await syncTicketDay(tenantId, today);
  }
  console.log(`[ETL] Daily batch complete for ${tenantRows.length} tenants`);
}

export function createEtlSyncWorker(connection: ConnectionOptions): Worker {
  return new Worker<EtlJobPayload>(
    'etl-sync',
    async (job: Job<EtlJobPayload>) => {
      const { tenantId, date } = job.data;
      const dateStr = date ?? new Date().toISOString().split('T')[0]!;
      if (tenantId) {
        await syncTicketDay(tenantId, dateStr);
      } else {
        await runDailyBatch();
      }
    },
    { connection, concurrency: 1 },
  );
}

export async function registerEtlRepeatableJob(queue: Queue): Promise<void> {
  // Remove legacy once-daily job if it exists
  await queue.removeRepeatable('daily-batch', { pattern: '5 0 * * *', jobId: 'etl-daily-batch' }).catch(() => {});

  // Twice-daily: 06:00 UTC and 18:00 UTC (idempotent — BullMQ deduplicates by jobId)
  await queue.add('daily-batch-morning', {}, {
    repeat: { pattern: '0 6 * * *' },
    jobId: 'etl-daily-0600',
  });
  await queue.add('daily-batch-evening', {}, {
    repeat: { pattern: '0 18 * * *' },
    jobId: 'etl-daily-1800',
  });

  // Run an immediate backfill for today so data shows up without waiting for cron
  await queue.add('daily-batch-now', {}, { jobId: 'etl-backfill-today' });

  console.log('[ETL] Repeatable jobs registered: 06:00 UTC + 18:00 UTC + immediate backfill');
}
