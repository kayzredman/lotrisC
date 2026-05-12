import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsArray,
  IsDateString,
  ArrayMaxSize,
  IsPositive,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Shared ────────────────────────────────────────────────────────────────────

export type KpiMetricType = 'PERCENTAGE' | 'TIME_HOURS' | 'TIME_MINUTES' | 'COUNT' | 'SCORE';
export type KpiDirection = 'HIGHER_BETTER' | 'LOWER_BETTER';
export type KpiScope = 'ORG' | 'TEAM' | 'INDIVIDUAL';
export type KpiDefinitionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type MeasurementPeriod = 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
export type AgreementStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'CLOSED';
export type ActualSource = 'TICKET_RESOLVE' | 'TASK_COMPLETE' | 'MANUAL';

// ─── KPI Definitions ──────────────────────────────────────────────────────────

export class CreateKpiDefinitionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['PERCENTAGE', 'TIME_HOURS', 'TIME_MINUTES', 'COUNT', 'SCORE'])
  metricType!: KpiMetricType;

  @IsEnum(['HIGHER_BETTER', 'LOWER_BETTER'])
  direction!: KpiDirection;

  @IsEnum(['ORG', 'TEAM', 'INDIVIDUAL'])
  scope!: KpiScope;

  @IsNumber()
  @IsPositive()
  defaultTarget!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight!: number;
}

export class UpdateKpiDefinitionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['PERCENTAGE', 'TIME_HOURS', 'TIME_MINUTES', 'COUNT', 'SCORE'])
  metricType?: KpiMetricType;

  @IsOptional()
  @IsEnum(['HIGHER_BETTER', 'LOWER_BETTER'])
  direction?: KpiDirection;

  @IsOptional()
  @IsEnum(['ORG', 'TEAM', 'INDIVIDUAL'])
  scope?: KpiScope;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  defaultTarget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status?: KpiDefinitionStatus;
}

export class SetTeamTargetDto {
  @IsUUID()
  teamId!: string;

  @IsNumber()
  @IsPositive()
  targetValue!: number;
}

// ─── Engineer Assignments ─────────────────────────────────────────────────────

export class CreateKpiAssignmentDto {
  @IsUUID()
  engineerId!: string;

  @IsUUID()
  kpiDefinitionId!: string;

  @IsString()
  periodKey!: string;

  @IsEnum(['DAILY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'])
  measurementPeriod!: MeasurementPeriod;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetOverride?: number;
}

// ─── Agreements ───────────────────────────────────────────────────────────────

export class CreateKpiAgreementDto {
  @IsUUID()
  engineerId!: string;

  @IsString()
  periodKey!: string;
}

export class KpiMetricRowDto {
  @IsOptional()
  @IsUUID()
  kpiDefinitionId?: string;

  @IsString()
  description!: string;

  @IsEnum(['DAILY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'])
  measurementPeriod!: MeasurementPeriod;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight!: number;

  @IsNumber()
  @IsPositive()
  targetScore!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class KpiAreaDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KpiMetricRowDto)
  metrics!: KpiMetricRowDto[];
}

export class UpsertAgreementAreasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(20)
  @Type(() => KpiAreaDto)
  areas!: KpiAreaDto[];
}

// ─── Document Import ──────────────────────────────────────────────────────────

export class ImportColumnMappingDto {
  /** Name of the CSV/Excel column to map to each field */
  descriptionColumn!: string;
  weightColumn!: string;
  targetScoreColumn!: string;

  @IsOptional()
  measurementPeriodColumn?: string;

  @IsOptional()
  kpiDefinitionIdColumn?: string;
}

// ─── Actuals ─────────────────────────────────────────────────────────────────

export class CreateActualDto {
  @IsUUID()
  metricId!: string;

  @IsOptional()
  @IsUUID()
  kpiDefinitionId?: string;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
