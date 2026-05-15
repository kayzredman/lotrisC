import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import type { ServerResponse } from 'node:http';
import IORedis from 'ioredis';
import { getEnv } from '@lotris/config';

/**
 * SseService — manages per-user Server-Sent Event connections.
 *
 * Workers publish real-time events to Redis pub/sub channel `sse:user:{userId}`.
 * This service subscribes to those channels and fans the message out to every
 * active browser SSE connection for that user.
 *
 * Usage from a controller:
 *   await this.sseService.addConnection(auth.userId, reply.raw);
 */
@Injectable()
export class SseService implements OnApplicationShutdown {
  // userId → set of active HTTP response streams
  private readonly connections = new Map<string, Set<ServerResponse>>();
  private subscriber: IORedis | null = null;

  private getSubscriber(): IORedis {
    if (!this.subscriber) {
      this.subscriber = new IORedis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
      this.subscriber.on('message', (channel: string, message: string) => {
        // channel = 'sse:user:{userId}'
        const userId = channel.split(':')[2];
        if (!userId) return;
        const conns = this.connections.get(userId);
        if (!conns || conns.size === 0) return;
        for (const res of [...conns]) {
          try {
            res.write(`data: ${message}\n\n`);
          } catch {
            conns.delete(res);
          }
        }
      });
    }
    return this.subscriber;
  }

  async addConnection(userId: string, res: ServerResponse): Promise<void> {
    const isNew = !this.connections.has(userId);
    if (isNew) {
      this.connections.set(userId, new Set());
      // Subscribe once per userId — Redis fan-out handles multiple tabs
      await this.getSubscriber().subscribe(`sse:user:${userId}`);
    }
    this.connections.get(userId)!.add(res);

    res.on('close', () => {
      const conns = this.connections.get(userId);
      if (!conns) return;
      conns.delete(res);
      if (conns.size === 0) this.connections.delete(userId);
      // Note: we deliberately do NOT unsubscribe from Redis here — the
      // subscriber overhead is negligible and re-subscribing on reconnect is fine.
    });
  }

  onApplicationShutdown(): void {
    void this.subscriber?.quit();
  }
}
