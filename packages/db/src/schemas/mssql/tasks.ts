import {
  mssqlTable,
  varchar,
  int,
  bit,
  datetime2,
  nvarchar,
  index,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { teams } from './teams';
import { users } from './users';

/**
 * Tasks — non-ticket work items.
 *
 * source:
 *   LEAD_ASSIGNED — created by a team lead, assigned to one or more engineers via Task_Assignments
 *   SELF_LOGGED   — created by an engineer for themselves; visible to their team lead
 *
 * Type enum: MAINTENANCE | DR_BCP | CHANGE_REQUEST | DOCUMENTATION | TRAINING | AD_HOC
 *
 * Progress:
 *   If the task has checklist items → computed as (completed / total) * 100.
 *   If no checklist items → manually set via progressOverride (0–100).
 */
export const tasks = mssqlTable(
  'Tasks',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    teamId: varchar('team_id', { length: 36 }).references(() => teams.id),

    title: nvarchar('title', { length: 500 }).notNull(),
    description: nvarchar('description', { length: 4000 }),
    taskType: varchar('task_type', { length: 50 }).notNull().default('AD_HOC'),
    source: varchar('source', { length: 20 }).notNull().default('SELF_LOGGED'),
    status: varchar('status', { length: 30 }).notNull().default('OPEN'),

    // Progress (0–100); null when computed from checklist
    progressOverride: int('progress_override'),

    // Due date (optional)
    dueDate: datetime2('due_date', { precision: 3 }),

    // KPI linkage (nullable — wired in Sprint 8)
    kpiDefinitionId: varchar('kpi_definition_id', { length: 36 }),

    // Author
    createdBy: varchar('created_by', { length: 36 }).notNull().references(() => users.id),

    completedAt: datetime2('completed_at', { precision: 3 }),
    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
    updatedAt: datetime2('updated_at', { precision: 3 }).notNull(),
  },
  (t) => ({
    tenantIdx: index('IX_Tasks_Tenant').on(t.tenantId),
    tenantTeamIdx: index('IX_Tasks_TenantTeam').on(t.tenantId, t.teamId),
    createdByIdx: index('IX_Tasks_CreatedBy').on(t.createdBy),
  }),
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
