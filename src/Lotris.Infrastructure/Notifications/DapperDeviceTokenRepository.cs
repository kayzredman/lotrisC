using Dapper;
using Lotris.Application.Notifications;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Notifications;

public sealed class DapperDeviceTokenRepository : IDeviceTokenRepository
{
    private readonly ISqlConnectionFactory _connections;

    public DapperDeviceTokenRepository(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<DeviceTokenRecord> UpsertAsync(
        Guid userId,
        Guid tenantId,
        string platform,
        string token,
        string? deviceLabel,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);

        var existing = await connection.QuerySingleOrDefaultAsync<DeviceTokenRow>(new CommandDefinition(
            """
            SELECT TOP 1 id AS Id, user_id AS UserId, tenant_id AS TenantId, platform AS Platform,
                   token AS Token, device_label AS DeviceLabel, created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM dbo.Device_Tokens
            WHERE token = @Token AND revoked_at IS NULL
            """,
            new { Token = token },
            cancellationToken: cancellationToken));

        if (existing is not null)
        {
            await connection.ExecuteAsync(new CommandDefinition(
                """
                UPDATE dbo.Device_Tokens
                SET user_id = @UserId, tenant_id = @TenantId, platform = @Platform,
                    device_label = @DeviceLabel, updated_at = @UpdatedAt
                WHERE id = @Id
                """,
                new
                {
                    existing.Id,
                    UserId = SqlGuid.ToSql(userId),
                    TenantId = SqlGuid.ToSql(tenantId),
                    Platform = platform,
                    DeviceLabel = deviceLabel,
                    UpdatedAt = now,
                },
                cancellationToken: cancellationToken));

            return Map(existing with { UserId = userId, TenantId = tenantId, Platform = platform, DeviceLabel = deviceLabel, UpdatedAt = now });
        }

        var id = Guid.NewGuid();
        await connection.ExecuteAsync(new CommandDefinition(
            """
            INSERT INTO dbo.Device_Tokens (
                id, user_id, tenant_id, platform, token, device_label, created_at, updated_at
            ) VALUES (
                @Id, @UserId, @TenantId, @Platform, @Token, @DeviceLabel, @CreatedAt, @UpdatedAt
            )
            """,
            new
            {
                Id = SqlGuid.ToSql(id),
                UserId = SqlGuid.ToSql(userId),
                TenantId = SqlGuid.ToSql(tenantId),
                Platform = platform,
                Token = token,
                DeviceLabel = deviceLabel,
                CreatedAt = now,
                UpdatedAt = now,
            },
            cancellationToken: cancellationToken));

        return new DeviceTokenRecord
        {
            Id = id,
            UserId = userId,
            TenantId = tenantId,
            Platform = platform,
            Token = token,
            DeviceLabel = deviceLabel,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    public async Task<bool> RevokeAsync(Guid deviceId, Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.ExecuteAsync(new CommandDefinition(
            """
            UPDATE dbo.Device_Tokens
            SET revoked_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
            WHERE id = @Id AND user_id = @UserId AND revoked_at IS NULL
            """,
            new { Id = SqlGuid.ToSql(deviceId), UserId = SqlGuid.ToSql(userId) },
            cancellationToken: cancellationToken));

        return rows > 0;
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(
            """
            UPDATE dbo.Device_Tokens
            SET revoked_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
            WHERE user_id = @UserId AND revoked_at IS NULL
            """,
            new { UserId = SqlGuid.ToSql(userId) },
            cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<DeviceTokenRecord>> ListActiveForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<DeviceTokenRow>(new CommandDefinition(
            """
            SELECT id AS Id, user_id AS UserId, tenant_id AS TenantId, platform AS Platform,
                   token AS Token, device_label AS DeviceLabel, created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM dbo.Device_Tokens
            WHERE user_id = @UserId AND revoked_at IS NULL
            ORDER BY updated_at DESC
            """,
            new { UserId = SqlGuid.ToSql(userId) },
            cancellationToken: cancellationToken));

        return rows.Select(Map).ToList();
    }

    private static DeviceTokenRecord Map(DeviceTokenRow row) => new()
    {
        Id = row.Id,
        UserId = row.UserId,
        TenantId = row.TenantId,
        Platform = row.Platform,
        Token = row.Token,
        DeviceLabel = row.DeviceLabel,
        CreatedAt = row.CreatedAt,
        UpdatedAt = row.UpdatedAt,
    };

    private sealed record DeviceTokenRow
    {
        public Guid Id { get; init; }
        public Guid UserId { get; init; }
        public Guid TenantId { get; init; }
        public string Platform { get; init; } = "";
        public string Token { get; init; } = "";
        public string? DeviceLabel { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
    }
}
