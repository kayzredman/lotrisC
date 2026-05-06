import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { HealthModule } from './modules/health/health.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QueueModule } from './modules/queue/queue.module';

@Module({
  imports: [
    AuthModule,
    AdminModule,
    WebhooksModule,
    HealthModule,
    TicketsModule,
    NotificationsModule,
    QueueModule,
  ],
})
export class AppModule {}
