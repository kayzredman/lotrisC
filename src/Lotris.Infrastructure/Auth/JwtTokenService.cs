using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using Lotris.Application.Auth;
using Lotris.Contracts;
using Lotris.Contracts.Auth;
using Lotris.Domain;
using Lotris.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Lotris.Infrastructure.Auth;

public class JwtTokenService : IAuthTokenService
{
    private readonly JwtOptions _jwtOptions;
    private readonly string _signingKey;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly UserManager<LotrisIdentityUser> _userManager;

    public JwtTokenService(
        IOptions<JwtOptions> jwtOptions,
        IConfiguration configuration,
        IRefreshTokenRepository refreshTokens,
        UserManager<LotrisIdentityUser> userManager)
    {
        _jwtOptions = jwtOptions.Value;
        _signingKey = configuration["JWT_SECRET"]
            ?? configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT signing key is not configured (JWT_SECRET or Jwt:Secret).");
        _refreshTokens = refreshTokens;
        _userManager = userManager;
    }

    public async Task<AuthResponse> IssueTokenAsync(LotrisSession session, CancellationToken cancellationToken = default)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwtOptions.ExpirationMinutes);
        var refreshExpiresAt = DateTime.UtcNow.AddDays(_jwtOptions.RefreshExpirationDays);
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
        var refreshToken = CreateRefreshToken();
        await _refreshTokens.CreateAsync(
            session.UserId,
            session.TenantId,
            HashRefreshToken(refreshToken),
            refreshExpiresAt,
            cancellationToken);

        return new AuthResponse(accessToken, refreshToken, expiresAt, session);
    }

    public async Task<AuthResponse?> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return null;
        }

        var existing = await _refreshTokens.GetActiveByTokenHashAsync(HashRefreshToken(refreshToken), cancellationToken);
        if (existing is null)
        {
            return null;
        }

        var user = await _userManager.FindByIdAsync(existing.UserId.ToString());
        if (user is null)
        {
            await _refreshTokens.RevokeAsync(existing.Id, cancellationToken: cancellationToken);
            return null;
        }

        var next = await IssueTokenAsync(ToSession(user), cancellationToken);
        var nextRecord = await _refreshTokens.GetActiveByTokenHashAsync(HashRefreshToken(next.RefreshToken), cancellationToken);
        await _refreshTokens.TouchAsync(existing.Id, cancellationToken);
        await _refreshTokens.RevokeAsync(existing.Id, nextRecord?.Id, cancellationToken);
        return next;
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return;
        }

        var existing = await _refreshTokens.GetActiveByTokenHashAsync(HashRefreshToken(refreshToken), cancellationToken);
        if (existing is not null)
        {
            await _refreshTokens.RevokeAsync(existing.Id, cancellationToken: cancellationToken);
        }
    }

    private static string CreateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Base64UrlEncoder.Encode(bytes);
    }

    private static string HashRefreshToken(string refreshToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));
        return Convert.ToHexString(bytes);
    }

    private static LotrisSession ToSession(LotrisIdentityUser user) => new(
        user.Id,
        user.TenantId,
        (UserRole)user.RoleId,
        user.Email ?? string.Empty,
        user.FullName);
}
