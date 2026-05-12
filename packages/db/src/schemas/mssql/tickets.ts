import {
  mssqlTable,
  varchar,
  int,
  bit,
  datetime2,
  nvarchar,
  index,
  decimal,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { teams } from './teams';
import { users } from './users';

/**
 * TicketStatus mirrors the lifecycle state machine.
 * Valid transitions are enforced in the TicketLifecycleService — not in the DB.
 *
 * NEW → TEAM_ASSIGNED → UNASSIGNED → ASSIGNED → IN_PROGRESS → ESCALATED → RESOLVED → CLOSED
 */
export const tickets = mssqlTable(
  'Tickets',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),

    // Core fields
    title: nvarchar('title', { length: 500 }).notNull(),
    description: nvarchar('description', { length: 4000 }).notNull(),
    priority: int('priority').notNull().default(2), // 1=CRITICAL 2=HIGH 3=MEDIUM 4=LOW

    // Status
    status: varchar('status', { length: 50 }).notNull().default('NEW'),

    // Intake source tracking
    source: varchar('source', { length: 20 }).notNull().default('INTERNAL'),
    requesterEmail: varchar('requester_email', { length: 255 }),
    requesterName: nvarchar('requester_name', { length: 255 }),
    relatedTicketId: varchar('related_ticket_id', { length: 36 }),

    // Routing
    teamId: varchar('team_id', { length: 36 }).references(() => teams.id),
    assigneeId: varchar('assignee_id', { length: 36 }).references(() => users.id),
    createdBy: varchar('created_by', { length: 36 }).notNull().references(() => users.id),

    // SLA
    slaPickupDeadline: datetime2('sla_pickup_deadline', { precision: 3 }),
    slaResolutionDeadline: datetime2('sla_resolution_deadline', { precision: 3 }),
    slaPickupBreached: bit('sla_pickup_breached').notNull().default(0),
    slaResolutionBreached: bit('sla_resolution_breached').notNull().default(0),

    // Timestamps
    assignedAt: datetime2('assigned_at', { precision: 3 }),
    resolvedAt: datetime2('resolved_at', { precision: 3 }),
    closedAt: datetime2('closed_at', { precision: 3 }),
    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
    updatedAt: datetime2('updated_at', { precision: 3 }).notNull(),
  },
  (table) => ({
    tenantIdx: index('idx_tickets_tenant').on(table.tenantId),
    tenantStatusIdx: index('idx_tickets_tenant_status').on(table.tenantId, table.status),
    tenantTeamIdx: index('idx_tickets_tenant_team').on(table.tenantId, table.teamId),
    tenantAssigneeIdx: index('idx_tickets_tenant_assignee').on(table.tenantId, table.assigneeId),
    // Queue ordering index: priority ASC (1=highest), sla_resolution_deadline ASC
    tenantQueueIdx: index('idx_tickets_queue').on(table.tenantId, table.priority, table.slaResolutionDeadline),
  }),
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
