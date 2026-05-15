import { Injectable, Logger } from '@nestjs/common';
import { getMssqlDb, tickets, users, eq, and, sql } from '@lotris/db';
import IORedis from 'ioredis';
import { getEnv } from '@lotris/config';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * SlaPredictor — scans all IN_PROGRESS tickets for a tenant and sets
 * `sla_warning_level` to AMBER (70% of SLA window elapsed) or RED (90%).
 *
 * Called by:
 *   - The `sla-predictor` BullMQ worker (every 5 minutes, all tenants)
 *   - Optionally triggered on ticket status change
 *
 * Multi-tenancy: every MSSQL query includes a tenantId filter (Rule 3).
 */
@Injectable()
export class SlaPredictor {
  private readonly logger = new Logger(SlaPredictor.name);
  private dedupClient: IORedis | null = null;

  constructor(private readonly notifications: NotificationsService) {}

  private getDedup(): IORedis {
    if (!this.dedupClient) {
      this.dedupClient = new IORedis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
    }
    return this.dedupClient;
  }

  /**
   * Compute warning level based on elapsed fraction of the SLA window.
   * Returns NONE/AMBER/RED. Pure function — easy to unit-test.
   */
  computeWarningLevel(
    assignedAt: Date,
    slaDeadline: Date,
    now: Date,
  ): 'NONE' | 'AMBER' | 'RED' {
    const total = slaDeadline.getTime() - assignedAt.getTime();
    if (total <= 0) return 'RED'; // already past or invalid window
    const elapsed = now.getTime() - assignedAt.getTime();
    const pct = elapsed / total;
    if (pct >= 0.9) return 'RED';
    if (pct >= 0.7) return 'AMBER';
    return 'NONE';
  }

  /**
   * Scan all IN_PROGRESS tickets for the given tenant, update sla_warning_level,
   * and queue SLA_WARNING notifications for newly AMBER/RED tickets.
   */
  async scanAndUpdate(tenantId: string): Promise<void> {
    const db = await getMssqlDb();
    const now = new Date();

    // Fetch all in-progress tickets with an SLA deadline for this tenant
    const rows = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        assigneeId: tickets.assigneeId,
        teamId: tickets.teamId,
        assignedAt: tickets.assignedAt,
        slaDeadline: tickets.slaResolutionDeadline,
        currentLevel: tickets.slaWarningLevel,
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          eq(tickets.status, 'IN_PROGRESS'),
          sql`${tickets.slaResolutionDeadline} IS NOT NULL`,
          sql`${tickets.assignedAt} IS NOT NULL`,
        ),
      );

    if (rows.length === 0) return;

    // Collect unique assignee and team IDs for bulk user lookup
    const assigneeIds = [...new Set(rows.map((r) => r.assigneeId).filter(Boolean) as string[])];
    const teamIds    = [...new Set(rows.map((r) => r.teamId).filter(Boolean) as string[])];

    // Fetch assignee emails in one query
    const assigneeRows = assigneeIds.length > 0
      ? await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(and(eq(users.tenantId, tenantId), sql`${users.id} IN (${sql.raw(assigneeIds.map(() => '?').join(','))})`, ...assigneeIds.map(() => sql`1=1`)))
          : [];
    // Note: for complex IN() we use raw SQL to avoid stub limitations
    const assigneeEmailMap = new Map<string, string>();
    for (const u of assigneeRows) assigneeEmailMap.set(u.id, u.email);

    // If the stub's IN() is limited, fall back to individual lookups
    if (assigneeIds.length > 0 && assigneeEmailMap.size === 0) {
      for (const uid of assigneeIds) {
        const found = await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(and(eq(users.tenantId, tenantId), eq(users.id, uid)));
        if (found[0]) assigneeEmailMap.set(found[0].id, found[0].email);
      }
    }

    // Fetch team leads (roleId = 4) for each relevant team
    const leadMap = new Map<string, { id: string; email: string }>();
    for (const teamId of teamIds) {
      const leads = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(
          and(
            eq(users.tenantId, tenantId),
            eq(users.teamId, teamId),
            eq(users.roleId, 4), // TEAM_LEAD
          ),
        );
      if (leads[0]) leadMap.set(teamId, { id: leads[0].id, email: leads[0].email });
    }

    const dedup = this.getDedup();

    for (const row of rows) {
      if (!row.assignedAt || !row.slaDeadline) continue;

      const assignedAt  = new Date(row.assignedAt);
      const slaDeadline = new Date(row.slaDeadline);
      const newLevel    = this.computeWarningLevel(assignedAt, slaDeadline, now);

      // Update DB if level changed (skip if unchanged to reduce writes)
      if (newLevel !== row.currentLevel) {
        await db
          .execute(
            sql`UPDATE Tickets SET sla_warning_level = ${newLevel}, updated_at = ${now.toISOString()} WHERE id = ${row.id} AND tenant_id = ${tenantId}`,
          )
          .catch((err: unknown) => {
            this.logger.error(`Failed to update sla_warning_level for ticket ${row.id}: ${String(err)}`);
          });
      }

      // Only notify for AMBER or RED
      if (newLevel === 'NONE') continue;

      // Redis dedup: SET NX with TTL = minutesRemaining (min 1 min)
      const msRemaining      = slaDeadline.getTime() - now.getTime();
      const minutesRemaining = Math.max(1, Math.round(msRemaining / 60_000));
      const dedupKey         = `sla-alert:${row.id}:${newLevel}`;
      const wasSet           = await dedup.set(dedupKey, '1', 'EX', minutesRemaining * 60, 'NX');
      if (!wasSet) continue; // already notified at this level

      const assigneeId    = row.assigneeId ?? null;
      const assigneeEmail = assigneeId ? (assigneeEmailMap.get(assigneeId) ?? '') : '';
      const lead          = row.teamId ? leadMap.get(row.teamId) : undefined;
      const ticketRef     = `TKT-${row.id.split('-')[0]?.toUpperCase() ?? row.id.slice(0, 8).toUpperCase()}`;

      await this.notifications.queueSlaWarning({
        type:             'SLA_WARNING',
        tenantId,
        ticketId:         row.id,
        ticketRef,
        ticketTitle:      row.title,
        assigneeId:       assigneeId ?? '',
        assigneeEmail,
        leadId:           lead?.id ?? null,
        leadEmail:        lead?.email ?? null,
        warningLevel:     newLevel,
        slaDeadline:      slaDeadline.toISOString(),
        minutesRemaining,
      });

      this.logger.log(
        `SLA ${newLevel} queued for ticket ${ticketRef} (${minutesRemaining}m remaining)`,
      );
    }
  }
}
