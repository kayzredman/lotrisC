import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';
import { KpiImportService } from './kpi-import.service';

@Module({
  imports: [
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }), // 10 MB cap
  ],
  controllers: [KpiController],
  providers: [KpiService, KpiImportService],
  exports: [KpiService],
})
export class KpiModule {}
