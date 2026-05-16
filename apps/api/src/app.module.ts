import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { HealthModule } from './modules/health/health.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QueueModule } from './modules/queue/queue.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { KpiModule } from './modules/kpi/kpi.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReportsModule } from './modules/reports/reports.module';
import { IntakeModule } from './modules/intake/intake.module';
import { AccessRequestModule } from './modules/access-request/access-request.module';
import { MigrationModule } from './modules/migration/migration.module';

@Module({
  imports: [
    MigrationModule,
    AuthModule,
    AdminModule,
    WebhooksModule,
    HealthModule,
    TicketsModule,
    NotificationsModule,
    QueueModule,
    TasksModule,
    KpiModule,
    AnalyticsModule,
    ReportsModule,
    IntakeModule,
    AccessRequestModule,
  ],
})
export class AppModule {}
