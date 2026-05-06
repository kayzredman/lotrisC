import { IsString, IsOptional, IsIn } from 'class-validator';

const REPORT_TYPES = ['TICKET_SUMMARY', 'SLA_COMPLIANCE', 'KPI_REPORT', 'ENGINEER_PERF'] as const;
const FORMATS = ['PDF', 'EXCEL'] as const;
const FREQUENCIES = ['WEEKLY', 'MONTHLY', 'QUARTERLY'] as const;

export class GenerateReportDto {
  @IsString()
  @IsIn(REPORT_TYPES)
  reportType!: string;

  @IsString()
  @IsIn(FORMATS)
  format!: string;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @IsString()
  @IsOptional()
  teamId?: string;
}

export class CreateScheduleDto {
  @IsString()
  @IsIn(REPORT_TYPES)
  reportType!: string;

  @IsString()
  @IsIn(FORMATS)
  format!: string;

  @IsString()
  @IsIn(FREQUENCIES)
  frequency!: string;

  @IsString()
  recipients!: string; // JSON array of email strings, e.g. '["a@b.com","c@d.com"]'

  @IsString()
  @IsOptional()
  teamId?: string;
}
