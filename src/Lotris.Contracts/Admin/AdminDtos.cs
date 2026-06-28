namespace Lotris.Contracts.Admin;

public sealed record CreateUserRequest(
    string Email,
    string FullName,
    int RoleId,
    Guid? TeamId = null,
    string? TemporaryPassword = null);

public sealed record CreateUserResponse(
    Guid Id,
    string Email,
    string FullName,
    int RoleId,
    Guid? TeamId,
    string? TemporaryPassword);

public sealed record UpdateUserRequest(string? FullName = null, Guid? TeamId = null);

public sealed record AssignRoleRequest(int RoleId);

public sealed record CreateTeamRequest(
    string Name,
    int? MaxTicketsPerEngineer = null,
    int? PickupSlaMinutes = null);

public sealed record UpdateTeamRequest(
    string? Name = null,
    int? MaxTicketsPerEngineer = null,
    int? PickupSlaMinutes = null,
    bool? IsActive = null);

public sealed record UserListItemDto(
    Guid Id,
    string Email,
    string FullName,
    int RoleId,
    string RoleName,
    Guid? TeamId,
    string? TeamName,
    bool IsActive,
    bool IsUnavailable);

public sealed record TeamListItemDto(
    Guid Id,
    string Name,
    int MaxTicketsPerEngineer,
    int PickupSlaMinutes,
    bool IsActive,
    int MemberCount);

public sealed record CreateTeamResponse(Guid Id);
