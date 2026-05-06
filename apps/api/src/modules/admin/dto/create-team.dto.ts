import { IsString, IsInt, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() maxTicketsPerEngineer?: number;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() pickupSlaMins?: number;
}
