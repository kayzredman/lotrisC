import 'reflect-metadata'; // required by @Injectable() decorators in bundled NestJS services
import { getEnv } from '@lotris/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createSlaTimersWorker } from './sla-timers.worker';
import { createAutoAssignWorker } from './auto-assign.worker';
import { createEtlSyncWorker, registerEtlRepeatableJob } from './etl-sync.worker';
import { createNotificationsWorker } from './notifications.worker';
import { createSlaPredictorWorker } from './sla-predictor.worker';
import { createKpiTrendWorker } from './kpi-trend.worker';
import { createDigestWorker } from './digest.worker';
import { createReportGenWorker } from './report-gen.worker';

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

/** ETL sync — incremental and daily batch MSSQL → PostgreSQL (Sprint 11-12) */
export const etlSyncQueue = new Queue('etl-sync', { connection });

/** SLA breach prediction — scans IN_PROGRESS tickets every 5 min (Sprint 18) */
export const slaPredictorQueue = new Queue('sla-predictor', { connection });

/** KPI trend analysis + snapshot writes — every 30 min (Sprint 18) */
export const kpiTrendQueue = new Queue('kpi-trend', { connection });

/** Daily KPI digest emails to team leads — 08:00 UTC (Sprint 18) */
export const digestQueue = new Queue('digest', { connection });

// ── Active workers ──────────────────────────────────────────────────────────

const slaTimersWorker     = createSlaTimersWorker(connection);
const autoAssignWorker    = createAutoAssignWorker(connection);
const etlSyncWorker       = createEtlSyncWorker(connection);
const notificationsWorker = createNotificationsWorker(connection);
const slaPredictorWorker  = createSlaPredictorWorker(connection);
const kpiTrendWorker      = createKpiTrendWorker(connection);
const digestWorker        = createDigestWorker(connection);
const reportGenWorker     = createReportGenWorker(connection, reportGenQueue);

// Register ETL repeatable daily job (idempotent — BullMQ deduplicates by jobId)
registerEtlRepeatableJob(etlSyncQueue).catch((err) =>
  console.error('Failed to register ETL repeatable job:', err),
);

// ── Register Sprint 18 repeatable jobs ─────────────────────────────────────

/** SLA predictor: every 5 minutes */
slaPredictorQueue.add(
  'sla-predict-scan',
  {},
  { repeat: { pattern: '*/5 * * * *' }, jobId: 'sla-predict-repeatable', removeOnComplete: { count: 5 } },
).catch((err) => console.error('Failed to register sla-predictor job:', err));

/** KPI trend: every 30 minutes */
kpiTrendQueue.add(
  'kpi-trend-scan',
  {},
  { repeat: { pattern: '0 */30 * * * *' }, jobId: 'kpi-trend-repeatable', removeOnComplete: { count: 5 } },
).catch((err) => console.error('Failed to register kpi-trend job:', err));

/** Digest: daily at 08:00 UTC */
digestQueue.add(
  'daily-digest',
  {},
  { repeat: { pattern: '0 8 * * *' }, jobId: 'digest-repeatable', removeOnComplete: { count: 5 } },
).catch((err) => console.error('Failed to register digest job:', err));

/** Report schedules: hourly at :00 */
reportGenQueue.add(
  'PROCESS_SCHEDULES',
  {},
  { repeat: { pattern: '0 * * * *' }, jobId: 'report-schedule-repeatable', removeOnComplete: { count: 5 } },
).catch((err) => console.error('Failed to register report schedule job:', err));

console.log('⚙️   Lotris BullMQ Worker process starting…');
console.log('   Queues registered: sla-timers, auto-assign, notifications, report-gen, etl-sync, sla-predictor, kpi-trend, digest');
console.log('   Workers active:    sla-timers, auto-assign, notifications, etl-sync, sla-predictor, kpi-trend, digest, report-gen');

// ── Graceful shutdown ──────────────────────────────────────────────────────
async function shutdown() {
  console.log('\n🛑  Shutting down workers gracefully…');
  await Promise.all([
    slaTimersWorker.close(),
    autoAssignWorker.close(),
    etlSyncWorker.close(),
    notificationsWorker.close(),
    slaPredictorWorker.close(),
    kpiTrendWorker.close(),
    digestWorker.close(),
    reportGenWorker.close(),
    slaTimersQueue.close(),
    autoAssignQueue.close(),
    notificationsQueue.close(),
    reportGenQueue.close(),
    etlSyncQueue.close(),
    slaPredictorQueue.close(),
    kpiTrendQueue.close(),
    digestQueue.close(),
    connection.quit(),
  ]);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
