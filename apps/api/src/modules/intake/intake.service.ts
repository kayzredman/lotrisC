import { Injectable, Logger, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
import { getMssqlDb, sql } from '@lotris/db';
import { getEnv } from '@lotris/config';
import { v4 as uuidv4 } from 'uuid';
import IORedis from 'ioredis';
import { NotificationsService } from '../notifications/notifications.service';

export const WEB_FORM_CATEGORIES = [
  'Hardware',
  'Software / Apps',
  'Access & Permissions',
  'Network / Connectivity',
  'Other',
] as const;

export type WebFormCategory = (typeof WEB_FORM_CATEGORIES)[number];

export interface PublicTicketRequestDto {
  tenantId: string;
  requesterName: string;
  requesterEmail: string;
  category: string;
  subject: string;
  description: string;
}

/**
 * IntakeService — handles external ticket creation from two channels:
 *   1. Public web form (SELF_SERVICE)   — POST /api/v1/request
 *   2. IMAP email polling (EMAIL)       — runs every 60s if env is configured
 *
 * Both channels create tickets in the operational DB and enqueue an ACK email.
 */
@Injectable()
export class IntakeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IntakeService.name);
  private redis: IORedis | null = null;

  constructor(private readonly notifications: NotificationsService) {}

  onApplicationBootstrap() {
    this.startEmailIntakePoller();
  }

  private getRedis(): IORedis {
    if (!this.redis) {
      const env = getEnv();
      this.redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
    }
    return this.redis;
  }

  // ── Rate limit check (Redis sliding window — 10 req/hour per IP) ─────────

  async checkRateLimit(ip: string): Promise<boolean> {
    const key = `rate:intake:${ip}`;
    try {
      const redis = this.getRedis();
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 3600);
      return count <= 10;
    } catch {
      // If Redis is down, allow the request (fail open — don't block legitimate users)
      this.logger.warn('Redis unavailable for rate limit check — allowing request');
      return true;
    }
  }

  // ── Web form ticket creation (SELF_SERVICE) ───────────────────────────────

  async createFromWebForm(dto: PublicTicketRequestDto): Promise<{ ticketId: string; ticketRef: string }> {
    // Validate category
    if (!WEB_FORM_CATEGORIES.includes(dto.category as WebFormCategory)) {
      throw new BadRequestException(`Invalid category: ${dto.category}`);
    }

    const db = await getMssqlDb();
    const env = getEnv();

    // Look up category routing → team + priority
    const routingRows = await db.execute<{ teamId: string; defaultPriority: number }>(
      sql.raw(`
        SELECT team_id AS teamId, default_priority AS defaultPriority
        FROM CategoryRouting
        WHERE tenant_id = '${dto.tenantId.replace(/'/g, "''")}' AND category = '${dto.category.replace(/'/g, "''")}'
      `),
    );
    const routing = routingRows[0];

    // Resolve system user — required for createdBy FK
    const systemUserId = env.INTAKE_SYSTEM_USER_ID;
    if (!systemUserId) {
      this.logger.error('INTAKE_SYSTEM_USER_ID not set — cannot create external ticket');
      throw new BadRequestException('Ticket intake is not configured for this system');
    }

    // Verify system user belongs to this tenant
    const sysUserRows = await db.execute<{ id: string }>(
      sql.raw(`SELECT id FROM Users WHERE id = '${systemUserId}' AND tenant_id = '${dto.tenantId}'`),
    );
    if (!sysUserRows[0]) {
      this.logger.error(`INTAKE_SYSTEM_USER_ID ${systemUserId} not found in tenant ${dto.tenantId}`);
      throw new BadRequestException('Ticket intake system user is misconfigured');
    }

    const id = uuidv4();
    const now = new Date();
    const priority = routing?.defaultPriority ?? 3;
    const teamId = routing?.teamId ?? null;

    // Resolve SLA pickup deadline if team is known
    let slaPickupDeadline: Date | null = null;
    if (teamId) {
      const slaRows = await db.execute<{ pickupSlaMinutes: number }>(
        sql.raw(`
          SELECT COALESCE(sc.pickup_sla_minutes, t.pickup_sla_minutes) AS pickupSlaMinutes
          FROM Teams t
          LEFT JOIN SlaConfigs sc ON sc.team_id = t.id AND sc.tenant_id = t.tenant_id
          WHERE t.id = '${teamId}' AND t.tenant_id = '${dto.tenantId}'
        `),
      );
      const pickupMin = slaRows[0]?.pickupSlaMinutes ?? 30;
      slaPickupDeadline = new Date(now.getTime() + Number(pickupMin) * 60_000);
    }

    // Insert ticket
    await db.execute(sql.raw(`
      INSERT INTO Tickets (
        id, tenant_id, title, description, priority, status, source,
        requester_email, requester_name,
        team_id, created_by,
        sla_pickup_deadline, sla_pickup_breached, sla_resolution_breached,
        created_at, updated_at
      ) VALUES (
        '${id}', '${dto.tenantId}',
        '${dto.subject.replace(/'/g, "''")}',
        '${dto.description.replace(/'/g, "''")}',
        ${priority}, 'NEW', 'SELF_SERVICE',
        '${dto.requesterEmail.replace(/'/g, "''")}',
        '${dto.requesterName.replace(/'/g, "''")}',
        ${teamId ? `'${teamId}'` : 'NULL'},
        '${systemUserId}',
        ${slaPickupDeadline ? `'${slaPickupDeadline.toISOString()}'` : 'NULL'},
        0, 0,
        '${now.toISOString()}', '${now.toISOString()}'
      )
    `));

    // Write history
    await db.execute(sql.raw(`
      INSERT INTO TicketHistory (id, tenant_id, ticket_id, actor_id, event_type, to_value, created_at)
      VALUES ('${uuidv4()}', '${dto.tenantId}', '${id}', '${systemUserId}', 'CREATED', 'NEW', '${now.toISOString()}')
    `));

    // Transition to TEAM_ASSIGNED if team resolved
    if (teamId) {
      await db.execute(sql.raw(`
        UPDATE Tickets SET status = 'TEAM_ASSIGNED', team_id = '${teamId}', updated_at = '${now.toISOString()}'
        WHERE id = '${id}' AND tenant_id = '${dto.tenantId}'
      `));
      await db.execute(sql.raw(`
        INSERT INTO TicketHistory (id, tenant_id, ticket_id, actor_id, event_type, from_value, to_value, created_at)
        VALUES ('${uuidv4()}', '${dto.tenantId}', '${id}', '${systemUserId}', 'STATUS_CHANGED', 'NEW', 'TEAM_ASSIGNED', '${now.toISOString()}')
      `));
    }

    const refNum = id.split('-')[0]?.toUpperCase() ?? id.slice(0, 8).toUpperCase();
    const ticketRef = `TKT-${refNum}`;

    // Enqueue acknowledgement email
    await this.notifications.queueIntakeAck({
      type: 'INTAKE_ACK',
      ticketId: id,
      ticketRef,
      ticketTitle: dto.subject,
      requesterEmail: dto.requesterEmail,
      requesterName: dto.requesterName,
    });

    return { ticketId: id, ticketRef };
  }

  // ── IMAP email intake poller ──────────────────────────────────────────────

  private startEmailIntakePoller() {
    const env = getEnv();

    if (!env.INTAKE_EMAIL_HOST || !env.INTAKE_EMAIL_USER || !env.INTAKE_EMAIL_PASS) {
      this.logger.log('IMAP intake not configured — email intake disabled');
      return;
    }

    if (!env.TRIAGE_TENANT_ID || !env.TRIAGE_TEAM_ID || !env.INTAKE_SYSTEM_USER_ID) {
      this.logger.warn(
        'TRIAGE_TENANT_ID, TRIAGE_TEAM_ID, or INTAKE_SYSTEM_USER_ID not set — email intake disabled',
      );
      return;
    }

    this.logger.log(
      `IMAP intake enabled — polling ${env.INTAKE_EMAIL_USER}@${env.INTAKE_EMAIL_HOST} every 60s`,
    );

    // Poll immediately at startup, then every 60 seconds
    void this.pollEmailInbox().catch((err) => this.logger.error('Initial IMAP poll failed', err));
    setInterval(
      () => void this.pollEmailInbox().catch((err) => this.logger.error('IMAP poll error', err)),
      60_000,
    );
  }

  private async pollEmailInbox(): Promise<void> {
    const env = getEnv();

    // Dynamic import — imapflow is only needed if IMAP is configured
    const { ImapFlow } = await import('imapflow');

    const client = new ImapFlow({
      host: env.INTAKE_EMAIL_HOST!,
      port: env.INTAKE_EMAIL_PORT,
      secure: env.INTAKE_EMAIL_TLS === 'true',
      auth: {
        user: env.INTAKE_EMAIL_USER!,
        pass: env.INTAKE_EMAIL_PASS!,
      },
      logger: false,
    });

    try {
      await client.connect();
      await client.mailboxOpen('INBOX');

      // Fetch all unseen messages
      for await (const msg of client.fetch({ seen: false }, { envelope: true, source: true }) as AsyncIterable<{ uid: number | string; envelope: Record<string, unknown>; source: Buffer }>) {
        try {
          await this.processInboundEmail(env, msg);
          // Mark as seen so we don't process again
          await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
        } catch (err) {
          this.logger.error(`Failed to process email uid=${msg.uid}: ${String(err)}`);
        }
      }
    } finally {
      await client.logout();
    }
  }

  private async processInboundEmail(
    env: ReturnType<typeof getEnv>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    msg: { uid: number | string; envelope: Record<string, any>; source: Buffer },
  ): Promise<void> {
    const db = await getMssqlDb();
    const tenantId = env.TRIAGE_TENANT_ID!;
    const teamId = env.TRIAGE_TEAM_ID!;
    const systemUserId = env.INTAKE_SYSTEM_USER_ID!;

    const subject = msg.envelope.subject?.trim() || '(no subject)';
    const fromAddr = msg.envelope.from?.[0];
    const requesterEmail = (fromAddr?.address as string | undefined) ?? 'unknown@unknown.com';
    const rawName = (fromAddr?.name as string | undefined)?.trim();
    const requesterName = rawName || (requesterEmail.split('@')[0] ?? 'Unknown');

    // Parse plain-text body from source buffer
    const rawSource = msg.source.toString('utf8');
    const description = this.extractPlainText(rawSource) || subject;

    // Dedup: skip if a ticket with this requester_email + title already created in last 5 minutes
    const recentRows = await db.execute<{ id: string }>(
      sql.raw(`
        SELECT TOP 1 id FROM Tickets
        WHERE tenant_id = '${tenantId}'
          AND requester_email = '${requesterEmail.replace(/'/g, "''")}'
          AND title = '${subject.replace(/'/g, "''")}'
          AND source = 'EMAIL'
          AND created_at > DATEADD(MINUTE, -5, GETUTCDATE())
      `),
    );
    if (recentRows.length > 0) {
      this.logger.debug(`Skipping duplicate email from ${requesterEmail}: "${subject}"`);
      return;
    }

    const id = uuidv4();
    const now = new Date();

    await db.execute(sql.raw(`
      INSERT INTO Tickets (
        id, tenant_id, title, description, priority, status, source,
        requester_email, requester_name,
        team_id, created_by,
        sla_pickup_breached, sla_resolution_breached,
        created_at, updated_at
      ) VALUES (
        '${id}', '${tenantId}',
        '${subject.replace(/'/g, "''")}',
        '${description.replace(/'/g, "''")}',
        3, 'TEAM_ASSIGNED', 'EMAIL',
        '${requesterEmail.replace(/'/g, "''")}',
        '${requesterName.replace(/'/g, "''")}',
        '${teamId}',
        '${systemUserId}',
        0, 0,
        '${now.toISOString()}', '${now.toISOString()}'
      )
    `));

    await db.execute(sql.raw(`
      INSERT INTO TicketHistory (id, tenant_id, ticket_id, actor_id, event_type, to_value, created_at)
      VALUES ('${uuidv4()}', '${tenantId}', '${id}', '${systemUserId}', 'CREATED', 'TEAM_ASSIGNED', '${now.toISOString()}')
    `));

    const refNum = id.split('-')[0]?.toUpperCase() ?? id.slice(0, 8).toUpperCase();

    await this.notifications.queueIntakeAck({
      type: 'INTAKE_ACK',
      ticketId: id,
      ticketRef: `TKT-${refNum}`,
      ticketTitle: subject,
      requesterEmail,
      requesterName,
    });

    this.logger.log(`Email ticket created: TKT-${refNum} from ${requesterEmail}`);
  }

  /**
   * Extract plain text from a raw email source (very simple heuristic).
   * Strips MIME headers, base64 parts, and HTML tags.
   */
  private extractPlainText(raw: string): string {
    // Find text/plain section
    const plainMatch = raw.match(/Content-Type:\s*text\/plain[^\n]*\n([\s\S]*?)(?:\n--|\n\n--)/i);
    if (plainMatch?.[1]) {
      return plainMatch[1]
        .replace(/^Content-Transfer-Encoding:.*$/im, '')
        .replace(/<[^>]*>/g, '')
        .trim()
        .slice(0, 4000);
    }
    // Fallback: strip headers and HTML from entire source
    return raw
      .replace(/^[\w-]+:.*\n/gm, '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 4000);
  }
}
