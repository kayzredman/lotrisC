using Lotris.Contracts.Auth;
using Lotris.Contracts;

namespace Lotris.Application.Auth;

public interface IRefreshTokenRepository
{
    Task<RefreshTokenRecord> CreateAsync(
        Guid userId,
        Guid tenantId,
        string tokenHash,
        DateTime expiresAt,
        CancellationToken cancellationToken = default);

    Task<RefreshTokenRecord?> GetActiveByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);

    Task RevokeAsync(
        Guid id,
        Guid? replacedByTokenId = null,
        CancellationToken cancellationToken = default);

    Task TouchAsync(Guid id, CancellationToken cancellationToken = default);
}

public sealed class RefreshTokenRecord
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public Guid TenantId { get; init; }
    public string TokenHash { get; init; } = "";
    public DateTime ExpiresAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? LastUsedAt { get; init; }
    public DateTime? RevokedAt { get; init; }
    public Guid? ReplacedByTokenId { get; init; }
}
