import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { getMssqlDb, tickets, ticketHistory, users } from '@lotris/db';
import { eq, and, count, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface SlaJobData {
  ticketId: string;
  tenantId: string;
}

/**
 * Pickup SLA check:
 * Fired when a ticket has not been claimed within the pickup SLA window.
 * If still UNASSIGNED/TEAM_ASSIGNED → trigger auto-assignment.
 * Marks pickup SLA as breached.
 */
async function handlePickupSlaCheck(job: Job<SlaJobData>) {
  const { ticketId, tenantId } = job.data;
  const db = getMssqlDb();

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)));

  if (!ticket) {
    console.log(`[sla-timers] pickup-sla-check: ticket ${ticketId} not found, skipping`);
    return;
  }

  // Already claimed or beyond this state — no action needed
  if (ticket.status !== 'UNASSIGNED' && ticket.status !== 'TEAM_ASSIGNED') {
    console.log(`[sla-timers] pickup-sla-check: ticket ${ticketId} status=${ticket.status as string}, no action`);
    return;
  }

  const now = new Date();

  // Mark pickup SLA breached
  await db
    .update(tickets)
    .set({ slaPickupBreached: 1, updatedAt: now })
    .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)));

  await db.insert(ticketHistory).values({
    tenantId,
    ticketId,
    actorId: null,
    eventType: 'PICKUP_SLA_BREACHED',
    fromValue: null,
    toValue: `Breached at ${now.toISOString()}`,
    createdAt: now,
  });

  // Trigger auto-assignment via a separate queue
  // (import lazily to avoid circular issues)
  const { autoAssignQueue } = await import('./index');
  await autoAssignQueue.add(
    'auto-assign',
    { ticketId, tenantId },
    {
      jobId: `auto-assign-${ticketId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    },
  );

  console.log(`[sla-timers] pickup-sla-check: ticket ${ticketId} SLA breached — auto-assign queued`);
}

/**
 * Resolution SLA check:
 * Fired when a ticket has not been resolved within resolution SLA.
 * If still open → mark breached, escalate, notify manager.
 */
async function handleResolutionSlaCheck(job: Job<SlaJobData>) {
  const { ticketId, tenantId } = job.data;
  const db = getMssqlDb();

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)));

  if (!ticket) return;

  // Already resolved or closed — nothing to do
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    return;
  }

  const now = new Date();

  // Mark resolution SLA breached and escalate
  await db
    .update(tickets)
    .set({
      slaResolutionBreached: 1,
      status: 'ESCALATED',
      updatedAt: now,
    })
    .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)));

  await db.insert(ticketHistory).values([
    {
      tenantId,
      ticketId,
      actorId: null,
      eventType: 'RESOLUTION_SLA_BREACHED',
      toValue: `Breached at ${now.toISOString()}`,
      createdAt: now,
    },
    {
      tenantId,
      ticketId,
      actorId: null,
      eventType: 'STATUS_CHANGED',
      fromValue: ticket.status as string,
      toValue: 'ESCALATED',
      createdAt: now,
    },
  ]);

  // Queue manager notification
  const { notificationsQueue } = await import('./index');
  await notificationsQueue.add(
    'TICKET_ESCALATED',
    {
      type: 'TICKET_ESCALATED',
      tenantId,
      ticketId,
      ticketTitle: ticket.title,
      actorId: null,
      reason: 'RESOLUTION_SLA_BREACH',
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  );

  console.log(`[sla-timers] resolution-sla-check: ticket ${ticketId} SLA breached → ESCALATED`);
}

export function createSlaTimersWorker(connection: IORedis) {
  const worker = new Worker<SlaJobData>(
    'sla-timers',
    async (job) => {
      if (job.name === 'pickup-sla-check') {
        await handlePickupSlaCheck(job);
      } else if (job.name === 'resolution-sla-check') {
        await handleResolutionSlaCheck(job);
      } else {
        console.warn(`[sla-timers] Unknown job name: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) =>
    console.log(`[sla-timers] Job ${job.id} (${job.name}) completed`),
  );
  worker.on('failed', (job, err) =>
    console.error(`[sla-timers] Job ${job?.id} failed:`, err),
  );

  return worker;
}
