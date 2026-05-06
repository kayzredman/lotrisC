import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { RoleGuard } from '../auth/role.guard';
import { Session } from '../auth/decorators/session.decorator';
import type { TrpcAuth } from '@lotris/types';
import { QueueService } from './queue.service';
import { QueueListQueryDto, UpdateQueueConfigDto } from './dto';

@UseGuards(ClerkJwtGuard)
@Controller('api/v1/queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /** GET /api/v1/queue — team queue ordered by priority + SLA pickup deadline */
  @Get()
  list(@Session() auth: TrpcAuth, @Query() query: QueueListQueryDto) {
    return this.queueService.listQueue(auth, query);
  }

  /** POST /api/v1/queue/claim/:ticketId — controlled pickup with workload check */
  @Post('claim/:ticketId')
  @HttpCode(HttpStatus.OK)
  claim(
    @Session() auth: TrpcAuth,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ) {
    return this.queueService.claimTicket(auth, ticketId);
  }

  /** GET /api/v1/queue/health — per-team status counts, SLA breach summary, workload gauges */
  @Get('health')
  health(@Session() auth: TrpcAuth) {
    return this.queueService.getQueueHealth(auth);
  }

  /** GET /api/v1/queue/config — get queue config for tenant or team */
  @UseGuards(RoleGuard('ADMIN', 'SUPERADMIN', 'IT_MANAGER'))
  @Get('config')
  getConfig(@Session() auth: TrpcAuth, @Query('teamId') teamId?: string) {
    return this.queueService.getQueueConfig(auth.tenantId, teamId);
  }

  /** PATCH /api/v1/queue/config — upsert queue config (ADMIN only) */
  @UseGuards(RoleGuard('ADMIN', 'SUPERADMIN'))
  @Patch('config')
  updateConfig(@Session() auth: TrpcAuth, @Body() dto: UpdateQueueConfigDto) {
    return this.queueService.upsertQueueConfig(auth, dto);
  }
}
