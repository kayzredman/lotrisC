import {
  mssqlTable,
  varchar,
  bit,
  datetime2,
  index,
} from 'drizzle-orm/mssql-core';
import { tenants } from './tenants';
import { tasks } from './tasks';
import { users } from './users';

/**
 * Task_Assignments — many-to-many between Tasks and Engineers.
 * Each row tracks per-assignee completion (isCompleted).
 * Used for LEAD_ASSIGNED tasks; SELF_LOGGED tasks have no rows here
 * (the engineer is implicitly the sole owner via tasks.createdBy).
 */
export const taskAssignments = mssqlTable(
  'Task_Assignments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    taskId: varchar('task_id', { length: 36 }).notNull().references(() => tasks.id),
    assigneeId: varchar('assignee_id', { length: 36 }).notNull().references(() => users.id),
    isCompleted: bit('is_completed').notNull().default(0),
    completedAt: datetime2('completed_at', { precision: 3 }),
    assignedAt: datetime2('assigned_at', { precision: 3 }).notNull(),
  },
  (t) => ({
    taskIdx: index('IX_TaskAssignments_Task').on(t.taskId),
    assigneeIdx: index('IX_TaskAssignments_Assignee').on(t.tenantId, t.assigneeId),
  }),
);

export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type NewTaskAssignment = typeof taskAssignments.$inferInsert;
