export type { TrpcContext, TrpcAuth, UserRole, TicketStatus, TicketPriority, TaskSource, TaskType, KpiMetricType, KpiDirection, KpiScope, KpiAgreementStatus, ServiceStatus, ServiceHealthEntry, QueueDepthEntry, HealthSnapshot, IncidentEntry } from './context';

/**
 * AppRouter type — exported from apps/api/src/trpc/router.ts and re-exported here.
 * The web app imports this type to get end-to-end type safety without importing
 * any runtime NestJS code.
 *
 * Usage in apps/web:
 *   import type { AppRouter } from '@lotris/types';
 *   const trpc = createTRPCReact<AppRouter>();
 */
export type { AppRouter } from './app-router';
