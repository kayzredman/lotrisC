import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { getMssqlDb } from '@lotris/db';
import { tasks, taskAssignments, taskChecklistItems, users } from '@lotris/db';
import { eq, and, sql, count, asc, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { TrpcAuth } from '@lotris/types';
import { UserRole } from '@lotris/types';
import type {
  CreateTaskDto,
  UpdateTaskDto,
  TaskListQueryDto,
  CreateChecklistItemDto,
  AddAssigneesDto,
} from './dto';

@Injectable()
export class TasksService {
  private get db() {
    return getMssqlDb();
  }

  // ── Create ───────────────────────────────────────────────────────────────

  async create(auth: TrpcAuth, dto: CreateTaskDto) {
    const db = this.db;
    const now = new Date();
    const id = uuidv4();

    // Determine source from role
    const isLead = auth.role === UserRole.TEAM_LEAD || auth.role === UserRole.IT_MANAGER || auth.role === UserRole.ADMIN;
    const hasAssignees = dto.assigneeIds && dto.assigneeIds.length > 0;
    const source = isLead && hasAssignees ? 'LEAD_ASSIGNED' : 'SELF_LOGGED';

    // SELF_LOGGED can only be by the requester themselves; enforce no assigneeIds
    if (source === 'SELF_LOGGED' && hasAssignees) {
      throw new BadRequestException('Non-leads cannot assign tasks to others');
    }

    await db.insert(tasks).values({
      id,
      tenantId: auth.tenantId,
      teamId: dto.teamId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      taskType: dto.taskType ?? 'AD_HOC',
      source,
      status: 'OPEN',
      progressOverride: dto.progressOverride ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Create assignment rows for LEAD_ASSIGNED
    if (source === 'LEAD_ASSIGNED' && dto.assigneeIds?.length) {
      await db.insert(taskAssignments).values(
        dto.assigneeIds.map((assigneeId) => ({
          id: uuidv4(),
          tenantId: auth.tenantId,
          taskId: id,
          assigneeId,
          isCompleted: 0,
          assignedAt: now,
        })),
      );
    }

    return this.findById(auth, id);
  }

  // ── List ─────────────────────────────────────────────────────────────────

  async list(auth: TrpcAuth, query: TaskListQueryDto) {
    const db = this.db;
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const offset = (page - 1) * limit;

    const isLead = auth.role === UserRole.TEAM_LEAD || auth.role === UserRole.IT_MANAGER || auth.role === UserRole.ADMIN;

    // Build base WHERE conditions
    const conditions: ReturnType<typeof eq>[] = [
      eq(tasks.tenantId, auth.tenantId) as ReturnType<typeof eq>,
    ];

    if (query.status) {
      conditions.push(eq(tasks.status, query.status) as ReturnType<typeof eq>);
    }
    if (query.source) {
      conditions.push(eq(tasks.source, query.source) as ReturnType<typeof eq>);
    }
    if (query.teamId) {
      conditions.push(eq(tasks.teamId, query.teamId) as ReturnType<typeof eq>);
    }

    // Engineers can only see tasks they created or are assigned to
    // Leads/managers see all team tasks
    let visibilityFilter: string | null = null;
    if (!isLead) {
      visibilityFilter = auth.userId;
    }

    const whereClause = and(...conditions);

    let rows: typeof tasks.$inferSelect[];

    if (visibilityFilter) {
      // Fetch tasks created by or assigned to this engineer
      const assignedTaskIds = await db
        .select({ taskId: taskAssignments.taskId })
        .from(taskAssignments)
        .where(
          and(
            eq(taskAssignments.tenantId, auth.tenantId),
            eq(taskAssignments.assigneeId, visibilityFilter),
          ),
        );
      const assignedIds = assignedTaskIds.map((r) => r.taskId as string);

      rows = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.tenantId, auth.tenantId),
            ...(conditions.slice(1)),
            sql`(${tasks.createdBy} = ${visibilityFilter}${assignedIds.length ? sql` OR ${tasks.id} IN (${sql.join(assignedIds.map((id) => sql`${id}`), sql`, `)})` : sql``})`,
          ),
        )
        .orderBy(asc(tasks.dueDate), asc(tasks.createdAt))
        .offset(offset)
        .limit(limit);
    } else {
      rows = await db
        .select()
        .from(tasks)
        .where(whereClause)
        .orderBy(asc(tasks.dueDate), asc(tasks.createdAt))
        .offset(offset)
        .limit(limit);
    }

    // Enrich with progress computed from checklist
    const enriched = await Promise.all(rows.map((t) => this.enrichTask(t)));

    const [{ total }] = await db
      .select({ total: count() })
      .from(tasks)
      .where(whereClause);

    return { items: enriched, total: Number(total), page, limit };
  }

  // ── Get by ID ─────────────────────────────────────────────────────────────

  async findById(auth: TrpcAuth, taskId: string) {
    const db = this.db;
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, auth.tenantId)));

    if (!task) throw new NotFoundException(`Task ${taskId} not found`);

    const isLead = auth.role === UserRole.TEAM_LEAD || auth.role === UserRole.IT_MANAGER || auth.role === UserRole.ADMIN;
    const isOwner = task.createdBy === auth.userId;

    // Check visibility: engineer must be creator or assignee
    if (!isLead && !isOwner) {
      const [assignment] = await db
        .select()
        .from(taskAssignments)
        .where(
          and(
            eq(taskAssignments.taskId, taskId),
            eq(taskAssignments.assigneeId, auth.userId),
          ),
        );
      if (!assignment) throw new ForbiddenException('Access denied');
    }

    return this.enrichTask(task);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(auth: TrpcAuth, taskId: string, dto: UpdateTaskDto) {
    const db = this.db;
    const task = await this.findById(auth, taskId);
    const now = new Date();

    const updates: Partial<typeof tasks.$inferInsert> = { updatedAt: now };

    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.taskType !== undefined) updates.taskType = dto.taskType;
    if (dto.dueDate !== undefined) updates.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.progressOverride !== undefined) updates.progressOverride = dto.progressOverride;

    if (dto.status !== undefined) {
      updates.status = dto.status;
      if (dto.status === 'COMPLETED') {
        updates.completedAt = now;
        updates.progressOverride = 100;
      }
    }

    await db
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, auth.tenantId)));

    return this.findById(auth, taskId);
  }

  // ── Checklist ─────────────────────────────────────────────────────────────

  async addChecklistItem(auth: TrpcAuth, taskId: string, dto: CreateChecklistItemDto) {
    // Verify access
    await this.findById(auth, taskId);
    const db = this.db;
    const now = new Date();

    // Next sort order
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, taskId));

    const sortOrder = dto.sortOrder ?? (Number(maxOrder) + 1);
    const id = uuidv4();

    await db.insert(taskChecklistItems).values({
      id,
      tenantId: auth.tenantId,
      taskId,
      label: dto.label,
      sortOrder,
      isCompleted: 0,
      createdAt: now,
    });

    return db
      .select()
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, taskId))
      .orderBy(asc(taskChecklistItems.sortOrder));
  }

  async toggleChecklistItem(auth: TrpcAuth, taskId: string, itemId: string) {
    await this.findById(auth, taskId);
    const db = this.db;

    const [item] = await db
      .select()
      .from(taskChecklistItems)
      .where(
        and(
          eq(taskChecklistItems.id, itemId),
          eq(taskChecklistItems.taskId, taskId),
        ),
      );

    if (!item) throw new NotFoundException(`Checklist item ${itemId} not found`);

    const now = new Date();
    const nowCompleted = !item.isCompleted;

    await db
      .update(taskChecklistItems)
      .set({
        isCompleted: nowCompleted ? 1 : 0,
        completedAt: nowCompleted ? now : null,
      })
      .where(eq(taskChecklistItems.id, itemId));

    // Update task progress from checklist
    await this.recomputeProgress(auth.tenantId, taskId);

    return this.findById(auth, taskId);
  }

  async deleteChecklistItem(auth: TrpcAuth, taskId: string, itemId: string) {
    await this.findById(auth, taskId);
    const db = this.db;
    await db
      .delete(taskChecklistItems)
      .where(
        and(
          eq(taskChecklistItems.id, itemId),
          eq(taskChecklistItems.taskId, taskId),
        ),
      );
    await this.recomputeProgress(auth.tenantId, taskId);
    return { success: true };
  }

  // ── Assignees ─────────────────────────────────────────────────────────────

  async addAssignees(auth: TrpcAuth, taskId: string, dto: AddAssigneesDto) {
    const isLead = auth.role === UserRole.TEAM_LEAD || auth.role === UserRole.IT_MANAGER || auth.role === UserRole.ADMIN;
    if (!isLead) throw new ForbiddenException('Only leads can assign tasks');

    await this.findById(auth, taskId);
    const db = this.db;
    const now = new Date();

    // Upsert — skip existing
    const existing = await db
      .select({ assigneeId: taskAssignments.assigneeId })
      .from(taskAssignments)
      .where(eq(taskAssignments.taskId, taskId));
    const existingIds = new Set(existing.map((r) => r.assigneeId as string));
    const newIds = dto.assigneeIds.filter((id) => !existingIds.has(id));

    if (newIds.length > 0) {
      await db.insert(taskAssignments).values(
        newIds.map((assigneeId) => ({
          id: uuidv4(),
          tenantId: auth.tenantId,
          taskId,
          assigneeId,
          isCompleted: 0,
          assignedAt: now,
        })),
      );

      // Promote source to LEAD_ASSIGNED if it was SELF_LOGGED
      await db
        .update(tasks)
        .set({ source: 'LEAD_ASSIGNED', updatedAt: now })
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.source, 'SELF_LOGGED'),
          ),
        );
    }

    return this.findById(auth, taskId);
  }

  async markAssignmentComplete(auth: TrpcAuth, taskId: string) {
    const db = this.db;
    const now = new Date();

    await db
      .update(taskAssignments)
      .set({ isCompleted: 1, completedAt: now })
      .where(
        and(
          eq(taskAssignments.taskId, taskId),
          eq(taskAssignments.assigneeId, auth.userId),
        ),
      );

    // If ALL assignees are done → mark task COMPLETED
    const [{ total }] = await db
      .select({ total: count() })
      .from(taskAssignments)
      .where(eq(taskAssignments.taskId, taskId));

    const [{ done }] = await db
      .select({ done: count() })
      .from(taskAssignments)
      .where(and(eq(taskAssignments.taskId, taskId), eq(taskAssignments.isCompleted, 1)));

    if (Number(total) > 0 && Number(total) === Number(done)) {
      await db
        .update(tasks)
        .set({ status: 'COMPLETED', completedAt: now, progressOverride: 100, updatedAt: now })
        .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, auth.tenantId)));
    }

    return this.findById(auth, taskId);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async enrichTask(task: typeof tasks.$inferSelect) {
    const db = this.db;

    // Checklist items
    const checklistItems = await db
      .select()
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, task.id as string))
      .orderBy(asc(taskChecklistItems.sortOrder));

    // Compute progress
    let progress: number;
    if (checklistItems.length > 0) {
      const completed = checklistItems.filter((i) => i.isCompleted).length;
      progress = Math.round((completed / checklistItems.length) * 100);
    } else {
      progress = task.progressOverride ?? 0;
    }

    // Assignments
    const assignments = await db
      .select({
        id: taskAssignments.id,
        assigneeId: taskAssignments.assigneeId,
        isCompleted: taskAssignments.isCompleted,
        completedAt: taskAssignments.completedAt,
        assignedAt: taskAssignments.assignedAt,
      })
      .from(taskAssignments)
      .where(eq(taskAssignments.taskId, task.id as string));

    return {
      ...task,
      progress,
      checklistItems,
      assignments,
    };
  }

  private async recomputeProgress(tenantId: string, taskId: string) {
    const db = this.db;

    const items = await db
      .select({ isCompleted: taskChecklistItems.isCompleted })
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, taskId));

    if (items.length === 0) return;

    const completed = items.filter((i) => i.isCompleted).length;
    const progress = Math.round((completed / items.length) * 100);
    const now = new Date();

    const updates: Partial<typeof tasks.$inferInsert> = {
      progressOverride: progress,
      updatedAt: now,
    };

    // Auto-complete the task if all items are checked
    if (progress === 100) {
      updates.status = 'COMPLETED';
      updates.completedAt = now;
    }

    await db
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)));
  }
}
