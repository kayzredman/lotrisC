import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { verifyToken } from '@clerk/backend';
import { getEnv } from '@lotris/config';
import { getMssqlDb, users, roles, tenants, eq } from '@lotris/db';
import type { TrpcAuth, TrpcContext } from '@lotris/types';

/**
 * tRPC request context.
 * Verifies the Clerk JWT and resolves the user's internal session from MSSQL.
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
    if (!payload.org_id) return { auth: null };

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
      .where(eq(users.clerkUserId, payload.sub))
      .limit(1);

    const row = result[0];
    if (!row || !row.userActive || !row.tenantActive) return { auth: null };

    const auth: TrpcAuth = {
      clerkUserId: payload.sub,
      userId: row.userId,
      tenantId: row.tenantId,
      role: row.roleName as TrpcAuth['role'],
    };

    return { auth };
  } catch {
    return { auth: null };
  }
}
