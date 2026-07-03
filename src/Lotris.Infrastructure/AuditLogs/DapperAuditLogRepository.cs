using Dapper;
using Lotris.Application.AuditLogs;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.AuditLogs;

public sealed class DapperAuditLogRepository : IAuditLogRepository
{
    private readonly ISqlConnectionFactory _connections;

    public DapperAuditLogRepository(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task WriteAsync(AuditLogWriteModel entry, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.Audit_Logs (
                tenant_id, user_id, action, entity_type, entity_id, details, created_at
            ) VALUES (
                @TenantId, @UserId, @Action, @EntityType, @EntityId, @Details, @CreatedAt
            )
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(entry.TenantId),
            UserId = SqlGuid.ToSql(entry.UserId),
            entry.Action,
            entry.EntityType,
            entry.EntityId,
            entry.Details,
            entry.CreatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<(IReadOnlyList<AuditLogEntity> Rows, int Total)> ListAsync(
        Guid tenantId,
        int page,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var offset = (page - 1) * limit;
        const string sql = """
            SELECT id, tenant_id AS TenantId, user_id AS UserId, action, entity_type AS EntityType,
                   entity_id AS EntityId, details, created_at AS CreatedAt,
                   COUNT(1) OVER() AS Total
            FROM dbo.Audit_Logs
            WHERE tenant_id = @TenantId
            ORDER BY created_at DESC
            OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = (await connection.QueryAsync<AuditLogRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            Offset = offset,
            Limit = limit,
        }, cancellationToken: cancellationToken))).ToList();

        var total = rows.FirstOrDefault()?.Total ?? 0;
        return (rows.Select(r => new AuditLogEntity
        {
            Id = r.Id,
            TenantId = SqlGuid.FromSql(r.TenantId),
            UserId = SqlGuid.FromSql(r.UserId),
            Action = r.Action,
            EntityType = r.EntityType,
            EntityId = r.EntityId,
            Details = r.Details,
            CreatedAt = r.CreatedAt,
        }).ToList(), total);
    }

    private sealed class AuditLogRow
    {
        public long Id { get; init; }
        public string TenantId { get; init; } = "";
        public string UserId { get; init; } = "";
        public string Action { get; init; } = "";
        public string? EntityType { get; init; }
        public string? EntityId { get; init; }
        public string? Details { get; init; }
        public DateTime CreatedAt { get; init; }
        public int Total { get; init; }
    }
}
