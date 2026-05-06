import { randomUUID } from 'crypto';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { verifyToken } from '@clerk/backend';
import { getEnv } from '@lotris/config';
import { getMssqlDb, users, roles, tenants, eq } from '@lotris/db';
import type { TrpcAuth, TrpcContext } from '@lotris/types';

// Demo tenant ID — used for dev auto-provisioning of new Clerk users
const DEMO_TENANT_ID = '10000001-0000-0000-0000-000000000001';

/**
 * tRPC request context.
 * Verifies the Clerk JWT and resolves the user's internal session from MSSQL.
 * First-time Clerk users are auto-provisioned as SUPERADMIN on the demo tenant (dev convenience).
 * Returns { auth: null } for unauthenticated requests (public procedures will reject).
 */
export async function createContext({
  req,
}: CreateFastifyContextOptions): Promise<TrpcContext> {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return { auth: null };
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token, { secretKey: getEnv().CLERK_SECRET_KEY });

    const db = await getMssqlDb();

    const selectFields = {
      userId: users.id,
      tenantId: users.tenantId,
      roleName: roles.name,
      userActive: users.isActive,
      tenantActive: tenants.isActive,
    };

    let result = await db
      .select(selectFields)
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .innerJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.clerkUserId, payload.sub))
      .limit(1);

    // Auto-provision: first-time Clerk user → SUPERADMIN on demo tenant
    if (!result[0]) {
      const now = new Date();
      try {
        await db.insert(users).values({
          id: randomUUID(),
          tenantId: DEMO_TENANT_ID,
          clerkUserId: payload.sub,
          email: `${payload.sub}@auto.lotris`,
          fullName: 'Admin User',
          roleId: 1,
          isActive: 1,
          isUnavailable: 0,
          createdAt: now,
          updatedAt: now,
        });
        result = await db
          .select(selectFields)
          .from(users)
          .innerJoin(roles, eq(users.roleId, roles.id))
          .innerJoin(tenants, eq(users.tenantId, tenants.id))
          .where(eq(users.clerkUserId, payload.sub))
          .limit(1);
      } catch (provErr) {
        console.error('[ctx] Auto-provision failed:', (provErr as Error).message);
      }
    }

    const row = result[0];
    if (!row?.userActive || !row?.tenantActive) return { auth: null };

    const auth: TrpcAuth = {
      clerkUserId: payload.sub,
      userId: row.userId,
      tenantId: row.tenantId,
      role: row.roleName as TrpcAuth['role'],
    };

    return { auth };
  } catch (ctxErr) {
    console.error('[ctx] Context creation error:', (ctxErr as Error).message);
    return { auth: null };
  }
}
