import { Worker, Queue, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import IORedisClient from 'ioredis';
import { getMssqlDb, tickets, users, eq, and, sql } from '@lotris/db';
import { getEnv } from '@lotris/config';

/**
 * SLA Predictor Worker — runs every 5 minutes across all tenants.
 *
 * Scans IN_PROGRESS tickets, computes SLA warning levels,
 * updates the DB, and queues SLA_WARNING notifications.
 * Uses a Redis dedup key to avoid repeated notifications for the same level.
 *
 * This is the standalone worker version (no NestJS DI).
 * The NestJS SlaPredictor service provides the same logic for on-demand use.
 */

function computeWarningLevel(
  assignedAt: Date,
  slaDeadline: Date,
  now: Date,
): 'NONE' | 'AMBER' | 'RED' {
  const total = slaDeadline.getTime() - assignedAt.getTime();
  if (total <= 0) return 'RED';
  const elapsed = now.getTime() - assignedAt.getTime();
  const pct     = elapsed / total;
  if (pct >= 0.9) return 'RED';
  if (pct >= 0.7) return 'AMBER';
  return 'NONE';
}

async function runSlaPredictor(dedup: IORedisClient, notificationsQueue: Queue): Promise<void> {
  const db  = await getMssqlDb();
  const now = new Date();

  // Fetch all unique tenants that have IN_PROGRESS tickets with SLA deadlines
  const tenantRows = await db.execute<{ tenant_id: string }>(
    sql`SELECT DISTINCT tenant_id FROM Tickets WHERE status = 'IN_PROGRESS' AND sla_resolution_deadline IS NOT NULL AND assigned_at IS NOT NULL`,
  );

  for (const { tenant_id: tenantId } of tenantRows) {
    const rows = await db
      .select({
        id:           tickets.id,
        title:        tickets.title,
        assigneeId:   tickets.assigneeId,
        teamId:       tickets.teamId,
        assignedAt:   tickets.assignedAt,
        slaDeadline:  tickets.slaResolutionDeadline,
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

    for (const row of rows) {
      if (!row.assignedAt || !row.slaDeadline) continue;

      const newLevel = computeWarningLevel(new Date(row.assignedAt), new Date(row.slaDeadline), now);

      if (newLevel !== row.currentLevel) {
        await db.execute(
          sql`UPDATE Tickets SET sla_warning_level = ${newLevel}, updated_at = ${now.toISOString()} WHERE id = ${row.id} AND tenant_id = ${tenantId}`,
        ).catch((err: unknown) => console.error(`[sla-predictor] UPDATE failed for ${row.id}:`, err));
      }

      if (newLevel === 'NONE') continue;

      const msRemaining      = new Date(row.slaDeadline).getTime() - now.getTime();
      const minutesRemaining = Math.max(1, Math.round(msRemaining / 60_000));
      const dedupKey         = `sla-alert:${row.id}:${newLevel}`;
      const wasSet           = await dedup.set(dedupKey, '1', 'EX', minutesRemaining * 60, 'NX');
      if (!wasSet) continue;

      // Fetch assignee email
      let assigneeEmail = '';
      if (row.assigneeId) {
        const assignees = await db
          .select({ email: users.email })
          .from(users)
          .where(and(eq(users.tenantId, tenantId), eq(users.id, row.assigneeId)));
        assigneeEmail = assignees[0]?.email ?? '';
      }

      // Fetch team lead
      let leadId: string | null   = null;
      let leadEmail: string | null = null;
      if (row.teamId) {
        const leads = await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(and(eq(users.tenantId, tenantId), eq(users.teamId, row.teamId), eq(users.roleId, 4)));
        if (leads[0]) {
          leadId    = leads[0].id;
          leadEmail = leads[0].email;
        }
      }

      const ticketRef = `TKT-${row.id.split('-')[0]?.toUpperCase() ?? row.id.slice(0, 8).toUpperCase()}`;
      await notificationsQueue.add('SLA_WARNING', {
        type: 'SLA_WARNING',
        tenantId,
        ticketId:         row.id,
        ticketRef,
        ticketTitle:      row.title,
        assigneeId:       row.assigneeId ?? '',
        assigneeEmail,
        leadId,
        leadEmail,
        warningLevel:     newLevel,
        slaDeadline:      new Date(row.slaDeadline).toISOString(),
        minutesRemaining,
      }, {
        attempts: 3,
        backoff:  { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail:     { count: 500 },
      });
    }
  }
}

export function createSlaPredictorWorker(connection: IORedis): Worker {
  const env   = getEnv();
  const dedup = new IORedisClient(env.REDIS_URL, { maxRetriesPerRequest: null });
  const notificationsQueue = new Queue('notifications', { connection: new IORedisClient(env.REDIS_URL, { maxRetriesPerRequest: null }) });

  return new Worker(
    'sla-predictor',
    async (_job: Job) => {
      await runSlaPredictor(dedup, notificationsQueue);
    },
    { connection, concurrency: 1 },
  );
}
