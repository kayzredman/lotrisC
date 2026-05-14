import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsPdfService } from './reports-pdf.service';
import { ReportsExcelService } from './reports-excel.service';
import { ReportsConfigService } from './reports-config.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportsPdfService, ReportsExcelService, ReportsConfigService],
  exports: [ReportsService, ReportsConfigService],
})
export class ReportsModule {}
