namespace Lotris.Application.Admin;

public sealed class AdminUserEntity
{
    public Guid Id { get; init; }
    public string Email { get; init; } = "";
    public string FullName { get; init; } = "";
    public int RoleId { get; init; }
    public string RoleName { get; init; } = "";
    public Guid? TeamId { get; init; }
    public string? TeamName { get; init; }
    public bool IsActive { get; init; }
    public bool IsUnavailable { get; init; }
}

public sealed class AdminTeamEntity
{
    public Guid Id { get; init; }
    public string Name { get; init; } = "";
    public int MaxTicketsPerEngineer { get; init; }
    public int PickupSlaMinutes { get; init; }
    public bool IsActive { get; init; }
    public int MemberCount { get; init; }
}

public sealed class AdminUserUpdateModel
{
    public string? FullName { get; init; }
    public Guid? TeamId { get; init; }
    public bool ClearTeam { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class AdminTeamCreateModel
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public string Name { get; init; } = "";
    public int MaxTicketsPerEngineer { get; init; }
    public int PickupSlaMinutes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class AdminTeamUpdateModel
{
    public string? Name { get; init; }
    public int? MaxTicketsPerEngineer { get; init; }
    public int? PickupSlaMinutes { get; init; }
    public bool? IsActive { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class TeamAccessGrantEntity
{
    public Guid Id { get; init; }
    public Guid GranteeUserId { get; init; }
    public string GranteeName { get; init; } = "";
    public Guid TargetTeamId { get; init; }
    public string TargetTeamName { get; init; } = "";
    public Guid GrantedBy { get; init; }
    public string GrantedByName { get; init; } = "";
    public DateTime CreatedAt { get; init; }
}

public sealed class CategoryRoutingEntity
{
    public Guid Id { get; init; }
    public string Category { get; init; } = "";
    public Guid TeamId { get; init; }
    public string TeamName { get; init; } = "";
    public int DefaultPriority { get; init; }
}
