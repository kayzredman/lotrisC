import { initTRPC, TRPCError } from '@trpc/server';
import type { TrpcContext } from './context';

export type { TrpcContext };

/**
 * tRPC initialisation — single instance, bound to TrpcContext.
 * Import `t` ONLY inside apps/api — never in packages/.
 */
export const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure — requires a valid authenticated context.
 * Use for all endpoints that need a logged-in user.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

/**
 * Admin procedure — requires ADMIN or SUPERADMIN role.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.auth.role !== 'ADMIN' && ctx.auth.role !== 'SUPERADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
