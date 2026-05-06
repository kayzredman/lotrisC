import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ClaimTicketDto {
  // No body needed — ticketId comes from the URL param
}

export class QueueListQueryDto {
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}

export class UpdateQueueConfigDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacityPerEngineer?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  pickupSlaMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  resolutionSlaMinutes?: number;

  @IsOptional()
  autoAssignEnabled?: boolean;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
