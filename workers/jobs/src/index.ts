import { getEnv } from '@lotris/config';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createSlaTimersWorker } from './sla-timers.worker';
import { createAutoAssignWorker } from './auto-assign.worker';

const env = getEnv();

// ── Shared Redis connection ─────────────────────────────────────────────────
const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
});

connection.on('connect', () => console.log('🔴  Redis connected (workers)'));
connection.on('error', (err) => console.error('Redis error:', err));

// ── Queue registrations ─────────────────────────────────────────────────────

/** SLA countdown timers — pickup + resolution SLA breach jobs (Sprint 5-6) */
export const slaTimersQueue = new Queue('sla-timers', { connection });

/** Auto-assignment jobs — triggered on pickup SLA breach (Sprint 5-6) */
export const autoAssignQueue = new Queue('auto-assign', { connection });

/** Email + in-app notification dispatch (Sprint 3-4) */
export const notificationsQueue = new Queue('notifications', { connection });

/** Report generation (PDF + Excel) and email delivery (Sprint 11-12) */
export const reportGenQueue = new Queue('report-gen', { connection });

// ── Active workers ──────────────────────────────────────────────────────────

const slaTimersWorker = createSlaTimersWorker(connection);
const autoAssignWorker = createAutoAssignWorker(connection);

console.log('⚙️   Lotris BullMQ Worker process starting…');
console.log('   Queues registered: sla-timers, auto-assign, notifications, report-gen');
console.log('   Workers active: sla-timers, auto-assign');

// ── Graceful shutdown ──────────────────────────────────────────────────────
async function shutdown() {
  console.log('\n🛑  Shutting down workers gracefully…');
  await Promise.all([
    slaTimersWorker.close(),
    autoAssignWorker.close(),
    slaTimersQueue.close(),
    autoAssignQueue.close(),
    notificationsQueue.close(),
    reportGenQueue.close(),
    connection.quit(),
  ]);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
