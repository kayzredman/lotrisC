import { IsString, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTeamDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() maxTicketsPerEngineer?: number;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() pickupSlaMinutes?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}
