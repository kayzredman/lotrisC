import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { getMssqlDb, eq, and, asc, sql, count } from '@lotris/db';
import { v4 as uuidv4 } from 'uuid';

import {
  tickets,
  users,
  queueConfigs,
} from '@lotris/db';
import type { TrpcAuth } from '@lotris/types';

import { TICKET_STATUS } from '../tickets/ticket-lifecycle';
import { NotificationsService } from '../notifications/notifications.service';
import { getEnv } from '@lotris/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { UpdateQueueConfigDto, QueueListQueryDto } from './dto';

@Injectable()
export class QueueService {
  constructor(private readonly notifications: NotificationsService) {}

  private get db() {
    return getMssqlDb();
  }

  // ── Queue list (UNASSIGNED tickets for the engineer's team) ──────────────

  async listQueue(auth: TrpcAuth, query: QueueListQueryDto) {
    const db = await getMssqlDb();
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));
    const offset = (page - 1) * limit;

    // If no teamId provided, use the engineer's own team
    let teamId = query.teamId;
    if (!teamId) {
      const [engineer] = await db
        .select({ teamId: users.teamId })
        .from(users)
        .where(and(eq(users.id, auth.userId), eq(users.tenantId, auth.tenantId)));
      teamId = engineer?.teamId ?? undefined;
    }

    if (!teamId) {
      return [];
    }

    // Queue: UNASSIGNED or TEAM_ASSIGNED tickets for the team
    // Queue ordering invariant: priority ASC (1=highest), sla_pickup_deadline ASC
    return db
      .select()
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, auth.tenantId),
          eq(tickets.teamId, teamId),
          sql`${tickets.status} IN ('UNASSIGNED', 'TEAM_ASSIGNED')`,
        ),
      )
      .orderBy(asc(tickets.priority), asc(tickets.slaPickupDeadline))
      .limit(limit)
      .offset(offset);
  }

  // ── Claim (controlled pickup) ─────────────────────────────────────────────

  async claimTicket(auth: TrpcAuth, ticketId: string) {
    const db = await getMssqlDb();

    // Fetch the ticket with tenant scope
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, auth.tenantId)));

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    if (ticket.status !== TICKET_STATUS.UNASSIGNED && ticket.status !== TICKET_STATUS.TEAM_ASSIGNED) {
      throw new BadRequestException(
        `Cannot claim a ticket with status ${ticket.status as string}. Only UNASSIGNED or TEAM_ASSIGNED tickets can be claimed.`,
      );
    }

    // Workload check: count engineer's current open tickets
    const queueCfg = await this.getQueueConfig(auth.tenantId, ticket.teamId as string | undefined);
    const [workload] = await db
      .select({ openCount: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, auth.tenantId),
          eq(tickets.assigneeId, auth.userId),
          sql`${tickets.status} IN ('ASSIGNED', 'IN_PROGRESS', 'ESCALATED')`,
        ),
      );

    const openCount = Number(workload?.openCount ?? 0);
    if (openCount >= queueCfg.maxCapacityPerEngineer) {
      throw new ForbiddenException(
        `You have reached maximum workload (${openCount}/${queueCfg.maxCapacityPerEngineer} open tickets). Resolve existing tickets before claiming more.`,
      );
    }

    // Transition to ASSIGNED
    const now = new Date();
    const resolutionDeadline = new Date(now.getTime() + queueCfg.resolutionSlaMinutes * 60_000);

    await db
      .update(tickets)
      .set({
        status: TICKET_STATUS.ASSIGNED,
        assigneeId: auth.userId,
        assignedAt: now,
        slaResolutionDeadline: resolutionDeadline,
        updatedAt: now,
      })
      .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, auth.tenantId)));

    // Write history
    const { ticketHistory } = await import('@lotris/db');
    await db.insert(ticketHistory).values({
      tenantId: auth.tenantId,
      ticketId,
      actorId: auth.userId,
      eventType: 'STATUS_CHANGED',
      fromValue: ticket.status as string,
      toValue: TICKET_STATUS.ASSIGNED,
      createdAt: now,
    });

    // Enqueue resolution SLA timer
    await this.enqueueResolutionSlaTimer(ticketId, auth.tenantId, resolutionDeadline);

    // Fire assigned notification
    void this.notifications.queueTicketNotification({
      type: 'TICKET_ASSIGNED',
      tenantId: auth.tenantId,
      ticketId,
      ticketTitle: ticket.title as string,
      actorId: auth.userId,
      recipientId: auth.userId,
    });

    const [updated] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, auth.tenantId)));
    return updated;
  }

  // ── Queue health ──────────────────────────────────────────────────────────

  async getQueueHealth(auth: TrpcAuth) {
    const db = await getMssqlDb();

    // Count tickets by status for this tenant
    const statusCounts = await db
      .select({
        status: tickets.status,
        teamId: tickets.teamId,
        cnt: count(),
      })
      .from(tickets)
      .where(eq(tickets.tenantId, auth.tenantId))
      .groupBy(tickets.status, tickets.teamId);

    // Count SLA breaches
    const [pickupBreaches] = await db
      .select({ cnt: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, auth.tenantId),
          eq(tickets.slaPickupBreached, 1),
          sql`${tickets.status} NOT IN ('RESOLVED', 'CLOSED')`,
        ),
      );

    const [resolutionBreaches] = await db
      .select({ cnt: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, auth.tenantId),
          eq(tickets.slaResolutionBreached, 1),
          sql`${tickets.status} NOT IN ('RESOLVED', 'CLOSED')`,
        ),
      );

    // Engineer workloads (open ticket count per assignee)
    const workloads = await db
      .select({
        assigneeId: tickets.assigneeId,
        openCount: count(),
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, auth.tenantId),
          sql`${tickets.status} IN ('ASSIGNED', 'IN_PROGRESS', 'ESCALATED')`,
          sql`${tickets.assigneeId} IS NOT NULL`,
        ),
      )
      .groupBy(tickets.assigneeId);

    return {
      statusCounts,
      pickupSlaBreaches: Number(pickupBreaches?.cnt ?? 0),
      resolutionSlaBreaches: Number(resolutionBreaches?.cnt ?? 0),
      engineerWorkloads: workloads,
    };
  }

  // ── Queue config CRUD (ADMIN-only) ────────────────────────────────────────

  async getQueueConfig(tenantId: string, teamId?: string): Promise<{
    maxCapacityPerEngineer: number;
    pickupSlaMinutes: number;
    resolutionSlaMinutes: number;
    autoAssignEnabled: number;
  }> {
    const db = await getMssqlDb();

    if (teamId) {
      const [teamCfg] = await db
        .select()
        .from(queueConfigs)
        .where(and(eq(queueConfigs.tenantId, tenantId), eq(queueConfigs.teamId, teamId)));
      if (teamCfg) return teamCfg as typeof teamCfg & { autoAssignEnabled: number };
    }

    const [tenantCfg] = await db
      .select()
      .from(queueConfigs)
      .where(and(eq(queueConfigs.tenantId, tenantId), sql`${queueConfigs.teamId} IS NULL`));

    return (tenantCfg ?? {
      maxCapacityPerEngineer: 10,
      pickupSlaMinutes: 30,
      resolutionSlaMinutes: 240,
      autoAssignEnabled: 1,
    }) as { maxCapacityPerEngineer: number; pickupSlaMinutes: number; resolutionSlaMinutes: number; autoAssignEnabled: number };
  }

  async upsertQueueConfig(auth: TrpcAuth, dto: UpdateQueueConfigDto) {
    const db = await getMssqlDb();
    const now = new Date();

    const conditions = [eq(queueConfigs.tenantId, auth.tenantId)];
    if (dto.teamId) {
      conditions.push(eq(queueConfigs.teamId, dto.teamId));
    } else {
      conditions.push(sql`${queueConfigs.teamId} IS NULL`);
    }

    const [existing] = await db.select().from(queueConfigs).where(and(...conditions));

    if (existing) {
      await db.update(queueConfigs).set({
        ...(dto.maxCapacityPerEngineer !== undefined ? { maxCapacityPerEngineer: dto.maxCapacityPerEngineer } : {}),
        ...(dto.pickupSlaMinutes !== undefined ? { pickupSlaMinutes: dto.pickupSlaMinutes } : {}),
        ...(dto.resolutionSlaMinutes !== undefined ? { resolutionSlaMinutes: dto.resolutionSlaMinutes } : {}),
        ...(dto.autoAssignEnabled !== undefined ? { autoAssignEnabled: dto.autoAssignEnabled ? 1 : 0 } : {}),
        updatedAt: now,
      }).where(and(...conditions));
    } else {
      await db.insert(queueConfigs).values({
        id: uuidv4(),
        tenantId: auth.tenantId,
        teamId: dto.teamId ?? null,
        maxCapacityPerEngineer: dto.maxCapacityPerEngineer ?? 10,
        pickupSlaMinutes: dto.pickupSlaMinutes ?? 30,
        resolutionSlaMinutes: dto.resolutionSlaMinutes ?? 240,
        autoAssignEnabled: dto.autoAssignEnabled !== false ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return this.getQueueConfig(auth.tenantId, dto.teamId);
  }

  // ── BullMQ helpers ────────────────────────────────────────────────────────

  private getSlaTimersQueue(): Queue {
    const env = getEnv();
    const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
    return new Queue('sla-timers', { connection });
  }

  async enqueuePickupSlaTimer(ticketId: string, tenantId: string, deadline: Date): Promise<void> {
    const delay = Math.max(0, deadline.getTime() - Date.now());
    await this.getSlaTimersQueue().add(
      'pickup-sla-check',
      { ticketId, tenantId },
      {
        jobId: `pickup-sla-${ticketId}`,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  async enqueueResolutionSlaTimer(ticketId: string, tenantId: string, deadline: Date): Promise<void> {
    const delay = Math.max(0, deadline.getTime() - Date.now());
    await this.getSlaTimersQueue().add(
      'resolution-sla-check',
      { ticketId, tenantId },
      {
        jobId: `resolution-sla-${ticketId}`,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }
}
