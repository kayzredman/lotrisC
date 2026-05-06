import { Injectable, Logger } from '@nestjs/common';
import { getEnv } from '@lotris/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export interface TicketNotificationPayload {
  type: 'TICKET_CREATED' | 'TICKET_ASSIGNED' | 'TICKET_RESOLVED' | 'TICKET_ESCALATED';
  tenantId: string;
  ticketId: string;
  ticketTitle: string;
  actorId: string;
  recipientId?: string;
}

/**
 * NotificationsService — queues notification jobs into BullMQ.
 * The actual email/in-app dispatch happens in workers/jobs.
 * This service only enqueues; it never sends directly.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private queue: Queue | null = null;

  private getQueue(): Queue {
    if (!this.queue) {
      const env = getEnv();
      const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
      this.queue = new Queue('notifications', { connection });
    }
    return this.queue;
  }

  async queueTicketNotification(payload: TicketNotificationPayload): Promise<void> {
    try {
      await this.getQueue().add(payload.type, payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      });
    } catch (err) {
      // Non-fatal: log and continue — never block the API response for a notification
      this.logger.error(`Failed to queue notification ${payload.type}: ${String(err)}`);
    }
  }
}
