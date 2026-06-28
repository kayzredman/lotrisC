using Dapper;
using Lotris.Application.Admin;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Admin;

public sealed class DapperAdminRepository : IAdminRepository
{
    private readonly ISqlConnectionFactory _connections;

    public DapperAdminRepository(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<IReadOnlyList<AdminUserEntity>> ListUsersAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT u.id, u.email, u.full_name AS FullName, u.role_id AS RoleId, r.name AS RoleName,
                   u.team_id AS TeamId, t.name AS TeamName, u.is_active AS IsActive,
                   u.is_unavailable AS IsUnavailable
            FROM dbo.Users u
            INNER JOIN dbo.Roles r ON u.role_id = r.id
            LEFT JOIN dbo.Teams t ON u.team_id = t.id
            WHERE u.tenant_id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<UserRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));

        return rows.Select(MapUser).ToList();
    }

    public async Task<AdminUserEntity?> GetUserAsync(
        Guid tenantId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT u.id, u.email, u.full_name AS FullName, u.role_id AS RoleId, r.name AS RoleName,
                   u.team_id AS TeamId, t.name AS TeamName, u.is_active AS IsActive,
                   u.is_unavailable AS IsUnavailable
            FROM dbo.Users u
            INNER JOIN dbo.Roles r ON u.role_id = r.id
            LEFT JOIN dbo.Teams t ON u.team_id = t.id
            WHERE u.tenant_id = @TenantId AND u.id = @UserId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<UserRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            UserId = SqlGuid.ToSql(userId),
        }, cancellationToken: cancellationToken));

        return row is null ? null : MapUser(row);
    }

    public async Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT COUNT(1) FROM dbo.Users WHERE email = @Email";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var count = await connection.ExecuteScalarAsync<int>(new CommandDefinition(sql, new { Email = email }, cancellationToken: cancellationToken));
        return count > 0;
    }

    public async Task UpdateUserAsync(
        Guid tenantId,
        Guid userId,
        AdminUserUpdateModel update,
        CancellationToken cancellationToken = default)
    {
        var sets = new List<string> { "updated_at = @UpdatedAt" };
        var parameters = new DynamicParameters();
        parameters.Add("UpdatedAt", update.UpdatedAt);
        parameters.Add("TenantId", SqlGuid.ToSql(tenantId));
        parameters.Add("UserId", SqlGuid.ToSql(userId));

        if (update.FullName is not null)
        {
            sets.Add("full_name = @FullName");
            parameters.Add("FullName", update.FullName);
        }

        if (update.TeamId.HasValue)
        {
            sets.Add("team_id = @TeamId");
            parameters.Add("TeamId", SqlGuid.ToSql(update.TeamId.Value));
        }
        else if (update.ClearTeam)
        {
            sets.Add("team_id = NULL");
        }

        var sql = $"UPDATE dbo.Users SET {string.Join(", ", sets)} WHERE tenant_id = @TenantId AND id = @UserId";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
    }

    public async Task DeactivateUserAsync(
        Guid tenantId,
        Guid userId,
        DateTime updatedAt,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.Users SET is_active = 0, updated_at = @UpdatedAt
            WHERE tenant_id = @TenantId AND id = @UserId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            UserId = SqlGuid.ToSql(userId),
            UpdatedAt = updatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task AssignRoleAsync(
        Guid tenantId,
        Guid userId,
        int roleId,
        DateTime updatedAt,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.Users SET role_id = @RoleId, updated_at = @UpdatedAt
            WHERE tenant_id = @TenantId AND id = @UserId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            UserId = SqlGuid.ToSql(userId),
            RoleId = roleId,
            UpdatedAt = updatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<AdminTeamEntity>> ListTeamsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT t.id, t.name,
                   t.max_tickets_per_engineer AS MaxTicketsPerEngineer,
                   t.pickup_sla_minutes AS PickupSlaMinutes,
                   t.is_active AS IsActive,
                   COUNT(u.id) AS MemberCount
            FROM dbo.Teams t
            LEFT JOIN dbo.Users u ON u.team_id = t.id
                                 AND u.tenant_id = t.tenant_id
                                 AND u.is_active = 1
            WHERE t.tenant_id = @TenantId
            GROUP BY t.id, t.name, t.max_tickets_per_engineer, t.pickup_sla_minutes, t.is_active
            ORDER BY t.name ASC
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<TeamRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));

        return rows.Select(r => new AdminTeamEntity
        {
            Id = SqlGuid.FromSql(r.Id),
            Name = r.Name,
            MaxTicketsPerEngineer = r.MaxTicketsPerEngineer,
            PickupSlaMinutes = r.PickupSlaMinutes,
            IsActive = r.IsActive,
            MemberCount = r.MemberCount,
        }).ToList();
    }

    public async Task CreateTeamAsync(AdminTeamCreateModel team, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.Teams (
                id, tenant_id, name, max_tickets_per_engineer, pickup_sla_minutes,
                is_active, created_at, updated_at
            ) VALUES (
                @Id, @TenantId, @Name, @MaxTicketsPerEngineer, @PickupSlaMinutes,
                1, @CreatedAt, @UpdatedAt
            )
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(team.Id),
            TenantId = SqlGuid.ToSql(team.TenantId),
            team.Name,
            team.MaxTicketsPerEngineer,
            team.PickupSlaMinutes,
            team.CreatedAt,
            team.UpdatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<AdminTeamEntity?> GetTeamAsync(
        Guid tenantId,
        Guid teamId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT t.id, t.name,
                   t.max_tickets_per_engineer AS MaxTicketsPerEngineer,
                   t.pickup_sla_minutes AS PickupSlaMinutes,
                   t.is_active AS IsActive,
                   COUNT(u.id) AS MemberCount
            FROM dbo.Teams t
            LEFT JOIN dbo.Users u ON u.team_id = t.id
                                 AND u.tenant_id = t.tenant_id
                                 AND u.is_active = 1
            WHERE t.tenant_id = @TenantId AND t.id = @TeamId
            GROUP BY t.id, t.name, t.max_tickets_per_engineer, t.pickup_sla_minutes, t.is_active
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<TeamRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            TeamId = SqlGuid.ToSql(teamId),
        }, cancellationToken: cancellationToken));

        if (row is null) return null;
        return new AdminTeamEntity
        {
            Id = SqlGuid.FromSql(row.Id),
            Name = row.Name,
            MaxTicketsPerEngineer = row.MaxTicketsPerEngineer,
            PickupSlaMinutes = row.PickupSlaMinutes,
            IsActive = row.IsActive,
            MemberCount = row.MemberCount,
        };
    }

    public async Task UpdateTeamAsync(
        Guid tenantId,
        Guid teamId,
        AdminTeamUpdateModel update,
        CancellationToken cancellationToken = default)
    {
        var sets = new List<string> { "updated_at = @UpdatedAt" };
        var parameters = new DynamicParameters();
        parameters.Add("UpdatedAt", update.UpdatedAt);
        parameters.Add("TenantId", SqlGuid.ToSql(tenantId));
        parameters.Add("TeamId", SqlGuid.ToSql(teamId));

        if (update.Name is not null) { sets.Add("name = @Name"); parameters.Add("Name", update.Name); }
        if (update.MaxTicketsPerEngineer.HasValue) { sets.Add("max_tickets_per_engineer = @MaxTicketsPerEngineer"); parameters.Add("MaxTicketsPerEngineer", update.MaxTicketsPerEngineer); }
        if (update.PickupSlaMinutes.HasValue) { sets.Add("pickup_sla_minutes = @PickupSlaMinutes"); parameters.Add("PickupSlaMinutes", update.PickupSlaMinutes); }
        if (update.IsActive.HasValue) { sets.Add("is_active = @IsActive"); parameters.Add("IsActive", update.IsActive.Value ? 1 : 0); }

        var sql = $"UPDATE dbo.Teams SET {string.Join(", ", sets)} WHERE tenant_id = @TenantId AND id = @TeamId";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
    }

    private static AdminUserEntity MapUser(UserRow row) => new()
    {
        Id = SqlGuid.FromSql(row.Id),
        Email = row.Email,
        FullName = row.FullName,
        RoleId = row.RoleId,
        RoleName = row.RoleName,
        TeamId = string.IsNullOrWhiteSpace(row.TeamId) ? null : SqlGuid.FromSql(row.TeamId),
        TeamName = row.TeamName,
        IsActive = row.IsActive,
        IsUnavailable = row.IsUnavailable,
    };

    private sealed class UserRow
    {
        public string Id { get; init; } = "";
        public string Email { get; init; } = "";
        public string FullName { get; init; } = "";
        public int RoleId { get; init; }
        public string RoleName { get; init; } = "";
        public string? TeamId { get; init; }
        public string? TeamName { get; init; }
        public bool IsActive { get; init; }
        public bool IsUnavailable { get; init; }
    }

    private sealed class TeamRow
    {
        public string Id { get; init; } = "";
        public string Name { get; init; } = "";
        public int MaxTicketsPerEngineer { get; init; }
        public int PickupSlaMinutes { get; init; }
        public bool IsActive { get; init; }
        public int MemberCount { get; init; }
    }
}
