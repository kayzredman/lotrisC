using Lotris.Contracts;
using Lotris.Contracts.Auth;

namespace Lotris.Application.Auth;

public interface IAuthTokenService
{
    AuthResponse IssueToken(LotrisSession session);
}
