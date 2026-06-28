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
}
