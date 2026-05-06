import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  getMssqlDb,
  kpiDefinitions,
  kpiTeamTargets,
  kpiEngineerAssignments,
  kpiAgreements,
  kpiAgreementAreas,
  kpiAgreementMetrics,
  kpiActuals,
  kpiResults,
  eq,
  and,
  asc,
  sql,
  type KpiAgreementArea,
  type KpiAgreementMetric,
} from '@lotris/db';
import { v4 as uuidv4 } from 'uuid';
import type { TrpcAuth } from '@lotris/types';
import type {
  CreateKpiDefinitionDto,
  UpdateKpiDefinitionDto,
  SetTeamTargetDto,
  CreateKpiAssignmentDto,
  CreateKpiAgreementDto,
  UpsertAgreementAreasDto,
  CreateActualDto,
} from './dto';

@Injectable()
export class KpiService {
  // ── KPI Definitions ─────────────────────────────────────────────────────

  async listDefinitions(auth: TrpcAuth) {
    const db = await getMssqlDb();
    return db
      .select()
      .from(kpiDefinitions)
      .where(eq(kpiDefinitions.tenantId, auth.tenantId))
      .orderBy(asc(kpiDefinitions.name));
  }

  async getDefinition(auth: TrpcAuth, id: string) {
    const db = await getMssqlDb();
    const [row] = await db
      .select()
      .from(kpiDefinitions)
      .where(and(eq(kpiDefinitions.id, id), eq(kpiDefinitions.tenantId, auth.tenantId)));
    if (!row) throw new NotFoundException('KPI definition not found');
    return row;
  }

  async createDefinition(auth: TrpcAuth, dto: CreateKpiDefinitionDto) {
    this.requireRole(auth, ['IT_MANAGER', 'ADMIN', 'SUPERADMIN']);
    const db = await getMssqlDb();
    const now = new Date();
    const id = uuidv4();
    await db.insert(kpiDefinitions).values({
      id,
      tenantId: auth.tenantId,
      name: dto.name,
      description: dto.description ?? null,
      metricType: dto.metricType,
      direction: dto.direction,
      scope: dto.scope,
      defaultTarget: String(dto.defaultTarget),
      weight: String(dto.weight),
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    });
    return this.getDefinition(auth, id);
  }

  async updateDefinition(auth: TrpcAuth, id: string, dto: UpdateKpiDefinitionDto) {
    this.requireRole(auth, ['IT_MANAGER', 'ADMIN', 'SUPERADMIN']);
    await this.getDefinition(auth, id); // 404 guard
    const db = await getMssqlDb();
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.metricType !== undefined) updates.metricType = dto.metricType;
    if (dto.direction !== undefined) updates.direction = dto.direction;
    if (dto.scope !== undefined) updates.scope = dto.scope;
    if (dto.defaultTarget !== undefined) updates.defaultTarget = String(dto.defaultTarget);
    if (dto.weight !== undefined) updates.weight = String(dto.weight);
    if (dto.status !== undefined) updates.status = dto.status;
    await db.update(kpiDefinitions).set(updates).where(eq(kpiDefinitions.id, id));
    return this.getDefinition(auth, id);
  }

  async archiveDefinition(auth: TrpcAuth, id: string) {
    this.requireRole(auth, ['IT_MANAGER', 'ADMIN', 'SUPERADMIN']);
    await this.getDefinition(auth, id);
    const db = await getMssqlDb();
    await db
      .update(kpiDefinitions)
      .set({ status: 'ARCHIVED', updatedAt: new Date() })
      .where(eq(kpiDefinitions.id, id));
    return { success: true };
  }

  // ── Team Targets ─────────────────────────────────────────────────────────

  async getTeamTargets(auth: TrpcAuth, kpiDefinitionId: string) {
    await this.getDefinition(auth, kpiDefinitionId);
    const db = await getMssqlDb();
    return db
      .select()
      .from(kpiTeamTargets)
      .where(
        and(
          eq(kpiTeamTargets.tenantId, auth.tenantId),
          eq(kpiTeamTargets.kpiDefinitionId, kpiDefinitionId),
        ),
      );
  }

  async setTeamTarget(auth: TrpcAuth, kpiDefinitionId: string, dto: SetTeamTargetDto) {
    this.requireRole(auth, ['IT_MANAGER', 'ADMIN', 'SUPERADMIN']);
    await this.getDefinition(auth, kpiDefinitionId);
    const db = await getMssqlDb();
    // Upsert: delete existing + insert
    await db
      .delete(kpiTeamTargets)
      .where(
        and(
          eq(kpiTeamTargets.kpiDefinitionId, kpiDefinitionId),
          eq(kpiTeamTargets.teamId, dto.teamId),
        ),
      );
    await db.insert(kpiTeamTargets).values({
      id: uuidv4(),
      tenantId: auth.tenantId,
      kpiDefinitionId,
      teamId: dto.teamId,
      targetValue: String(dto.targetValue),
    });
    return { success: true };
  }

  // ── Engineer Assignments ─────────────────────────────────────────────────

  async listAssignments(auth: TrpcAuth, engineerId?: string, periodKey?: string) {
    const db = await getMssqlDb();
    const conditions = [eq(kpiEngineerAssignments.tenantId, auth.tenantId)];
    if (engineerId) conditions.push(eq(kpiEngineerAssignments.engineerId, engineerId));
    if (periodKey) conditions.push(eq(kpiEngineerAssignments.periodKey, periodKey));
    return db
      .select()
      .from(kpiEngineerAssignments)
      .where(and(...conditions));
  }

  async createAssignment(auth: TrpcAuth, dto: CreateKpiAssignmentDto) {
    this.requireRole(auth, ['TEAM_LEAD', 'IT_MANAGER', 'ADMIN', 'SUPERADMIN']);
    await this.getDefinition(auth, dto.kpiDefinitionId);
    const db = await getMssqlDb();
    const id = uuidv4();
    await db.insert(kpiEngineerAssignments).values({
      id,
      tenantId: auth.tenantId,
      engineerId: dto.engineerId,
      kpiDefinitionId: dto.kpiDefinitionId,
      periodKey: dto.periodKey,
      measurementPeriod: dto.measurementPeriod,
      targetOverride: dto.targetOverride != null ? String(dto.targetOverride) : null,
      assignedBy: auth.userId,
      createdAt: new Date(),
    });
    const [row] = await db
      .select()
      .from(kpiEngineerAssignments)
      .where(eq(kpiEngineerAssignments.id, id));
    return row;
  }

  // ── Agreements ───────────────────────────────────────────────────────────

  async listAgreements(auth: TrpcAuth, engineerId?: string, periodKey?: string) {
    const db = await getMssqlDb();
    const conditions = [eq(kpiAgreements.tenantId, auth.tenantId)];
    if (engineerId) conditions.push(eq(kpiAgreements.engineerId, engineerId));
    if (periodKey) conditions.push(eq(kpiAgreements.periodKey, periodKey));
    // Engineers can only see their own agreements
    if (auth.role === 'ENGINEER') {
      conditions.push(eq(kpiAgreements.engineerId, auth.userId));
    }
    return db
      .select()
      .from(kpiAgreements)
      .where(and(...conditions))
      .orderBy(asc(kpiAgreements.periodKey));
  }

  async getAgreement(auth: TrpcAuth, id: string) {
    const db = await getMssqlDb();
    const [agreement] = await db
      .select()
      .from(kpiAgreements)
      .where(and(eq(kpiAgreements.id, id), eq(kpiAgreements.tenantId, auth.tenantId)));
    if (!agreement) throw new NotFoundException('KPI agreement not found');
    // Engineers can only view their own
    if (auth.role === 'ENGINEER' && agreement.engineerId !== auth.userId) {
      throw new ForbiddenException();
    }
    return agreement;
  }

  async getAgreementWithAreas(auth: TrpcAuth, id: string) {
    const agreement = await this.getAgreement(auth, id);
    const db = await getMssqlDb();
    const areas = await db
      .select()
      .from(kpiAgreementAreas)
      .where(eq(kpiAgreementAreas.agreementId, id))
      .orderBy(asc(kpiAgreementAreas.sortOrder));

    const areasWithMetrics = await Promise.all(
      areas.map(async (area: KpiAgreementArea) => {
        const metrics = await db
          .select()
          .from(kpiAgreementMetrics)
          .where(eq(kpiAgreementMetrics.areaId, area.id))
          .orderBy(asc(kpiAgreementMetrics.sortOrder));
        return { ...area, metrics };
      }),
    );

    return { ...agreement, areas: areasWithMetrics };
  }

  async createAgreement(auth: TrpcAuth, dto: CreateKpiAgreementDto) {
    this.requireRole(auth, ['TEAM_LEAD', 'IT_MANAGER', 'ADMIN', 'SUPERADMIN']);
    const db = await getMssqlDb();
    // Check no ACTIVE agreement exists for this engineer + period
    const [existing] = await db
      .select()
      .from(kpiAgreements)
      .where(
        and(
          eq(kpiAgreements.tenantId, auth.tenantId),
          eq(kpiAgreements.engineerId, dto.engineerId),
          eq(kpiAgreements.periodKey, dto.periodKey),
        ),
      );
    if (existing) {
      throw new BadRequestException(
        `Agreement already exists for engineer ${dto.engineerId} in period ${dto.periodKey}`,
      );
    }
    const now = new Date();
    const id = uuidv4();
    await db.insert(kpiAgreements).values({
      id,
      tenantId: auth.tenantId,
      engineerId: dto.engineerId,
      leadId: auth.userId,
      periodKey: dto.periodKey,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    });
    return this.getAgreement(auth, id);
  }

  async upsertAgreementAreas(auth: TrpcAuth, agreementId: string, dto: UpsertAgreementAreasDto) {
    const agreement = await this.getAgreement(auth, agreementId);
    if (agreement.status !== 'DRAFT') {
      throw new BadRequestException('Areas can only be edited while agreement is in DRAFT status');
    }
    // Validate area weights sum to 100
    const totalWeight = dto.areas.reduce((s, a) => s + a.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new BadRequestException(`Area weights must total 100 (got ${totalWeight})`);
    }
    const db = await getMssqlDb();
    // Delete existing areas + metrics (cascade via metrics FK on area_id)
    const existingAreas = await db
      .select({ id: kpiAgreementAreas.id })
      .from(kpiAgreementAreas)
      .where(eq(kpiAgreementAreas.agreementId, agreementId));
    for (const area of existingAreas) {
      await db.delete(kpiAgreementMetrics).where(eq(kpiAgreementMetrics.areaId, area.id));
    }
    await db.delete(kpiAgreementAreas).where(eq(kpiAgreementAreas.agreementId, agreementId));

    // Insert new areas + metrics
    for (let i = 0; i < dto.areas.length; i++) {
      const areaDto = dto.areas[i]!;
      const areaId = uuidv4();
      await db.insert(kpiAgreementAreas).values({
        id: areaId,
        tenantId: auth.tenantId,
        agreementId,
        name: areaDto.name,
        weight: String(areaDto.weight),
        sortOrder: areaDto.sortOrder ?? i,
      });
      for (let j = 0; j < areaDto.metrics.length; j++) {
        const m = areaDto.metrics[j]!;
        await db.insert(kpiAgreementMetrics).values({
          id: uuidv4(),
          tenantId: auth.tenantId,
          areaId,
          kpiDefinitionId: m.kpiDefinitionId ?? null,
          description: m.description,
          measurementPeriod: m.measurementPeriod,
          weight: String(m.weight),
          targetScore: String(m.targetScore),
          actualScore: null,
          sortOrder: m.sortOrder ?? j,
        });
      }
    }
    await db
      .update(kpiAgreements)
      .set({ updatedAt: new Date() })
      .where(eq(kpiAgreements.id, agreementId));

    return this.getAgreementWithAreas(auth, agreementId);
  }

  async submitAgreement(auth: TrpcAuth, id: string) {
    this.requireRole(auth, ['TEAM_LEAD', 'IT_MANAGER', 'ADMIN', 'SUPERADMIN']);
    const agreement = await this.getAgreement(auth, id);
    if (agreement.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT agreements can be submitted');
    }
    const db = await getMssqlDb();
    await db
      .update(kpiAgreements)
      .set({ status: 'PENDING_REVIEW', submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(kpiAgreements.id, id));
    return this.getAgreement(auth, id);
  }

  async acceptAgreement(auth: TrpcAuth, id: string) {
    const agreement = await this.getAgreement(auth, id);
    if (agreement.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Only PENDING_REVIEW agreements can be accepted');
    }
    // Only the engineer named in the agreement can accept it
    if (agreement.engineerId !== auth.userId) {
      throw new ForbiddenException('Only the named engineer can accept this agreement');
    }
    const db = await getMssqlDb();
    await db
      .update(kpiAgreements)
      .set({ status: 'ACTIVE', acceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(kpiAgreements.id, id));
    return this.getAgreement(auth, id);
  }

  // ── KPI Actuals ──────────────────────────────────────────────────────────

  async listActuals(auth: TrpcAuth, engineerId?: string, metricId?: string) {
    const db = await getMssqlDb();
    const conditions = [eq(kpiActuals.tenantId, auth.tenantId)];
    if (engineerId) conditions.push(eq(kpiActuals.engineerId, engineerId));
    if (metricId) conditions.push(eq(kpiActuals.metricId, metricId));
    if (auth.role === 'ENGINEER') {
      conditions.push(eq(kpiActuals.engineerId, auth.userId));
    }
    return db.select().from(kpiActuals).where(and(...conditions));
  }

  async createActual(auth: TrpcAuth, dto: CreateActualDto) {
    const db = await getMssqlDb();
    const now = new Date();
    const id = uuidv4();
    await db.insert(kpiActuals).values({
      id,
      tenantId: auth.tenantId,
      engineerId: auth.userId,
      metricId: dto.metricId,
      kpiDefinitionId: dto.kpiDefinitionId ?? null,
      value: String(dto.value),
      source: 'MANUAL',
      sourceRefId: null,
      note: dto.note ?? null,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : now,
    });
    const [row] = await db.select().from(kpiActuals).where(eq(kpiActuals.id, id));
    return row;
  }

  /**
   * Called by TicketsService on ticket RESOLVED.
   * Finds any ACTIVE agreement metric linked to the matching KPI definition for this engineer,
   * and records an actual for the resolution.
   */
  async ingestTicketResolve(
    tenantId: string,
    engineerId: string,
    ticketId: string,
    kpiDefinitionId?: string,
  ) {
    if (!kpiDefinitionId) return;
    const db = await getMssqlDb();
    // Find active agreement metric
    const metric = await this.findActiveMetricForEngineer(db, tenantId, engineerId, kpiDefinitionId);
    if (!metric) return;
    await db.insert(kpiActuals).values({
      id: uuidv4(),
      tenantId,
      engineerId,
      metricId: metric.id,
      kpiDefinitionId,
      value: '1', // count contribution
      source: 'TICKET_RESOLVE',
      sourceRefId: ticketId,
      note: null,
      recordedAt: new Date(),
    });
    await this.updateMetricActualScore(db, metric.id);
  }

  /**
   * Called by TasksService on task COMPLETED.
   * Records an actual for the task completion against the linked KPI definition.
   */
  async ingestTaskComplete(
    tenantId: string,
    engineerId: string,
    taskId: string,
    kpiDefinitionId?: string | null,
  ) {
    if (!kpiDefinitionId) return;
    const db = await getMssqlDb();
    const metric = await this.findActiveMetricForEngineer(db, tenantId, engineerId, kpiDefinitionId);
    if (!metric) return;
    await db.insert(kpiActuals).values({
      id: uuidv4(),
      tenantId,
      engineerId,
      metricId: metric.id,
      kpiDefinitionId,
      value: '1',
      source: 'TASK_COMPLETE',
      sourceRefId: taskId,
      note: null,
      recordedAt: new Date(),
    });
    await this.updateMetricActualScore(db, metric.id);
  }

  // ── Scoring Engine ───────────────────────────────────────────────────────

  async computeScore(auth: TrpcAuth, agreementId: string) {
    const agreement = await this.getAgreement(auth, agreementId);
    const db = await getMssqlDb();
    const areas = await db
      .select()
      .from(kpiAgreementAreas)
      .where(eq(kpiAgreementAreas.agreementId, agreementId))
      .orderBy(asc(kpiAgreementAreas.sortOrder));

    const areaScores: Array<{ areaId: string; areaName: string; score: number; weight: number }> = [];
    let overallScore = 0;

    for (const area of areas) {
      const metrics = await db
        .select()
        .from(kpiAgreementMetrics)
        .where(eq(kpiAgreementMetrics.areaId, area.id));

      const totalMetricWeight = metrics.reduce((s: number, m: KpiAgreementMetric) => s + Number(m.weight), 0);
      let areaScore = 0;
      if (totalMetricWeight > 0) {
        for (const m of metrics) {
          const actual = Number(m.actualScore ?? 0);
          const target = Number(m.targetScore);
          const metricScore = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
          areaScore += metricScore * (Number(m.weight) / totalMetricWeight);
        }
      }

      areaScores.push({
        areaId: area.id,
        areaName: area.name,
        score: Math.round(areaScore * 100) / 100,
        weight: Number(area.weight),
      });

      overallScore += areaScore * (Number(area.weight) / 100);
    }

    overallScore = Math.round(overallScore * 100) / 100;
    const now = new Date();

    // Upsert result
    const [existing] = await db
      .select()
      .from(kpiResults)
      .where(eq(kpiResults.agreementId, agreementId));

    if (existing) {
      await db
        .update(kpiResults)
        .set({
          overallScore: String(overallScore),
          areaScoresJson: JSON.stringify(areaScores),
          computedAt: now,
        })
        .where(eq(kpiResults.agreementId, agreementId));
    } else {
      await db.insert(kpiResults).values({
        id: uuidv4(),
        tenantId: agreement.tenantId,
        engineerId: agreement.engineerId,
        agreementId,
        periodKey: agreement.periodKey,
        overallScore: String(overallScore),
        areaScoresJson: JSON.stringify(areaScores),
        computedAt: now,
      });
    }

    const [result] = await db
      .select()
      .from(kpiResults)
      .where(eq(kpiResults.agreementId, agreementId));
    return result;
  }

  async getResult(auth: TrpcAuth, agreementId: string) {
    await this.getAgreement(auth, agreementId); // access check
    const db = await getMssqlDb();
    const [row] = await db
      .select()
      .from(kpiResults)
      .where(eq(kpiResults.agreementId, agreementId));
    return row ?? null;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private requireRole(auth: TrpcAuth, roles: string[]) {
    if (!roles.includes(auth.role)) {
      throw new ForbiddenException(`Requires one of: ${roles.join(', ')}`);
    }
  }

  private async findActiveMetricForEngineer(
    db: Awaited<ReturnType<typeof getMssqlDb>>,
    tenantId: string,
    engineerId: string,
    kpiDefinitionId: string,
  ) {
    // Find the ACTIVE agreement for this engineer with a metric linked to this KPI definition
    const [agreement] = await db
      .select()
      .from(kpiAgreements)
      .where(
        and(
          eq(kpiAgreements.tenantId, tenantId),
          eq(kpiAgreements.engineerId, engineerId),
          eq(kpiAgreements.status, 'ACTIVE'),
        ),
      );
    if (!agreement) return null;

    const areas = await db
      .select()
      .from(kpiAgreementAreas)
      .where(eq(kpiAgreementAreas.agreementId, agreement.id));

    for (const area of areas) {
      const [metric] = await db
        .select()
        .from(kpiAgreementMetrics)
        .where(
          and(
            eq(kpiAgreementMetrics.areaId, area.id),
            eq(kpiAgreementMetrics.kpiDefinitionId, kpiDefinitionId),
          ),
        );
      if (metric) return metric;
    }
    return null;
  }

  private async updateMetricActualScore(
    db: Awaited<ReturnType<typeof getMssqlDb>>,
    metricId: string,
  ) {
    // Sum all actuals for this metric and update actual_score
    const [sumRow] = await db
      .select({ total: sql<string>`SUM(CAST(value AS DECIMAL(10,2)))` })
      .from(kpiActuals)
      .where(eq(kpiActuals.metricId, metricId));
    const total = sumRow?.total ? Number(sumRow.total) : 0;
    await db
      .update(kpiAgreementMetrics)
      .set({ actualScore: String(total) })
      .where(eq(kpiAgreementMetrics.id, metricId));
  }
}
