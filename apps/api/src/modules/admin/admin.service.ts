import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getMssqlDb, users, teams, roles, auditLogs, teamAccessGrants, categoryRouting, eq, and, sql } from '@lotris/db';
import { createClerkClient } from '@clerk/backend';
import { getEnv } from '@lotris/config';
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

  /**
   * Send a Clerk invitation email to the new user.
   * The MSSQL record is created later by the Clerk `user.created` webhook
   * once the invitee completes sign-up. Role + team travel via publicMetadata.
   */
  async createUser(tenantId: string, actorId: string, dto: CreateUserDto) {
    const clerk = createClerkClient({ secretKey: getEnv().CLERK_SECRET_KEY });

    await clerk.invitations.createInvitation({
      emailAddress: dto.email,
      redirectUrl: `${process.env.APP_BASE_URL ?? 'http://localhost:3000'}/sign-up`,
      publicMetadata: {
        tenantId,
        roleId: dto.roleId,
        teamId: dto.teamId ?? null,
        fullName: dto.fullName,
      },
      notify: true,
      ignoreExisting: false,
    });

    const db = await getMssqlDb();
    await this.writeAuditLog(db, tenantId, actorId, 'USER_INVITED', 'Invitation', actorId, {
      email: dto.email,
      roleId: dto.roleId,
      teamId: dto.teamId ?? null,
    });

    return { invited: true };
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
    // Raw SQL for the live memberCount subquery; tenantId passed as bound parameter via sql``
    const rows = await db.execute<{
      id: string;
      name: string;
      maxTicketsPerEngineer: number;
      pickupSlaMinutes: number;
      isActive: number;
      memberCount: number;
    }>(sql`
      SELECT t.id, t.name,
             t.max_tickets_per_engineer AS maxTicketsPerEngineer,
             t.pickup_sla_minutes      AS pickupSlaMinutes,
             t.is_active               AS isActive,
             COUNT(u.id)               AS memberCount
      FROM Teams t
      LEFT JOIN Users u ON u.team_id = t.id
                       AND u.tenant_id = t.tenant_id
                       AND u.is_active = 1
      WHERE t.tenant_id = ${tenantId}
      GROUP BY t.id, t.name, t.max_tickets_per_engineer, t.pickup_sla_minutes, t.is_active
      ORDER BY t.name ASC
    `);
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

  // ── Team Access Grants ────────────────────────────────────────────────────

  async listTeamAccessGrants(tenantId: string) {
    const db = await getMssqlDb();
    const rows = await db.execute<{
      id: string;
      granteeUserId: string;
      granteeName: string;
      targetTeamId: string;
      targetTeamName: string;
      grantedBy: string;
      grantedByName: string;
      createdAt: Date;
    }>(sql.raw(`
      SELECT
        tag.id,
        tag.grantee_user_id   AS granteeUserId,
        gu.full_name          AS granteeName,
        tag.target_team_id    AS targetTeamId,
        tt.name               AS targetTeamName,
        tag.granted_by        AS grantedBy,
        gb.full_name          AS grantedByName,
        tag.created_at        AS createdAt
      FROM TeamAccessGrants tag
      INNER JOIN Users  gu ON gu.id = tag.grantee_user_id
      INNER JOIN Teams  tt ON tt.id = tag.target_team_id
      INNER JOIN Users  gb ON gb.id = tag.granted_by
      WHERE tag.tenant_id = '${tenantId}'
      ORDER BY tag.created_at DESC
    `));
    return rows;
  }

  async grantTeamAccess(tenantId: string, actorId: string, granteeUserId: string, targetTeamId: string) {
    const db = await getMssqlDb();
    // Validate grantee and team belong to tenant
    await this.assertUserBelongsToTenant(db, tenantId, granteeUserId);
    await this.assertTeamBelongsToTenant(db, tenantId, targetTeamId);

    const id = uuidv4();
    await db.insert(teamAccessGrants).values({
      id,
      tenantId,
      granteeUserId,
      targetTeamId,
      grantedBy: actorId,
      createdAt: new Date(),
    });

    await this.writeAuditLog(db, tenantId, actorId, 'TEAM_ACCESS_GRANTED', 'TeamAccessGrant', id, { granteeUserId, targetTeamId });
    return { id };
  }

  async revokeTeamAccess(tenantId: string, granteeUserId: string, targetTeamId: string) {
    const db = await getMssqlDb();
    await db
      .delete(teamAccessGrants)
      .where(and(
        eq(teamAccessGrants.tenantId, tenantId),
        eq(teamAccessGrants.granteeUserId, granteeUserId),
        eq(teamAccessGrants.targetTeamId, targetTeamId),
      ));
  }

  // ── Category Routing ──────────────────────────────────────────────────────

  async listCategoryRouting(tenantId: string) {
    const db = await getMssqlDb();
    const rows = await db.execute<{
      id: string;
      category: string;
      teamId: string;
      teamName: string;
      defaultPriority: number;
    }>(sql.raw(`
      SELECT cr.id, cr.category, cr.team_id AS teamId, t.name AS teamName,
             cr.default_priority AS defaultPriority
      FROM CategoryRouting cr
      INNER JOIN Teams t ON t.id = cr.team_id
      WHERE cr.tenant_id = '${tenantId}'
      ORDER BY cr.category ASC
    `));
    return rows.map((r) => ({
      id: r.id,
      category: r.category,
      teamId: r.teamId,
      teamName: r.teamName,
      defaultPriority: Number(r.defaultPriority),
    }));
  }

  /**
   * Upsert a category→team routing rule (insert or update by tenant+category).
   * Uses MERGE statement for idempotent upsert.
   */
  async upsertCategoryRouting(
    tenantId: string,
    actorId: string,
    category: string,
    teamId: string,
    defaultPriority: number,
  ) {
    const db = await getMssqlDb();
    await this.assertTeamBelongsToTenant(db, tenantId, teamId);

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.execute(sql.raw(`
      MERGE CategoryRouting AS target
      USING (SELECT '${tenantId}' AS tenant_id, '${category.replace(/'/g, "''")}' AS category) AS source
        ON target.tenant_id = source.tenant_id AND target.category = source.category
      WHEN MATCHED THEN
        UPDATE SET team_id = '${teamId}', default_priority = ${defaultPriority}, updated_at = '${now}'
      WHEN NOT MATCHED THEN
        INSERT (id, tenant_id, category, team_id, default_priority, created_at, updated_at)
        VALUES ('${id}', '${tenantId}', '${category.replace(/'/g, "''")}', '${teamId}', ${defaultPriority}, '${now}', '${now}');
    `));

    await this.writeAuditLog(db, tenantId, actorId, 'CATEGORY_ROUTING_UPSERT', 'CategoryRouting', id, { category, teamId, defaultPriority });

    return { category, teamId, defaultPriority };
  }

  async deleteCategoryRouting(tenantId: string, actorId: string, category: string) {
    const db = await getMssqlDb();
    await db
      .delete(categoryRouting)
      .where(and(eq(categoryRouting.tenantId, tenantId), eq(categoryRouting.category, category)));
    await this.writeAuditLog(db, tenantId, actorId, 'CATEGORY_ROUTING_DELETED', 'CategoryRouting', category, { category });
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
