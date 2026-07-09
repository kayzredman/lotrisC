using Lotris.Contracts;
using Lotris.Contracts.Auth;

namespace Lotris.Application.Auth;

public interface IAuthTokenService
{
    Task<AuthResponse> IssueTokenAsync(LotrisSession session, CancellationToken cancellationToken = default);
    Task<AuthResponse?> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);
    Task RevokeRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);
}
