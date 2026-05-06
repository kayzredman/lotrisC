/**
 * TrpcContext — the object available to every tRPC procedure.
 * Created per-request in apps/api/src/trpc/context.ts.
 */
export interface TrpcAuth {
  clerkUserId: string;
  userId: string;       // MSSQL Users.id
  tenantId: string;     // MSSQL Tenants.id
  role: UserRole;
}

export interface TrpcContext {
  auth: TrpcAuth | null;
}

// ─── Shared enums ─────────────────────────────────────────────────────────────

export type UserRole =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'IT_MANAGER'
  | 'TEAM_LEAD'
  | 'ENGINEER'
  | 'EXECUTIVE';

export type TicketStatus =
  | 'NEW'
  | 'TEAM_ASSIGNED'
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TaskSource = 'LEAD_ASSIGNED' | 'SELF_LOGGED';

export type TaskType =
  | 'MAINTENANCE'
  | 'DR_BCP'
  | 'CHANGE_REQUEST'
  | 'DOCUMENTATION'
  | 'TRAINING'
  | 'AD_HOC';

export type KpiMetricType = 'PERCENTAGE' | 'COUNT' | 'DURATION_HOURS' | 'SCORE' | 'RATE';

export type KpiDirection = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';

export type KpiScope = 'ORG' | 'TEAM' | 'ENGINEER';

export type KpiAgreementStatus = 'DRAFT' | 'PENDING_SIGN_OFF' | 'ACTIVE' | 'CLOSED';

export type ServiceStatus = 'UP' | 'DEGRADED' | 'DOWN';
