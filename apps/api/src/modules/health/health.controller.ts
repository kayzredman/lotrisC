import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { RoleGuard } from '../auth/role.guard';
import { Session } from '../auth/decorators/session.decorator';
import { HealthService } from './health.service';
import type { TrpcAuth } from '@lotris/types';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** Public liveness probe — used by Docker, load balancers, and status pages */
  @ApiOperation({ summary: 'API liveness check' })
  @Get()
  check() {
    return {
      status: 'UP',
      service: 'api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Full health snapshot — single poll (ADMIN only).
   * Used as the initial data load before the SSE stream connects.
   */
  @ApiOperation({ summary: 'Full system health snapshot (ADMIN)' })
  @ApiBearerAuth()
  @UseGuards(ClerkJwtGuard, RoleGuard('ADMIN', 'SUPERADMIN'))
  @Get('snapshot')
  snapshot() {
    return this.healthService.getSnapshot();
  }

  /**
   * SSE stream — emits a HealthSnapshot every 1 second.
   * ADMIN only. Uses Clerk JWT passed via ClerkJwtGuard (Authorization header).
   */
  @ApiOperation({ summary: 'Live SSE health stream (ADMIN)' })
  @ApiBearerAuth()
  @UseGuards(ClerkJwtGuard, RoleGuard('ADMIN', 'SUPERADMIN'))
  @Get('sse')
  async sseHealth(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Session() _session: TrpcAuth,
  ) {
    // Hijack the response so Fastify doesn't auto-finalize it
    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx proxy buffering
    });
    raw.flushHeaders();

    const send = (data: unknown) => {
      raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial snapshot immediately
    try {
      send(await this.healthService.getSnapshot());
    } catch {
      // continue even if initial check fails
    }

    const interval = setInterval(async () => {
      try {
        send(await this.healthService.getSnapshot());
      } catch {
        // non-fatal
      }
    }, 1000);

    // Clean up when client disconnects
    req.raw.on('close', () => {
      clearInterval(interval);
    });
  }

  /**
   * Restart a service — ADMIN only.
   * 60s cooldown enforced via Redis. Always writes audit log.
   */
  @ApiOperation({ summary: 'Request a service restart (ADMIN, 60s cooldown)' })
  @ApiBearerAuth()
  @UseGuards(ClerkJwtGuard, RoleGuard('ADMIN', 'SUPERADMIN'))
  @HttpCode(HttpStatus.OK)
  @Post('restart/:serviceName')
  restartService(
    @Param('serviceName') serviceName: string,
    @Session() session: TrpcAuth,
  ) {
    // Validate serviceName against allow-list (prevent injection)
    const allowed = new Set([
      'nestjs-api',
      'nextjs-web',
      'bullmq-workers',
      'mssql-db',
      'redis',
      'postgres-analytics',
    ]);
    if (!allowed.has(serviceName)) {
      return { queued: false, error: 'Unknown service name' };
    }
    return this.healthService.requestRestart(serviceName, session.userId, session.tenantId);
  }
}
