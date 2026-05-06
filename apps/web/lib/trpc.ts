import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@lotris/types';

/**
 * tRPC React client.
 * Import `trpc` from this file in all client components.
 *
 * Usage:
 *   const { data } = trpc['users.me'].useQuery();
 */
export const trpc = createTRPCReact<AppRouter>();
