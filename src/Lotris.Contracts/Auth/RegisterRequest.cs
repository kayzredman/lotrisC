using Lotris.Domain;

namespace Lotris.Contracts.Auth;

public record RegisterRequest(
    string Email,
    string Password,
    string FullName,
    Guid? TenantId = null,
    UserRole Role = UserRole.Engineer,
    string? TenantName = null,
    string? TenantSlug = null);
