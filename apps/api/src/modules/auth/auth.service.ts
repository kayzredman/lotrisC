import { Injectable, UnauthorizedException } from '@nestjs/common';
import { getMssqlDb } from '@lotris/db';
import { users, roles, tenants } from '@lotris/db';
import { eq } from 'drizzle-orm';
import type { TrpcAuth } from '@lotris/types';

@Injectable()
export class AuthService {
  /**
   * Resolves a Clerk user + org into an internal scoped session.
   * Throws UnauthorizedException if the user or tenant is not found / inactive.
   */
  async resolveSession({
    clerkUserId,
    clerkOrgId,
  }: {
    clerkUserId: string;
    clerkOrgId: string;
  }): Promise<TrpcAuth> {
    const db = await getMssqlDb();

    const result = await db
      .select({
        userId: users.id,
        tenantId: users.tenantId,
        roleName: roles.name,
        userActive: users.isActive,
        tenantActive: tenants.isActive,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .innerJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    const row = result[0];

    if (!row) {
      throw new UnauthorizedException('User not provisioned — contact your administrator');
    }
    if (!row.userActive || !row.tenantActive) {
      throw new UnauthorizedException('Account or organisation is inactive');
    }
    if (row.tenantId !== clerkOrgId) {
      // Org mismatch — Clerk org doesn't match the stored tenant
      throw new UnauthorizedException('Organisation mismatch');
    }

    return {
      clerkUserId,
      userId: row.userId,
      tenantId: row.tenantId,
      role: row.roleName as TrpcAuth['role'],
    };
  }
}
