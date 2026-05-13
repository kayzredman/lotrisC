import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SlaPredictor } from './sla-predictor.service';

@Module({
  imports: [NotificationsModule],
  controllers: [TicketsController],
  providers: [TicketsService, SlaPredictor],
  exports: [TicketsService, SlaPredictor],
})
export class TicketsModule {}
