import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getMssqlDb, eq, and, asc, sql } from '@lotris/db';
import { v4 as uuidv4 } from 'uuid';
import {
  tickets,
  ticketComments,
  ticketHistory,
  slaConfigs,
  attachmentRefs,
} from '@lotris/db';
import type { TrpcAuth } from '@lotris/types';
import { UserRole } from '@lotris/types';
import {
  assertTransition,
  HISTORY_EVENT,
  TICKET_STATUS,
  type TicketStatus,
} from './ticket-lifecycle';
import type {
  CreateTicketDto,
  UpdateTicketStatusDto,
  CreateCommentDto,
  CreateAttachmentRefDto,
  TicketListQueryDto,
} from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import { getEnv } from '@lotris/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class TicketsService {
  constructor(private readonly notifications: NotificationsService) {}

  private getSlaTimersQueue(): Queue {
    const env = getEnv();
    const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
    return new Queue('sla-timers', { connection });
  }

  // ── Create ───────────────────────────────────────────────────────────────

  async create(auth: TrpcAuth, dto: CreateTicketDto) {
    const db = await getMssqlDb();
    const now = new Date();
    const id = uuidv4();

    // Resolve SLA config
    const sla = await this.getSlaConfig(auth.tenantId, dto.teamId);
    const slaPickupDeadline = dto.teamId
      ? new Date(now.getTime() + sla.pickupSlaMinutes * 60_000)
      : null;

    await db.insert(tickets).values({
      id,
      tenantId: auth.tenantId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority ?? 2,
      status: 'NEW',
      teamId: dto.teamId ?? null,
      createdBy: auth.userId,
      slaPickupDeadline,
      createdAt: now,
      updatedAt: now,
    });

    await this.writeHistory({
      tenantId: auth.tenantId,
      ticketId: id,
      actorId: auth.userId,
      eventType: HISTORY_EVENT.CREATED,
      toValue: 'NEW',
    });

    // If team provided, immediately transition to TEAM_ASSIGNED
    if (dto.teamId) {
      await this.updateStatus(auth, id, { status: 'TEAM_ASSIGNED', teamId: dto.teamId });
    }

    const created = await this.findById(auth, id);

    // Fire notification — non-blocking
    void this.notifications.queueTicketNotification({
      type: 'TICKET_CREATED',
      tenantId: auth.tenantId,
      ticketId: id,
      ticketTitle: dto.title,
      actorId: auth.userId,
    });

    return created;
  }

  // ── List ─────────────────────────────────────────────────────────────────

  async list(auth: TrpcAuth, query: TicketListQueryDto) {
    const db = await getMssqlDb();
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));
    const offset = (page - 1) * limit;

    const conditions = [eq(tickets.tenantId, auth.tenantId)];

    if (query.status) {
      conditions.push(eq(tickets.status, query.status));
    }
    if (query.teamId) {
      conditions.push(eq(tickets.teamId, query.teamId));
    }
    if (query.assigneeId) {
      conditions.push(eq(tickets.assigneeId, query.assigneeId));
    }
    if (query.priority) {
      conditions.push(eq(tickets.priority, Number(query.priority)));
    }

    const rows = await db
      .select()
      .from(tickets)
      .where(and(...conditions))
      // Queue ordering invariant: priority ASC (1=highest), sla_resolution_deadline ASC
      .orderBy(asc(tickets.priority), asc(tickets.slaResolutionDeadline))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  // ── Get by ID ────────────────────────────────────────────────────────────

  async findById(auth: TrpcAuth, ticketId: string) {
    const db = await getMssqlDb();
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, auth.tenantId)));

    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }
    return ticket;
  }

  // ── Status transition ────────────────────────────────────────────────────

  async updateStatus(auth: TrpcAuth, ticketId: string, dto: UpdateTicketStatusDto) {
    const db = await getMssqlDb();
    const ticket = await this.findById(auth, ticketId);
    const from = ticket.status as TicketStatus;
    const to = dto.status as TicketStatus;

    assertTransition(from, to);

    const now = new Date();
    const updates: Partial<typeof ticket> & { updatedAt: Date } = { updatedAt: now };

    if (to === TICKET_STATUS.ASSIGNED && dto.assigneeId) {
      updates.assigneeId = dto.assigneeId;
      updates.assignedAt = now;
      // Set resolution SLA deadline from SLA config
      const sla = await this.getSlaConfig(auth.tenantId, ticket.teamId ?? undefined);
      updates.slaResolutionDeadline = new Date(now.getTime() + sla.resolutionSlaMinutes * 60_000);
    }

    if (to === TICKET_STATUS.TEAM_ASSIGNED && dto.teamId) {
      updates.teamId = dto.teamId;

      // Start pickup SLA timer if deadline is set
      const pickupDeadline = ticket.slaPickupDeadline as Date | null;
      if (pickupDeadline) {
        const delay = Math.max(0, new Date(pickupDeadline).getTime() - Date.now());
        void this.getSlaTimersQueue().add(
          'pickup-sla-check',
          { ticketId, tenantId: auth.tenantId },
          {
            jobId: `pickup-sla-${ticketId}`,
            delay,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          },
        );
      }
    }

    if (to === TICKET_STATUS.RESOLVED) {
      updates.resolvedAt = now;
    }

    if (to === TICKET_STATUS.CLOSED) {
      updates.closedAt = now;
    }

    await db
      .update(tickets)
      .set({ ...updates, status: to })
      .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, auth.tenantId)));

    await this.writeHistory({
      tenantId: auth.tenantId,
      ticketId,
      actorId: auth.userId,
      eventType: HISTORY_EVENT.STATUS_CHANGED,
      fromValue: from,
      toValue: to,
    });

    if (to === TICKET_STATUS.ESCALATED) {
      await this.writeHistory({
        tenantId: auth.tenantId,
        ticketId,
        actorId: auth.userId,
        eventType: HISTORY_EVENT.ESCALATED,
      });
    }

    const updated = await this.findById(auth, ticketId);

    // Fire notifications — non-blocking
    if (to === TICKET_STATUS.ASSIGNED) {
      void this.notifications.queueTicketNotification({
        type: 'TICKET_ASSIGNED',
        tenantId: auth.tenantId,
        ticketId,
        ticketTitle: updated.title,
        actorId: auth.userId,
        recipientId: dto.assigneeId,
      });
    }
    if (to === TICKET_STATUS.RESOLVED) {
      void this.notifications.queueTicketNotification({
        type: 'TICKET_RESOLVED',
        tenantId: auth.tenantId,
        ticketId,
        ticketTitle: updated.title,
        actorId: auth.userId,
        recipientId: updated.createdBy,
      });
    }
    if (to === TICKET_STATUS.ESCALATED) {
      void this.notifications.queueTicketNotification({
        type: 'TICKET_ESCALATED',
        tenantId: auth.tenantId,
        ticketId,
        ticketTitle: updated.title,
        actorId: auth.userId,
      });
    }

    return updated;
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async addComment(auth: TrpcAuth, ticketId: string, dto: CreateCommentDto) {
    const db = await getMssqlDb();
    // Ensure ticket exists + belongs to tenant
    await this.findById(auth, ticketId);

    const id = uuidv4();
    const now = new Date();

    // ENGINEER role cannot post internal comments
    if (dto.isInternal && auth.role === 'ENGINEER') {
      throw new ForbiddenException('Engineers cannot post internal comments');
    }

    await db.insert(ticketComments).values({
      id,
      tenantId: auth.tenantId,
      ticketId,
      authorId: auth.userId,
      body: dto.body,
      isInternal: dto.isInternal ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    });

    await this.writeHistory({
      tenantId: auth.tenantId,
      ticketId,
      actorId: auth.userId,
      eventType: HISTORY_EVENT.COMMENT_ADDED,
    });

    return { id };
  }

  async getComments(auth: TrpcAuth, ticketId: string) {
    await this.findById(auth, ticketId);
    const db = await getMssqlDb();

    const isEngineer = auth.role === 'ENGINEER';

    const rows = await db
      .select()
      .from(ticketComments)
      .where(
        and(
          eq(ticketComments.ticketId, ticketId),
          eq(ticketComments.tenantId, auth.tenantId),
          // Engineers cannot see internal comments
          ...(isEngineer ? [eq(ticketComments.isInternal, 0)] : []),
        ),
      )
      .orderBy(asc(ticketComments.createdAt));

    return rows;
  }

  // ── Attachments ───────────────────────────────────────────────────────────

  async addAttachmentRef(auth: TrpcAuth, ticketId: string, dto: CreateAttachmentRefDto) {
    await this.findById(auth, ticketId);
    const db = await getMssqlDb();
    const id = uuidv4();
    const now = new Date();

    await db.insert(attachmentRefs).values({
      id,
      tenantId: auth.tenantId,
      ticketId,
      uploadedBy: auth.userId,
      storageKey: dto.storageKey,
      originalName: dto.originalName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      createdAt: now,
    });

    await this.writeHistory({
      tenantId: auth.tenantId,
      ticketId,
      actorId: auth.userId,
      eventType: HISTORY_EVENT.ATTACHMENT_ADDED,
      toValue: dto.originalName,
    });

    return { id };
  }

  // ── History ───────────────────────────────────────────────────────────────

  async getHistory(auth: TrpcAuth, ticketId: string) {
    await this.findById(auth, ticketId);
    const db = await getMssqlDb();

    return db
      .select()
      .from(ticketHistory)
      .where(and(eq(ticketHistory.ticketId, ticketId), eq(ticketHistory.tenantId, auth.tenantId)))
      .orderBy(asc(ticketHistory.createdAt));
  }

  // ── SLA config helper ─────────────────────────────────────────────────────

  async getSlaConfig(tenantId: string, teamId?: string) {
    const db = await getMssqlDb();

    // Try team-specific config first, fall back to tenant default
    if (teamId) {
      const [teamSla] = await db
        .select()
        .from(slaConfigs)
        .where(and(eq(slaConfigs.tenantId, tenantId), eq(slaConfigs.teamId, teamId)));
      if (teamSla) return teamSla;
    }

    const [tenantSla] = await db
      .select()
      .from(slaConfigs)
      .where(and(eq(slaConfigs.tenantId, tenantId), sql`${slaConfigs.teamId} IS NULL`));

    // Return defaults if no config stored yet
    return tenantSla ?? { pickupSlaMinutes: 30, resolutionSlaMinutes: 240 };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async writeHistory(entry: {
    tenantId: string;
    ticketId: string;
    actorId?: string;
    eventType: string;
    fromValue?: string;
    toValue?: string;
    metadata?: string;
  }) {
    const db = await getMssqlDb();
    await db.insert(ticketHistory).values({
      tenantId: entry.tenantId,
      ticketId: entry.ticketId,
      actorId: entry.actorId ?? null,
      eventType: entry.eventType,
      fromValue: entry.fromValue ?? null,
      toValue: entry.toValue ?? null,
      metadata: entry.metadata ?? null,
      createdAt: new Date(),
    });
  }
}
