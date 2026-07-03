namespace Lotris.Contracts.Auth;

public sealed record CurrentUserDto(
    Guid Id,
    Guid TenantId,
    string Email,
    string FullName,
    int RoleId,
    string RoleName,
    Guid? TeamId);
