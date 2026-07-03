using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Lotris.Application.Auth;
using Lotris.Contracts;
using Lotris.Contracts.Auth;
using Lotris.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Lotris.Infrastructure.Auth;

public class JwtTokenService : IAuthTokenService
{
    private readonly JwtOptions _jwtOptions;
    private readonly string _signingKey;

    public JwtTokenService(IOptions<JwtOptions> jwtOptions, IConfiguration configuration)
    {
        _jwtOptions = jwtOptions.Value;
        _signingKey = configuration["JWT_SECRET"]
            ?? configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT signing key is not configured (JWT_SECRET or Jwt:Secret).");
    }

    public AuthResponse IssueToken(LotrisSession session)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwtOptions.ExpirationMinutes);
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_signingKey)),
            SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, session.UserId.ToString()),
            new(JwtRegisteredClaimNames.Email, session.Email),
            new("tenant_id", session.TenantId.ToString()),
            new(ClaimTypes.Role, session.Role.ToRoleName()),
            new("full_name", session.FullName),
        };

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        return new AuthResponse(accessToken, expiresAt, session);
    }
}
