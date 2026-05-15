import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'node:child_process';
import * as path from 'node:path';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getEnv } from '@lotris/config';
import { getMssqlDb, getPostgresDb, auditLogs, desc, sql } from '@lotris/db';

export interface ServiceHealthEntry {
  id: string;
  name: string;
  sub: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  cpu: number;          // percentage 0-100
  memUsedMb: number;
  memTotalMb: number;
  uptimeSeconds: number;
  lastPingMs: number;   // response time in ms (-1 = unreachable)
  checkedAt: string;    // ISO timestamp
}

export interface QueueDepthEntry {
  name: string;
  sub: string;
  waiting: number;
  active: number;
  failed: number;
  delayed: number;
  completedLastHour: number;
}

export interface HealthSnapshot {
  services: ServiceHealthEntry[];
  queues: QueueDepthEntry[];
  timestamp: string;
}

export interface IncidentEntry {
  id: number;
  title: string;
  service: string;
  resolvedAt: string | null;
  createdAt: string;
  details: string | null;
}

// CPU sampling state — updated on each health check
let _prevCpuUsage = process.cpuUsage();
let _prevCpuTime = Date.now();

function sampleApiCpuPercent(): number {
  const now = Date.now();
  const cur = process.cpuUsage(_prevCpuUsage);
  const elapsed = (now - _prevCpuTime) * 1000; // microseconds
  const totalCpu = cur.user + cur.system;
  const pct = elapsed > 0 ? Math.min(100, Math.round((totalCpu / elapsed) * 100)) : 0;
  _prevCpuUsage = process.cpuUsage();
  _prevCpuTime = now;
  return pct;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redisClient: IORedis | null = null;
  private bullQueues: Map<string, Queue> = new Map();

  private getRedis(): IORedis {
    if (!this.redisClient) {
      this.redisClient = new IORedis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
    }
    return this.redisClient;
  }

  private getBullQueue(name: string): Queue {
    if (!this.bullQueues.has(name)) {
      this.bullQueues.set(name, new Queue(name, { connection: this.getRedis() }));
    }
    return this.bullQueues.get(name)!;
  }

  // ── Per-service checks ───────────────────────────────────────────────────

  private checkApiSelf(): ServiceHealthEntry {
    const mem = process.memoryUsage();
    const memUsedMb = Math.round(mem.rss / 1024 / 1024);
    const cpu = sampleApiCpuPercent();
    return {
      id: 'nestjs-api',
      name: 'NestJS API',
      sub: 'api · :4000',
      status: 'UP',
      cpu,
      memUsedMb,
      memTotalMb: 2048, // configured limit
      uptimeSeconds: Math.round(process.uptime()),
      lastPingMs: 0,
      checkedAt: new Date().toISOString(),
    };
  }

  private async checkWeb(): Promise<ServiceHealthEntry> {
    const start = Date.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch(`http://localhost:${process.env.WEB_PORT ?? 3000}`, {
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const ms = Date.now() - start;
      const status = res.ok ? (ms > 1000 ? 'DEGRADED' : 'UP') : 'DEGRADED';
      return {
        id: 'nextjs-web',
        name: 'Next.js Web',
        sub: 'web · :3000',
        status,
        cpu: 0, // not observable from API
        memUsedMb: 0,
        memTotalMb: 1024,
        uptimeSeconds: 0,
        lastPingMs: ms,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        id: 'nextjs-web',
        name: 'Next.js Web',
        sub: 'web · :3000',
        status: 'DOWN',
        cpu: 0,
        memUsedMb: 0,
        memTotalMb: 1024,
        uptimeSeconds: 0,
        lastPingMs: -1,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private async checkMssql(): Promise<ServiceHealthEntry> {
    const start = Date.now();
    try {
      const db = await getMssqlDb();
      await db.execute(sql`SELECT 1 AS health_check`);
      const ms = Date.now() - start;
      const status = ms > 200 ? 'DEGRADED' : 'UP';
      return {
        id: 'mssql-db',
        name: 'MSSQL',
        sub: 'operational DB',
        status,
        cpu: 0,
        memUsedMb: 0,
        memTotalMb: 8192,
        uptimeSeconds: 0,
        lastPingMs: ms,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.warn(`MSSQL health check failed: ${String(err)}`);
      return {
        id: 'mssql-db',
        name: 'MSSQL',
        sub: 'operational DB',
        status: 'DOWN',
        cpu: 0,
        memUsedMb: 0,
        memTotalMb: 8192,
        uptimeSeconds: 0,
        lastPingMs: -1,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private async checkPostgres(): Promise<ServiceHealthEntry> {
    const start = Date.now();
    try {
      const db = getPostgresDb();
      await db.execute(sql`SELECT 1 AS health_check`);
      const ms = Date.now() - start;
      const status = ms > 300 ? 'DEGRADED' : 'UP';
      return {
        id: 'postgres-analytics',
        name: 'PostgreSQL',
        sub: 'analytics DB',
        status,
        cpu: 0,
        memUsedMb: 0,
        memTotalMb: 4096,
        uptimeSeconds: 0,
        lastPingMs: ms,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.warn(`PostgreSQL health check failed: ${String(err)}`);
      return {
        id: 'postgres-analytics',
        name: 'PostgreSQL',
        sub: 'analytics DB',
        status: 'DOWN',
        cpu: 0,
        memUsedMb: 0,
        memTotalMb: 4096,
        uptimeSeconds: 0,
        lastPingMs: -1,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealthEntry> {
    const start = Date.now();
    try {
      const redis = this.getRedis();
      await redis.ping();
      const ms = Date.now() - start;

      // Get memory info
      let memUsedMb = 0;
      try {
        const info = await redis.info('memory');
        const match = info.match(/used_memory:(\d+)/);
        if (match) memUsedMb = Math.round(Number(match[1]) / 1024 / 1024);
      } catch {
        // non-fatal
      }

      const status = ms > 50 ? 'DEGRADED' : 'UP';
      return {
        id: 'redis',
        name: 'Redis',
        sub: 'cache + queues',
        status,
        cpu: 0,
        memUsedMb,
        memTotalMb: 2048,
        uptimeSeconds: 0,
        lastPingMs: ms,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.warn(`Redis health check failed: ${String(err)}`);
      return {
        id: 'redis',
        name: 'Redis',
        sub: 'cache + queues',
        status: 'DOWN',
        cpu: 0,
        memUsedMb: 0,
        memTotalMb: 2048,
        uptimeSeconds: 0,
        lastPingMs: -1,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private async checkBullMqWorkers(): Promise<ServiceHealthEntry> {
    // Workers health is inferred from Redis connectivity + queue accessibility
    try {
      const q = this.getBullQueue('sla-timers');
      await q.getJobCounts();
      return {
        id: 'bullmq-workers',
        name: 'BullMQ Workers',
        sub: 'jobs · no port',
        status: 'UP',
        cpu: 0,
        memUsedMb: 0,
        memTotalMb: 512,
        uptimeSeconds: 0,
        lastPingMs: 0,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        id: 'bullmq-workers',
        name: 'BullMQ Workers',
        sub: 'jobs · no port',
        status: 'DOWN',
        cpu: 0,
        memUsedMb: 0,
        memTotalMb: 512,
        uptimeSeconds: 0,
        lastPingMs: -1,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  // ── Queue depths ─────────────────────────────────────────────────────────

  private readonly QUEUE_DEFS = [
    { name: 'sla-timers',    sub: 'Pickup + resolution countdowns' },
    { name: 'auto-assign',   sub: 'Mutex-locked assignment jobs'   },
    { name: 'notifications', sub: 'Email + in-app push dispatch'   },
    { name: 'report-gen',    sub: 'PDF/Excel generation jobs'      },
  ];

  private async getQueueDepths(): Promise<QueueDepthEntry[]> {
    const results: QueueDepthEntry[] = [];
    for (const def of this.QUEUE_DEFS) {
      try {
        const q = this.getBullQueue(def.name);
        const counts = await q.getJobCounts('waiting', 'active', 'failed', 'delayed', 'completed');
        results.push({
          name: def.name,
          sub: def.sub,
          waiting:           counts.waiting   ?? 0,
          active:            counts.active    ?? 0,
          failed:            counts.failed    ?? 0,
          delayed:           counts.delayed   ?? 0,
          completedLastHour: counts.completed ?? 0,
        });
      } catch {
        results.push({
          name: def.name,
          sub: def.sub,
          waiting: 0, active: 0, failed: 0, delayed: 0, completedLastHour: 0,
        });
      }
    }
    return results;
  }

  // ── Full snapshot ────────────────────────────────────────────────────────

  async getSnapshot(): Promise<HealthSnapshot> {
    const [api, web, mssql, postgres, redis, workers, queues] = await Promise.all([
      Promise.resolve(this.checkApiSelf()),
      this.checkWeb(),
      this.checkMssql(),
      this.checkPostgres(),
      this.checkRedis(),
      this.checkBullMqWorkers(),
      this.getQueueDepths(),
    ]);
    return {
      services: [api, web, mssql, postgres, redis, workers],
      queues,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Incidents ────────────────────────────────────────────────────────────

  async getIncidents(limit = 20): Promise<IncidentEntry[]> {
    try {
      const db = await getMssqlDb();
      // Incidents are audit log entries with action starting with SERVICE_
      // We use a system-level tenantId 'system' for cross-tenant health entries
      const rows = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          details: auditLogs.details,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(sql`${auditLogs.action} LIKE 'SERVICE_%'`)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return rows.map((r: typeof rows[number]) => ({
        id: r.id,
        title: r.action.replace('SERVICE_', '').replace(/_/g, ' '),
        service: r.entityId ?? 'unknown',
        resolvedAt: r.entityType === 'RESOLVED' ? r.createdAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        details: r.details ?? null,
      }));
    } catch {
      return [];
    }
  }

  // ── Restart (audit + cooldown check) ────────────────────────────────────

  async requestRestart(serviceName: string, actorId: string, tenantId: string): Promise<{ queued: boolean; cooldownSeconds?: number }> {
    const redis = this.getRedis();
    const cooldownKey = `health:restart-cooldown:${serviceName}`;

    // Check cooldown
    const ttl = await redis.ttl(cooldownKey);
    if (ttl > 0) {
      return { queued: false, cooldownSeconds: ttl };
    }

    // Set 60s cooldown
    await redis.set(cooldownKey, '1', 'EX', 60);

    // Write audit log
    try {
      const db = await getMssqlDb();
      await db.insert(auditLogs).values({
        tenantId,
        userId: actorId,
        action: 'SERVICE_RESTART_REQUESTED',
        entityType: 'Service',
        entityId: serviceName,
        details: JSON.stringify({ serviceName, requestedAt: new Date().toISOString() }),
        createdAt: new Date(),
      });
    } catch (err) {
      this.logger.error(`Failed to write restart audit log: ${String(err)}`);
    }

    // For nestjs-api: schedule graceful exit (Docker/PM2 will restart)
    if (serviceName === 'nestjs-api') {
      this.logger.warn(`[Health] Restart requested for nestjs-api by ${actorId}. Scheduling exit...`);
      setTimeout(() => process.exit(0), 1500);
    }

    return { queued: true };
  }

  // ── Package store health ──────────────────────────────────────────────────

  async checkStoreHealth(): Promise<{
    healthy: boolean;
    corruptedPackages: string[];
    repairState: 'idle' | 'running' | 'done' | 'error';
    startedAt?: string;
  }> {
    const redis = this.getRedis();
    const [repairState, startedAt] = await Promise.all([
      redis.get('health:store-repair:state'),
      redis.get('health:store-repair:started_at'),
    ]);
    const state = (repairState ?? 'idle') as 'idle' | 'running' | 'done' | 'error';

    if (state === 'running') {
      return { healthy: false, corruptedPackages: [], repairState: 'running', startedAt: startedAt ?? undefined };
    }

    const pnpm = path.join(path.dirname(process.execPath), 'pnpm');
    return new Promise((resolve) => {
      exec(`"${pnpm}" store status`, { cwd: process.cwd(), timeout: 30_000 }, (_err, stdout) => {
        const corruptedPackages = stdout
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('You can run') && !l.includes('pnpm install'));
        resolve({
          healthy: corruptedPackages.length === 0,
          corruptedPackages,
          repairState: state,
          startedAt: startedAt ?? undefined,
        });
      });
    });
  }

  async repairStore(actorId: string, tenantId: string): Promise<{ started: boolean; message: string }> {
    const redis = this.getRedis();

    const [current, cooldownTtl] = await Promise.all([
      redis.get('health:store-repair:state'),
      redis.ttl('health:store-repair:cooldown'),
    ]);
    if (current === 'running') return { started: false, message: 'Repair already in progress' };
    if (cooldownTtl > 0) return { started: false, message: `Repair cooling down — available in ${cooldownTtl}s` };

    await Promise.all([
      redis.set('health:store-repair:state', 'running', 'EX', 600),
      redis.set('health:store-repair:started_at', new Date().toISOString(), 'EX', 600),
    ]);

    try {
      const db = await getMssqlDb();
      await db.insert(auditLogs).values({
        tenantId,
        userId: actorId,
        action: 'STORE_REPAIR_REQUESTED',
        entityType: 'System',
        entityId: 'pnpm-store',
        details: JSON.stringify({ startedAt: new Date().toISOString() }),
        createdAt: new Date(),
      });
    } catch (err) {
      this.logger.error(`Failed to write store repair audit log: ${String(err)}`);
    }

    const pnpm = path.join(path.dirname(process.execPath), 'pnpm');
    this.logger.log(`[Health] pnpm store repair triggered by ${actorId}`);

    exec(`"${pnpm}" install --force`, { cwd: process.cwd(), timeout: 300_000 }, async (err, _stdout, stderr) => {
      const r = this.getRedis();
      if (err) {
        this.logger.error(`[Health] Store repair failed: ${stderr}`);
        await r.set('health:store-repair:state', 'error', 'EX', 300);
      } else {
        this.logger.log('[Health] Store repair completed successfully');
        await Promise.all([
          r.set('health:store-repair:state', 'done', 'EX', 120),
          r.set('health:store-repair:cooldown', '1', 'EX', 300),
        ]);
      }
    });

    return { started: true, message: 'Repair started — takes 2–4 min. Status updates automatically.' };
  }
}
