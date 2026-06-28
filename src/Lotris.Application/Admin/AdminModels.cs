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
