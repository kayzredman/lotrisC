namespace Lotris.Application.Auth;

public sealed class UserAccountCreateRequest
{
    public required Guid TenantId { get; init; }
    public required string Email { get; init; }
    public required string FullName { get; init; }
    public required int RoleId { get; init; }
    public Guid? TeamId { get; init; }
    public required string Password { get; init; }
}

public sealed class UserAccountCreateResult
{
    public required Guid UserId { get; init; }
}

public interface IUserAccountCreator
{
    Task<UserAccountCreateResult> CreateAsync(
        UserAccountCreateRequest request,
        CancellationToken cancellationToken = default);
}
