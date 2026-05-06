import { router, protectedProcedure } from './trpc';
import { getMssqlDb } from '@lotris/db';
import { users, teams, roles, tickets, ticketComments, ticketHistory } from '@lotris/db';
import { eq, and, asc } from 'drizzle-orm';
import { z } from 'zod';
import { TicketsService } from '../modules/tickets/tickets.service';
import { QueueService } from '../modules/queue/queue.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { TasksService } from '../modules/tasks/tasks.service';

/**
 * tRPC application router.
 * Procedure naming convention: entity.operation
 * All procedures with data access include a tenantId filter — no exceptions.
 */
export const appRouter = router({
  // ── users ───────────────────────────────────────────────────────────────

  'users.me': protectedProcedure.query(async ({ ctx }) => {
    const db = getMssqlDb();
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        roleId: users.roleId,
        teamId: users.teamId,
        roleName: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.id, ctx.auth.userId), eq(users.tenantId, ctx.auth.tenantId)))
      .limit(1);

    if (!result[0]) throw new Error('User record not found');
    return result[0];
  }),

  'users.list': protectedProcedure.query(async ({ ctx }) => {
    const db = getMssqlDb();
    return db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        roleId: users.roleId,
        roleName: roles.name,
        teamId: users.teamId,
        isActive: users.isActive,
        isUnavailable: users.isUnavailable,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.tenantId, ctx.auth.tenantId), eq(users.isActive, 1)));
  }),

  // ── teams ───────────────────────────────────────────────────────────────

  'teams.list': protectedProcedure.query(async ({ ctx }) => {
    const db = getMssqlDb();
    return db
      .select()
      .from(teams)
      .where(and(eq(teams.tenantId, ctx.auth.tenantId), eq(teams.isActive, 1)));
  }),

  // ── tickets ──────────────────────────────────────────────────────────────

  'tickets.list': protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        priority: z.number().int().min(1).max(4).optional(),
        teamId: z.string().uuid().optional(),
        assigneeId: z.string().uuid().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const svc = new TicketsService(new NotificationsService());
      return svc.list(ctx.auth, input);
    }),

  'tickets.get': protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const svc = new TicketsService(new NotificationsService());
      return svc.findById(ctx.auth, input.id);
    }),

  'tickets.create': protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        description: z.string().min(1).max(4000),
        priority: z.number().int().min(1).max(4).default(2),
        teamId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const svc = new TicketsService(new NotificationsService());
      return svc.create(ctx.auth, input);
    }),

  'tickets.updateStatus': protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['TEAM_ASSIGNED', 'UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED']),
        teamId: z.string().uuid().optional(),
        assigneeId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const svc = new TicketsService(new NotificationsService());
      return svc.updateStatus(ctx.auth, input.id, input);
    }),

  'tickets.addComment': protectedProcedure
    .input(
      z.object({
        ticketId: z.string().uuid(),
        body: z.string().min(1).max(4000),
        isInternal: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const svc = new TicketsService(new NotificationsService());
      return svc.addComment(ctx.auth, input.ticketId, input);
    }),

  'tickets.getComments': protectedProcedure
    .input(z.object({ ticketId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const svc = new TicketsService(new NotificationsService());
      return svc.getComments(ctx.auth, input.ticketId);
    }),

  'tickets.getHistory': protectedProcedure
    .input(z.object({ ticketId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const svc = new TicketsService(new NotificationsService());
      return svc.getHistory(ctx.auth, input.ticketId);
    }),

  // ── queue ─────────────────────────────────────────────────────────────────

  'queue.list': protectedProcedure
    .input(
      z.object({
        teamId: z.string().uuid().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const svc = new QueueService(new NotificationsService());
      return svc.listQueue(ctx.auth, input);
    }),

  'queue.claim': protectedProcedure
    .input(z.object({ ticketId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const svc = new QueueService(new NotificationsService());
      return svc.claimTicket(ctx.auth, input.ticketId);
    }),

  'queue.health': protectedProcedure
    .query(async ({ ctx }) => {
      const svc = new QueueService(new NotificationsService());
      return svc.getQueueHealth(ctx.auth);
    }),

  // ── tasks ─────────────────────────────────────────────────────────────────

  'tasks.list': protectedProcedure
    .input(
      z.object({
        status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
        source: z.enum(['LEAD_ASSIGNED', 'SELF_LOGGED']).optional(),
        teamId: z.string().uuid().optional(),
        assigneeId: z.string().uuid().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const svc = new TasksService();
      return svc.list(ctx.auth, input);
    }),

  'tasks.get': protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const svc = new TasksService();
      return svc.findById(ctx.auth, input.id);
    }),

  'tasks.create': protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        description: z.string().max(4000).optional(),
        taskType: z.enum(['MAINTENANCE', 'DR_BCP', 'CHANGE_REQUEST', 'DOCUMENTATION', 'TRAINING', 'AD_HOC']).optional(),
        teamId: z.string().uuid().optional(),
        assigneeIds: z.array(z.string().uuid()).max(20).optional(),
        dueDate: z.string().datetime().optional(),
        progressOverride: z.number().int().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const svc = new TasksService();
      return svc.create(ctx.auth, input);
    }),

  'tasks.update': protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(4000).optional(),
        taskType: z.enum(['MAINTENANCE', 'DR_BCP', 'CHANGE_REQUEST', 'DOCUMENTATION', 'TRAINING', 'AD_HOC']).optional(),
        status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
        dueDate: z.string().datetime().optional(),
        progressOverride: z.number().int().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...dto } = input;
      const svc = new TasksService();
      return svc.update(ctx.auth, id, dto);
    }),

  'tasks.addChecklistItem': protectedProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        label: z.string().min(1).max(500),
        sortOrder: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const svc = new TasksService();
      return svc.addChecklistItem(ctx.auth, input.taskId, { label: input.label, sortOrder: input.sortOrder });
    }),

  'tasks.toggleChecklistItem': protectedProcedure
    .input(z.object({ taskId: z.string().uuid(), itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const svc = new TasksService();
      return svc.toggleChecklistItem(ctx.auth, input.taskId, input.itemId);
    }),

  'tasks.complete': protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const svc = new TasksService();
      return svc.markAssignmentComplete(ctx.auth, input.taskId);
    }),
});

export type AppRouter = typeof appRouter;

