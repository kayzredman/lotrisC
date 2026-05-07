import { IsString, IsNotEmpty, IsOptional, IsIn, IsUUID, MaxLength, Min, Max, IsInt } from 'class-validator';

const PRIORITY_VALUES = [1, 2, 3, 4] as const;

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description!: string;

  @IsInt()
  @IsIn(PRIORITY_VALUES)
  @IsOptional()
  priority: number = 2;

  @IsUUID()
  @IsOptional()
  teamId?: string;
}

export class UpdateTicketStatusDto {
  @IsString()
  @IsIn(['TEAM_ASSIGNED', 'UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'])
  status!: string;

  /** Required when transitioning to TEAM_ASSIGNED */
  @IsUUID()
  @IsOptional()
  teamId?: string;

  /** Required when transitioning to ASSIGNED */
  @IsUUID()
  @IsOptional()
  assigneeId?: string;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  isInternal?: boolean = false;
}

export class CreateAttachmentRefDto {
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  originalName!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsInt()
  sizeBytes!: number;
}

export class TicketListQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 25;
}
