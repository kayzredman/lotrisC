using Dapper;
using Lotris.Application.Onboarding;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Onboarding;

public sealed class DapperOnboardingRepository : IOnboardingRepository
{
    private readonly ISqlConnectionFactory _connections;

    public DapperOnboardingRepository(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<(DateTime? CompletedAt, int TeamCount)> GetStatusAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT t.onboarding_completed_at AS CompletedAt,
                   (SELECT COUNT(1) FROM dbo.Teams tm
                    WHERE tm.tenant_id = t.id AND tm.is_active = 1) AS TeamCount
            FROM dbo.Tenants t
            WHERE t.id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<StatusRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));

        return (row?.CompletedAt, row?.TeamCount ?? 0);
    }

    public async Task UpdateTenantOrgAsync(
        Guid tenantId,
        string name,
        string slug,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.Tenants
            SET name = @Name, slug = @Slug, updated_at = @UpdatedAt
            WHERE id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            Name = name,
            Slug = slug,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken: cancellationToken));
    }

    public async Task CompleteAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.Tenants
            SET onboarding_completed_at = @CompletedAt, updated_at = @UpdatedAt
            WHERE id = @TenantId
            """;

        var now = DateTime.UtcNow;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            CompletedAt = now,
            UpdatedAt = now,
        }, cancellationToken: cancellationToken));
    }

    public async Task DeleteDraftKpiDefinitionsAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            DELETE FROM dbo.KPI_Definitions
            WHERE tenant_id = @TenantId AND status = 'DRAFT'
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));
    }

    public async Task InsertKpiDefinitionAsync(
        Guid tenantId,
        string name,
        string description,
        string metricType,
        string direction,
        string scope,
        string defaultTarget,
        string weight,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.KPI_Definitions
                (id, tenant_id, name, description, metric_type, direction, scope,
                 default_target, weight, status, created_at, updated_at)
            VALUES
                (@Id, @TenantId, @Name, @Description, @MetricType, @Direction, @Scope,
                 @DefaultTarget, @Weight, 'DRAFT', @CreatedAt, @UpdatedAt)
            """;

        var now = DateTime.UtcNow;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(Guid.NewGuid()),
            TenantId = SqlGuid.ToSql(tenantId),
            Name = name,
            Description = description,
            MetricType = metricType,
            Direction = direction,
            Scope = scope,
            DefaultTarget = defaultTarget,
            Weight = weight,
            CreatedAt = now,
            UpdatedAt = now,
        }, cancellationToken: cancellationToken));
    }

    private sealed class StatusRow
    {
        public DateTime? CompletedAt { get; init; }
        public int TeamCount { get; init; }
    }
}
