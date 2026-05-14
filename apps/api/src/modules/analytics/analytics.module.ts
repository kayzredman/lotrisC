import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { DashboardCacheService } from './dashboard-cache.service';
import { EtlService } from './etl.service';
import { KpiTrendAnalyser } from './kpi-trend.service';
import { WorkloadAnalyserService } from './workload-analyser.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AnalyticsController],
  providers: [DashboardCacheService, EtlService, KpiTrendAnalyser, WorkloadAnalyserService],
  exports: [DashboardCacheService, EtlService, KpiTrendAnalyser, WorkloadAnalyserService],
})
export class AnalyticsModule {}
