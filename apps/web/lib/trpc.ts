import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@lotris/types';

/**
 * tRPC React client.
 * Import `trpc` from this file in all client components.
 *
 * Usage:
 *   const { data } = trpc['users.me'].useQuery();
 *
 * Typed as `any` because AppRouter is a stub (= any) until apps/api is fully
 * built; createTRPCReact<any> otherwise resolves to an error-string union type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<AppRouter>() as any;
