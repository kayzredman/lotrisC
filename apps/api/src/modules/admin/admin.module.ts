import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SlaConfigController } from './sla-config.controller';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [AdminController, SlaConfigController],
  providers: [AdminService],
})
export class AdminModule {}
