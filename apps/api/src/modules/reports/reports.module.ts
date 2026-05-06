import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsPdfService } from './reports-pdf.service';
import { ReportsExcelService } from './reports-excel.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportsPdfService, ReportsExcelService],
  exports: [ReportsService],
})
export class ReportsModule {}
