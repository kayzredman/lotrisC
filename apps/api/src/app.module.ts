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

@Module({
  imports: [
    AuthModule,
    AdminModule,
    WebhooksModule,
    HealthModule,
    TicketsModule,
    NotificationsModule,
    QueueModule,
    TasksModule,
    KpiModule,
  ],
})
export class AppModule {}
