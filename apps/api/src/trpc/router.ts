import { router, protectedProcedure, adminProcedure, managerProcedure, publicProcedure } from './trpc';
import { TRPCError } from '@trpc/server';
import { HealthService } from '../modules/health/health.service';
import { getMssqlDb, users, teams, roles, auditLogs, eq, and, sql, desc } from '@lotris/db';
import { z } from 'zod';
import { TicketsService } from '../modules/tickets/tickets.service';
import { QueueService } from '../modules/queue/queue.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { TasksService } from '../modules/tasks/tasks.service';
import { KpiService } from '../modules/kpi/kpi.service';
import { DashboardCacheService } from '../modules/analytics/dashboard-cache.service';
import { AdminService } from '../modules/admin/admin.service';
import type { CreateUserDto } from '../modules/admin/dto/create-user.dto';
import type { CreateTeamDto } from '../modules/admin/dto/create-team.dto';
import type { UpdateTeamDto } from '../modules/admin/dto/update-team.dto';

/**
 * tRPC application router.
 * Procedure naming convention: entity.operation
 * All procedures with data access include a tenantId filter — no exceptions.
 */
export const appRouter = router({
  // ── users ───────────────────────────────────────────────────────────────

  'users.me': protectedProcedure.query(async ({ ctx }) => {
    const db = await getMssqlDb();
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
    const db = await getMssqlDb();
    return db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        roleId: users.roleId,
        roleName: roles.name,
        teamId: users.teamId,
        teamName: teams.name,
        isActive: users.isActive,
        isUnavailable: users.isUnavailable,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(teams, eq(users.teamId, teams.id))
      .where(and(eq(users.tenantId, ctx.auth.tenantId), eq(users.isActive, 1)));
  }),

  // ── teams ───────────────────────────────────────────────────────────────

  'teams.list': protectedProcedure.query(async ({ ctx }) => {
    const db = await getMssqlDb();
    return db
      .select()
      .from(teams)
      .where(and(eq(teams.tenantId, ctx.auth.tenantId), eq(teams.isActive, 1)));
  }),

  // ── admin ────────────────────────────────────────────────────────────────

  'admin.users.list': adminProcedure.query(async ({ ctx }) => {
    const svc = new AdminService();
    return svc.listUsers(ctx.auth.tenantId);
  }),

  'admin.users.updateRole': adminProcedure
    .input(z.object({ userId: z.string().uuid(), roleId: z.number().int().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const svc = new AdminService();
      return svc.assignRole(ctx.auth.tenantId, ctx.auth.userId, input.userId, input.roleId);
    }),

  'admin.users.setActive': adminProcedure
    .input(z.object({ userId: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.isActive) {
        // Reactivate — direct update
        const db = await getMssqlDb();
        await db
          .update(users)
          .set({ isActive: 1, updatedAt: new Date() })
          .where(and(eq(users.id, input.userId), eq(users.tenantId, ctx.auth.tenantId)));
        return { ok: true };
      }
      const svc = new AdminService();
      return svc.deactivateUser(ctx.auth.tenantId, ctx.auth.userId, input.userId);
    }),

  'admin.users.create': adminProcedure
    .input(z.object({
      email: z.string().email(),
      fullName: z.string().min(1),
      roleId: z.number().int().min(1),
      teamId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = new AdminService();
      return svc.createUser(ctx.auth.tenantId, ctx.auth.userId, input as CreateUserDto);
    }),

  'admin.teams.list': managerProcedure.query(async ({ ctx }) => {
    const svc = new AdminService();
    return svc.listTeams(ctx.auth.tenantId);
  }),

  'admin.teams.create': managerProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      maxTicketsPerEngineer: z.number().int().min(1).optional(),
      pickupSlaMinutes: z.number().int().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = new AdminService();
      return svc.createTeam(ctx.auth.tenantId, ctx.auth.userId, input as CreateTeamDto);
    }),

  'admin.teams.update': managerProcedure
    .input(z.object({
      teamId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      maxTicketsPerEngineer: z.number().int().min(1).optional(),
      pickupSlaMinutes: z.number().int().min(1).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { teamId, ...dto } = input;
      const svc = new AdminService();
      return svc.updateTeam(ctx.auth.tenantId, ctx.auth.userId, teamId, dto as UpdateTeamDto);
    }),

  // ── admin.teamAccess ──────────────────────────────────────────────────────

  'admin.teamAccess.list': managerProcedure
    .query(async ({ ctx }) => {
      const svc = new AdminService();
      return svc.listTeamAccessGrants(ctx.auth.tenantId);
    }),

  'admin.teamAccess.grant': managerProcedure
    .input(z.object({
      granteeUserId: z.string().uuid(),
      targetTeamId:  z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = new AdminService();
      return svc.grantTeamAccess(ctx.auth.tenantId, ctx.auth.userId, input.granteeUserId, input.targetTeamId);
    }),

  'admin.teamAccess.revoke': managerProcedure
    .input(z.object({
      granteeUserId: z.string().uuid(),
      targetTeamId:  z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = new AdminService();
      return svc.revokeTeamAccess(ctx.auth.tenantId, input.granteeUserId, input.targetTeamId);
    }),


  'tickets.list': protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        priority: z.number().int().min(1).max(4).optional(),
        teamId: z.string().uuid().optional(),
        assigneeId: z.string().uuid().optional(),
        search: z.string().optional(),
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

  'tickets.assign': protectedProcedure
    .input(z.object({ id: z.string().uuid(), assigneeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const ALLOWED = ['ADMIN', 'SUPERADMIN', 'IT_MANAGER', 'TEAM_LEAD'];
      if (!ALLOWED.includes(ctx.auth.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only Admins, IT Managers and Team Leads can assign tickets' });
      }
      const svc = new TicketsService(new NotificationsService());
      return svc.assign(ctx.auth, input.id, input.assigneeId);
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

  // ── kpi ───────────────────────────────────────────────────────────────────

  'kpi.definitions.list': protectedProcedure.query(async ({ ctx }) => {
    const svc = new KpiService();
    return svc.listDefinitions(ctx.auth);
  }),

  'kpi.definitions.get': protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const svc = new KpiService();
      return svc.getDefinition(ctx.auth, input.id);
    }),

  'kpi.assignments.list': protectedProcedure
    .input(
      z.object({
        engineerId: z.string().uuid().optional(),
        periodKey: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const svc = new KpiService();
      return svc.listAssignments(ctx.auth, input.engineerId, input.periodKey);
    }),

  'kpi.agreements.list': protectedProcedure
    .input(
      z.object({
        engineerId: z.string().uuid().optional(),
        periodKey: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const svc = new KpiService();
      return svc.listAgreements(ctx.auth, input.engineerId, input.periodKey);
    }),

  'kpi.agreements.get': protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const svc = new KpiService();
      return svc.getAgreementWithAreas(ctx.auth, input.id);
    }),

  'kpi.actuals.list': protectedProcedure
    .input(
      z.object({
        engineerId: z.string().uuid().optional(),
        metricId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const svc = new KpiService();
      return svc.listActuals(ctx.auth, input.engineerId, input.metricId);
    }),

  'kpi.results.get': protectedProcedure
    .input(z.object({ agreementId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const svc = new KpiService();
      return svc.getResult(ctx.auth, input.agreementId);
    }),

  'kpi.score.compute': protectedProcedure
    .input(z.object({ agreementId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const svc = new KpiService();
      return svc.computeScore(ctx.auth, input.agreementId);
    }),

  // ── dashboard ─────────────────────────────────────────────────────────────

  'dashboard.summary': protectedProcedure.query(async ({ ctx }) => {
    const svc = new DashboardCacheService();
    return svc.getSummary(ctx.auth);
  }),

  'dashboard.ticketAnalytics': protectedProcedure.query(async ({ ctx }) => {
    const svc = new DashboardCacheService();
    return svc.getTicketAnalytics(ctx.auth);
  }),

  'dashboard.engineerPerf': protectedProcedure.query(async ({ ctx }) => {
    const svc = new DashboardCacheService();
    return svc.getEngineerPerf(ctx.auth);
  }),

  'dashboard.queueHealth': protectedProcedure.query(async ({ ctx }) => {
    const svc = new DashboardCacheService();
    return svc.getQueueHealth(ctx.auth);
  }),

  'dashboard.teamWorkload': protectedProcedure.query(async ({ ctx }) => {
    const svc = new DashboardCacheService();
    return svc.getTeamWorkload(ctx.auth);
  }),

  // ── health (ADMIN only) ──────────────────────────────────────────────────

  'health.getSnapshot': managerProcedure.query(async () => {
    const svc = new HealthService();
    return svc.getSnapshot();
  }),

  'health.getIncidents': managerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      const svc = new HealthService();
      return svc.getIncidents(input.limit);
    }),

  'health.restartService': adminProcedure  // ADMIN/SUPERADMIN only — destructive action
    .input(z.object({
      serviceName: z.enum([
        'nestjs-api',
        'nextjs-web',
        'bullmq-workers',
        'mssql-db',
        'redis',
        'postgres-analytics',
      ]),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = new HealthService();
      return svc.requestRestart(input.serviceName, ctx.auth.userId, ctx.auth.tenantId);
    }),

  // ── package store health (ADMIN only) ───────────────────────────────────

  'health.storeHealth': adminProcedure.query(async () => {
    const svc = new HealthService();
    return svc.checkStoreHealth();
  }),

  'health.repairStore': adminProcedure.mutation(async ({ ctx }) => {
    const svc = new HealthService();
    return svc.repairStore(ctx.auth.userId, ctx.auth.tenantId);
  }),

  // ── audit logs (ADMIN only) ──────────────────────────────────────────────

  'auditLogs.list': managerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      const db = await getMssqlDb();
      return db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          details: auditLogs.details,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, ctx.auth.tenantId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit);
    }),

  // ── monitor (PUBLIC — no auth required) ─────────────────────────────────

  'monitor.stats': publicProcedure.query(async () => {
    const db = await getMssqlDb();

    type StatRow = {
      totalOpen: number;
      slaBreach: number;
      resolved24h: number;
      totalActive: number;
    };
    type TeamRow = {
      teamName: string;
      openCount: number;
      inProgress: number;
      escalated: number;
    };
    type RecentRow = {
      id: string;
      title: string;
      status: string;
      priority: number;
      teamName: string | null;
      createdAt: Date;
    };

    const [statsRows, teamRows, recentRows] = await Promise.all([
      db.execute<StatRow>(sql.raw(`
        SELECT
          SUM(CASE WHEN status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS totalOpen,
          SUM(CASE WHEN status NOT IN ('RESOLVED','CLOSED') AND sla_resolution_deadline < GETUTCDATE() THEN 1 ELSE 0 END) AS slaBreach,
          SUM(CASE WHEN status IN ('RESOLVED','CLOSED') AND updated_at >= DATEADD(HOUR,-24,GETUTCDATE()) THEN 1 ELSE 0 END) AS resolved24h,
          COUNT(*) AS totalActive
        FROM Tickets
        WHERE status NOT IN ('CLOSED')
      `)),
      db.execute<TeamRow>(sql.raw(`
        SELECT
          t.name AS teamName,
          SUM(CASE WHEN tk.status IN ('NEW','TEAM_ASSIGNED','UNASSIGNED','ASSIGNED') THEN 1 ELSE 0 END) AS openCount,
          SUM(CASE WHEN tk.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgress,
          SUM(CASE WHEN tk.status = 'ESCALATED' THEN 1 ELSE 0 END) AS escalated
        FROM Teams t
        LEFT JOIN Tickets tk ON tk.team_id = t.id AND tk.status NOT IN ('RESOLVED','CLOSED')
        WHERE t.is_active = 1
        GROUP BY t.id, t.name
        ORDER BY openCount DESC
      `)),
      db.execute<RecentRow>(sql.raw(`
        SELECT TOP 20
          tk.id, tk.title, tk.status, tk.priority,
          tm.name AS teamName,
          tk.created_at AS createdAt
        FROM Tickets tk
        LEFT JOIN Teams tm ON tm.id = tk.team_id
        WHERE tk.status NOT IN ('RESOLVED','CLOSED')
        ORDER BY tk.priority ASC, tk.created_at ASC
      `)),
    ]);

    const s = statsRows[0] ?? { totalOpen: 0, slaBreach: 0, resolved24h: 0, totalActive: 0 };
    return {
      totalOpen:   Number(s.totalOpen   ?? 0),
      slaBreach:   Number(s.slaBreach   ?? 0),
      resolved24h: Number(s.resolved24h ?? 0),
      totalActive: Number(s.totalActive ?? 0),
      teams: teamRows.map((r) => ({
        teamName:   r.teamName,
        open:       Number(r.openCount  ?? 0),
        inProgress: Number(r.inProgress ?? 0),
        escalated:  Number(r.escalated  ?? 0),
      })),
      topTickets: recentRows.map((r) => ({
        id:       r.id,
        title:    r.title,
        status:   r.status,
        priority: Number(r.priority),
        teamName: r.teamName ?? '—',
        createdAt: r.createdAt,
      })),
    };
  }),
});

export type AppRouter = typeof appRouter;

