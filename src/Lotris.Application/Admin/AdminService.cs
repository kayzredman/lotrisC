using System.Security.Cryptography;
using System.Text.Json;
using Lotris.Application.Auth;
using Lotris.Application.AuditLogs;
using Lotris.Application.Common;
using Lotris.Contracts.Admin;

namespace Lotris.Application.Admin;

public class AdminService
{
    private readonly IAdminRepository _admin;
    private readonly IAuditLogRepository _auditLogs;
    private readonly IUserAccountCreator _userAccountCreator;

    public AdminService(
        IAdminRepository admin,
        IAuditLogRepository auditLogs,
        IUserAccountCreator userAccountCreator)
    {
        _admin = admin;
        _auditLogs = auditLogs;
        _userAccountCreator = userAccountCreator;
    }

    public async Task<IReadOnlyList<UserListItemDto>> ListUsersAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _admin.ListUsersAsync(tenantId, cancellationToken);
        return rows.Select(u => new UserListItemDto(
            u.Id,
            u.Email,
            u.FullName,
            u.RoleId,
            u.RoleName,
            u.TeamId,
            u.TeamName,
            u.IsActive,
            u.IsUnavailable)).ToList();
    }

    public async Task<CreateUserResponse> CreateUserAsync(
        Guid tenantId,
        Guid actorId,
        CreateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        if (await _admin.EmailExistsAsync(request.Email, cancellationToken))
        {
            throw new BadRequestException("A user with this email already exists.");
        }

        var tempPassword = request.TemporaryPassword ?? GenerateTemporaryPassword();

        var created = await _userAccountCreator.CreateAsync(new UserAccountCreateRequest
        {
            TenantId = tenantId,
            Email = request.Email,
            FullName = request.FullName,
            RoleId = request.RoleId,
            TeamId = request.TeamId,
            Password = tempPassword,
        }, cancellationToken);

        await WriteAuditAsync(tenantId, actorId, "USER_CREATED", "User", created.UserId.ToString(), new
        {
            request.Email,
            request.RoleId,
            request.TeamId,
        }, cancellationToken);

        return new CreateUserResponse(
            created.UserId,
            request.Email,
            request.FullName,
            request.RoleId,
            request.TeamId,
            request.TemporaryPassword is null ? tempPassword : null);
    }

    public async Task UpdateUserAsync(
        Guid tenantId,
        Guid actorId,
        Guid userId,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        await AssertUserExistsAsync(tenantId, userId, cancellationToken);

        await _admin.UpdateUserAsync(tenantId, userId, new AdminUserUpdateModel
        {
            FullName = request.FullName,
            TeamId = request.TeamId,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken);

        await WriteAuditAsync(tenantId, actorId, "USER_UPDATED", "User", userId.ToString(), request, cancellationToken);
    }

    public async Task DeactivateUserAsync(
        Guid tenantId,
        Guid actorId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        if (userId == actorId)
        {
            throw new ForbiddenException("You cannot deactivate your own account");
        }

        await AssertUserExistsAsync(tenantId, userId, cancellationToken);
        await _admin.DeactivateUserAsync(tenantId, userId, DateTime.UtcNow, cancellationToken);
        await WriteAuditAsync(tenantId, actorId, "USER_DEACTIVATED", "User", userId.ToString(), null, cancellationToken);
    }

    public async Task AssignRoleAsync(
        Guid tenantId,
        Guid actorId,
        Guid userId,
        int roleId,
        CancellationToken cancellationToken = default)
    {
        await AssertUserExistsAsync(tenantId, userId, cancellationToken);
        await _admin.AssignRoleAsync(tenantId, userId, roleId, DateTime.UtcNow, cancellationToken);
        await WriteAuditAsync(tenantId, actorId, "ROLE_ASSIGNED", "User", userId.ToString(), new { roleId }, cancellationToken);
    }

    public async Task<IReadOnlyList<TeamListItemDto>> ListTeamsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _admin.ListTeamsAsync(tenantId, cancellationToken);
        return rows.Select(t => new TeamListItemDto(
            t.Id,
            t.Name,
            t.MaxTicketsPerEngineer,
            t.PickupSlaMinutes,
            t.IsActive,
            t.MemberCount)).ToList();
    }

    public async Task<CreateTeamResponse> CreateTeamAsync(
        Guid tenantId,
        Guid actorId,
        CreateTeamRequest request,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var id = Guid.NewGuid();

        await _admin.CreateTeamAsync(new AdminTeamCreateModel
        {
            Id = id,
            TenantId = tenantId,
            Name = request.Name,
            MaxTicketsPerEngineer = request.MaxTicketsPerEngineer ?? 5,
            PickupSlaMinutes = request.PickupSlaMinutes ?? 30,
            CreatedAt = now,
            UpdatedAt = now,
        }, cancellationToken);

        await WriteAuditAsync(tenantId, actorId, "TEAM_CREATED", "Team", id.ToString(), new { request.Name }, cancellationToken);
        return new CreateTeamResponse(id);
    }

    public async Task UpdateTeamAsync(
        Guid tenantId,
        Guid actorId,
        Guid teamId,
        UpdateTeamRequest request,
        CancellationToken cancellationToken = default)
    {
        await AssertTeamExistsAsync(tenantId, teamId, cancellationToken);

        await _admin.UpdateTeamAsync(tenantId, teamId, new AdminTeamUpdateModel
        {
            Name = request.Name,
            MaxTicketsPerEngineer = request.MaxTicketsPerEngineer,
            PickupSlaMinutes = request.PickupSlaMinutes,
            IsActive = request.IsActive,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken);

        await WriteAuditAsync(tenantId, actorId, "TEAM_UPDATED", "Team", teamId.ToString(), request, cancellationToken);
    }

    public async Task<IReadOnlyList<TeamAccessGrantDto>> ListTeamAccessGrantsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _admin.ListTeamAccessGrantsAsync(tenantId, cancellationToken);
        return rows.Select(g => new TeamAccessGrantDto(
            g.Id,
            g.GranteeUserId,
            g.GranteeName,
            g.TargetTeamId,
            g.TargetTeamName,
            g.GrantedBy,
            g.GrantedByName,
            g.CreatedAt)).ToList();
    }

    public async Task<GrantTeamAccessResponse> GrantTeamAccessAsync(
        Guid tenantId,
        Guid actorId,
        GrantTeamAccessRequest request,
        CancellationToken cancellationToken = default)
    {
        await AssertUserExistsAsync(tenantId, request.GranteeUserId, cancellationToken);
        await AssertTeamExistsAsync(tenantId, request.TargetTeamId, cancellationToken);

        var id = await _admin.GrantTeamAccessAsync(
            tenantId,
            request.GranteeUserId,
            request.TargetTeamId,
            actorId,
            cancellationToken);

        await WriteAuditAsync(tenantId, actorId, "TEAM_ACCESS_GRANTED", "TeamAccessGrant", id.ToString(), request, cancellationToken);
        return new GrantTeamAccessResponse(id);
    }

    public async Task RevokeTeamAccessAsync(
        Guid tenantId,
        Guid actorId,
        Guid grantId,
        CancellationToken cancellationToken = default)
    {
        await _admin.RevokeTeamAccessAsync(tenantId, grantId, cancellationToken);
        await WriteAuditAsync(tenantId, actorId, "TEAM_ACCESS_REVOKED", "TeamAccessGrant", grantId.ToString(), null, cancellationToken);
    }

    public async Task<IReadOnlyList<CategoryRoutingDto>> ListCategoryRoutingAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _admin.ListCategoryRoutingAsync(tenantId, cancellationToken);
        return rows.Select(r => new CategoryRoutingDto(
            r.Id,
            r.Category,
            r.TeamId,
            r.TeamName,
            r.DefaultPriority)).ToList();
    }

    public async Task UpsertCategoryRoutingAsync(
        Guid tenantId,
        Guid actorId,
        UpsertCategoryRoutingRequest request,
        CancellationToken cancellationToken = default)
    {
        await AssertTeamExistsAsync(tenantId, request.TeamId, cancellationToken);
        await _admin.UpsertCategoryRoutingAsync(
            tenantId,
            request.Category.Trim(),
            request.TeamId,
            request.DefaultPriority,
            cancellationToken);
        await WriteAuditAsync(tenantId, actorId, "CATEGORY_ROUTING_UPSERTED", "CategoryRouting", request.Category, request, cancellationToken);
    }

    public async Task DeleteCategoryRoutingAsync(
        Guid tenantId,
        Guid actorId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _admin.DeleteCategoryRoutingAsync(tenantId, id, cancellationToken);
        await WriteAuditAsync(tenantId, actorId, "CATEGORY_ROUTING_DELETED", "CategoryRouting", id.ToString(), null, cancellationToken);
    }

    private async Task AssertUserExistsAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken)
    {
        if (await _admin.GetUserAsync(tenantId, userId, cancellationToken) is null)
        {
            throw new NotFoundException("User not found");
        }
    }

    private async Task AssertTeamExistsAsync(Guid tenantId, Guid teamId, CancellationToken cancellationToken)
    {
        if (await _admin.GetTeamAsync(tenantId, teamId, cancellationToken) is null)
        {
            throw new NotFoundException("Team not found");
        }
    }

    private Task WriteAuditAsync(
        Guid tenantId,
        Guid userId,
        string action,
        string entityType,
        string entityId,
        object? details,
        CancellationToken cancellationToken) =>
        _auditLogs.WriteAsync(new AuditLogWriteModel
        {
            TenantId = tenantId,
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details is null ? null : JsonSerializer.Serialize(details),
            CreatedAt = DateTime.UtcNow,
        }, cancellationToken);

    private static string GenerateTemporaryPassword()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
        var bytes = RandomNumberGenerator.GetBytes(16);
        var result = new char[16];
        for (var i = 0; i < result.Length; i++)
        {
            result[i] = chars[bytes[i] % chars.Length];
        }

        return new string(result) + "A1!";
    }
}
