import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { getMssqlDb, tickets, ticketHistory, users, queueConfigs, eq, and, count, asc, sql } from '@lotris/db';

interface AutoAssignJobData {
  ticketId: string;
  tenantId: string;
}

const MUTEX_TTL_MS = 10_000; // 10 second lock per ticket

/**
 * Auto-assignment worker.
 * Uses a Redis mutex lock (SETNX) to prevent race conditions when
 * multiple pickup SLA timers fire at nearly the same time.
 *
 * Algorithm:
 *   1. Acquire mutex for this ticketId
 *   2. Reload ticket — if already assigned, release + return
 *   3. Find least-loaded active engineer in the ticket's team
 *   4. Check they are under max capacity
 *   5. Assign ticket → ASSIGNED; write history; enqueue resolution SLA
 *   6. Release mutex
 */
async function handleAutoAssign(job: Job<AutoAssignJobData>, redis: IORedis) {
  const { ticketId, tenantId } = job.data;
  const mutexKey = `mutex:auto-assign:${ticketId}`;
  const db = await getMssqlDb();

  // ── Acquire mutex ─────────────────────────────────────────────────────────
  const acquired = await redis.set(mutexKey, '1', 'PX', MUTEX_TTL_MS, 'NX');
  if (!acquired) {
    console.log(`[auto-assign] mutex locked for ${ticketId} — skipping duplicate job`);
    return;
  }

  try {
    // ── Reload ticket ───────────────────────────────────────────────────────
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)));

    if (!ticket) {
      console.log(`[auto-assign] ticket ${ticketId} not found`);
      return;
    }

    // Already assigned — nothing to do
    if (ticket.status !== 'UNASSIGNED' && ticket.status !== 'TEAM_ASSIGNED') {
      console.log(`[auto-assign] ticket ${ticketId} already in status ${ticket.status as string}`);
      return;
    }

    if (!ticket.teamId) {
      console.log(`[auto-assign] ticket ${ticketId} has no team — cannot auto-assign`);
      return;
    }

    // ── Check auto-assign is enabled for this team ──────────────────────────
    const queueCfg = await getQueueConfig(db, tenantId, ticket.teamId as string);
    if (!queueCfg.autoAssignEnabled) {
      console.log(`[auto-assign] auto-assign disabled for team ${ticket.teamId as string}`);
      return;
    }

    // ── Find least-loaded engineer in the team ─────────────────────────────
    // Get all active engineers in the team
    const teamEngineers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.teamId, ticket.teamId as string),
          eq(users.isActive, 1),
          eq(users.isUnavailable, 0),
        ),
      );

    if (teamEngineers.length === 0) {
      console.log(`[auto-assign] no available engineers in team ${ticket.teamId as string}`);
      return;
    }

    // Count open tickets per engineer
    const workloads = await db
      .select({
        assigneeId: tickets.assigneeId,
        openCount: count(),
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          sql`${tickets.status} IN ('ASSIGNED', 'IN_PROGRESS', 'ESCALATED')`,
          sql`${tickets.assigneeId} IS NOT NULL`,
        ),
      )
      .groupBy(tickets.assigneeId);

    const workloadMap = new Map<string, number>();
    for (const w of workloads) {
      workloadMap.set(w.assigneeId as string, Number(w.openCount));
    }

    // Find engineer with lowest load (round-robin on tie via array order)
    let selectedEngineerId: string | null = null;
    let minLoad = Infinity;

    for (const eng of teamEngineers) {
      const load = workloadMap.get(eng.id as string) ?? 0;
      if (load < minLoad && load < queueCfg.maxCapacityPerEngineer) {
        minLoad = load;
        selectedEngineerId = eng.id as string;
      }
    }

    if (!selectedEngineerId) {
      console.log(`[auto-assign] all engineers at max capacity for team ${ticket.teamId as string}`);
      return;
    }

    // ── Assign the ticket ──────────────────────────────────────────────────
    const now = new Date();
    const resolutionDeadline = new Date(
      now.getTime() + queueCfg.resolutionSlaMinutes * 60_000,
    );

    await db.update(tickets).set({
      status: 'ASSIGNED',
      assigneeId: selectedEngineerId,
      assignedAt: now,
      slaResolutionDeadline: resolutionDeadline,
      updatedAt: now,
    }).where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)));

    await db.insert(ticketHistory).values({
      tenantId,
      ticketId,
      actorId: null,
      eventType: 'AUTO_ASSIGNED',
      fromValue: ticket.status as string,
      toValue: 'ASSIGNED',
      metadata: JSON.stringify({ assignedTo: selectedEngineerId, reason: 'PICKUP_SLA_BREACH' }),
      createdAt: now,
    });

    // Enqueue resolution SLA timer
    const { slaTimersQueue } = await import('./index');
    const delay = Math.max(0, resolutionDeadline.getTime() - Date.now());
    await slaTimersQueue.add(
      'resolution-sla-check',
      { ticketId, tenantId },
      {
        jobId: `resolution-sla-${ticketId}`,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    // Notify the assigned engineer
    const { notificationsQueue } = await import('./index');
    await notificationsQueue.add(
      'TICKET_ASSIGNED',
      {
        type: 'TICKET_ASSIGNED',
        tenantId,
        ticketId,
        ticketTitle: ticket.title,
        actorId: null,
        recipientId: selectedEngineerId,
        autoAssigned: true,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    console.log(
      `[auto-assign] ticket ${ticketId} auto-assigned to engineer ${selectedEngineerId} (load: ${minLoad})`,
    );
  } finally {
    // ── Release mutex ───────────────────────────────────────────────────────
    await redis.del(mutexKey);
  }
}

async function getQueueConfig(
  db: Awaited<ReturnType<typeof getMssqlDb>>,
  tenantId: string,
  teamId: string,
): Promise<{ maxCapacityPerEngineer: number; resolutionSlaMinutes: number; autoAssignEnabled: number }> {
  const [teamCfg] = await db
    .select()
    .from(queueConfigs)
    .where(and(eq(queueConfigs.tenantId, tenantId), eq(queueConfigs.teamId, teamId)));
  if (teamCfg) return teamCfg as typeof teamCfg & { autoAssignEnabled: number };

  const [tenantCfg] = await db
    .select()
    .from(queueConfigs)
    .where(and(eq(queueConfigs.tenantId, tenantId), sql`${queueConfigs.teamId} IS NULL`));

  return (tenantCfg ?? {
    maxCapacityPerEngineer: 10,
    resolutionSlaMinutes: 240,
    autoAssignEnabled: 1,
  }) as { maxCapacityPerEngineer: number; resolutionSlaMinutes: number; autoAssignEnabled: number };
}

export function createAutoAssignWorker(connection: IORedis) {
  // Use a separate dedicated Redis connection for the worker
  // The mutex uses the same connection instance
  const worker = new Worker<AutoAssignJobData>(
    'auto-assign',
    async (job) => {
      await handleAutoAssign(job, connection);
    },
    {
      connection,
      // Concurrency 1 to serialise assignments and reduce mutex contention
      concurrency: 1,
    },
  );

  worker.on('completed', (job) =>
    console.log(`[auto-assign] Job ${job.id} completed`),
  );
  worker.on('failed', (job, err) =>
    console.error(`[auto-assign] Job ${job?.id} failed:`, err),
  );

  return worker;
}
