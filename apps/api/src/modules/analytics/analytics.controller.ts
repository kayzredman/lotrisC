import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { Session as Auth } from '../auth/decorators/session.decorator';
import type { TrpcAuth } from '@lotris/types';
import { DashboardCacheService } from './dashboard-cache.service';

@Controller('api/v1/dashboard')
@UseGuards(ClerkJwtGuard)
export class AnalyticsController {
  constructor(private readonly cache: DashboardCacheService) {}

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  async getSummary(@Auth() auth: TrpcAuth) {
    return this.cache.getSummary(auth);
  }

  @Get('ticket-analytics')
  @HttpCode(HttpStatus.OK)
  async getTicketAnalytics(@Auth() auth: TrpcAuth) {
    return this.cache.getTicketAnalytics(auth);
  }

  @Get('engineer-perf')
  @HttpCode(HttpStatus.OK)
  async getEngineerPerf(@Auth() auth: TrpcAuth) {
    return this.cache.getEngineerPerf(auth);
  }

  @Get('queue-health')
  @HttpCode(HttpStatus.OK)
  async getQueueHealth(@Auth() auth: TrpcAuth) {
    return this.cache.getQueueHealth(auth);
  }
}
