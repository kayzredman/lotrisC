/**
 * Shared domain types for the Lotris web client (REST / OpenAPI era).
 */
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

export type KpiAgreementStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'CLOSED';

export type ServiceStatus = 'UP' | 'DEGRADED' | 'DOWN';

export interface ServiceHealthEntry {
  id: string;
  name: string;
  sub: string;
  status: ServiceStatus;
  cpu: number;
  memUsedMb: number;
  memTotalMb: number;
  uptimeSeconds: number;
  lastPingMs: number;
  checkedAt: string;
}

export interface QueueDepthEntry {
  name: string;
  sub: string;
  waiting: number;
  active: number;
  failed: number;
  delayed: number;
  completedLastHour: number;
}

export interface HealthSnapshot {
  services: ServiceHealthEntry[];
  queues: QueueDepthEntry[];
  timestamp: string;
}

export interface IncidentEntry {
  id: number;
  title: string;
  service: string;
  resolvedAt: string | null;
  createdAt: string;
  details: string | null;
}

// ─── Sprint 18: SLA Warning + KPI Trend row types ────────────────────────────

/** A ticket currently at AMBER or RED SLA warning level. */
export interface SlaWarningRow {
  ticketId: string;
  ticketRef: string;
  title: string;
  priority: number;
  status: string;
  slaDeadline: string;          // ISO timestamp
  warningLevel: 'AMBER' | 'RED';
  minutesRemaining: number;
  assigneeId: string | null;
  assigneeName: string | null;
  teamId: string | null;
  teamName: string | null;
}

/** Latest KPI trend snapshot for an engineer in the current period. */
export interface KpiTrendRow {
  snapshotId: string;
  engineerId: string;
  engineerName: string;
  kpiDefId: string;
  kpiName: string;
  periodKey: string;
  actualToDate: number;
  projectedEop: number;
  target: number;
  warningLevel: 'NONE' | 'AMBER' | 'RED';
  snapshotAt: string;           // ISO timestamp
}

// ─── Sprint 19: Workload analysis types ──────────────────────────────────────

/** Per-engineer workload snapshot within a team. */
export interface EngineerLoad {
  engineerId: string;
  fullName: string;
  openTickets: number;
  maxCapacity: number;
  /** Percentage 0-200+; ≥100 = overloaded */
  loadPct: number;
  isUnavailable: boolean;
}

/** A single suggested ticket reassignment to balance team load. */
export interface WorkloadSuggestion {
  ticketId: string;
  ticketTitle: string;
  fromEngineerId: string;
  fromEngineerName: string;
  toEngineerId: string;
  toEngineerName: string;
}

/** Complete workload analysis for a team. */
export interface TeamWorkloadResult {
  teamId: string;
  engineers: EngineerLoad[];
  suggestions: WorkloadSuggestion[];
}

// ─── Sprint 19: Report config type ───────────────────────────────────────────

/** Merged tenant report configuration (with defaults applied). */
export interface ReportConfigDefaults {
  brandName: string;
  defaultTimezone: string;
  attachmentSizeLimitMb: number;
  retentionDays: number;
  defaultRecipients: string[];
}
