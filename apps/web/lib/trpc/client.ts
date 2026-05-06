import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@lotris/types';

/**
 * tRPC React client.
 * Import `trpc` from this file in all client components.
 *
 * AppRouter is currently typed as `any` in @lotris/types (stub until api type
 * extraction is wired up). Cast to `any` so bracket-notation procedure calls
 * like `trpc['queue.health'].useQuery()` don't trigger noImplicitAny.
 *
 * Usage:
 *   const { data } = trpc['users.me'].useQuery();
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<AppRouter>() as any;
