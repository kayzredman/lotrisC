import { Controller, Get, Patch, Body, UseGuards, Query } from '@nestjs/common';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { RoleGuard } from '../auth/role.guard';
import { Session } from '../auth/decorators/session.decorator';
import type { TrpcAuth } from '@lotris/types';
import { TicketsService } from '../tickets/tickets.service';
import { getMssqlDb, slaConfigs, eq, and, sql } from '@lotris/db';
import { v4 as uuidv4 } from 'uuid';
import { IsInt, IsOptional, Min } from 'class-validator';

class UpdateSlaConfigDto {
  @IsInt()
  @Min(5)
  @IsOptional()
  pickupSlaMinutes?: number;

  @IsInt()
  @Min(30)
  @IsOptional()
  resolutionSlaMinutes?: number;

  @IsOptional()
  teamId?: string;
}

@UseGuards(ClerkJwtGuard, RoleGuard('ADMIN', 'SUPERADMIN'))
@Controller('api/v1/admin')
export class SlaConfigController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('sla-config')
  async get(@Session() auth: TrpcAuth, @Query('teamId') teamId?: string) {
    return this.ticketsService.getSlaConfig(auth.tenantId, teamId);
  }

  @Patch('sla-config')
  async update(@Session() auth: TrpcAuth, @Body() dto: UpdateSlaConfigDto) {
    const db = await getMssqlDb();
    const now = new Date();

    const conditions = [eq(slaConfigs.tenantId, auth.tenantId)];
    if (dto.teamId) {
      conditions.push(eq(slaConfigs.teamId, dto.teamId));
    } else {
      conditions.push(sql`${slaConfigs.teamId} IS NULL`);
    }

    const [existing] = await db.select().from(slaConfigs).where(and(...conditions));

    if (existing) {
      await db
        .update(slaConfigs)
        .set({
          ...(dto.pickupSlaMinutes !== undefined ? { pickupSlaMinutes: dto.pickupSlaMinutes } : {}),
          ...(dto.resolutionSlaMinutes !== undefined
            ? { resolutionSlaMinutes: dto.resolutionSlaMinutes }
            : {}),
          updatedAt: now,
        })
        .where(and(...conditions));
    } else {
      await db.insert(slaConfigs).values({
        id: uuidv4(),
        tenantId: auth.tenantId,
        teamId: dto.teamId ?? null,
        pickupSlaMinutes: dto.pickupSlaMinutes ?? 30,
        resolutionSlaMinutes: dto.resolutionSlaMinutes ?? 240,
        createdAt: now,
        updatedAt: now,
      });
    }

    return this.ticketsService.getSlaConfig(auth.tenantId, dto.teamId);
  }
}
