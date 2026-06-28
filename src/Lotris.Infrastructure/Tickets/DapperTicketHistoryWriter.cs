using Dapper;
using Lotris.Application.Tickets;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Tickets;

public sealed class DapperTicketHistoryWriter : ITicketHistoryWriter
{
    private readonly ISqlConnectionFactory _connections;

    public DapperTicketHistoryWriter(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task WriteAsync(HistoryEntry entry, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.Ticket_History (
                tenant_id, ticket_id, actor_id, event_type,
                from_value, to_value, metadata, created_at
            ) VALUES (
                @TenantId, @TicketId, @ActorId, @EventType,
                @FromValue, @ToValue, @Metadata, @CreatedAt
            )
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(entry.TenantId),
            TicketId = SqlGuid.ToSql(entry.TicketId),
            ActorId = entry.ActorId.HasValue ? SqlGuid.ToSql(entry.ActorId.Value) : null,
            entry.EventType,
            entry.FromValue,
            entry.ToValue,
            entry.Metadata,
            entry.CreatedAt,
        }, cancellationToken: cancellationToken));
    }
}
