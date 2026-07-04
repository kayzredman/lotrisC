using System.Security.Cryptography;
using System.Text.Json;
using Lotris.Application.Auth;
using Lotris.Application.AuditLogs;
using Lotris.Application.Common;
using Lotris.Contracts.Admin;
using Lotris.Domain;

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
        Guid actorId,
        UserRole actorRole,
        CancellationToken cancellationToken = default)
    {
        var teamFilter = await ResolveUserTeamFilterAsync(tenantId, actorId, actorRole, cancellationToken);
        var rows = await _admin.ListUsersAsync(tenantId, teamFilter, cancellationToken);
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
        UserRole actorRole,
        CreateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        await AssertCanCreateUserAsync(tenantId, actorId, actorRole, request, cancellationToken);

        var effectiveRequest = request;
        if (actorRole == UserRole.TeamLead)
        {
            var actor = await _admin.GetUserAsync(tenantId, actorId, cancellationToken)
                ?? throw new ForbiddenException("User profile not found.");
            effectiveRequest = request with
            {
                RoleId = (int)UserRole.Engineer,
                TeamId = actor.TeamId,
            };
        }

        if (await _admin.EmailExistsAsync(effectiveRequest.Email, cancellationToken))
        {
            throw new BadRequestException("A user with this email already exists.");
        }

        var tempPassword = effectiveRequest.TemporaryPassword ?? GenerateTemporaryPassword();

        var created = await _userAccountCreator.CreateAsync(new UserAccountCreateRequest
        {
            TenantId = tenantId,
            Email = effectiveRequest.Email,
            FullName = effectiveRequest.FullName,
            RoleId = effectiveRequest.RoleId,
            TeamId = effectiveRequest.TeamId,
            Password = tempPassword,
        }, cancellationToken);

        await WriteAuditAsync(tenantId, actorId, "USER_CREATED", "User", created.UserId.ToString(), new
        {
            effectiveRequest.Email,
            effectiveRequest.RoleId,
            effectiveRequest.TeamId,
        }, cancellationToken);

        return new CreateUserResponse(
            created.UserId,
            effectiveRequest.Email,
            effectiveRequest.FullName,
            effectiveRequest.RoleId,
            effectiveRequest.TeamId,
            effectiveRequest.TemporaryPassword is null ? tempPassword : null);
    }

    public async Task UpdateUserAsync(
        Guid tenantId,
        Guid actorId,
        UserRole actorRole,
        Guid userId,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        var target = await GetManagedUserAsync(tenantId, actorId, actorRole, userId, cancellationToken);
        AssertCanUpdateUser(actorRole, target, request);

        await _admin.UpdateUserAsync(tenantId, userId, new AdminUserUpdateModel
        {
            FullName = request.FullName,
            TeamId = request.TeamId,
            IsActive = request.IsActive,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken);

        await WriteAuditAsync(tenantId, actorId, request.IsActive == true ? "USER_REACTIVATED" : request.IsActive == false ? "USER_DEACTIVATED" : "USER_UPDATED", "User", userId.ToString(), request, cancellationToken);
    }

    public async Task DeactivateUserAsync(
        Guid tenantId,
        Guid actorId,
        UserRole actorRole,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        if (userId == actorId)
        {
            throw new ForbiddenException("You cannot deactivate your own account");
        }

        var target = await GetManagedUserAsync(tenantId, actorId, actorRole, userId, cancellationToken);
        AssertCanDeactivateUser(actorRole, target);

        await _admin.UpdateUserAsync(tenantId, userId, new AdminUserUpdateModel
        {
            IsActive = false,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken);
        await WriteAuditAsync(tenantId, actorId, "USER_DEACTIVATED", "User", userId.ToString(), null, cancellationToken);
    }

    public async Task AssignRoleAsync(
        Guid tenantId,
        Guid actorId,
        UserRole actorRole,
        Guid userId,
        int roleId,
        CancellationToken cancellationToken = default)
    {
        if (actorRole == UserRole.TeamLead)
        {
            throw new ForbiddenException("Team leads cannot change user roles.");
        }

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
        UserRole actorRole,
        CreateTeamRequest request,
        CancellationToken cancellationToken = default)
    {
        if (actorRole == UserRole.TeamLead)
        {
            throw new ForbiddenException("Team leads cannot create teams.");
        }

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
        UserRole actorRole,
        Guid teamId,
        UpdateTeamRequest request,
        CancellationToken cancellationToken = default)
    {
        await AssertTeamExistsAsync(tenantId, teamId, cancellationToken);
        await AssertCanManageTeamAsync(tenantId, actorId, actorRole, teamId, request, cancellationToken);

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

    private async Task<Guid?> ResolveUserTeamFilterAsync(
        Guid tenantId,
        Guid actorId,
        UserRole actorRole,
        CancellationToken cancellationToken)
    {
        if (actorRole is UserRole.SuperAdmin or UserRole.Admin or UserRole.ItManager)
        {
            return null;
        }

        if (actorRole != UserRole.TeamLead)
        {
            throw new ForbiddenException("You do not have permission to list users.");
        }

        var actor = await _admin.GetUserAsync(tenantId, actorId, cancellationToken)
            ?? throw new ForbiddenException("User profile not found.");

        if (actor.TeamId is null)
        {
            throw new ForbiddenException("Assign yourself to a team before managing users.");
        }

        return actor.TeamId;
    }

    private async Task AssertCanCreateUserAsync(
        Guid tenantId,
        Guid actorId,
        UserRole actorRole,
        CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        if (actorRole is UserRole.SuperAdmin or UserRole.Admin or UserRole.ItManager)
        {
            if (request.RoleId == (int)UserRole.SuperAdmin && actorRole != UserRole.SuperAdmin)
            {
                throw new ForbiddenException("Only super admins can create super admin accounts.");
            }
            return;
        }

        if (actorRole != UserRole.TeamLead)
        {
            throw new ForbiddenException("You do not have permission to create users.");
        }

        var actor = await _admin.GetUserAsync(tenantId, actorId, cancellationToken)
            ?? throw new ForbiddenException("User profile not found.");

        if (actor.TeamId is null)
        {
            throw new ForbiddenException("Assign yourself to a team before inviting users.");
        }

        if (request.RoleId != (int)UserRole.Engineer)
        {
            throw new ForbiddenException("Team leads can only invite engineers.");
        }

        if (request.TeamId.HasValue && request.TeamId != actor.TeamId)
        {
            throw new ForbiddenException("Team leads can only invite users to their own team.");
        }
    }

    private async Task<AdminUserEntity> GetManagedUserAsync(
        Guid tenantId,
        Guid actorId,
        UserRole actorRole,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var target = await _admin.GetUserAsync(tenantId, userId, cancellationToken)
            ?? throw new NotFoundException("User not found");

        if (actorRole is UserRole.SuperAdmin or UserRole.Admin or UserRole.ItManager)
        {
            return target;
        }

        if (actorRole != UserRole.TeamLead)
        {
            throw new ForbiddenException("You do not have permission to manage users.");
        }

        var actor = await _admin.GetUserAsync(tenantId, actorId, cancellationToken)
            ?? throw new ForbiddenException("User profile not found.");

        if (actor.TeamId is null || target.TeamId != actor.TeamId)
        {
            throw new ForbiddenException("You can only manage users on your own team.");
        }

        return target;
    }

    private static void AssertCanUpdateUser(UserRole actorRole, AdminUserEntity target, UpdateUserRequest request)
    {
        if (actorRole is UserRole.SuperAdmin or UserRole.Admin or UserRole.ItManager)
        {
            return;
        }

        if (request.TeamId.HasValue && request.TeamId != target.TeamId)
        {
            throw new ForbiddenException("Team leads cannot move users to another team.");
        }

        if (request.IsActive.HasValue && target.RoleId != (int)UserRole.Engineer)
        {
            throw new ForbiddenException("Team leads can only activate or deactivate engineers.");
        }
    }

    private static void AssertCanDeactivateUser(UserRole actorRole, AdminUserEntity target)
    {
        if (actorRole is UserRole.SuperAdmin or UserRole.Admin or UserRole.ItManager)
        {
            return;
        }

        if (target.RoleId != (int)UserRole.Engineer)
        {
            throw new ForbiddenException("Team leads can only deactivate engineers.");
        }
    }

    private async Task AssertCanManageTeamAsync(
        Guid tenantId,
        Guid actorId,
        UserRole actorRole,
        Guid teamId,
        UpdateTeamRequest request,
        CancellationToken cancellationToken)
    {
        if (actorRole is UserRole.SuperAdmin or UserRole.Admin or UserRole.ItManager)
        {
            return;
        }

        if (actorRole != UserRole.TeamLead)
        {
            throw new ForbiddenException("You do not have permission to manage teams.");
        }

        if (request.IsActive.HasValue)
        {
            throw new ForbiddenException("Team leads cannot activate or deactivate teams.");
        }

        var actor = await _admin.GetUserAsync(tenantId, actorId, cancellationToken)
            ?? throw new ForbiddenException("User profile not found.");

        if (actor.TeamId != teamId)
        {
            throw new ForbiddenException("You can only update your own team.");
        }
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
