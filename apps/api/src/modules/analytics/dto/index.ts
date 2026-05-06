import { IsString, IsOptional } from 'class-validator';

export class DashboardQueryDto {
  @IsString()
  @IsOptional()
  teamId?: string;
}

export class GenerateReportDto {
  @IsString()
  reportType!: string; // TICKET_SUMMARY | SLA_COMPLIANCE | KPI_REPORT | ENGINEER_PERF

  @IsString()
  format!: string; // PDF | EXCEL

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
  reportType!: string;

  @IsString()
  format!: string;

  @IsString()
  frequency!: string; // WEEKLY | MONTHLY | QUARTERLY

  @IsString()
  recipients!: string; // JSON array of email strings

  @IsString()
  @IsOptional()
  teamId?: string;
}
