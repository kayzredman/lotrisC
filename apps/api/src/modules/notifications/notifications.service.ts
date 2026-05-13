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

export interface IntakeAckPayload {
  type: 'INTAKE_ACK';
  ticketId: string;
  ticketRef: string;
  ticketTitle: string;
  requesterEmail: string;
  requesterName: string;
}

export interface IntakeResolvedPayload {
  type: 'INTAKE_RESOLVED';
  ticketId: string;
  ticketRef: string;
  ticketTitle: string;
  requesterEmail: string;
  requesterName: string;
  teamName: string;
}

export interface SlaWarningPayload {
  type: 'SLA_WARNING';
  tenantId: string;
  ticketId: string;
  ticketRef: string;
  ticketTitle: string;
  assigneeId: string;
  assigneeEmail: string;
  leadId: string | null;
  leadEmail: string | null;
  warningLevel: 'AMBER' | 'RED';
  slaDeadline: string; // ISO timestamp
  minutesRemaining: number;
}

export interface KpiWarningPayload {
  type: 'KPI_WARNING';
  tenantId: string;
  engineerId: string;
  engineerName: string;
  kpiName: string;
  projectedScore: number;
  target: number;
  warningLevel: 'AMBER' | 'RED';
  periodKey: string;
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

  async queueIntakeAck(payload: IntakeAckPayload): Promise<void> {
    try {
      await this.getQueue().add('INTAKE_ACK', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      });
    } catch (err) {
      this.logger.error(`Failed to queue INTAKE_ACK for ${payload.ticketId}: ${String(err)}`);
    }
  }

  async queueIntakeResolved(payload: IntakeResolvedPayload): Promise<void> {
    try {
      await this.getQueue().add('INTAKE_RESOLVED', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      });
    } catch (err) {
      this.logger.error(`Failed to queue INTAKE_RESOLVED for ${payload.ticketId}: ${String(err)}`);
    }
  }

  async queueSlaWarning(payload: SlaWarningPayload): Promise<void> {
    try {
      await this.getQueue().add('SLA_WARNING', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      });
    } catch (err) {
      this.logger.error(`Failed to queue SLA_WARNING for ticket ${payload.ticketId}: ${String(err)}`);
    }
  }

  async queueKpiWarning(payload: KpiWarningPayload): Promise<void> {
    try {
      await this.getQueue().add('KPI_WARNING', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      });
    } catch (err) {
      this.logger.error(`Failed to queue KPI_WARNING for engineer ${payload.engineerId}: ${String(err)}`);
    }
  }
}
