import { IsString, IsOptional, IsEnum, IsUUID, IsInt, Min, Max, IsArray, IsDateString, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export type TaskSource = 'LEAD_ASSIGNED' | 'SELF_LOGGED';
export type TaskType = 'MAINTENANCE' | 'DR_BCP' | 'CHANGE_REQUEST' | 'DOCUMENTATION' | 'TRAINING' | 'AD_HOC';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['MAINTENANCE', 'DR_BCP', 'CHANGE_REQUEST', 'DOCUMENTATION', 'TRAINING', 'AD_HOC'])
  taskType?: TaskType;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  /** For LEAD_ASSIGNED — list of engineer IDs to assign */
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(20)
  assigneeIds?: string[];

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressOverride?: number;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['MAINTENANCE', 'DR_BCP', 'CHANGE_REQUEST', 'DOCUMENTATION', 'TRAINING', 'AD_HOC'])
  taskType?: TaskType;

  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: TaskStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressOverride?: number;
}

export class TaskListQueryDto {
  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(['LEAD_ASSIGNED', 'SELF_LOGGED'])
  source?: TaskSource;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}

export class CreateChecklistItemDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class AddAssigneesDto {
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(20)
  assigneeIds!: string[];
}
