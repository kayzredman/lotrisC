using System.Text.RegularExpressions;
using Dapper;
using Lotris.Application.Auth;
using Lotris.Infrastructure.Data;
using Microsoft.Data.SqlClient;

namespace Lotris.Infrastructure.Auth;

public sealed class LegacyUserProvisioner : ILegacyUserProvisioner
{
    private readonly ISqlConnectionFactory _connections;

    public LegacyUserProvisioner(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<LegacyUserProvisionResult> ProvisionAsync(
        LegacyUserProvisionRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            if (request.CreateTenant)
            {
                var slug = ResolveSlug(request.TenantName!, request.TenantSlug);
                var now = DateTime.UtcNow;

                const string tenantSql = """
                    INSERT INTO dbo.Tenants (id, clerk_org_id, name, slug, is_active, created_at, updated_at)
                    VALUES (@Id, @ClerkOrgId, @Name, @Slug, 1, @Now, @Now)
                    """;

                await connection.ExecuteAsync(new CommandDefinition(tenantSql, new
                {
                    Id = SqlGuid.ToSql(request.TenantId),
                    ClerkOrgId = $"identity:{request.TenantId}",
                    Name = request.TenantName,
                    Slug = slug,
                    Now = now,
                }, transaction, cancellationToken: cancellationToken));
            }

            const string userSql = """
                INSERT INTO dbo.Users (
                    id, tenant_id, clerk_user_id, email, full_name,
                    role_id, team_id, is_active, is_unavailable, created_at, updated_at
                ) VALUES (
                    @Id, @TenantId, @ClerkUserId, @Email, @FullName,
                    @RoleId, @TeamId, 1, 0, @Now, @Now
                )
                """;

            var timestamp = DateTime.UtcNow;
            await connection.ExecuteAsync(new CommandDefinition(userSql, new
            {
                Id = SqlGuid.ToSql(request.UserId),
                TenantId = SqlGuid.ToSql(request.TenantId),
                ClerkUserId = $"identity:{request.UserId}",
                request.Email,
                request.FullName,
                request.RoleId,
                TeamId = request.TeamId.HasValue ? SqlGuid.ToSql(request.TeamId.Value) : null,
                Now = timestamp,
            }, transaction, cancellationToken: cancellationToken));

            await transaction.CommitAsync(cancellationToken);
            return new LegacyUserProvisionResult
            {
                TenantId = request.TenantId,
                UserId = request.UserId,
            };
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<LegacyUserProfile?> GetUserProfileAsync(
        Guid userId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT u.id AS Id, u.tenant_id AS TenantId, u.email AS Email, u.full_name AS FullName,
                   u.role_id AS RoleId, u.team_id AS TeamId
            FROM dbo.Users u
            WHERE u.id = @UserId AND u.tenant_id = @TenantId AND u.is_active = 1
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<ProfileRow>(new CommandDefinition(sql, new
        {
            UserId = SqlGuid.ToSql(userId),
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));

        if (row is null)
        {
            return null;
        }

        return new LegacyUserProfile
        {
            Id = SqlGuid.FromSql(row.Id),
            TenantId = SqlGuid.FromSql(row.TenantId),
            Email = row.Email,
            FullName = row.FullName,
            RoleId = row.RoleId,
            TeamId = string.IsNullOrWhiteSpace(row.TeamId) ? null : SqlGuid.FromSql(row.TeamId),
        };
    }

    private sealed class ProfileRow
    {
        public string Id { get; init; } = "";
        public string TenantId { get; init; } = "";
        public string Email { get; init; } = "";
        public string FullName { get; init; } = "";
        public int RoleId { get; init; }
        public string? TeamId { get; init; }
    }

    private static string ResolveSlug(string tenantName, string? tenantSlug)
    {
        if (!string.IsNullOrWhiteSpace(tenantSlug))
        {
            return tenantSlug.Trim().ToLowerInvariant();
        }

        var slug = tenantName.Trim().ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9]+", "-");
        slug = slug.Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? Guid.NewGuid().ToString("N")[..8] : slug;
    }
}
