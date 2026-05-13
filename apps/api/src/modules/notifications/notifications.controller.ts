import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { Session } from '../auth/decorators/session.decorator';
import type { TrpcAuth } from '@lotris/types';
import { SseService } from './sse.service';

/**
 * NotificationsController — real-time SSE notification stream.
 *
 * GET /api/v1/notifications/sse
 * Opens a Server-Sent Event stream for the authenticated user.
 * Events are published by BullMQ workers via Redis pub/sub.
 *
 * Event payload shape: { type, ...fields }
 *   SLA_WARNING  → { type:'SLA_WARNING', ticketRef, ticketTitle, warningLevel, minutesRemaining }
 *   KPI_WARNING  → { type:'KPI_WARNING', kpiName, projectedScore, target, warningLevel, periodKey }
 */
@Controller('api/v1/notifications')
@UseGuards(ClerkJwtGuard)
export class NotificationsController {
  constructor(private readonly sse: SseService) {}

  @Get('sse')
  async sseNotifications(
    @Session() auth: TrpcAuth,
    @Req() _req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    reply.hijack();
    const raw = reply.raw;

    raw.writeHead(200, {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    raw.flushHeaders();

    // Keepalive comment every 30s to prevent proxy/load-balancer timeouts
    const keepAlive = setInterval(() => {
      try {
        raw.write(': keep-alive\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 30_000);

    raw.on('close', () => clearInterval(keepAlive));

    await this.sse.addConnection(auth.userId, raw);
  }
}
