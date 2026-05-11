import { initTRPC, TRPCError } from '@trpc/server';
import type { TrpcContext } from '@lotris/types';

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

/**
 * managerProcedure — SUPERADMIN, ADMIN, and IT_MANAGER.
 * Used for team management, cross-team access grants, health monitoring, and audit log.
 */
export const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const managerRoles = ['SUPERADMIN', 'ADMIN', 'IT_MANAGER'] as const;
  if (!(managerRoles as readonly string[]).includes(ctx.auth.role)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

/**
 * adminProcedure — SUPERADMIN and ADMIN only.
 * Used for user management, role changes, team access grants, and service restarts.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.auth.role !== 'ADMIN' && ctx.auth.role !== 'SUPERADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
