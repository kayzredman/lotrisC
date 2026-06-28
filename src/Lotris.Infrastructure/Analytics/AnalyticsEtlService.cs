using Dapper;
using Lotris.Application.Analytics;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Analytics;

public sealed class AnalyticsEtlService : IAnalyticsEtlService
{
    private readonly IAnalyticsStore _analytics;
    private readonly ISqlConnectionFactory _connections;

    public AnalyticsEtlService(IAnalyticsStore analytics, ISqlConnectionFactory connections)
    {
        _analytics = analytics;
        _connections = connections;
    }

    public async Task SyncTicketDayAsync(Guid tenantId, DateOnly date, CancellationToken cancellationToken = default)
    {
        await _analytics.UpsertTicketDailyAsync(tenantId, date, cancellationToken);
    }

    public Task SyncSlaDayAsync(
        Guid tenantId,
        DateOnly date,
        int totalTickets,
        int breachCount,
        CancellationToken cancellationToken = default) =>
        _analytics.UpsertSlaDailyAsync(tenantId, date, totalTickets, breachCount, cancellationToken);

    public async Task SyncEngineerPerfWeekAsync(
        Guid tenantId,
        Guid engineerId,
        CancellationToken cancellationToken = default)
    {
        var weekKey = AnalyticsWeekHelper.CurrentWeekKey(DateTime.UtcNow);
        var weekStart = AnalyticsWeekHelper.IsoWeekStart(DateTime.UtcNow);

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var tenantParam = SqlGuid.ToSql(tenantId);
        var engineerParam = SqlGuid.ToSql(engineerId);

        const string resolvedSql = """
            SELECT COUNT(1) FROM dbo.Tickets
            WHERE tenant_id = @TenantId AND assignee_id = @EngineerId
              AND status IN ('RESOLVED','CLOSED')
              AND CAST(resolved_at AS DATE) >= @WeekStart
            """;

        const string breachSql = """
            SELECT COUNT(1) FROM dbo.Tickets
            WHERE tenant_id = @TenantId AND assignee_id = @EngineerId
              AND sla_resolution_breached = 1
              AND CAST(created_at AS DATE) >= @WeekStart
            """;

        const string avgSql = """
            SELECT AVG(CAST(DATEDIFF(HOUR, created_at, resolved_at) AS DECIMAL(10,2)))
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId AND assignee_id = @EngineerId
              AND resolved_at IS NOT NULL
              AND CAST(resolved_at AS DATE) >= @WeekStart
            """;

        const string kpiSql = """
            SELECT TOP 1 overall_score FROM dbo.KPI_Results
            WHERE tenant_id = @TenantId AND engineer_id = @EngineerId
            ORDER BY computed_at DESC
            """;

        var param = new { TenantId = tenantParam, EngineerId = engineerParam, WeekStart = weekStart.ToDateTime(TimeOnly.MinValue) };
        var ticketsResolved = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            resolvedSql, param, cancellationToken: cancellationToken));
        var slaBreaches = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            breachSql, param, cancellationToken: cancellationToken));
        var avgHours = await connection.ExecuteScalarAsync<decimal?>(new CommandDefinition(
            avgSql, param, cancellationToken: cancellationToken));
        var kpiScore = await connection.ExecuteScalarAsync<decimal?>(new CommandDefinition(
            kpiSql,
            new { TenantId = tenantParam, EngineerId = engineerParam },
            cancellationToken: cancellationToken));

        await _analytics.UpsertEngineerPerfAsync(
            tenantId,
            engineerId,
            weekKey,
            ticketsResolved,
            slaBreaches,
            avgHours,
            kpiScore,
            cancellationToken);
    }

    public async Task RunIncrementalRollupAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await SyncTicketDayAsync(tenantId, today, cancellationToken);

        foreach (var engineerId in await GetActiveEngineerIdsAsync(tenantId, cancellationToken))
        {
            await SyncEngineerPerfWeekAsync(tenantId, engineerId, cancellationToken);
        }
    }

    public async Task RunDailyBatchAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var yesterday = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        await SyncTicketDayAsync(tenantId, yesterday, cancellationToken);
        await SyncTicketDayAsync(tenantId, today, cancellationToken);

        foreach (var engineerId in await GetActiveEngineerIdsAsync(tenantId, cancellationToken))
        {
            await SyncEngineerPerfWeekAsync(tenantId, engineerId, cancellationToken);
        }
    }

    public async Task RunIncrementalRollupAllTenantsAsync(CancellationToken cancellationToken = default)
    {
        foreach (var tenantId in await GetDistinctTenantIdsAsync(cancellationToken))
        {
            await RunIncrementalRollupAsync(tenantId, cancellationToken);
        }
    }

    public async Task RunDailyBatchAllTenantsAsync(CancellationToken cancellationToken = default)
    {
        foreach (var tenantId in await GetDistinctTenantIdsAsync(cancellationToken))
        {
            await RunDailyBatchAsync(tenantId, cancellationToken);
        }
    }

    private async Task<IReadOnlyList<Guid>> GetDistinctTenantIdsAsync(CancellationToken cancellationToken)
    {
        const string sql = "SELECT DISTINCT tenant_id FROM dbo.Tickets";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<string>(new CommandDefinition(sql, cancellationToken: cancellationToken));
        return rows.Select(SqlGuid.FromSql).ToList();
    }

    private async Task<IReadOnlyList<Guid>> GetActiveEngineerIdsAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id FROM dbo.Users
            WHERE tenant_id = @TenantId AND is_active = 1
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<string>(new CommandDefinition(
            sql,
            new { TenantId = SqlGuid.ToSql(tenantId) },
            cancellationToken: cancellationToken));
        return rows.Select(SqlGuid.FromSql).ToList();
    }
}
