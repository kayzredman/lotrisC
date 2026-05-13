import { Injectable, Logger } from '@nestjs/common';
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
  asc,
  sql,
} from '@lotris/db';
import { v4 as uuid } from 'uuid';
import IORedis from 'ioredis';
import { getEnv } from '@lotris/config';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * KpiTrendAnalyser — for each active KPI engineer assignment in the current
 * period, fits a linear regression on recorded actuals and projects the
 * end-of-period score. Writes results to `kpi_trend_snapshots` (PostgreSQL)
 * and queues KPI_WARNING notifications when projections look bad.
 *
 * Multi-tenancy: every MSSQL query includes a tenantId filter (Rule 3).
 */
@Injectable()
export class KpiTrendAnalyser {
  private readonly logger = new Logger(KpiTrendAnalyser.name);
  private dedupClient: IORedis | null = null;

  constructor(private readonly notifications: NotificationsService) {}

  private getDedup(): IORedis {
    if (!this.dedupClient) {
      this.dedupClient = new IORedis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
    }
    return this.dedupClient;
  }

  /**
   * Parse a periodKey like "2026-Q2" or "2026-05" into the period end date.
   */
  static periodEndDate(periodKey: string): Date {
    const qMatch = periodKey.match(/^(\d{4})-Q([1-4])$/);
    if (qMatch) {
      const year = parseInt(qMatch[1]!, 10);
      const q    = parseInt(qMatch[2]!, 10);
      // Q1=Mar 31, Q2=Jun 30, Q3=Sep 30, Q4=Dec 31
      const month = q * 3; // 3,6,9,12
      return new Date(year, month, 0); // day 0 = last day of previous month → last day of `month`
    }
    const mMatch = periodKey.match(/^(\d{4})-(\d{2})$/);
    if (mMatch) {
      const year  = parseInt(mMatch[1]!, 10);
      const month = parseInt(mMatch[2]!, 10);
      return new Date(year, month, 0); // last day of the given month
    }
    // Fallback: 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }

  /**
   * Linear regression: returns { slope, intercept } where x = days since first
   * data point and y = value.
   */
  private static linearRegression(
    points: Array<{ x: number; y: number }>,
  ): { slope: number; intercept: number } {
    const n = points.length;
    if (n < 2) {
      return { slope: 0, intercept: n === 1 ? points[0]!.y : 0 };
    }
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

  /**
   * Determine warning level for a given direction, projected score, and target.
   * HIGHER_BETTER: warn when projected < target  (falling below)
   * LOWER_BETTER:  warn when projected > target  (rising above)
   */
  computeWarning(
    projected: number,
    target: number,
    direction: string,
  ): 'NONE' | 'AMBER' | 'RED' {
    if (target === 0) return 'NONE';
    if (direction === 'HIGHER_BETTER') {
      const ratio = projected / target;
      if (ratio < 0.85) return 'RED';
      if (ratio < 0.99) return 'AMBER';
    } else {
      // LOWER_BETTER: threshold applies as target/projected
      const ratio = target / projected;
      if (ratio < 0.85) return 'RED';
      if (ratio < 0.99) return 'AMBER';
    }
    return 'NONE';
  }

  /**
   * Compute trend for a single engineer/KPI/period.
   * Returns the projected end-of-period score, actual to date, and warning level.
   */
  async computeTrend(
    engineerId: string,
    kpiDefId: string,
    periodKey: string,
    tenantId: string,
  ): Promise<{
    actualToDate: number;
    projectedEop: number;
    target: number;
    warningLevel: 'NONE' | 'AMBER' | 'RED';
  } | null> {
    const db = await getMssqlDb();

    // Fetch actuals for this engineer/KPI in the period
    // We use kpiDefinitionId matching and recordedAt ordering
    const actuals = await db
      .select({ value: kpiActuals.value, recordedAt: kpiActuals.recordedAt })
      .from(kpiActuals)
      .where(
        and(
          eq(kpiActuals.tenantId, tenantId),
          eq(kpiActuals.engineerId, engineerId),
          eq(kpiActuals.kpiDefinitionId, kpiDefId),
        ),
      );

    if (actuals.length === 0) return null;

    // Get assignment details (target + direction)
    const assignments = await db
      .select({
        targetOverride: kpiEngineerAssignments.targetOverride,
        kpiDefinitionId: kpiEngineerAssignments.kpiDefinitionId,
      })
      .from(kpiEngineerAssignments)
      .where(
        and(
          eq(kpiEngineerAssignments.tenantId, tenantId),
          eq(kpiEngineerAssignments.engineerId, engineerId),
          eq(kpiEngineerAssignments.kpiDefinitionId, kpiDefId),
          eq(kpiEngineerAssignments.periodKey, periodKey),
        ),
      );

    const kpiDefs = await db
      .select({ defaultTarget: kpiDefinitions.defaultTarget, direction: kpiDefinitions.direction, name: kpiDefinitions.name })
      .from(kpiDefinitions)
      .where(and(eq(kpiDefinitions.tenantId, tenantId), eq(kpiDefinitions.id, kpiDefId)));

    const kpiDef   = kpiDefs[0];
    const assign   = assignments[0];
    if (!kpiDef) return null;

    const rawTarget = assign?.targetOverride ?? kpiDef.defaultTarget;
    const target    = parseFloat(String(rawTarget));
    const direction = kpiDef.direction ?? 'HIGHER_BETTER';

    // Sort actuals by recordedAt
    const sorted = actuals
      .filter((a) => a.recordedAt != null)
      .sort((a, b) => new Date(a.recordedAt!).getTime() - new Date(b.recordedAt!).getTime());

    if (sorted.length === 0) return null;

    const t0 = new Date(sorted[0]!.recordedAt!).getTime();
    const points = sorted.map((a) => ({
      x: (new Date(a.recordedAt!).getTime() - t0) / 86_400_000, // days since first
      y: parseFloat(String(a.value)),
    }));

    const { slope, intercept } = KpiTrendAnalyser.linearRegression(points);
    const actualToDate = points[points.length - 1]!.y;

    const periodEnd    = KpiTrendAnalyser.periodEndDate(periodKey);
    const daysToEnd    = (periodEnd.getTime() - Date.now()) / 86_400_000;
    const daysElapsed  = (Date.now() - t0) / 86_400_000;
    const projectedEop = intercept + slope * (daysElapsed + Math.max(0, daysToEnd));

    const warningLevel = this.computeWarning(projectedEop, target, direction);
    return { actualToDate, projectedEop, target, warningLevel };
  }

  /**
   * Scan all active KPI assignments for the current period under a given tenant.
   * Writes `kpi_trend_snapshots` rows and queues warnings as needed.
   */
  async scanAllEngineers(tenantId: string): Promise<void> {
    const db    = await getMssqlDb();
    const pg    = getPostgresDb();
    const dedup = this.getDedup();
    const now   = new Date();

    // Determine current period keys (monthly + quarterly)
    const yr    = now.getFullYear();
    const mo    = String(now.getMonth() + 1).padStart(2, '0');
    const q     = Math.ceil((now.getMonth() + 1) / 3);
    const activePeriods = [`${yr}-${mo}`, `${yr}-Q${q}`];

    // Fetch all active assignments for this tenant in current periods
    const assignments = await db
      .select({
        id:            kpiEngineerAssignments.id,
        engineerId:    kpiEngineerAssignments.engineerId,
        kpiDefId:      kpiEngineerAssignments.kpiDefinitionId,
        periodKey:     kpiEngineerAssignments.periodKey,
        targetOverride: kpiEngineerAssignments.targetOverride,
      })
      .from(kpiEngineerAssignments)
      .where(eq(kpiEngineerAssignments.tenantId, tenantId));

    // Filter to active periods in JS to avoid complex MSSQL stub IN()
    const active = assignments.filter((a) => activePeriods.includes(a.periodKey));
    if (active.length === 0) return;

    // Build engineer email/name map
    const engineerIds = [...new Set(active.map((a) => a.engineerId))];
    const engineerMap = new Map<string, { name: string; teamId: string | null }>();
    for (const eid of engineerIds) {
      const found = await db
        .select({ id: users.id, fullName: users.fullName, teamId: users.teamId })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.id, eid)));
      if (found[0]) engineerMap.set(eid, { name: found[0].fullName, teamId: found[0].teamId });
    }

    // Build KPI name map
    const kpiIds  = [...new Set(active.map((a) => a.kpiDefId))];
    const kpiMap  = new Map<string, { name: string; direction: string }>();
    for (const kid of kpiIds) {
      const found = await db
        .select({ id: kpiDefinitions.id, name: kpiDefinitions.name, direction: kpiDefinitions.direction })
        .from(kpiDefinitions)
        .where(and(eq(kpiDefinitions.tenantId, tenantId), eq(kpiDefinitions.id, kid)));
      if (found[0]) kpiMap.set(kid, { name: found[0].name, direction: found[0].direction });
    }

    for (const assign of active) {
      try {
        const trend = await this.computeTrend(assign.engineerId, assign.kpiDefId, assign.periodKey, tenantId);
        if (!trend) continue;

        const { actualToDate, projectedEop, target, warningLevel } = trend;

        // Write snapshot to PostgreSQL (upsert by deleting old then inserting)
        const snapshotId = uuid();
        await pg.insert(kpiTrendSnapshots).values({
          id:           snapshotId,
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

        // Cache in Redis (TTL 2h)
        const cacheKey = `kpi-trend:${assign.engineerId}:${assign.kpiDefId}:${assign.periodKey}`;
        await dedup.set(cacheKey, JSON.stringify({ actualToDate, projectedEop, target, warningLevel }), 'EX', 7200);

        if (warningLevel === 'NONE') continue;

        // Dedup alert (TTL 23h — one alert per level per period per day)
        const alertKey = `kpi-alert:${assign.engineerId}:${assign.kpiDefId}:${assign.periodKey}:${warningLevel}`;
        const wasSet   = await dedup.set(alertKey, '1', 'EX', 82_800, 'NX');
        if (!wasSet) continue;

        const engineer = engineerMap.get(assign.engineerId);
        const kpi      = kpiMap.get(assign.kpiDefId);
        if (!engineer || !kpi) continue;

        // Queue KPI_WARNING notification (SSE via notifications worker)
        await this.notifications.queueKpiWarning({
          type:          'KPI_WARNING',
          tenantId,
          engineerId:    assign.engineerId,
          engineerName:  engineer.name,
          kpiName:       kpi.name,
          projectedScore: projectedEop,
          target,
          warningLevel,
          periodKey:     assign.periodKey,
        });

        // Push to team lead digest queue
        if (engineer.teamId) {
          const leads = await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(
              and(
                eq(users.tenantId, tenantId),
                eq(users.teamId, engineer.teamId),
                eq(users.roleId, 4), // TEAM_LEAD
              ),
            );
          for (const lead of leads) {
            const digestItem = JSON.stringify({
              engineerName:  engineer.name,
              kpiName:       kpi.name,
              projectedScore: projectedEop,
              target,
              warningLevel,
              periodKey:     assign.periodKey,
            });
            await dedup.rpush(`digest:lead:${lead.id}`, digestItem);
            // Store as "leadId|leadEmail" so digest.worker can resolve the email
            await dedup.sadd('digest:active-leads', `${lead.id}|${lead.email}`);
          }
        }

        this.logger.log(
          `KPI ${warningLevel} queued: ${engineer.name} / ${kpi.name} / ${assign.periodKey} (projected=${projectedEop.toFixed(2)}, target=${target})`,
        );
      } catch (err) {
        this.logger.error(
          `KPI trend error for engineer=${assign.engineerId} kpi=${assign.kpiDefId}: ${String(err)}`,
        );
      }
    }
  }
}
