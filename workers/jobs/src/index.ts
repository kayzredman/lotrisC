import { getEnv } from '@lotris/config';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const env = getEnv();

// ── Shared Redis connection ─────────────────────────────────────────────────
const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
});

connection.on('connect', () => console.log('🔴  Redis connected (workers)'));
connection.on('error', (err) => console.error('Redis error:', err));

// ── Queue registrations ─────────────────────────────────────────────────────
// Queues are registered here. Workers are added as sprints progress.

/** SLA countdown timers — pickup + resolution SLA breach jobs (Sprint 5-6) */
export const slaTimersQueue = new Queue('sla-timers', { connection });

/** Auto-assignment jobs — triggered on pickup SLA breach (Sprint 5-6) */
export const autoAssignQueue = new Queue('auto-assign', { connection });

/** Email + in-app notification dispatch (Sprint 3-4) */
export const notificationsQueue = new Queue('notifications', { connection });

/** Report generation (PDF + Excel) and email delivery (Sprint 11-12) */
export const reportGenQueue = new Queue('report-gen', { connection });

// ── Worker bootstrapping ────────────────────────────────────────────────────
// Workers are registered in individual files and imported here.
// They will be added in the relevant sprints.

console.log('⚙️   Lotris BullMQ Worker process starting…');
console.log('   Queues registered: sla-timers, auto-assign, notifications, report-gen');
console.log('   Workers active: none (Sprint 3+ will add workers)');

// ── Graceful shutdown ──────────────────────────────────────────────────────
async function shutdown() {
  console.log('\n🛑  Shutting down workers gracefully…');
  await Promise.all([
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
