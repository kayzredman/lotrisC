namespace Lotris.Application.Auth;

public sealed class LegacyUserProvisionRequest
{
    public required Guid UserId { get; init; }
    public required string Email { get; init; }
    public required string FullName { get; init; }
    public required int RoleId { get; init; }
    public Guid TenantId { get; init; }
    public Guid? TeamId { get; init; }
    public string? TenantName { get; init; }
    public string? TenantSlug { get; init; }
    public bool CreateTenant { get; init; }
}

public sealed class LegacyUserProvisionResult
{
    public required Guid TenantId { get; init; }
    public required Guid UserId { get; init; }
}

public sealed class LegacyUserProfile
{
    public required Guid Id { get; init; }
    public required Guid TenantId { get; init; }
    public required string Email { get; init; }
    public required string FullName { get; init; }
    public required int RoleId { get; init; }
    public Guid? TeamId { get; init; }
}

public interface ILegacyUserProvisioner
{
    Task<LegacyUserProvisionResult> ProvisionAsync(
        LegacyUserProvisionRequest request,
        CancellationToken cancellationToken = default);

    Task<LegacyUserProfile?> GetUserProfileAsync(
        Guid userId,
        Guid tenantId,
        CancellationToken cancellationToken = default);
}
