import { Injectable, Logger } from '@nestjs/common';
import {
  getMssqlDb, getPostgresDb,
  tickets, kpiResults, users,
  analyticsTicketDaily, analyticsSlaDaily, analyticsEngineerPerf,
  eq, and, desc, inArray, isNotNull, sql,
} from '@lotris/db';
import type Redis from 'ioredis';
import type { TrpcAuth } from '@lotris/types';

const TTL_SECONDS = 30;

/** Roles that see full org-level dashboard data */
const ORG_LEVEL_ROLES: TrpcAuth['role'][] = ['SUPERADMIN', 'ADMIN', 'IT_MANAGER', 'EXECUTIVE'];

@Injectable()
export class DashboardCacheService {
  private readonly logger = new Logger(DashboardCacheService.name);

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

  /** Look up the calling user's team ID from MSSQL. */
  private async getUserTeam(userId: string, tenantId: string): Promise<string | null> {
    const db = await getMssqlDb();
    const [row] = await db
      .select({ teamId: users.teamId })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
    return row?.teamId ?? null;
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

  async getSummary(auth: TrpcAuth) {
    const { tenantId, role, userId } = auth;
    const db = await getMssqlDb();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── ENGINEER: personal stats (bypass cache) ──────────────────────────
    if (role === 'ENGINEER') {
      const statusCounts = await db
        .select({ status: tickets.status, total: sql<number>`COUNT(*)` })
        .from(tickets)
        .where(and(eq(tickets.tenantId, tenantId), eq(tickets.assigneeId, userId)))
        .groupBy(tickets.status);
      const countOf = (s: string) => statusCounts.find((r) => r.status === s)?.total ?? 0;
      const openTickets = countOf('ASSIGNED') + countOf('IN_PROGRESS') + countOf('ESCALATED');
      const resolvedMTD = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(tickets)
        .where(and(
          eq(tickets.tenantId, tenantId), eq(tickets.assigneeId, userId),
          inArray(tickets.status, ['RESOLVED', 'CLOSED']),
          sql`${tickets.resolvedAt} >= ${monthStart.toISOString()}`,
        ))
        .then((r) => r[0]?.total ?? 0);
      const slaBreached = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(tickets)
        .where(and(
          eq(tickets.tenantId, tenantId), eq(tickets.assigneeId, userId),
          inArray(tickets.status, ['ASSIGNED', 'IN_PROGRESS', 'ESCALATED']),
          eq(tickets.slaResolutionBreached, 1),
        ))
        .then((r) => r[0]?.total ?? 0);
      const kpiScoreRows = await db
        .select({ score: kpiResults.overallScore })
        .from(kpiResults)
        .where(and(eq(kpiResults.tenantId, tenantId), eq(kpiResults.engineerId, userId)))
        .orderBy(desc(kpiResults.computedAt))
        .limit(1);
      const kpiScore = kpiScoreRows.length > 0
        ? Math.round(parseFloat((kpiScoreRows[0] as { score: string | null }).score ?? '0'))
        : 0;
      return { openTickets, resolvedMTD, slaBreached, kpiScore };
    }

    // ── TEAM_LEAD: team-scoped stats ──────────────────────────────────────
    if (role === 'TEAM_LEAD') {
      const teamId = await this.getUserTeam(userId, tenantId);
      if (teamId) {
        const cacheKey = `dash:${tenantId}:team:${teamId}:summary`;
        const cached = await this.getCached<object>(cacheKey);
        if (cached) return cached;
        const teamFilter = and(eq(tickets.tenantId, tenantId), eq(tickets.teamId, teamId));
        const statusCounts = await db
          .select({ status: tickets.status, total: sql<number>`COUNT(*)` })
          .from(tickets).where(teamFilter).groupBy(tickets.status);
        const countOf = (s: string) => statusCounts.find((r) => r.status === s)?.total ?? 0;
        const openTickets = countOf('NEW') + countOf('TEAM_ASSIGNED') + countOf('ASSIGNED') +
          countOf('IN_PROGRESS') + countOf('ESCALATED');
        const resolvedMTD = await db
          .select({ total: sql<number>`COUNT(*)` })
          .from(tickets)
          .where(and(teamFilter, inArray(tickets.status, ['RESOLVED', 'CLOSED']),
            sql`${tickets.resolvedAt} >= ${monthStart.toISOString()}`
          ))
          .then((r) => r[0]?.total ?? 0);
        const slaBreached = await db
          .select({ total: sql<number>`COUNT(*)` })
          .from(tickets)
          .where(and(teamFilter,
            inArray(tickets.status, ['NEW', 'TEAM_ASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED']),
            eq(tickets.slaResolutionBreached, 1)
          ))
          .then((r) => r[0]?.total ?? 0);
        const kpiScoreRows = await db
          .select({ score: kpiResults.overallScore })
          .from(kpiResults)
          .where(eq(kpiResults.tenantId, tenantId))
          .orderBy(desc(kpiResults.computedAt)).limit(20);
        const kpiScore = kpiScoreRows.length > 0
          ? Math.round(kpiScoreRows.reduce((s, r) => s + parseFloat(r.score ?? '0'), 0) / kpiScoreRows.length)
          : 0;
        const result = { openTickets, resolvedMTD, slaBreached, kpiScore };
        await this.setCache(cacheKey, result);
        return result;
      }
      // Fallthrough to org-level if TEAM_LEAD has no team assigned
    }

    // ── Org-level roles (ADMIN, SUPERADMIN, IT_MANAGER, EXECUTIVE) ────────
    const cacheKey = `dash:${tenantId}:summary`;
    const cached = await this.getCached<object>(cacheKey);
    if (cached) return cached;

    // Count tickets by status — single scan
    const statusCounts = await db
      .select({
        status: tickets.status,
        total: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(eq(tickets.tenantId, tenantId))
      .groupBy(tickets.status);

    const countOf = (status: string) =>
      statusCounts.find((r) => r.status === status)?.total ?? 0;

    const openTickets =
      countOf('NEW') + countOf('TEAM_ASSIGNED') + countOf('ASSIGNED') +
      countOf('IN_PROGRESS') + countOf('ESCALATED');

    // Resolved this calendar month
    const resolvedMTD = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          inArray(tickets.status, ['RESOLVED', 'CLOSED']),
          sql`${tickets.resolvedAt} >= ${monthStart.toISOString()}`,
        ),
      )
      .then((r) => r[0]?.total ?? 0);

    // SLA breached (open tickets only)
    const slaBreached = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          inArray(tickets.status, ['NEW', 'TEAM_ASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED']),
          eq(tickets.slaResolutionBreached, 1),
        ),
      )
      .then((r) => r[0]?.total ?? 0);

    // Latest avg KPI score across all engineers for this tenant
    const kpiScoreRows = await db
      .select({ score: kpiResults.overallScore })
      .from(kpiResults)
      .where(eq(kpiResults.tenantId, tenantId))
      .orderBy(desc(kpiResults.computedAt))
      .limit(20);

    const kpiScore =
      kpiScoreRows.length > 0
        ? Math.round(
            kpiScoreRows.reduce((s, r) => s + parseFloat(r.score ?? '0'), 0) /
              kpiScoreRows.length,
          )
        : 0;

    const result = { openTickets, resolvedMTD, slaBreached, kpiScore };
    await this.setCache(cacheKey, result);
    return result;
  }

  async getTicketAnalytics(auth: TrpcAuth) {
    const tenantId = auth.tenantId;
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

  async getEngineerPerf(auth: TrpcAuth): Promise<{ name: string; team: string; tickets: number; score: number }[]> {
    const { tenantId, role, userId } = auth;
    const cacheKey = ORG_LEVEL_ROLES.includes(role)
      ? `dash:${tenantId}:engineer-perf`
      : role === 'TEAM_LEAD'
        ? `dash:${tenantId}:team:${userId}:engineer-perf`
        : null; // ENGINEER: no cache
    if (cacheKey) {
      const cached = await this.getCached<{ name: string; team: string; tickets: number; score: number }[]>(cacheKey);
      if (cached) return cached;
    }

    const pg = getPostgresDb();
    const currentWeek = (() => {
      const d = new Date();
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
    })();

    // Pull Postgres perf rows that have actual activity
    const perfRows = await pg
      .select({
        engineerId: analyticsEngineerPerf.engineerId,
        ticketsResolved: analyticsEngineerPerf.ticketsResolved,
        kpiScore: analyticsEngineerPerf.kpiScore,
      })
      .from(analyticsEngineerPerf)
      .where(
        and(
          eq(analyticsEngineerPerf.tenantId, tenantId),
          eq(analyticsEngineerPerf.weekKey, currentWeek),
          isNotNull(analyticsEngineerPerf.kpiScore),
        ),
      )
      .orderBy(desc(analyticsEngineerPerf.kpiScore))
      .limit(10);

    if (perfRows.length === 0) {
      if (cacheKey) await this.setCache(cacheKey, []);
      return [];
    }

    // Role-based visibility: ENGINEER sees only their own row; TEAM_LEAD sees their team
    let filteredPerfRows = perfRows;
    if (role === 'ENGINEER') {
      filteredPerfRows = perfRows.filter((r) => r.engineerId === userId);
    } else if (role === 'TEAM_LEAD') {
      const teamId = await this.getUserTeam(userId, tenantId);
      if (teamId) {
        const db2 = await getMssqlDb();
        const teamMembers = await db2
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.teamId, teamId), eq(users.tenantId, tenantId)));
        const memberIds = new Set(teamMembers.map((u) => u.id));
        filteredPerfRows = perfRows.filter((r) => memberIds.has(r.engineerId));
      }
    }

    if (filteredPerfRows.length === 0) {
      if (cacheKey) await this.setCache(cacheKey, []);
      return [];
    }

    // Look up engineer names + team from MSSQL using raw SQL to avoid Drizzle inArray quirks
    const db = await getMssqlDb();
    const engineerIds = filteredPerfRows.map((r) => r.engineerId);
    const idList = engineerIds.map(id => `'${id}'`).join(',');
    const userRows = await db.execute<{ id: string; full_name: string; team_name: string | null }>(
      sql.raw(`SELECT u.id, u.full_name, t.name AS team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id WHERE u.id IN (${idList})`),
    ) as unknown as { id: string; full_name: string; team_name: string | null }[];

    const TAG_MAP: Record<string, string> = {
      'Infrastructure':       'Infra',
      'App Development':      'App Dev',
      'Applications Support': 'App Supp',
      'IT Security':          'IT Sec',
      'Project Management':   'Proj Mgmt',
      'IT Governance':        'IT Gov',
    };

    const infoMap = new Map(userRows.map(u => [u.id, {
      name: u.full_name ?? '–',
      team: u.team_name ? (TAG_MAP[u.team_name] ?? u.team_name.slice(0, 8)) : '–',
    }]));

    // Abbreviate "Akosua Appiah" → "A. Appiah"
    const abbreviate = (full: string) => {
      const parts = full.trim().split(/\s+/);
      if (parts.length < 2) return full;
      return `${parts[0]?.[0] ?? '?'}. ${parts.slice(1).join(' ')}`;
    };

    const result = filteredPerfRows.map((r) => {
      const info = infoMap.get(r.engineerId) ?? { name: '–', team: '–' };
      return {
        name: abbreviate(info.name),
        team: info.team,
        tickets: r.ticketsResolved,
        score: Math.round(parseFloat(r.kpiScore ?? '0')),
      };
    });

    if (cacheKey) await this.setCache(cacheKey, result);
    return result;
  }

  async getTeamWorkload(auth: TrpcAuth): Promise<{ id: string; name: string; tag: string; queued: number; pct: number }[]> {
    const { tenantId, role, userId } = auth;
    const isOrgLevel = ORG_LEVEL_ROLES.includes(role);
    const teamId = isOrgLevel ? null : await this.getUserTeam(userId, tenantId);
    const cacheKey = isOrgLevel
      ? `dash:${tenantId}:team-workload`
      : teamId ? `dash:${tenantId}:team:${teamId}:team-workload` : `dash:${tenantId}:team-workload`;
    const cached = await this.getCached<{ id: string; name: string; tag: string; queued: number; pct: number }[]>(cacheKey);
    if (cached) return cached;

    const db = await getMssqlDb();
    const teamFilter = (!isOrgLevel && teamId) ? `AND t.id = '${teamId}'` : '';

    // Open ticket count per team (tickets assigned to engineers in that team)
    const rows = await db.execute<{ team_id: string; team_name: string; queued: number }>(
      sql.raw(`
        SELECT
          t.id        AS team_id,
          t.name      AS team_name,
          COUNT(tk.id) AS queued
        FROM teams t
        LEFT JOIN users u  ON u.team_id  = t.id AND u.tenant_id = t.tenant_id
        LEFT JOIN tickets tk ON tk.assignee_id = u.id
          AND tk.tenant_id = t.tenant_id
          AND tk.status NOT IN ('RESOLVED','CLOSED')
        WHERE t.tenant_id = '${tenantId}'
          AND t.is_active = 1
          ${teamFilter}
        GROUP BY t.id, t.name
        ORDER BY queued DESC
      `),
    ) as unknown as { team_id: string; team_name: string; queued: number }[];

    // Short tag map — derive from name, fall back to first 8 chars
    const TAG_MAP: Record<string, string> = {
      'Infrastructure':     'Infra',
      'App Development':    'App Dev',
      'Applications Support': 'App Supp',
      'IT Security':        'IT Sec',
      'Project Management': 'Proj Mgmt',
      'IT Governance':      'IT Gov',
    };

    const maxQueued = Math.max(...rows.map(r => Number(r.queued)), 1);

    const result = rows.map(r => ({
      id:     r.team_id,
      name:   r.team_name,
      tag:    TAG_MAP[r.team_name] ?? r.team_name.slice(0, 8),
      queued: Number(r.queued),
      pct:    Math.round((Number(r.queued) / maxQueued) * 100),
    }));

    await this.setCache(cacheKey, result);
    return result;
  }

  async getQueueHealth(auth: TrpcAuth) {
    const { tenantId, role, userId } = auth;
    const isOrgLevel = ORG_LEVEL_ROLES.includes(role);
    const teamId = isOrgLevel ? null : await this.getUserTeam(userId, tenantId);
    const cacheKey = isOrgLevel
      ? `dash:${tenantId}:queue`
      : teamId ? `dash:${tenantId}:team:${teamId}:queue` : `dash:${tenantId}:queue`;
    const cached = await this.getCached<object>(cacheKey);
    if (cached) return cached;

    const db = await getMssqlDb();
    const now = new Date();
    const atRiskCutoff = new Date(now.getTime() + 30 * 60 * 1000); // 30 min from now

    const teamFilter = (!isOrgLevel && teamId)
      ? eq(tickets.teamId, teamId)
      : undefined;

    // Unassigned tickets (NEW + TEAM_ASSIGNED with no assignee)
    const unassignedRows = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          inArray(tickets.status, ['NEW', 'TEAM_ASSIGNED']),
          teamFilter,
        ),
      )
      .then((r) => r[0]?.total ?? 0);

    // At-risk: SLA pickup deadline within 30 minutes
    const atRiskRows = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          inArray(tickets.status, ['NEW', 'TEAM_ASSIGNED', 'ASSIGNED']),
          sql`${tickets.slaPickupDeadline} <= ${atRiskCutoff.toISOString()}`,
          sql`${tickets.slaPickupDeadline} > ${now.toISOString()}`,
          eq(tickets.slaPickupBreached, 0),
          teamFilter,
        ),
      )
      .then((r) => r[0]?.total ?? 0);

    // Auto-assigned today (ASSIGNED status, assignedAt today)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const autoAssignedToday = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          inArray(tickets.status, ['ASSIGNED', 'IN_PROGRESS']),
          isNotNull(tickets.assignedAt),
          sql`${tickets.assignedAt} >= ${todayStart.toISOString()}`,
          teamFilter,
        ),
      )
      .then((r) => r[0]?.total ?? 0);

    const result = {
      unassigned: Number(unassignedRows),
      atRisk: Number(atRiskRows),
      autoAssignedToday: Number(autoAssignedToday),
    };

    await this.setCache(cacheKey, result);
    return result;
  }
}
