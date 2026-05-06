import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { DashboardCacheService } from './dashboard-cache.service';
import { EtlService } from './etl.service';

@Module({
  controllers: [AnalyticsController],
  providers: [DashboardCacheService, EtlService],
  exports: [DashboardCacheService, EtlService],
})
export class AnalyticsModule {}
