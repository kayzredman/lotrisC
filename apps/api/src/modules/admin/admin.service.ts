import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getMssqlDb, users, teams, roles, auditLogs, eq, and, sql } from '@lotris/db';
import { v4 as uuidv4 } from 'uuid';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { CreateTeamDto } from './dto/create-team.dto';
import type { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class AdminService {
  // ── Users ────────────────────────────────────────────────────────────────

  async listUsers(tenantId: string) {
    const db = await getMssqlDb();
    return db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        roleId: users.roleId,
        roleName: roles.name,
        teamId: users.teamId,
        teamName: teams.name,
        isActive: users.isActive,
        isUnavailable: users.isUnavailable,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(teams, eq(users.teamId, teams.id))
      .where(eq(users.tenantId, tenantId));
  }

  async createUser(tenantId: string, actorId: string, dto: CreateUserDto) {
    const db = await getMssqlDb();
    const id = uuidv4();
    const now = new Date();

    await db.insert(users).values({
      id,
      tenantId,
      clerkUserId: dto.clerkUserId,
      email: dto.email,
      fullName: dto.fullName,
      roleId: dto.roleId,
      teamId: dto.teamId ?? null,
      isActive: 1,
      isUnavailable: 0,
      createdAt: now,
      updatedAt: now,
    });

    await this.writeAuditLog(db, tenantId, actorId, 'USER_CREATED', 'User', id, {
      email: dto.email,
    });

    return { id };
  }

  async updateUser(tenantId: string, actorId: string, userId: string, dto: UpdateUserDto) {
    const db = await getMssqlDb();
    await this.assertUserBelongsToTenant(db, tenantId, userId);

    await db
      .update(users)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

    await this.writeAuditLog(db, tenantId, actorId, 'USER_UPDATED', 'User', userId, dto as Record<string, unknown>);
  }

  async deactivateUser(tenantId: string, actorId: string, userId: string) {
    if (userId === actorId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    const db = await getMssqlDb();
    await this.assertUserBelongsToTenant(db, tenantId, userId);

    await db
      .update(users)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

    await this.writeAuditLog(db, tenantId, actorId, 'USER_DEACTIVATED', 'User', userId, null);
  }

  async assignRole(tenantId: string, actorId: string, userId: string, roleId: number) {
    const db = await getMssqlDb();
    await this.assertUserBelongsToTenant(db, tenantId, userId);

    await db
      .update(users)
      .set({ roleId, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

    await this.writeAuditLog(db, tenantId, actorId, 'ROLE_ASSIGNED', 'User', userId, { roleId });
  }

  // ── Teams ────────────────────────────────────────────────────────────────

  async listTeams(tenantId: string) {
    const db = await getMssqlDb();
    // Raw SQL: get all teams (active + inactive) with live member count
    const rows = await db.execute<{
      id: string;
      name: string;
      maxTicketsPerEngineer: number;
      pickupSlaMinutes: number;
      isActive: number;
      memberCount: number;
    }>(sql.raw(`
      SELECT t.id, t.name,
             t.max_tickets_per_engineer AS maxTicketsPerEngineer,
             t.pickup_sla_minutes      AS pickupSlaMinutes,
             t.is_active               AS isActive,
             COUNT(u.id)               AS memberCount
      FROM Teams t
      LEFT JOIN Users u ON u.team_id = t.id
                       AND u.tenant_id = t.tenant_id
                       AND u.is_active = 1
      WHERE t.tenant_id = '${tenantId}'
      GROUP BY t.id, t.name, t.max_tickets_per_engineer, t.pickup_sla_minutes, t.is_active
      ORDER BY t.name ASC
    `));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      maxTicketsPerEngineer: Number(r.maxTicketsPerEngineer),
      pickupSlaMinutes: Number(r.pickupSlaMinutes),
      isActive: Number(r.isActive) === 1,
      memberCount: Number(r.memberCount),
    }));
  }

  async createTeam(tenantId: string, actorId: string, dto: CreateTeamDto) {
    const db = await getMssqlDb();
    const id = uuidv4();
    const now = new Date();

    await db.insert(teams).values({
      id,
      tenantId,
      name: dto.name,
      maxTicketsPerEngineer: dto.maxTicketsPerEngineer ?? 5,
      pickupSlaMinutes: dto.pickupSlaMinutes ?? 30,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    });

    await this.writeAuditLog(db, tenantId, actorId, 'TEAM_CREATED', 'Team', id, { name: dto.name });

    return { id };
  }

  async updateTeam(tenantId: string, actorId: string, teamId: string, dto: UpdateTeamDto) {
    const db = await getMssqlDb();
    await this.assertTeamBelongsToTenant(db, tenantId, teamId);

    await db
      .update(teams)
      .set({
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.maxTicketsPerEngineer !== undefined ? { maxTicketsPerEngineer: dto.maxTicketsPerEngineer } : {}),
        ...(dto.pickupSlaMinutes !== undefined ? { pickupSlaMinutes: dto.pickupSlaMinutes } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive ? 1 : 0 } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(teams.id, teamId), eq(teams.tenantId, tenantId)));

    await this.writeAuditLog(db, tenantId, actorId, 'TEAM_UPDATED', 'Team', teamId, dto as Record<string, unknown>);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async assertUserBelongsToTenant(
    db: Awaited<ReturnType<typeof getMssqlDb>>,
    tenantId: string,
    userId: string,
  ) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!rows[0]) throw new NotFoundException('User not found');
  }

  private async assertTeamBelongsToTenant(
    db: Awaited<ReturnType<typeof getMssqlDb>>,
    tenantId: string,
    teamId: string,
  ) {
    const rows = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.tenantId, tenantId)))
      .limit(1);

    if (!rows[0]) throw new NotFoundException('Team not found');
  }

  private async writeAuditLog(
    db: Awaited<ReturnType<typeof getMssqlDb>>,
    tenantId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, unknown> | null,
  ) {
    await db.insert(auditLogs).values({
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      details: details ? JSON.stringify(details) : null,
      createdAt: new Date(),
    });
  }
}
