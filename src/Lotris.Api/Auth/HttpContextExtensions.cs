using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Lotris.Contracts;
using Lotris.Domain;

namespace Lotris.Api.Auth;

public static class HttpContextExtensions
{
    public static LotrisSession GetLotrisSession(this HttpContext context)
    {
        var user = context.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            throw new UnauthorizedAccessException("Authentication required.");
        }

        var userIdClaim = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        var tenantClaim = user.FindFirstValue("tenant_id");
        var roleClaim = user.FindFirstValue(ClaimTypes.Role);
        var email = user.FindFirstValue(JwtRegisteredClaimNames.Email)
            ?? user.FindFirstValue(ClaimTypes.Email)
            ?? string.Empty;
        var fullName = user.FindFirstValue("full_name") ?? string.Empty;

        if (!Guid.TryParse(userIdClaim, out var userId) || !Guid.TryParse(tenantClaim, out var tenantId))
        {
            throw new UnauthorizedAccessException("Invalid session claims.");
        }

        var role = string.IsNullOrWhiteSpace(roleClaim)
            ? UserRole.Engineer
            : UserRoleExtensions.FromRoleName(roleClaim);

        return new LotrisSession(userId, tenantId, role, email, fullName);
    }
}
