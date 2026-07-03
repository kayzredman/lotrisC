using System.Text.Json;
using Lotris.Application.Common;
using Lotris.Contracts;
using Lotris.Contracts.Kpi;
using Lotris.Domain;

namespace Lotris.Application.Kpi;

public sealed class KpiService
{
    private static readonly UserRole[] DefinitionManagerRoles =
    [
        UserRole.ItManager,
        UserRole.Admin,
        UserRole.SuperAdmin,
    ];

    private static readonly UserRole[] AssignmentLeadRoles =
    [
        UserRole.TeamLead,
        UserRole.ItManager,
        UserRole.Admin,
        UserRole.SuperAdmin,
    ];

    private readonly IKpiRepository _kpi;

    public KpiService(IKpiRepository kpi)
    {
        _kpi = kpi;
    }

    public Task<IReadOnlyList<KpiDefinitionDto>> ListDefinitionsAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default) =>
        MapDefinitionsAsync(_kpi.ListDefinitionsAsync(session.TenantId, cancellationToken));

    public async Task<KpiDefinitionDto> GetDefinitionAsync(
        LotrisSession session,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var row = await RequireDefinitionAsync(session.TenantId, id, cancellationToken);
        return MapDefinition(row);
    }

    public async Task<KpiDefinitionDto> CreateDefinitionAsync(
        LotrisSession session,
        CreateKpiDefinitionRequest request,
        CancellationToken cancellationToken = default)
    {
        RequireRole(session, DefinitionManagerRoles);
        var now = DateTime.UtcNow;
        var id = Guid.NewGuid();
        await _kpi.CreateDefinitionAsync(new KpiDefinitionEntity
        {
            Id = id,
            TenantId = session.TenantId,
            Name = request.Name,
            Description = request.Description,
            MetricType = request.MetricType,
            Direction = request.Direction,
            Scope = request.Scope,
            DefaultTarget = request.DefaultTarget,
            Weight = request.Weight,
            Status = "DRAFT",
            CreatedAt = now,
            UpdatedAt = now,
        }, cancellationToken);

        return await GetDefinitionAsync(session, id, cancellationToken);
    }

    public async Task<KpiDefinitionDto> UpdateDefinitionAsync(
        LotrisSession session,
        Guid id,
        UpdateKpiDefinitionRequest request,
        CancellationToken cancellationToken = default)
    {
        RequireRole(session, DefinitionManagerRoles);
        await RequireDefinitionAsync(session.TenantId, id, cancellationToken);

        var updates = new Dictionary<string, object?> { ["updated_at"] = DateTime.UtcNow };
        if (request.Name is not null) updates["name"] = request.Name;
        if (request.Description is not null) updates["description"] = request.Description;
        if (request.MetricType is not null) updates["metric_type"] = request.MetricType;
        if (request.Direction is not null) updates["direction"] = request.Direction;
        if (request.Scope is not null) updates["scope"] = request.Scope;
        if (request.DefaultTarget is not null) updates["default_target"] = request.DefaultTarget;
        if (request.Weight is not null) updates["weight"] = request.Weight;
        if (request.Status is not null) updates["status"] = request.Status;

        await _kpi.UpdateDefinitionAsync(id, updates, cancellationToken);
        return await GetDefinitionAsync(session, id, cancellationToken);
    }

    public async Task ArchiveDefinitionAsync(
        LotrisSession session,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        RequireRole(session, DefinitionManagerRoles);
        await RequireDefinitionAsync(session.TenantId, id, cancellationToken);
        await _kpi.ArchiveDefinitionAsync(id, DateTime.UtcNow, cancellationToken);
    }

    public async Task<IReadOnlyList<KpiTeamTargetDto>> GetTeamTargetsAsync(
        LotrisSession session,
        Guid kpiDefinitionId,
        CancellationToken cancellationToken = default)
    {
        await RequireDefinitionAsync(session.TenantId, kpiDefinitionId, cancellationToken);
        var rows = await _kpi.GetTeamTargetsAsync(session.TenantId, kpiDefinitionId, cancellationToken);
        return rows.Select(MapTeamTarget).ToList();
    }

    public async Task SetTeamTargetAsync(
        LotrisSession session,
        Guid kpiDefinitionId,
        SetTeamTargetRequest request,
        CancellationToken cancellationToken = default)
    {
        RequireRole(session, DefinitionManagerRoles);
        await RequireDefinitionAsync(session.TenantId, kpiDefinitionId, cancellationToken);
        await _kpi.DeleteTeamTargetAsync(kpiDefinitionId, request.TeamId, cancellationToken);
        await _kpi.UpsertTeamTargetAsync(new KpiTeamTargetEntity
        {
            Id = Guid.NewGuid(),
            TenantId = session.TenantId,
            KpiDefinitionId = kpiDefinitionId,
            TeamId = request.TeamId,
            TargetValue = request.TargetValue,
        }, cancellationToken);
    }

    public async Task<IReadOnlyList<KpiAssignmentDto>> ListAssignmentsAsync(
        LotrisSession session,
        Guid? engineerId,
        string? periodKey,
        CancellationToken cancellationToken = default)
    {
        if (session.Role == UserRole.Engineer)
        {
            engineerId = session.UserId;
        }

        var rows = await _kpi.ListAssignmentsAsync(session.TenantId, engineerId, periodKey, cancellationToken);
        return rows.Select(MapAssignment).ToList();
    }

    public async Task<KpiAssignmentDto> CreateAssignmentAsync(
        LotrisSession session,
        CreateKpiAssignmentRequest request,
        CancellationToken cancellationToken = default)
    {
        RequireRole(session, AssignmentLeadRoles);
        await RequireDefinitionAsync(session.TenantId, request.KpiDefinitionId, cancellationToken);

        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;
        await _kpi.CreateAssignmentAsync(new KpiAssignmentEntity
        {
            Id = id,
            TenantId = session.TenantId,
            EngineerId = request.EngineerId,
            KpiDefinitionId = request.KpiDefinitionId,
            PeriodKey = request.PeriodKey,
            MeasurementPeriod = request.MeasurementPeriod,
            TargetOverride = request.TargetOverride,
            AssignedBy = session.UserId,
            CreatedAt = now,
        }, cancellationToken);

        var row = await _kpi.GetAssignmentAsync(id, cancellationToken)
            ?? throw new NotFoundException("KPI assignment not found");
        return MapAssignment(row);
    }

    public async Task<IReadOnlyList<KpiAgreementDto>> ListAgreementsAsync(
        LotrisSession session,
        Guid? engineerId,
        string? periodKey,
        CancellationToken cancellationToken = default)
    {
        if (session.Role == UserRole.Engineer)
        {
            engineerId = session.UserId;
        }

        var rows = await _kpi.ListAgreementsAsync(session.TenantId, engineerId, periodKey, cancellationToken);
        return rows.Select(MapAgreement).ToList();
    }

    public async Task<KpiAgreementDetailDto> GetAgreementWithAreasAsync(
        LotrisSession session,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var agreement = await RequireAgreementAsync(session, id, cancellationToken);
        var areas = await _kpi.GetAgreementAreasAsync(id, cancellationToken);
        var areasWithMetrics = new List<KpiAgreementAreaDto>();

        foreach (var area in areas)
        {
            var metrics = await _kpi.GetAreaMetricsAsync(area.Id, cancellationToken);
            areasWithMetrics.Add(MapArea(area, metrics));
        }

        return MapAgreementDetail(agreement, areasWithMetrics);
    }

    public async Task<KpiAgreementDto> CreateAgreementAsync(
        LotrisSession session,
        CreateKpiAgreementRequest request,
        CancellationToken cancellationToken = default)
    {
        RequireRole(session, AssignmentLeadRoles);

        var existing = await _kpi.FindAgreementByEngineerPeriodAsync(
            session.TenantId,
            request.EngineerId,
            request.PeriodKey,
            cancellationToken);
        if (existing is not null)
        {
            throw new BadRequestException(
                $"Agreement already exists for engineer {request.EngineerId} in period {request.PeriodKey}");
        }

        var now = DateTime.UtcNow;
        var id = Guid.NewGuid();
        await _kpi.CreateAgreementAsync(new KpiAgreementEntity
        {
            Id = id,
            TenantId = session.TenantId,
            EngineerId = request.EngineerId,
            LeadId = session.UserId,
            PeriodKey = request.PeriodKey,
            Status = "DRAFT",
            CreatedAt = now,
            UpdatedAt = now,
        }, cancellationToken);

        var agreement = await RequireAgreementAsync(session, id, cancellationToken);
        return MapAgreement(agreement);
    }

    public async Task<KpiAgreementDetailDto> UpsertAgreementAreasAsync(
        LotrisSession session,
        Guid agreementId,
        UpsertAgreementAreasRequest request,
        CancellationToken cancellationToken = default)
    {
        var agreement = await RequireAgreementAsync(session, agreementId, cancellationToken);
        if (agreement.Status != "DRAFT")
        {
            throw new BadRequestException("Areas can only be edited while agreement is in DRAFT status");
        }

        var totalWeight = request.Areas.Sum(a => a.Weight);
        if (Math.Abs(totalWeight - 100m) > 0.01m)
        {
            throw new BadRequestException($"Area weights must total 100 (got {totalWeight})");
        }

        await _kpi.DeleteAgreementAreasAsync(agreementId, cancellationToken);

        for (var i = 0; i < request.Areas.Count; i++)
        {
            var areaDto = request.Areas[i];
            var areaId = Guid.NewGuid();
            await _kpi.CreateAgreementAreaAsync(new KpiAgreementAreaEntity
            {
                Id = areaId,
                TenantId = session.TenantId,
                AgreementId = agreementId,
                Name = areaDto.Name,
                Weight = areaDto.Weight,
                SortOrder = areaDto.SortOrder ?? i,
            }, cancellationToken);

            for (var j = 0; j < areaDto.Metrics.Count; j++)
            {
                var metric = areaDto.Metrics[j];
                await _kpi.CreateAgreementMetricAsync(new KpiAgreementMetricEntity
                {
                    Id = Guid.NewGuid(),
                    TenantId = session.TenantId,
                    AreaId = areaId,
                    KpiDefinitionId = metric.KpiDefinitionId,
                    Description = metric.Description,
                    MeasurementPeriod = metric.MeasurementPeriod,
                    Weight = metric.Weight,
                    TargetScore = metric.TargetScore,
                    ActualScore = null,
                    SortOrder = metric.SortOrder ?? j,
                }, cancellationToken);
            }
        }

        await _kpi.UpdateAgreementAsync(agreementId, new Dictionary<string, object?>
        {
            ["updated_at"] = DateTime.UtcNow,
        }, cancellationToken);

        return await GetAgreementWithAreasAsync(session, agreementId, cancellationToken);
    }

    public async Task<KpiAgreementDto> SubmitAgreementAsync(
        LotrisSession session,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        RequireRole(session, AssignmentLeadRoles);
        var agreement = await RequireAgreementAsync(session, id, cancellationToken);
        if (agreement.Status != "DRAFT")
        {
            throw new BadRequestException("Only DRAFT agreements can be submitted");
        }

        var now = DateTime.UtcNow;
        await _kpi.UpdateAgreementAsync(id, new Dictionary<string, object?>
        {
            ["status"] = "PENDING_REVIEW",
            ["submitted_at"] = now,
            ["updated_at"] = now,
        }, cancellationToken);

        agreement = await RequireAgreementAsync(session, id, cancellationToken);
        return MapAgreement(agreement);
    }

    public async Task<KpiAgreementDto> AcceptAgreementAsync(
        LotrisSession session,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var agreement = await RequireAgreementAsync(session, id, cancellationToken);
        if (agreement.Status != "PENDING_REVIEW")
        {
            throw new BadRequestException("Only PENDING_REVIEW agreements can be accepted");
        }

        if (agreement.EngineerId != session.UserId)
        {
            throw new ForbiddenException("Only the named engineer can accept this agreement");
        }

        var now = DateTime.UtcNow;
        await _kpi.UpdateAgreementAsync(id, new Dictionary<string, object?>
        {
            ["status"] = "ACTIVE",
            ["accepted_at"] = now,
            ["updated_at"] = now,
        }, cancellationToken);

        agreement = await RequireAgreementAsync(session, id, cancellationToken);
        return MapAgreement(agreement);
    }

    public async Task<IReadOnlyList<KpiActualDto>> ListActualsAsync(
        LotrisSession session,
        Guid? engineerId,
        Guid? metricId,
        CancellationToken cancellationToken = default)
    {
        if (session.Role == UserRole.Engineer)
        {
            engineerId = session.UserId;
        }

        var rows = await _kpi.ListActualsAsync(session.TenantId, engineerId, metricId, cancellationToken);
        return rows.Select(MapActual).ToList();
    }

    public async Task<KpiActualDto> CreateActualAsync(
        LotrisSession session,
        CreateActualRequest request,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var id = Guid.NewGuid();
        await _kpi.CreateActualAsync(new KpiActualEntity
        {
            Id = id,
            TenantId = session.TenantId,
            EngineerId = session.UserId,
            MetricId = request.MetricId,
            KpiDefinitionId = request.KpiDefinitionId,
            Value = request.Value,
            Source = "MANUAL",
            SourceRefId = null,
            Note = request.Note,
            RecordedAt = request.RecordedAt ?? now,
        }, cancellationToken);

        var row = await _kpi.GetActualAsync(id, cancellationToken)
            ?? throw new NotFoundException("KPI actual not found");
        return MapActual(row);
    }

    public async Task<KpiResultDto> ComputeScoreAsync(
        LotrisSession session,
        Guid agreementId,
        CancellationToken cancellationToken = default)
    {
        var agreement = await RequireAgreementAsync(session, agreementId, cancellationToken);
        var areas = await _kpi.GetAgreementAreasAsync(agreementId, cancellationToken);

        var scoringAreas = new List<ScoringAreaInput>();
        foreach (var area in areas)
        {
            var metrics = await _kpi.GetAreaMetricsAsync(area.Id, cancellationToken);
            scoringAreas.Add(new ScoringAreaInput(
                area.Id,
                area.Name,
                area.Weight,
                metrics.Select(m => new ScoringMetricInput(
                    m.Weight,
                    m.ActualScore ?? 0m,
                    m.TargetScore)).ToList()));
        }

        var result = KpiScoringEngine.Compute(scoringAreas);
        var areaScoresJson = JsonSerializer.Serialize(result.AreaScores.Select(a => new
        {
            areaId = a.AreaId,
            areaName = a.AreaName,
            score = a.Score,
            weight = a.Weight,
        }));

        var now = DateTime.UtcNow;
        var existing = await _kpi.GetResultByAgreementAsync(agreementId, cancellationToken);
        var entity = new KpiResultEntity
        {
            Id = existing?.Id ?? Guid.NewGuid(),
            TenantId = agreement.TenantId,
            EngineerId = agreement.EngineerId,
            AgreementId = agreementId,
            PeriodKey = agreement.PeriodKey,
            AreaScoresJson = areaScoresJson,
            OverallScore = result.OverallScore,
            ComputedAt = now,
        };

        await _kpi.UpsertResultAsync(entity, cancellationToken);
        return MapResult(entity);
    }

    public async Task<KpiResultDto?> GetResultAsync(
        LotrisSession session,
        Guid agreementId,
        CancellationToken cancellationToken = default)
    {
        await RequireAgreementAsync(session, agreementId, cancellationToken);
        var row = await _kpi.GetResultByAgreementAsync(agreementId, cancellationToken);
        return row is null ? null : MapResult(row);
    }

    public async Task IngestTicketResolveAsync(
        Guid tenantId,
        Guid engineerId,
        Guid ticketId,
        Guid? kpiDefinitionId,
        CancellationToken cancellationToken = default)
    {
        if (!kpiDefinitionId.HasValue)
        {
            return;
        }

        var metric = await FindActiveMetricAsync(tenantId, engineerId, kpiDefinitionId.Value, cancellationToken);
        if (metric is null)
        {
            return;
        }

        await _kpi.CreateActualAsync(new KpiActualEntity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            EngineerId = engineerId,
            MetricId = metric.Id,
            KpiDefinitionId = kpiDefinitionId,
            Value = 1m,
            Source = "TICKET_RESOLVE",
            SourceRefId = ticketId,
            Note = null,
            RecordedAt = DateTime.UtcNow,
        }, cancellationToken);

        await UpdateMetricActualScoreAsync(metric.Id, cancellationToken);
    }

    public async Task IngestTaskCompleteAsync(
        Guid tenantId,
        Guid engineerId,
        Guid taskId,
        Guid? kpiDefinitionId,
        CancellationToken cancellationToken = default)
    {
        if (!kpiDefinitionId.HasValue)
        {
            return;
        }

        var metric = await FindActiveMetricAsync(tenantId, engineerId, kpiDefinitionId.Value, cancellationToken);
        if (metric is null)
        {
            return;
        }

        await _kpi.CreateActualAsync(new KpiActualEntity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            EngineerId = engineerId,
            MetricId = metric.Id,
            KpiDefinitionId = kpiDefinitionId,
            Value = 1m,
            Source = "TASK_COMPLETE",
            SourceRefId = taskId,
            Note = null,
            RecordedAt = DateTime.UtcNow,
        }, cancellationToken);

        await UpdateMetricActualScoreAsync(metric.Id, cancellationToken);
    }

    internal async Task<KpiAgreementEntity> RequireAgreementForImportAsync(
        LotrisSession session,
        Guid id,
        CancellationToken cancellationToken = default) =>
        await RequireAgreementAsync(session, id, cancellationToken);

    private async Task<KpiAgreementMetricEntity?> FindActiveMetricAsync(
        Guid tenantId,
        Guid engineerId,
        Guid kpiDefinitionId,
        CancellationToken cancellationToken)
    {
        var agreement = await _kpi.FindActiveAgreementForEngineerAsync(tenantId, engineerId, cancellationToken);
        if (agreement is null)
        {
            return null;
        }

        return await _kpi.FindActiveMetricForDefinitionAsync(agreement.Id, kpiDefinitionId, cancellationToken);
    }

    private async Task UpdateMetricActualScoreAsync(Guid metricId, CancellationToken cancellationToken)
    {
        var total = await _kpi.SumActualsForMetricAsync(metricId, cancellationToken);
        await _kpi.UpdateMetricActualScoreAsync(metricId, total, cancellationToken);
    }

    private async Task<KpiDefinitionEntity> RequireDefinitionAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var row = await _kpi.GetDefinitionAsync(tenantId, id, cancellationToken);
        if (row is null)
        {
            throw new NotFoundException("KPI definition not found");
        }

        return row;
    }

    private async Task<KpiAgreementEntity> RequireAgreementAsync(
        LotrisSession session,
        Guid id,
        CancellationToken cancellationToken)
    {
        var agreement = await _kpi.GetAgreementAsync(session.TenantId, id, cancellationToken);
        if (agreement is null)
        {
            throw new NotFoundException("KPI agreement not found");
        }

        if (session.Role == UserRole.Engineer && agreement.EngineerId != session.UserId)
        {
            throw new ForbiddenException("Access denied");
        }

        return agreement;
    }

    private static void RequireRole(LotrisSession session, UserRole[] roles)
    {
        if (!roles.Contains(session.Role))
        {
            throw new ForbiddenException($"Requires one of: {string.Join(", ", roles.Select(r => r.ToRoleName()))}");
        }
    }

    private static async Task<IReadOnlyList<KpiDefinitionDto>> MapDefinitionsAsync(
        Task<IReadOnlyList<KpiDefinitionEntity>> task)
    {
        var rows = await task;
        return rows.Select(MapDefinition).ToList();
    }

    private static KpiDefinitionDto MapDefinition(KpiDefinitionEntity row) => new(
        row.Id,
        row.TenantId,
        row.Name,
        row.Description,
        row.MetricType,
        row.Direction,
        row.Scope,
        row.DefaultTarget,
        row.Weight,
        row.Status,
        row.CreatedAt,
        row.UpdatedAt);

    private static KpiTeamTargetDto MapTeamTarget(KpiTeamTargetEntity row) => new(
        row.Id,
        row.TenantId,
        row.KpiDefinitionId,
        row.TeamId,
        row.TargetValue);

    private static KpiAssignmentDto MapAssignment(KpiAssignmentEntity row) => new(
        row.Id,
        row.TenantId,
        row.EngineerId,
        row.KpiDefinitionId,
        row.PeriodKey,
        row.MeasurementPeriod,
        row.TargetOverride,
        row.AssignedBy,
        row.CreatedAt);

    private static KpiAgreementDto MapAgreement(KpiAgreementEntity row) => new(
        row.Id,
        row.TenantId,
        row.EngineerId,
        row.LeadId,
        row.PeriodKey,
        row.Status,
        row.SubmittedAt,
        row.AcceptedAt,
        row.ClosedAt,
        row.CreatedAt,
        row.UpdatedAt);

    private static KpiAgreementDetailDto MapAgreementDetail(
        KpiAgreementEntity agreement,
        IReadOnlyList<KpiAgreementAreaDto> areas) => new(
        agreement.Id,
        agreement.TenantId,
        agreement.EngineerId,
        agreement.LeadId,
        agreement.PeriodKey,
        agreement.Status,
        agreement.SubmittedAt,
        agreement.AcceptedAt,
        agreement.ClosedAt,
        agreement.CreatedAt,
        agreement.UpdatedAt,
        areas);

    private static KpiAgreementAreaDto MapArea(
        KpiAgreementAreaEntity area,
        IReadOnlyList<KpiAgreementMetricEntity> metrics) => new(
        area.Id,
        area.TenantId,
        area.AgreementId,
        area.Name,
        area.Weight,
        area.SortOrder,
        metrics.Select(MapMetric).ToList());

    private static KpiAgreementMetricDto MapMetric(KpiAgreementMetricEntity row) => new(
        row.Id,
        row.TenantId,
        row.AreaId,
        row.KpiDefinitionId,
        row.Description,
        row.MeasurementPeriod,
        row.Weight,
        row.TargetScore,
        row.ActualScore,
        row.SortOrder);

    private static KpiActualDto MapActual(KpiActualEntity row) => new(
        row.Id,
        row.TenantId,
        row.EngineerId,
        row.MetricId,
        row.KpiDefinitionId,
        row.Value,
        row.Source,
        row.SourceRefId,
        row.Note,
        row.RecordedAt);

    private static KpiResultDto MapResult(KpiResultEntity row) => new(
        row.Id,
        row.TenantId,
        row.EngineerId,
        row.AgreementId,
        row.PeriodKey,
        row.AreaScoresJson,
        row.OverallScore,
        row.ComputedAt);
}
