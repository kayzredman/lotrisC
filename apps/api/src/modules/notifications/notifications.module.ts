import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SseService } from './sse.service';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, SseService],
  exports: [NotificationsService, SseService],
})
export class NotificationsModule {}
