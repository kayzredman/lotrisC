import { Worker, Queue, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import IORedisClient from 'ioredis';
import {
  getMssqlDb,
  getPostgresDb,
  kpiActuals,
  kpiEngineerAssignments,
  kpiDefinitions,
  kpiTrendSnapshots,
  users,
  eq,
  and,
  sql,
} from '@lotris/db';
import { v4 as uuid } from 'uuid';
import { getEnv } from '@lotris/config';

/**
 * KPI Trend Worker — runs every 30 minutes.
 *
 * Standalone version of KpiTrendAnalyser (no NestJS DI).
 * Fetches active KPI assignments, computes linear regression projections,
 * writes kpi_trend_snapshots to PostgreSQL, and queues KPI_WARNING notifications.
 */

function periodEndDate(periodKey: string): Date {
  const qMatch = periodKey.match(/^(\d{4})-Q([1-4])$/);
  if (qMatch) {
    const year  = parseInt(qMatch[1]!, 10);
    const q     = parseInt(qMatch[2]!, 10);
    const month = q * 3;
    return new Date(year, month, 0);
  }
  const mMatch = periodKey.match(/^(\d{4})-(\d{2})$/);
  if (mMatch) {
    const year  = parseInt(mMatch[1]!, 10);
    const month = parseInt(mMatch[2]!, 10);
    return new Date(year, month, 0);
  }
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
}

function linearRegression(points: Array<{ x: number; y: number }>): { slope: number; intercept: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: n === 1 ? points[0]!.y : 0 };
  const sumX  = points.reduce((a, p) => a + p.x, 0);
  const sumY  = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function computeWarning(projected: number, target: number, direction: string): 'NONE' | 'AMBER' | 'RED' {
  if (target === 0) return 'NONE';
  if (direction === 'HIGHER_BETTER') {
    const ratio = projected / target;
    if (ratio < 0.85) return 'RED';
    if (ratio < 0.99) return 'AMBER';
  } else {
    const ratio = target / projected;
    if (ratio < 0.85) return 'RED';
    if (ratio < 0.99) return 'AMBER';
  }
  return 'NONE';
}

async function runKpiTrend(dedup: IORedisClient, notificationsQueue: Queue): Promise<void> {
  const db  = await getMssqlDb();
  const pg  = getPostgresDb();
  const now = new Date();

  const yr  = now.getFullYear();
  const mo  = String(now.getMonth() + 1).padStart(2, '0');
  const q   = Math.ceil((now.getMonth() + 1) / 3);
  const activePeriods = [`${yr}-${mo}`, `${yr}-Q${q}`];

  // Fetch all tenants with active assignments in current periods
  const tenantRows = await db.execute<{ tenant_id: string }>(
    sql`SELECT DISTINCT tenant_id FROM KPI_Engineer_Assignments`,
  );

  for (const { tenant_id: tenantId } of tenantRows) {
    const assignments = await db
      .select({
        engineerId:    kpiEngineerAssignments.engineerId,
        kpiDefId:      kpiEngineerAssignments.kpiDefinitionId,
        periodKey:     kpiEngineerAssignments.periodKey,
        targetOverride: kpiEngineerAssignments.targetOverride,
      })
      .from(kpiEngineerAssignments)
      .where(eq(kpiEngineerAssignments.tenantId, tenantId));

    const active = assignments.filter((a) => activePeriods.includes(a.periodKey));
    if (active.length === 0) continue;

    // Cache engineer + KPI info in maps to reduce repeated queries
    const engineerMap = new Map<string, { name: string; teamId: string | null }>();
    const kpiMap      = new Map<string, { name: string; direction: string; defaultTarget: string }>();

    for (const assign of active) {
      try {
        // Fetch actuals
        const actuals = await db
          .select({ value: kpiActuals.value, recordedAt: kpiActuals.recordedAt })
          .from(kpiActuals)
          .where(
            and(
              eq(kpiActuals.tenantId, tenantId),
              eq(kpiActuals.engineerId, assign.engineerId),
              eq(kpiActuals.kpiDefinitionId, assign.kpiDefId),
            ),
          );

        if (actuals.length === 0) continue;

        // Lazy-load KPI def
        if (!kpiMap.has(assign.kpiDefId)) {
          const defs = await db
            .select({ id: kpiDefinitions.id, name: kpiDefinitions.name, direction: kpiDefinitions.direction, defaultTarget: kpiDefinitions.defaultTarget })
            .from(kpiDefinitions)
            .where(and(eq(kpiDefinitions.tenantId, tenantId), eq(kpiDefinitions.id, assign.kpiDefId)));
          if (defs[0]) kpiMap.set(assign.kpiDefId, { name: defs[0].name, direction: defs[0].direction, defaultTarget: String(defs[0].defaultTarget) });
        }

        // Lazy-load engineer
        if (!engineerMap.has(assign.engineerId)) {
          const found = await db
            .select({ id: users.id, fullName: users.fullName, teamId: users.teamId })
            .from(users)
            .where(and(eq(users.tenantId, tenantId), eq(users.id, assign.engineerId)));
          if (found[0]) engineerMap.set(assign.engineerId, { name: found[0].fullName, teamId: found[0].teamId });
        }

        const kpiDef   = kpiMap.get(assign.kpiDefId);
        const engineer = engineerMap.get(assign.engineerId);
        if (!kpiDef || !engineer) continue;

        const target    = parseFloat(String(assign.targetOverride ?? kpiDef.defaultTarget));
        const direction = kpiDef.direction;

        const sorted = actuals
          .filter((a) => a.recordedAt != null)
          .sort((a, b) => new Date(a.recordedAt!).getTime() - new Date(b.recordedAt!).getTime());

        if (sorted.length === 0) continue;

        const t0      = new Date(sorted[0]!.recordedAt!).getTime();
        const points  = sorted.map((a) => ({
          x: (new Date(a.recordedAt!).getTime() - t0) / 86_400_000,
          y: parseFloat(String(a.value)),
        }));
        const { slope, intercept } = linearRegression(points);
        const actualToDate = points[points.length - 1]!.y;
        const periodEnd    = periodEndDate(assign.periodKey);
        const daysElapsed  = (now.getTime() - t0) / 86_400_000;
        const daysToEnd    = (periodEnd.getTime() - now.getTime()) / 86_400_000;
        const projectedEop = intercept + slope * (daysElapsed + Math.max(0, daysToEnd));

        const warningLevel = computeWarning(projectedEop, target, direction);

        // Write to PostgreSQL
        try {
          await pg.insert(kpiTrendSnapshots).values({
            id:           uuid(),
            tenantId,
            engineerId:   assign.engineerId,
            kpiDefId:     assign.kpiDefId,
            periodKey:    assign.periodKey,
            snapshotAt:   now,
            actualToDate: String(actualToDate),
            projectedEop: String(projectedEop),
            target:       String(target),
            warningLevel,
          });
        } catch (pgErr) {
          console.error(`[kpi-trend] PG insert failed:`, pgErr);
        }

        // Cache in Redis
        const cacheKey = `kpi-trend:${assign.engineerId}:${assign.kpiDefId}:${assign.periodKey}`;
        await dedup.set(cacheKey, JSON.stringify({ actualToDate, projectedEop, target, warningLevel }), 'EX', 7200);

        if (warningLevel === 'NONE') continue;

        // Dedup alert
        const alertKey = `kpi-alert:${assign.engineerId}:${assign.kpiDefId}:${assign.periodKey}:${warningLevel}`;
        const wasSet   = await dedup.set(alertKey, '1', 'EX', 82_800, 'NX');
        if (!wasSet) continue;

        await notificationsQueue.add('KPI_WARNING', {
          type:          'KPI_WARNING',
          tenantId,
          engineerId:    assign.engineerId,
          engineerName:  engineer.name,
          kpiName:       kpiDef.name,
          projectedScore: projectedEop,
          target,
          warningLevel,
          periodKey:     assign.periodKey,
        }, {
          attempts: 3,
          backoff:  { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail:     { count: 500 },
        });

        // Push to team lead digest
        if (engineer.teamId) {
          const leads = await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(and(eq(users.tenantId, tenantId), eq(users.teamId, engineer.teamId), eq(users.roleId, 4)));
          for (const lead of leads) {
            await dedup.rpush(`digest:lead:${lead.id}`, JSON.stringify({
              engineerName:  engineer.name,
              kpiName:       kpiDef.name,
              projectedScore: projectedEop,
              target,
              warningLevel,
              periodKey:     assign.periodKey,
            }));
            // Store as "leadId|leadEmail" so digest.worker can send to the right address
            await dedup.sadd('digest:active-leads', `${lead.id}|${lead.email}`);
          }
        }

        console.log(`[kpi-trend] ${warningLevel}: ${engineer.name} / ${kpiDef.name} / ${assign.periodKey}`);
      } catch (err) {
        console.error(`[kpi-trend] error for engineer=${assign.engineerId} kpi=${assign.kpiDefId}:`, err);
      }
    }
  }
}

export function createKpiTrendWorker(connection: IORedis): Worker {
  const env   = getEnv();
  const dedup = new IORedisClient(env.REDIS_URL, { maxRetriesPerRequest: null });
  const notificationsQueue = new Queue('notifications', { connection: new IORedisClient(env.REDIS_URL, { maxRetriesPerRequest: null }) });

  return new Worker(
    'kpi-trend',
    async (_job: Job) => {
      await runKpiTrend(dedup, notificationsQueue);
    },
    { connection, concurrency: 1 },
  );
}
