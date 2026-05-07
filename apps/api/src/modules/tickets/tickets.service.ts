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
import type { NotificationsService } from '../notifications/notifications.service';
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

    // Build WHERE clause with raw SQL to support LIKE search
    const whereParts: string[] = [`tk.tenant_id = '${auth.tenantId}'`];
    if (query.status)   whereParts.push(`tk.status = '${query.status}'`);
    if (query.priority) whereParts.push(`tk.priority = ${Number(query.priority)}`);
    if (query.teamId)   whereParts.push(`tk.team_id = '${query.teamId}'`);
    if (query.assigneeId) whereParts.push(`tk.assignee_id = '${query.assigneeId}'`);
    if (query.search?.trim()) {
      const term = query.search.trim().replace(/'/g, "''");
      whereParts.push(`(tk.title LIKE '%${term}%' OR tk.id LIKE '%${term}%')`);
    }
    const where = whereParts.join(' AND ');

    type TicketRow = {
      id: string; title: string; description: string | null;
      status: string; priority: number; tenantId: string;
      teamId: string | null; assigneeId: string | null;
      slaPickupDeadline: string | null; slaPickupBreached: number;
      slaResolutionDeadline: string | null; slaResolutionBreached: number;
      createdAt: string; updatedAt: string;
      teamName: string | null;
      total: number;
    };

    const rawRows = await db.execute<TicketRow>(
      sql.raw(`
        SELECT
          tk.id, tk.title, tk.description, tk.status, tk.priority,
          tk.tenant_id AS tenantId, tk.team_id AS teamId, tk.assignee_id AS assigneeId,
          tk.sla_pickup_deadline AS slaPickupDeadline, tk.sla_pickup_breached AS slaPickupBreached,
          tk.sla_resolution_deadline AS slaResolutionDeadline, tk.sla_resolution_breached AS slaResolutionBreached,
          tk.created_at AS createdAt, tk.updated_at AS updatedAt,
          t.name AS teamName,
          COUNT(*) OVER() AS total
        FROM tickets tk
        LEFT JOIN teams t ON t.id = tk.team_id AND t.tenant_id = tk.tenant_id
        WHERE ${where}
        ORDER BY tk.priority ASC, tk.sla_resolution_deadline ASC
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `),
    ) as unknown as TicketRow[];

    const total = rawRows.length > 0 ? Number(rawRows[0]?.total ?? 0) : 0;

    return {
      total,
      page,
      limit,
      rows: rawRows.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status,
        priority: r.priority,
        tenantId: r.tenantId,
        teamId: r.teamId,
        teamName: r.teamName,
        assigneeId: r.assigneeId,
        slaPickupDeadline: r.slaPickupDeadline,
        slaPickupBreached: r.slaPickupBreached,
        slaResolutionDeadline: r.slaResolutionDeadline,
        slaResolutionBreached: r.slaResolutionBreached,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };
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

  // ── Assign (multi-step auto-transition) ──────────────────────────────────
  // Walks whatever chain is needed to reach ASSIGNED from the ticket's
  // current status: NEW → TEAM_ASSIGNED → UNASSIGNED → ASSIGNED.

  async assign(auth: TrpcAuth, ticketId: string, assigneeId: string) {
    const ticket = await this.findById(auth, ticketId);
    const status = ticket.status as string;

    // Step: NEW → TEAM_ASSIGNED (preserve existing teamId, or null is fine)
    if (status === 'NEW') {
      await this.updateStatus(auth, ticketId, {
        status: 'TEAM_ASSIGNED',
        teamId: (ticket.teamId as string | null) ?? undefined,
      });
    }

    // Step: TEAM_ASSIGNED → UNASSIGNED
    const afterFirst = await this.findById(auth, ticketId);
    if ((afterFirst.status as string) === 'TEAM_ASSIGNED') {
      await this.updateStatus(auth, ticketId, { status: 'UNASSIGNED' });
    }

    // Step: UNASSIGNED → ASSIGNED
    const afterSecond = await this.findById(auth, ticketId);
    if ((afterSecond.status as string) === 'UNASSIGNED') {
      return this.updateStatus(auth, ticketId, { status: 'ASSIGNED', assigneeId });
    }

    // Ticket is already ASSIGNED or further — just re-assign directly
    // (covers re-assigning an already-assigned ticket by going through ASSIGNED again)
    return this.updateStatus(auth, ticketId, { status: 'ASSIGNED', assigneeId });
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
