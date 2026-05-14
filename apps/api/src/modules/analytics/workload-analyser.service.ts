import { Injectable, Logger } from '@nestjs/common';
import { getMssqlDb, tickets, users, teams, queueConfigs, eq, and, inArray, sql } from '@lotris/db';
import type { EngineerLoad, WorkloadSuggestion, TeamWorkloadResult } from '@lotris/types';

const OPEN_STATUSES = ['NEW', 'TEAM_ASSIGNED', 'UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS'];
const MAX_SUGGESTIONS_PER_TEAM = 5;

@Injectable()
export class WorkloadAnalyserService {
  private readonly logger = new Logger(WorkloadAnalyserService.name);

  async analyseTeam(tenantId: string, teamId: string): Promise<TeamWorkloadResult> {
    const db = await getMssqlDb();

    // Fetch queue config for this team (fall back to tenant default if no team-specific row)
    const teamConfig = await db
      .select({ maxCapacity: queueConfigs.maxCapacityPerEngineer })
      .from(queueConfigs)
      .where(and(eq(queueConfigs.tenantId, tenantId), eq(queueConfigs.teamId, teamId)))
      .limit(1);

    let maxCapacity: number;
    if (teamConfig[0]) {
      maxCapacity = teamConfig[0].maxCapacity;
    } else {
      const defaultConfig = await db
        .select({ maxCapacity: queueConfigs.maxCapacityPerEngineer })
        .from(queueConfigs)
        .where(and(eq(queueConfigs.tenantId, tenantId), sql`${queueConfigs.teamId} IS NULL`))
        .limit(1);
      maxCapacity = defaultConfig[0]?.maxCapacity ?? 10;
    }

    // Fetch all active engineers in the team
    const engineers = await db
      .select({ id: users.id, fullName: users.fullName, isUnavailable: users.isUnavailable })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.teamId, teamId),
          eq(users.isActive, 1),
        ),
      );

    if (engineers.length === 0) {
      return { teamId, engineers: [], suggestions: [] };
    }

    const engineerIds = engineers.map((e) => e.id);

    // Count open tickets per engineer in one query
    const openTicketRows = await db
      .select({ assigneeId: tickets.assigneeId, count: sql<number>`COUNT(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          eq(tickets.teamId, teamId),
          inArray(tickets.status, OPEN_STATUSES),
          inArray(tickets.assigneeId, engineerIds),
        ),
      )
      .groupBy(tickets.assigneeId);

    const countMap = new Map<string, number>();
    for (const row of openTicketRows) {
      if (row.assigneeId) countMap.set(row.assigneeId, row.count);
    }

    const engineerLoads: EngineerLoad[] = engineers.map((eng) => {
      const openCount = countMap.get(eng.id) ?? 0;
      const loadPct = maxCapacity > 0 ? Math.round((openCount / maxCapacity) * 100) : 0;
      return {
        engineerId: eng.id,
        fullName: eng.fullName,
        openTickets: openCount,
        maxCapacity,
        loadPct,
        isUnavailable: eng.isUnavailable === 1,
      };
    });

    // Find overloaded engineers (load >= 100%) and available engineers (load < 70%)
    const overloaded = engineerLoads.filter((e) => !e.isUnavailable && e.loadPct >= 100);
    const available = engineerLoads
      .filter((e) => !e.isUnavailable && e.loadPct < 70)
      .sort((a, b) => a.loadPct - b.loadPct);

    const suggestions: WorkloadSuggestion[] = [];

    if (overloaded.length > 0 && available.length > 0) {
      // For each overloaded engineer, find their easiest-to-reassign tickets (not ESCALATED)
      for (const overEng of overloaded) {
        if (suggestions.length >= MAX_SUGGESTIONS_PER_TEAM) break;

        const candidateTickets = await db
          .select({ id: tickets.id, title: tickets.title, priority: tickets.priority })
          .from(tickets)
          .where(
            and(
              eq(tickets.tenantId, tenantId),
              eq(tickets.assigneeId, overEng.engineerId),
              inArray(tickets.status, OPEN_STATUSES.filter((s) => s !== 'IN_PROGRESS')),
            ),
          )
          .orderBy(tickets.priority, tickets.assignedAt)
          .limit(3);

        for (const ticket of candidateTickets) {
          if (suggestions.length >= MAX_SUGGESTIONS_PER_TEAM) break;
          const target = available[0];
          if (!target) break;

          suggestions.push({
            ticketId: ticket.id,
            ticketTitle: ticket.title,
            fromEngineerId: overEng.engineerId,
            fromEngineerName: overEng.fullName,
            toEngineerId: target.engineerId,
            toEngineerName: target.fullName,
          });
          // Temporarily increment target load so we don't over-assign
          target.loadPct += Math.round((1 / maxCapacity) * 100);
        }
      }
    }

    return { teamId, engineers: engineerLoads, suggestions };
  }

  async analyseAllTeams(tenantId: string): Promise<TeamWorkloadResult[]> {
    const db = await getMssqlDb();
    const activeTeams = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.tenantId, tenantId), eq(teams.isActive, 1)));

    const results: TeamWorkloadResult[] = [];
    for (const team of activeTeams) {
      try {
        results.push(await this.analyseTeam(tenantId, team.id));
      } catch (err) {
        this.logger.error(`analyseTeam failed for team ${team.id}: ${err}`);
      }
    }
    return results;
  }
}
