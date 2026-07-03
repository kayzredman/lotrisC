using Dapper;
using Lotris.Application.Kpi;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Kpi;

public sealed class DapperKpiRepository : IKpiRepository
{
    private readonly ISqlConnectionFactory _connections;

    public DapperKpiRepository(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<IReadOnlyList<KpiDefinitionEntity>> ListDefinitionsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, name AS Name, description AS Description,
                   metric_type AS MetricType, direction AS Direction, scope AS Scope,
                   default_target AS DefaultTarget, weight AS Weight, status AS Status,
                   created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM dbo.KPI_Definitions
            WHERE tenant_id = @TenantId
            ORDER BY name
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<KpiDefinitionEntity>(new CommandDefinition(
            sql,
            new { TenantId = SqlGuid.ToSql(tenantId) },
            cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<KpiDefinitionEntity?> GetDefinitionAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, name AS Name, description AS Description,
                   metric_type AS MetricType, direction AS Direction, scope AS Scope,
                   default_target AS DefaultTarget, weight AS Weight, status AS Status,
                   created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM dbo.KPI_Definitions
            WHERE id = @Id AND tenant_id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<KpiDefinitionEntity>(new CommandDefinition(
            sql,
            new { Id = SqlGuid.ToSql(id), TenantId = SqlGuid.ToSql(tenantId) },
            cancellationToken: cancellationToken));
    }

    public async Task CreateDefinitionAsync(KpiDefinitionEntity definition, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.KPI_Definitions
                (id, tenant_id, name, description, metric_type, direction, scope,
                 default_target, weight, status, created_at, updated_at)
            VALUES
                (@Id, @TenantId, @Name, @Description, @MetricType, @Direction, @Scope,
                 @DefaultTarget, @Weight, @Status, @CreatedAt, @UpdatedAt)
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, MapDefinitionParams(definition), cancellationToken: cancellationToken));
    }

    public async Task UpdateDefinitionAsync(
        Guid id,
        IReadOnlyDictionary<string, object?> updates,
        CancellationToken cancellationToken = default)
    {
        var sets = updates.Keys.Select(k => $"{k} = @{k}").ToList();
        var sql = $"UPDATE dbo.KPI_Definitions SET {string.Join(", ", sets)} WHERE id = @Id";

        var parameters = new DynamicParameters(updates);
        parameters.Add("Id", SqlGuid.ToSql(id));

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
    }

    public async Task ArchiveDefinitionAsync(Guid id, DateTime updatedAt, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.KPI_Definitions
            SET status = 'ARCHIVED', updated_at = @UpdatedAt
            WHERE id = @Id
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(id),
            UpdatedAt = updatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<KpiTeamTargetEntity>> GetTeamTargetsAsync(
        Guid tenantId,
        Guid kpiDefinitionId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, kpi_definition_id AS KpiDefinitionId,
                   team_id AS TeamId, target_value AS TargetValue
            FROM dbo.KPI_Team_Targets
            WHERE tenant_id = @TenantId AND kpi_definition_id = @KpiDefinitionId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<KpiTeamTargetEntity>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            KpiDefinitionId = SqlGuid.ToSql(kpiDefinitionId),
        }, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task UpsertTeamTargetAsync(KpiTeamTargetEntity target, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.KPI_Team_Targets
                (id, tenant_id, kpi_definition_id, team_id, target_value)
            VALUES
                (@Id, @TenantId, @KpiDefinitionId, @TeamId, @TargetValue)
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(target.Id),
            TenantId = SqlGuid.ToSql(target.TenantId),
            KpiDefinitionId = SqlGuid.ToSql(target.KpiDefinitionId),
            TeamId = SqlGuid.ToSql(target.TeamId),
            TargetValue = target.TargetValue,
        }, cancellationToken: cancellationToken));
    }

    public async Task DeleteTeamTargetAsync(Guid kpiDefinitionId, Guid teamId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            DELETE FROM dbo.KPI_Team_Targets
            WHERE kpi_definition_id = @KpiDefinitionId AND team_id = @TeamId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            KpiDefinitionId = SqlGuid.ToSql(kpiDefinitionId),
            TeamId = SqlGuid.ToSql(teamId),
        }, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<KpiAssignmentEntity>> ListAssignmentsAsync(
        Guid tenantId,
        Guid? engineerId,
        string? periodKey,
        CancellationToken cancellationToken = default)
    {
        var sql = """
            SELECT id AS Id, tenant_id AS TenantId, engineer_id AS EngineerId,
                   kpi_definition_id AS KpiDefinitionId, period_key AS PeriodKey,
                   measurement_period AS MeasurementPeriod, target_override AS TargetOverride,
                   assigned_by AS AssignedBy, created_at AS CreatedAt
            FROM dbo.KPI_Engineer_Assignments
            WHERE tenant_id = @TenantId
            """;

        var parameters = new DynamicParameters();
        parameters.Add("TenantId", SqlGuid.ToSql(tenantId));
        if (engineerId.HasValue)
        {
            sql += " AND engineer_id = @EngineerId";
            parameters.Add("EngineerId", SqlGuid.ToSql(engineerId.Value));
        }

        if (!string.IsNullOrWhiteSpace(periodKey))
        {
            sql += " AND period_key = @PeriodKey";
            parameters.Add("PeriodKey", periodKey);
        }

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<KpiAssignmentEntity>(new CommandDefinition(
            sql,
            parameters,
            cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task CreateAssignmentAsync(KpiAssignmentEntity assignment, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.KPI_Engineer_Assignments
                (id, tenant_id, engineer_id, kpi_definition_id, period_key,
                 measurement_period, target_override, assigned_by, created_at)
            VALUES
                (@Id, @TenantId, @EngineerId, @KpiDefinitionId, @PeriodKey,
                 @MeasurementPeriod, @TargetOverride, @AssignedBy, @CreatedAt)
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(assignment.Id),
            TenantId = SqlGuid.ToSql(assignment.TenantId),
            EngineerId = SqlGuid.ToSql(assignment.EngineerId),
            KpiDefinitionId = SqlGuid.ToSql(assignment.KpiDefinitionId),
            PeriodKey = assignment.PeriodKey,
            MeasurementPeriod = assignment.MeasurementPeriod,
            TargetOverride = assignment.TargetOverride,
            AssignedBy = SqlGuid.ToSql(assignment.AssignedBy),
            CreatedAt = assignment.CreatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<KpiAssignmentEntity?> GetAssignmentAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, engineer_id AS EngineerId,
                   kpi_definition_id AS KpiDefinitionId, period_key AS PeriodKey,
                   measurement_period AS MeasurementPeriod, target_override AS TargetOverride,
                   assigned_by AS AssignedBy, created_at AS CreatedAt
            FROM dbo.KPI_Engineer_Assignments
            WHERE id = @Id
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<KpiAssignmentEntity>(new CommandDefinition(
            sql,
            new { Id = SqlGuid.ToSql(id) },
            cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<KpiAgreementEntity>> ListAgreementsAsync(
        Guid tenantId,
        Guid? engineerId,
        string? periodKey,
        CancellationToken cancellationToken = default)
    {
        var sql = """
            SELECT id AS Id, tenant_id AS TenantId, engineer_id AS EngineerId, lead_id AS LeadId,
                   period_key AS PeriodKey, status AS Status, submitted_at AS SubmittedAt,
                   accepted_at AS AcceptedAt, closed_at AS ClosedAt,
                   created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM dbo.KPI_Agreements
            WHERE tenant_id = @TenantId
            """;

        var parameters = new DynamicParameters();
        parameters.Add("TenantId", SqlGuid.ToSql(tenantId));
        if (engineerId.HasValue)
        {
            sql += " AND engineer_id = @EngineerId";
            parameters.Add("EngineerId", SqlGuid.ToSql(engineerId.Value));
        }

        if (!string.IsNullOrWhiteSpace(periodKey))
        {
            sql += " AND period_key = @PeriodKey";
            parameters.Add("PeriodKey", periodKey);
        }

        sql += " ORDER BY period_key";

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<KpiAgreementEntity>(new CommandDefinition(
            sql,
            parameters,
            cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<KpiAgreementEntity?> GetAgreementAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, engineer_id AS EngineerId, lead_id AS LeadId,
                   period_key AS PeriodKey, status AS Status, submitted_at AS SubmittedAt,
                   accepted_at AS AcceptedAt, closed_at AS ClosedAt,
                   created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM dbo.KPI_Agreements
            WHERE id = @Id AND tenant_id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<KpiAgreementEntity>(new CommandDefinition(
            sql,
            new { Id = SqlGuid.ToSql(id), TenantId = SqlGuid.ToSql(tenantId) },
            cancellationToken: cancellationToken));
    }

    public async Task<KpiAgreementEntity?> FindAgreementByEngineerPeriodAsync(
        Guid tenantId,
        Guid engineerId,
        string periodKey,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT TOP 1 id AS Id, tenant_id AS TenantId, engineer_id AS EngineerId, lead_id AS LeadId,
                   period_key AS PeriodKey, status AS Status, submitted_at AS SubmittedAt,
                   accepted_at AS AcceptedAt, closed_at AS ClosedAt,
                   created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM dbo.KPI_Agreements
            WHERE tenant_id = @TenantId AND engineer_id = @EngineerId AND period_key = @PeriodKey
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<KpiAgreementEntity>(new CommandDefinition(
            sql,
            new
            {
                TenantId = SqlGuid.ToSql(tenantId),
                EngineerId = SqlGuid.ToSql(engineerId),
                PeriodKey = periodKey,
            },
            cancellationToken: cancellationToken));
    }

    public async Task CreateAgreementAsync(KpiAgreementEntity agreement, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.KPI_Agreements
                (id, tenant_id, engineer_id, lead_id, period_key, status,
                 submitted_at, accepted_at, closed_at, created_at, updated_at)
            VALUES
                (@Id, @TenantId, @EngineerId, @LeadId, @PeriodKey, @Status,
                 @SubmittedAt, @AcceptedAt, @ClosedAt, @CreatedAt, @UpdatedAt)
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, MapAgreementParams(agreement), cancellationToken: cancellationToken));
    }

    public async Task UpdateAgreementAsync(
        Guid id,
        IReadOnlyDictionary<string, object?> updates,
        CancellationToken cancellationToken = default)
    {
        var sets = updates.Keys.Select(k => $"{k} = @{k}").ToList();
        var sql = $"UPDATE dbo.KPI_Agreements SET {string.Join(", ", sets)} WHERE id = @Id";

        var parameters = new DynamicParameters(updates);
        parameters.Add("Id", SqlGuid.ToSql(id));

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<KpiAgreementAreaEntity>> GetAgreementAreasAsync(
        Guid agreementId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, agreement_id AS AgreementId,
                   name AS Name, weight AS Weight, sort_order AS SortOrder
            FROM dbo.KPI_Agreement_Areas
            WHERE agreement_id = @AgreementId
            ORDER BY sort_order
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<KpiAgreementAreaEntity>(new CommandDefinition(
            sql,
            new { AgreementId = SqlGuid.ToSql(agreementId) },
            cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<KpiAgreementMetricEntity>> GetAreaMetricsAsync(
        Guid areaId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, area_id AS AreaId,
                   kpi_definition_id AS KpiDefinitionId, description AS Description,
                   measurement_period AS MeasurementPeriod, weight AS Weight,
                   target_score AS TargetScore, actual_score AS ActualScore, sort_order AS SortOrder
            FROM dbo.KPI_Agreement_Metrics
            WHERE area_id = @AreaId
            ORDER BY sort_order
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<KpiAgreementMetricEntity>(new CommandDefinition(
            sql,
            new { AreaId = SqlGuid.ToSql(areaId) },
            cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task DeleteAgreementAreasAsync(Guid agreementId, CancellationToken cancellationToken = default)
    {
        const string deleteMetrics = """
            DELETE m FROM dbo.KPI_Agreement_Metrics m
            INNER JOIN dbo.KPI_Agreement_Areas a ON m.area_id = a.id
            WHERE a.agreement_id = @AgreementId
            """;

        const string deleteAreas = """
            DELETE FROM dbo.KPI_Agreement_Areas WHERE agreement_id = @AgreementId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var param = new { AgreementId = SqlGuid.ToSql(agreementId) };
        await connection.ExecuteAsync(new CommandDefinition(deleteMetrics, param, cancellationToken: cancellationToken));
        await connection.ExecuteAsync(new CommandDefinition(deleteAreas, param, cancellationToken: cancellationToken));
    }

    public async Task CreateAgreementAreaAsync(KpiAgreementAreaEntity area, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.KPI_Agreement_Areas
                (id, tenant_id, agreement_id, name, weight, sort_order)
            VALUES
                (@Id, @TenantId, @AgreementId, @Name, @Weight, @SortOrder)
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(area.Id),
            TenantId = SqlGuid.ToSql(area.TenantId),
            AgreementId = SqlGuid.ToSql(area.AgreementId),
            Name = area.Name,
            Weight = area.Weight,
            SortOrder = area.SortOrder,
        }, cancellationToken: cancellationToken));
    }

    public async Task CreateAgreementMetricAsync(KpiAgreementMetricEntity metric, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.KPI_Agreement_Metrics
                (id, tenant_id, area_id, kpi_definition_id, description, measurement_period,
                 weight, target_score, actual_score, sort_order)
            VALUES
                (@Id, @TenantId, @AreaId, @KpiDefinitionId, @Description, @MeasurementPeriod,
                 @Weight, @TargetScore, @ActualScore, @SortOrder)
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(metric.Id),
            TenantId = SqlGuid.ToSql(metric.TenantId),
            AreaId = SqlGuid.ToSql(metric.AreaId),
            KpiDefinitionId = metric.KpiDefinitionId.HasValue ? SqlGuid.ToSql(metric.KpiDefinitionId.Value) : null,
            Description = metric.Description,
            MeasurementPeriod = metric.MeasurementPeriod,
            Weight = metric.Weight,
            TargetScore = metric.TargetScore,
            ActualScore = metric.ActualScore,
            SortOrder = metric.SortOrder,
        }, cancellationToken: cancellationToken));
    }

    public async Task<KpiAgreementAreaEntity?> GetFirstAgreementAreaAsync(
        Guid agreementId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT TOP 1 id AS Id, tenant_id AS TenantId, agreement_id AS AgreementId,
                   name AS Name, weight AS Weight, sort_order AS SortOrder
            FROM dbo.KPI_Agreement_Areas
            WHERE agreement_id = @AgreementId
            ORDER BY sort_order
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<KpiAgreementAreaEntity>(new CommandDefinition(
            sql,
            new { AgreementId = SqlGuid.ToSql(agreementId) },
            cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<KpiActualEntity>> ListActualsAsync(
        Guid tenantId,
        Guid? engineerId,
        Guid? metricId,
        CancellationToken cancellationToken = default)
    {
        var sql = """
            SELECT id AS Id, tenant_id AS TenantId, engineer_id AS EngineerId, metric_id AS MetricId,
                   kpi_definition_id AS KpiDefinitionId, value AS Value, source AS Source,
                   source_ref_id AS SourceRefId, note AS Note, recorded_at AS RecordedAt
            FROM dbo.KPI_Actuals
            WHERE tenant_id = @TenantId
            """;

        var parameters = new DynamicParameters();
        parameters.Add("TenantId", SqlGuid.ToSql(tenantId));
        if (engineerId.HasValue)
        {
            sql += " AND engineer_id = @EngineerId";
            parameters.Add("EngineerId", SqlGuid.ToSql(engineerId.Value));
        }

        if (metricId.HasValue)
        {
            sql += " AND metric_id = @MetricId";
            parameters.Add("MetricId", SqlGuid.ToSql(metricId.Value));
        }

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<KpiActualEntity>(new CommandDefinition(
            sql,
            parameters,
            cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task CreateActualAsync(KpiActualEntity actual, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.KPI_Actuals
                (id, tenant_id, engineer_id, metric_id, kpi_definition_id, value,
                 source, source_ref_id, note, recorded_at)
            VALUES
                (@Id, @TenantId, @EngineerId, @MetricId, @KpiDefinitionId, @Value,
                 @Source, @SourceRefId, @Note, @RecordedAt)
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(actual.Id),
            TenantId = SqlGuid.ToSql(actual.TenantId),
            EngineerId = SqlGuid.ToSql(actual.EngineerId),
            MetricId = SqlGuid.ToSql(actual.MetricId),
            KpiDefinitionId = actual.KpiDefinitionId.HasValue ? SqlGuid.ToSql(actual.KpiDefinitionId.Value) : null,
            Value = actual.Value,
            Source = actual.Source,
            SourceRefId = actual.SourceRefId.HasValue ? SqlGuid.ToSql(actual.SourceRefId.Value) : null,
            Note = actual.Note,
            RecordedAt = actual.RecordedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<KpiActualEntity?> GetActualAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, engineer_id AS EngineerId, metric_id AS MetricId,
                   kpi_definition_id AS KpiDefinitionId, value AS Value, source AS Source,
                   source_ref_id AS SourceRefId, note AS Note, recorded_at AS RecordedAt
            FROM dbo.KPI_Actuals
            WHERE id = @Id
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<KpiActualEntity>(new CommandDefinition(
            sql,
            new { Id = SqlGuid.ToSql(id) },
            cancellationToken: cancellationToken));
    }

    public async Task<decimal> SumActualsForMetricAsync(Guid metricId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT ISNULL(SUM(CAST(value AS DECIMAL(10,2))), 0)
            FROM dbo.KPI_Actuals
            WHERE metric_id = @MetricId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<decimal>(new CommandDefinition(
            sql,
            new { MetricId = SqlGuid.ToSql(metricId) },
            cancellationToken: cancellationToken));
    }

    public async Task UpdateMetricActualScoreAsync(
        Guid metricId,
        decimal actualScore,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.KPI_Agreement_Metrics
            SET actual_score = @ActualScore
            WHERE id = @MetricId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            MetricId = SqlGuid.ToSql(metricId),
            ActualScore = actualScore,
        }, cancellationToken: cancellationToken));
    }

    public async Task<KpiResultEntity?> GetResultByAgreementAsync(
        Guid agreementId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, engineer_id AS EngineerId,
                   agreement_id AS AgreementId, period_key AS PeriodKey,
                   area_scores_json AS AreaScoresJson, overall_score AS OverallScore,
                   computed_at AS ComputedAt
            FROM dbo.KPI_Results
            WHERE agreement_id = @AgreementId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<KpiResultEntity>(new CommandDefinition(
            sql,
            new { AgreementId = SqlGuid.ToSql(agreementId) },
            cancellationToken: cancellationToken));
    }

    public async Task UpsertResultAsync(KpiResultEntity result, CancellationToken cancellationToken = default)
    {
        const string updateSql = """
            UPDATE dbo.KPI_Results
            SET overall_score = @OverallScore, area_scores_json = @AreaScoresJson, computed_at = @ComputedAt
            WHERE agreement_id = @AgreementId
            """;

        const string insertSql = """
            INSERT INTO dbo.KPI_Results
                (id, tenant_id, engineer_id, agreement_id, period_key,
                 area_scores_json, overall_score, computed_at)
            VALUES
                (@Id, @TenantId, @EngineerId, @AgreementId, @PeriodKey,
                 @AreaScoresJson, @OverallScore, @ComputedAt)
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var existing = await GetResultByAgreementAsync(result.AgreementId, cancellationToken);
        var parameters = new
        {
            Id = SqlGuid.ToSql(result.Id),
            TenantId = SqlGuid.ToSql(result.TenantId),
            EngineerId = SqlGuid.ToSql(result.EngineerId),
            AgreementId = SqlGuid.ToSql(result.AgreementId),
            PeriodKey = result.PeriodKey,
            AreaScoresJson = result.AreaScoresJson,
            OverallScore = result.OverallScore,
            ComputedAt = result.ComputedAt,
        };

        if (existing is not null)
        {
            await connection.ExecuteAsync(new CommandDefinition(updateSql, parameters, cancellationToken: cancellationToken));
        }
        else
        {
            await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, cancellationToken: cancellationToken));
        }
    }

    public async Task<KpiAgreementEntity?> FindActiveAgreementForEngineerAsync(
        Guid tenantId,
        Guid engineerId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT TOP 1 id AS Id, tenant_id AS TenantId, engineer_id AS EngineerId, lead_id AS LeadId,
                   period_key AS PeriodKey, status AS Status, submitted_at AS SubmittedAt,
                   accepted_at AS AcceptedAt, closed_at AS ClosedAt,
                   created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM dbo.KPI_Agreements
            WHERE tenant_id = @TenantId AND engineer_id = @EngineerId AND status = 'ACTIVE'
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<KpiAgreementEntity>(new CommandDefinition(
            sql,
            new
            {
                TenantId = SqlGuid.ToSql(tenantId),
                EngineerId = SqlGuid.ToSql(engineerId),
            },
            cancellationToken: cancellationToken));
    }

    public async Task<KpiAgreementMetricEntity?> FindActiveMetricForDefinitionAsync(
        Guid agreementId,
        Guid kpiDefinitionId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT TOP 1 m.id AS Id, m.tenant_id AS TenantId, m.area_id AS AreaId,
                   m.kpi_definition_id AS KpiDefinitionId, m.description AS Description,
                   m.measurement_period AS MeasurementPeriod, m.weight AS Weight,
                   m.target_score AS TargetScore, m.actual_score AS ActualScore, m.sort_order AS SortOrder
            FROM dbo.KPI_Agreement_Metrics m
            INNER JOIN dbo.KPI_Agreement_Areas a ON m.area_id = a.id
            WHERE a.agreement_id = @AgreementId AND m.kpi_definition_id = @KpiDefinitionId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<KpiAgreementMetricEntity>(new CommandDefinition(
            sql,
            new
            {
                AgreementId = SqlGuid.ToSql(agreementId),
                KpiDefinitionId = SqlGuid.ToSql(kpiDefinitionId),
            },
            cancellationToken: cancellationToken));
    }

    private static object MapDefinitionParams(KpiDefinitionEntity definition) => new
    {
        Id = SqlGuid.ToSql(definition.Id),
        TenantId = SqlGuid.ToSql(definition.TenantId),
        Name = definition.Name,
        Description = definition.Description,
        MetricType = definition.MetricType,
        Direction = definition.Direction,
        Scope = definition.Scope,
        DefaultTarget = definition.DefaultTarget,
        Weight = definition.Weight,
        Status = definition.Status,
        CreatedAt = definition.CreatedAt,
        UpdatedAt = definition.UpdatedAt,
    };

    private static object MapAgreementParams(KpiAgreementEntity agreement) => new
    {
        Id = SqlGuid.ToSql(agreement.Id),
        TenantId = SqlGuid.ToSql(agreement.TenantId),
        EngineerId = SqlGuid.ToSql(agreement.EngineerId),
        LeadId = SqlGuid.ToSql(agreement.LeadId),
        PeriodKey = agreement.PeriodKey,
        Status = agreement.Status,
        SubmittedAt = agreement.SubmittedAt,
        AcceptedAt = agreement.AcceptedAt,
        ClosedAt = agreement.ClosedAt,
        CreatedAt = agreement.CreatedAt,
        UpdatedAt = agreement.UpdatedAt,
    };
}
