using Dapper;
using Lotris.Application.Queue;
using Lotris.Application.Tickets;
using Lotris.Contracts.Queue;
using Lotris.Domain.Tickets;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Queue;

public sealed class DapperQueueRepository : IQueueRepository
{
    private readonly ISqlConnectionFactory _connections;

    public DapperQueueRepository(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<IReadOnlyList<QueueTicketEntity>> ListQueueAsync(
        Guid tenantId,
        Guid? teamId,
        int page,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var offset = (page - 1) * limit;
        var sql = """
            SELECT
                tk.id, tk.tenant_id AS TenantId, tk.title, tk.description, tk.priority, tk.status,
                tk.team_id AS TeamId, tk.assignee_id AS AssigneeId, tk.created_by AS CreatedBy,
                tk.sla_pickup_deadline AS SlaPickupDeadline, tk.sla_resolution_deadline AS SlaResolutionDeadline,
                tk.sla_pickup_breached AS SlaPickupBreached, tk.sla_resolution_breached AS SlaResolutionBreached,
                tk.assigned_at AS AssignedAt, tk.resolved_at AS ResolvedAt, tk.closed_at AS ClosedAt,
                tk.created_at AS CreatedAt, tk.updated_at AS UpdatedAt,
                t.name AS TeamName
            FROM dbo.Tickets tk
            LEFT JOIN dbo.Teams t ON t.id = tk.team_id
            WHERE tk.tenant_id = @TenantId
              AND tk.status IN ('UNASSIGNED', 'TEAM_ASSIGNED')
            """;

        var parameters = new DynamicParameters();
        parameters.Add("TenantId", SqlGuid.ToSql(tenantId));
        parameters.Add("Offset", offset);
        parameters.Add("Limit", limit);

        if (teamId.HasValue)
        {
            sql += " AND tk.team_id = @TeamId";
            parameters.Add("TeamId", SqlGuid.ToSql(teamId.Value));
        }

        sql += " ORDER BY tk.priority ASC, tk.sla_pickup_deadline ASC OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY";

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<QueueRow>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.Select(MapRow).ToList();
    }

    public async Task<QueueHealthResponse> GetHealthAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        const string statusSql = """
            SELECT status AS Status, team_id AS TeamId, COUNT(1) AS Count
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId
            GROUP BY status, team_id
            """;

        const string pickupSql = """
            SELECT COUNT(1)
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId
              AND sla_pickup_breached = 1
              AND status NOT IN ('RESOLVED', 'CLOSED')
            """;

        const string resolutionSql = """
            SELECT COUNT(1)
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId
              AND sla_resolution_breached = 1
              AND status NOT IN ('RESOLVED', 'CLOSED')
            """;

        const string workloadSql = """
            SELECT assignee_id AS AssigneeId, COUNT(1) AS OpenCount
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId
              AND status IN ('ASSIGNED', 'IN_PROGRESS', 'ESCALATED')
              AND assignee_id IS NOT NULL
            GROUP BY assignee_id
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var tenantParam = new { TenantId = SqlGuid.ToSql(tenantId) };

        var statusCounts = (await connection.QueryAsync<StatusCountRow>(
            new CommandDefinition(statusSql, tenantParam, cancellationToken: cancellationToken)))
            .Select(r => new QueueStatusCount(
                r.Status,
                string.IsNullOrWhiteSpace(r.TeamId) ? null : SqlGuid.FromSql(r.TeamId),
                r.Count))
            .ToList();

        var pickupBreaches = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(pickupSql, tenantParam, cancellationToken: cancellationToken));
        var resolutionBreaches = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(resolutionSql, tenantParam, cancellationToken: cancellationToken));

        var workloads = (await connection.QueryAsync<WorkloadRow>(
            new CommandDefinition(workloadSql, tenantParam, cancellationToken: cancellationToken)))
            .Select(r => new EngineerWorkload(SqlGuid.FromSql(r.AssigneeId), r.OpenCount))
            .ToList();

        return new QueueHealthResponse(statusCounts, pickupBreaches, resolutionBreaches, workloads);
    }

    public async Task<QueueConfigEntity> GetConfigAsync(
        Guid tenantId,
        Guid? teamId = null,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);

        if (teamId.HasValue)
        {
            const string teamSql = """
                SELECT max_capacity_per_engineer AS MaxCapacityPerEngineer,
                       pickup_sla_minutes AS PickupSlaMinutes,
                       resolution_sla_minutes AS ResolutionSlaMinutes,
                       auto_assign_enabled AS AutoAssignEnabled
                FROM dbo.Queue_Config
                WHERE tenant_id = @TenantId AND team_id = @TeamId
                """;

            var teamCfg = await connection.QuerySingleOrDefaultAsync<ConfigRow>(new CommandDefinition(teamSql, new
            {
                TenantId = SqlGuid.ToSql(tenantId),
                TeamId = SqlGuid.ToSql(teamId.Value),
            }, cancellationToken: cancellationToken));

            if (teamCfg is not null)
            {
                return MapConfig(teamCfg);
            }
        }

        const string tenantSql = """
            SELECT max_capacity_per_engineer AS MaxCapacityPerEngineer,
                   pickup_sla_minutes AS PickupSlaMinutes,
                   resolution_sla_minutes AS ResolutionSlaMinutes,
                   auto_assign_enabled AS AutoAssignEnabled
            FROM dbo.Queue_Config
            WHERE tenant_id = @TenantId AND team_id IS NULL
            """;

        var tenantCfg = await connection.QuerySingleOrDefaultAsync<ConfigRow>(new CommandDefinition(tenantSql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));

        return tenantCfg is null
            ? new QueueConfigEntity()
            : MapConfig(tenantCfg);
    }

    public async Task UpsertConfigAsync(QueueConfigUpsert upsert, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var tenantId = SqlGuid.ToSql(upsert.TenantId);
        string? teamId = upsert.TeamId.HasValue ? SqlGuid.ToSql(upsert.TeamId.Value) : null;

        const string selectSql = """
            SELECT id
            FROM dbo.Queue_Config
            WHERE tenant_id = @TenantId
              AND ((@TeamId IS NULL AND team_id IS NULL) OR team_id = @TeamId)
            """;

        var existingId = await connection.ExecuteScalarAsync<string?>(new CommandDefinition(selectSql, new
        {
            TenantId = tenantId,
            TeamId = teamId,
        }, cancellationToken: cancellationToken));

        var now = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(existingId))
        {
            var sets = new List<string> { "updated_at = @UpdatedAt" };
            var parameters = new DynamicParameters();
            parameters.Add("Id", existingId);
            parameters.Add("UpdatedAt", now);

            if (upsert.MaxCapacityPerEngineer.HasValue)
            {
                sets.Add("max_capacity_per_engineer = @MaxCapacityPerEngineer");
                parameters.Add("MaxCapacityPerEngineer", upsert.MaxCapacityPerEngineer.Value);
            }

            if (upsert.PickupSlaMinutes.HasValue)
            {
                sets.Add("pickup_sla_minutes = @PickupSlaMinutes");
                parameters.Add("PickupSlaMinutes", upsert.PickupSlaMinutes.Value);
            }

            if (upsert.ResolutionSlaMinutes.HasValue)
            {
                sets.Add("resolution_sla_minutes = @ResolutionSlaMinutes");
                parameters.Add("ResolutionSlaMinutes", upsert.ResolutionSlaMinutes.Value);
            }

            if (upsert.AutoAssignEnabled.HasValue)
            {
                sets.Add("auto_assign_enabled = @AutoAssignEnabled");
                parameters.Add("AutoAssignEnabled", upsert.AutoAssignEnabled.Value);
            }

            var updateSql = $"UPDATE dbo.Queue_Config SET {string.Join(", ", sets)} WHERE id = @Id";
            await connection.ExecuteAsync(new CommandDefinition(updateSql, parameters, cancellationToken: cancellationToken));
            return;
        }

        const string insertSql = """
            INSERT INTO dbo.Queue_Config (
                id, tenant_id, team_id, max_capacity_per_engineer,
                pickup_sla_minutes, resolution_sla_minutes, auto_assign_enabled,
                created_at, updated_at
            ) VALUES (
                @Id, @TenantId, @TeamId, @MaxCapacityPerEngineer,
                @PickupSlaMinutes, @ResolutionSlaMinutes, @AutoAssignEnabled,
                @CreatedAt, @UpdatedAt
            )
            """;

        await connection.ExecuteAsync(new CommandDefinition(insertSql, new
        {
            Id = SqlGuid.ToSql(Guid.NewGuid()),
            TenantId = tenantId,
            TeamId = teamId,
            MaxCapacityPerEngineer = upsert.MaxCapacityPerEngineer ?? 10,
            PickupSlaMinutes = upsert.PickupSlaMinutes ?? 30,
            ResolutionSlaMinutes = upsert.ResolutionSlaMinutes ?? 240,
            AutoAssignEnabled = upsert.AutoAssignEnabled ?? true,
            CreatedAt = now,
            UpdatedAt = now,
        }, cancellationToken: cancellationToken));
    }

    private sealed class QueueRow
    {
        public string Id { get; init; } = "";
        public string TenantId { get; init; } = "";
        public string Title { get; init; } = "";
        public string? Description { get; init; }
        public int Priority { get; init; }
        public string Status { get; init; } = "";
        public string? TeamId { get; init; }
        public string? AssigneeId { get; init; }
        public string CreatedBy { get; init; } = "";
        public DateTime? SlaPickupDeadline { get; init; }
        public DateTime? SlaResolutionDeadline { get; init; }
        public bool SlaPickupBreached { get; init; }
        public bool SlaResolutionBreached { get; init; }
        public DateTime? AssignedAt { get; init; }
        public DateTime? ResolvedAt { get; init; }
        public DateTime? ClosedAt { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
        public string? TeamName { get; init; }
    }

    private sealed class StatusCountRow
    {
        public string Status { get; init; } = "";
        public string? TeamId { get; init; }
        public int Count { get; init; }
    }

    private sealed class WorkloadRow
    {
        public string AssigneeId { get; init; } = "";
        public int OpenCount { get; init; }
    }

    private sealed class ConfigRow
    {
        public int MaxCapacityPerEngineer { get; init; }
        public int PickupSlaMinutes { get; init; }
        public int ResolutionSlaMinutes { get; init; }
        public bool AutoAssignEnabled { get; init; }
    }

    private static QueueTicketEntity MapRow(QueueRow row) =>
        new()
        {
            Id = SqlGuid.FromSql(row.Id),
            TenantId = SqlGuid.FromSql(row.TenantId),
            Title = row.Title,
            Description = row.Description,
            Priority = row.Priority,
            Status = row.Status,
            TeamId = string.IsNullOrWhiteSpace(row.TeamId) ? null : SqlGuid.FromSql(row.TeamId),
            TeamName = row.TeamName,
            AssigneeId = string.IsNullOrWhiteSpace(row.AssigneeId) ? null : SqlGuid.FromSql(row.AssigneeId),
            CreatedBy = SqlGuid.FromSql(row.CreatedBy),
            SlaPickupDeadline = row.SlaPickupDeadline,
            SlaResolutionDeadline = row.SlaResolutionDeadline,
            SlaPickupBreached = row.SlaPickupBreached,
            SlaResolutionBreached = row.SlaResolutionBreached,
            AssignedAt = row.AssignedAt,
            ResolvedAt = row.ResolvedAt,
            ClosedAt = row.ClosedAt,
            CreatedAt = row.CreatedAt,
            UpdatedAt = row.UpdatedAt,
        };

    private static QueueConfigEntity MapConfig(ConfigRow row) =>
        new()
        {
            MaxCapacityPerEngineer = row.MaxCapacityPerEngineer,
            PickupSlaMinutes = row.PickupSlaMinutes,
            ResolutionSlaMinutes = row.ResolutionSlaMinutes,
            AutoAssignEnabled = row.AutoAssignEnabled,
        };
}
