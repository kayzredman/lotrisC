using Dapper;
using Lotris.Application.Auth;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Auth;

public sealed class DapperRefreshTokenRepository : IRefreshTokenRepository
{
    private readonly ISqlConnectionFactory _connections;

    public DapperRefreshTokenRepository(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<RefreshTokenRecord> CreateAsync(
        Guid userId,
        Guid tenantId,
        string tokenHash,
        DateTime expiresAt,
        CancellationToken cancellationToken = default)
    {
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(
            """
            INSERT INTO dbo.Refresh_Tokens (
                id, user_id, tenant_id, token_hash, expires_at, created_at
            ) VALUES (
                @Id, @UserId, @TenantId, @TokenHash, @ExpiresAt, @CreatedAt
            )
            """,
            new
            {
                Id = SqlGuid.ToSql(id),
                UserId = SqlGuid.ToSql(userId),
                TenantId = SqlGuid.ToSql(tenantId),
                TokenHash = tokenHash,
                ExpiresAt = expiresAt,
                CreatedAt = now,
            },
            cancellationToken: cancellationToken));

        return new RefreshTokenRecord
        {
            Id = id,
            UserId = userId,
            TenantId = tenantId,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
            CreatedAt = now,
        };
    }

    public async Task<RefreshTokenRecord?> GetActiveByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<RefreshTokenRow>(new CommandDefinition(
            """
            SELECT TOP 1 id AS Id, user_id AS UserId, tenant_id AS TenantId, token_hash AS TokenHash,
                   expires_at AS ExpiresAt, created_at AS CreatedAt, last_used_at AS LastUsedAt,
                   revoked_at AS RevokedAt, replaced_by_token_id AS ReplacedByTokenId
            FROM dbo.Refresh_Tokens
            WHERE token_hash = @TokenHash
              AND revoked_at IS NULL
              AND expires_at > SYSUTCDATETIME()
            """,
            new { TokenHash = tokenHash },
            cancellationToken: cancellationToken));

        return row is null ? null : Map(row);
    }

    public async Task RevokeAsync(
        Guid id,
        Guid? replacedByTokenId = null,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(
            """
            UPDATE dbo.Refresh_Tokens
            SET revoked_at = SYSUTCDATETIME(),
                replaced_by_token_id = COALESCE(@ReplacedByTokenId, replaced_by_token_id)
            WHERE id = @Id AND revoked_at IS NULL
            """,
            new
            {
                Id = SqlGuid.ToSql(id),
                ReplacedByTokenId = replacedByTokenId.HasValue ? SqlGuid.ToSql(replacedByTokenId.Value) : null,
            },
            cancellationToken: cancellationToken));
    }

    public async Task TouchAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(
            """
            UPDATE dbo.Refresh_Tokens
            SET last_used_at = SYSUTCDATETIME()
            WHERE id = @Id
            """,
            new { Id = SqlGuid.ToSql(id) },
            cancellationToken: cancellationToken));
    }

    private static RefreshTokenRecord Map(RefreshTokenRow row) => new()
    {
        Id = row.Id,
        UserId = row.UserId,
        TenantId = row.TenantId,
        TokenHash = row.TokenHash,
        ExpiresAt = row.ExpiresAt,
        CreatedAt = row.CreatedAt,
        LastUsedAt = row.LastUsedAt,
        RevokedAt = row.RevokedAt,
        ReplacedByTokenId = row.ReplacedByTokenId,
    };

    private sealed record RefreshTokenRow
    {
        public Guid Id { get; init; }
        public Guid UserId { get; init; }
        public Guid TenantId { get; init; }
        public string TokenHash { get; init; } = "";
        public DateTime ExpiresAt { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime? LastUsedAt { get; init; }
        public DateTime? RevokedAt { get; init; }
        public Guid? ReplacedByTokenId { get; init; }
    }
}
