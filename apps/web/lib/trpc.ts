/**
 * Re-export the single tRPC React client instance.
 * All components must import from either this file or '@/lib/trpc/client' —
 * both resolve to the same singleton so they share the Provider context.
 */
export { trpc } from './trpc/client';
