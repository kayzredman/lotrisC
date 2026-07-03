using Dapper;
using Lotris.Application.Tickets;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Tickets;

public sealed class DapperSlaConfigRepository : ISlaConfigRepository
{
    private readonly ISqlConnectionFactory _connections;

    public DapperSlaConfigRepository(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<SlaConfig> GetAsync(Guid tenantId, Guid? teamId = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);

        if (teamId.HasValue)
        {
            const string teamSql = """
                SELECT pickup_sla_minutes AS PickupSlaMinutes,
                       resolution_sla_minutes AS ResolutionSlaMinutes
                FROM dbo.SLA_Configs
                WHERE tenant_id = @TenantId AND team_id = @TeamId
                """;

            var teamCfg = await connection.QuerySingleOrDefaultAsync<SlaConfig>(new CommandDefinition(teamSql, new
            {
                TenantId = SqlGuid.ToSql(tenantId),
                TeamId = SqlGuid.ToSql(teamId.Value),
            }, cancellationToken: cancellationToken));

            if (teamCfg is not null)
            {
                return teamCfg;
            }
        }

        const string tenantSql = """
            SELECT pickup_sla_minutes AS PickupSlaMinutes,
                   resolution_sla_minutes AS ResolutionSlaMinutes
            FROM dbo.SLA_Configs
            WHERE tenant_id = @TenantId AND team_id IS NULL
            """;

        var tenantCfg = await connection.QuerySingleOrDefaultAsync<SlaConfig>(new CommandDefinition(tenantSql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));

        return tenantCfg ?? new SlaConfig();
    }

    public async Task UpsertTenantDefaultAsync(
        Guid tenantId,
        int pickupSlaMinutes,
        int resolutionSlaMinutes,
        CancellationToken cancellationToken = default)
    {
        const string selectSql = """
            SELECT id FROM dbo.SLA_Configs
            WHERE tenant_id = @TenantId AND team_id IS NULL
            """;

        const string updateSql = """
            UPDATE dbo.SLA_Configs
            SET pickup_sla_minutes = @PickupSlaMinutes,
                resolution_sla_minutes = @ResolutionSlaMinutes,
                updated_at = @UpdatedAt
            WHERE id = @Id
            """;

        const string insertSql = """
            INSERT INTO dbo.SLA_Configs
                (id, tenant_id, team_id, pickup_sla_minutes, resolution_sla_minutes, created_at, updated_at)
            VALUES
                (@Id, @TenantId, NULL, @PickupSlaMinutes, @ResolutionSlaMinutes, @CreatedAt, @UpdatedAt)
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var tenantParam = SqlGuid.ToSql(tenantId);
        var existingId = await connection.ExecuteScalarAsync<string?>(new CommandDefinition(
            selectSql,
            new { TenantId = tenantParam },
            cancellationToken: cancellationToken));

        var now = DateTime.UtcNow;
        if (existingId is not null)
        {
            await connection.ExecuteAsync(new CommandDefinition(updateSql, new
            {
                Id = existingId,
                PickupSlaMinutes = pickupSlaMinutes,
                ResolutionSlaMinutes = resolutionSlaMinutes,
                UpdatedAt = now,
            }, cancellationToken: cancellationToken));
            return;
        }

        await connection.ExecuteAsync(new CommandDefinition(insertSql, new
        {
            Id = SqlGuid.ToSql(Guid.NewGuid()),
            TenantId = tenantParam,
            PickupSlaMinutes = pickupSlaMinutes,
            ResolutionSlaMinutes = resolutionSlaMinutes,
            CreatedAt = now,
            UpdatedAt = now,
        }, cancellationToken: cancellationToken));
    }
}
