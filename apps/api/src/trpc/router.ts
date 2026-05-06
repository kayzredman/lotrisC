import { router, protectedProcedure } from './trpc';
import { getMssqlDb } from '@lotris/db';
import { users, teams, roles } from '@lotris/db';
import { eq, and } from 'drizzle-orm';

/**
 * tRPC application router.
 * Procedure naming convention: entity.operation
 * All procedures with data access include a tenantId filter — no exceptions.
 */
export const appRouter = router({
  // ── users ───────────────────────────────────────────────────────────────

  'users.me': protectedProcedure.query(async ({ ctx }) => {
    const db = await getMssqlDb();
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        roleId: users.roleId,
        teamId: users.teamId,
        roleName: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.id, ctx.auth.userId), eq(users.tenantId, ctx.auth.tenantId)))
      .limit(1);

    if (!result[0]) throw new Error('User record not found');
    return result[0];
  }),

  'users.list': protectedProcedure.query(async ({ ctx }) => {
    const db = await getMssqlDb();
    return db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        roleId: users.roleId,
        roleName: roles.name,
        teamId: users.teamId,
        isActive: users.isActive,
        isUnavailable: users.isUnavailable,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.tenantId, ctx.auth.tenantId), eq(users.isActive, 1)));
  }),

  // ── teams ───────────────────────────────────────────────────────────────

  'teams.list': protectedProcedure.query(async ({ ctx }) => {
    const db = await getMssqlDb();
    return db
      .select()
      .from(teams)
      .where(and(eq(teams.tenantId, ctx.auth.tenantId), eq(teams.isActive, 1)));
  }),
});

export type AppRouter = typeof appRouter;
