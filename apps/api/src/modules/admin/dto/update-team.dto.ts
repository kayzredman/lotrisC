import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTeamDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() maxTicketsPerEngineer?: number;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() pickupSlaMins?: number;
}
