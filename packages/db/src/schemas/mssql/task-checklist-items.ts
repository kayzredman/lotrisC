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
import { tasks } from './tasks';

/**
 * Task_Checklist_Items — ordered steps within a task.
 * When checklist items exist, task progress is computed as:
 *   Math.round((completedCount / totalCount) * 100)
 * and tasks.progressOverride is ignored.
 */
export const taskChecklistItems = mssqlTable(
  'Task_Checklist_Items',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 36 }).notNull().references(() => tenants.id),
    taskId: varchar('task_id', { length: 36 }).notNull().references(() => tasks.id),
    label: nvarchar('label', { length: 500 }).notNull(),
    sortOrder: int('sort_order').notNull().default(0),
    isCompleted: bit('is_completed').notNull().default(0),
    completedAt: datetime2('completed_at', { precision: 3 }),
    createdAt: datetime2('created_at', { precision: 3 }).notNull(),
  },
  (t) => ({
    taskIdx: index('IX_TaskChecklistItems_Task').on(t.taskId),
    taskOrderIdx: index('IX_TaskChecklistItems_TaskOrder').on(t.taskId, t.sortOrder),
  }),
);

export type TaskChecklistItem = typeof taskChecklistItems.$inferSelect;
export type NewTaskChecklistItem = typeof taskChecklistItems.$inferInsert;
