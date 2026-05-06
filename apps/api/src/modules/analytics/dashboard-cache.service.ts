import { Injectable, Logger } from '@nestjs/common';
import { getPostgresDb, analyticsTicketDaily, analyticsSlaDaily, analyticsEngineerPerf, eq, and, desc, sql } from '@lotris/db';
import type Redis from 'ioredis';

const TTL_SECONDS = 30;

@Injectable()
export class DashboardCacheService {
  private readonly logger = new Logger(DashboardCacheService.name);

  constructor() {}

  private getRedis(): Redis | null {
    try {
      // Access ioredis client via global redis connection (injected via BullMQ's ioredis)
      // Falls back gracefully if Redis is unavailable
      return (global as any).__lotrisRedis as Redis ?? null;
    } catch {
      return null;
    }
  }

  private async getCached<T>(key: string): Promise<T | null> {
    const redis = this.getRedis();
    if (!redis) return null;
    try {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.warn(`Redis get failed for ${key}: ${err}`);
      return null;
    }
  }

  private async setCache(key: string, value: unknown): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(value), 'EX', TTL_SECONDS);
    } catch (err) {
      this.logger.warn(`Redis set failed for ${key}: ${err}`);
    }
  }

  async invalidate(tenantId: string): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;
    const keys = [
      `dash:${tenantId}:summary`,
      `dash:${tenantId}:queue`,
      `dash:${tenantId}:engineer-perf`,
      `dash:${tenantId}:ticket-analytics`,
    ];
    try {
      await redis.del(...keys);
    } catch (err) {
      this.logger.warn(`Redis invalidate failed for tenant ${tenantId}: ${err}`);
    }
  }

  async getSummary(tenantId: string) {
    const cacheKey = `dash:${tenantId}:summary`;
    const cached = await this.getCached<object>(cacheKey);
    if (cached) return cached;

    const pg = getPostgresDb();

    // Last 30 days of ticket daily rows
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0]!;

    const rows = await pg
      .select()
      .from(analyticsTicketDaily)
      .where(
        and(
          eq(analyticsTicketDaily.tenantId, tenantId),
          sql`${analyticsTicketDaily.date} >= ${dateStr}`,
        ),
      )
      .orderBy(desc(analyticsTicketDaily.date))
      .limit(30);

    const totalOpen = rows[0]?.totalOpen ?? 0;
    const avgResolutionHours =
      rows.length > 0
        ? rows.reduce((s, r) => s + parseFloat(r.avgResolutionHours ?? '0'), 0) / rows.length
        : 0;

    const slaRows = await pg
      .select()
      .from(analyticsSlaDaily)
      .where(
        and(
          eq(analyticsSlaDaily.tenantId, tenantId),
          sql`${analyticsSlaDaily.date} >= ${dateStr}`,
        ),
      )
      .orderBy(desc(analyticsSlaDaily.date))
      .limit(30);

    const slaCompliancePct =
      slaRows.length > 0
        ? slaRows.reduce((s, r) => s + parseFloat(r.compliancePct ?? '100'), 0) / slaRows.length
        : 100;

    const result = {
      openTickets: Number(totalOpen),
      slaCompliancePct: Math.round(slaCompliancePct * 10) / 10,
      avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
      ticketDaily: rows.slice(0, 7),
    };

    await this.setCache(cacheKey, result);
    return result;
  }

  async getTicketAnalytics(tenantId: string) {
    const cacheKey = `dash:${tenantId}:ticket-analytics`;
    const cached = await this.getCached<object>(cacheKey);
    if (cached) return cached;

    const pg = getPostgresDb();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0]!;

    const ticketRows = await pg
      .select()
      .from(analyticsTicketDaily)
      .where(
        and(
          eq(analyticsTicketDaily.tenantId, tenantId),
          sql`${analyticsTicketDaily.date} >= ${dateStr}`,
        ),
      )
      .orderBy(analyticsTicketDaily.date)
      .limit(7);

    const slaRows = await pg
      .select()
      .from(analyticsSlaDaily)
      .where(
        and(
          eq(analyticsSlaDaily.tenantId, tenantId),
          sql`${analyticsSlaDaily.date} >= ${dateStr}`,
        ),
      )
      .orderBy(analyticsSlaDaily.date)
      .limit(7);

    const result = { ticketTrend: ticketRows, slaTrend: slaRows };
    await this.setCache(cacheKey, result);
    return result;
  }

  async getEngineerPerf(tenantId: string) {
    const cacheKey = `dash:${tenantId}:engineer-perf`;
    const cached = await this.getCached<object[]>(cacheKey);
    if (cached) return cached;

    const pg = getPostgresDb();
    const currentWeek = (() => {
      const d = new Date();
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
    })();

    const rows = await pg
      .select()
      .from(analyticsEngineerPerf)
      .where(
        and(
          eq(analyticsEngineerPerf.tenantId, tenantId),
          eq(analyticsEngineerPerf.weekKey, currentWeek),
        ),
      );

    await this.setCache(cacheKey, rows);
    return rows;
  }

  async getQueueHealth(tenantId: string) {
    const cacheKey = `dash:${tenantId}:queue`;
    const cached = await this.getCached<object>(cacheKey);
    if (cached) return cached;

    // Queue health is computed from ticket daily: recent breach + open counts
    const pg = getPostgresDb();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateStr = threeDaysAgo.toISOString().split('T')[0]!;

    const rows = await pg
      .select()
      .from(analyticsTicketDaily)
      .where(
        and(
          eq(analyticsTicketDaily.tenantId, tenantId),
          sql`${analyticsTicketDaily.date} >= ${dateStr}`,
        ),
      )
      .orderBy(desc(analyticsTicketDaily.date))
      .limit(3);

    const result = {
      openTickets: rows[0]?.totalOpen ?? 0,
      recentBreaches: rows.reduce((s, r) => s + (r.slaBreachCount ?? 0), 0),
      resolvedLast3Days: rows.reduce((s, r) => s + (r.totalResolved ?? 0), 0),
    };

    await this.setCache(cacheKey, result);
    return result;
  }
}
