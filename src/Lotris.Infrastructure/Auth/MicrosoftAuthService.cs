using System.Security.Claims;
using Lotris.Application.Auth;
using Lotris.Contracts;
using Lotris.Contracts.Auth;
using Lotris.Domain;
using Lotris.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Lotris.Infrastructure.Auth;

public sealed class MicrosoftAuthService
{
    private readonly UserManager<LotrisIdentityUser> _userManager;
    private readonly IAuthTokenService _tokenService;
    private readonly ILegacyUserProvisioner _legacyProvisioner;
    private readonly EntraAuthOptions _entraOptions;
    private readonly AuthOptions _authOptions;
    private readonly ILogger<MicrosoftAuthService> _logger;

    public MicrosoftAuthService(
        UserManager<LotrisIdentityUser> userManager,
        IAuthTokenService tokenService,
        ILegacyUserProvisioner legacyProvisioner,
        IOptions<EntraAuthOptions> entraOptions,
        IOptions<AuthOptions> authOptions,
        ILogger<MicrosoftAuthService> logger)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _legacyProvisioner = legacyProvisioner;
        _entraOptions = entraOptions.Value;
        _authOptions = authOptions.Value;
        _logger = logger;
    }

    public async Task<AuthResponse> SignInAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        var email = principal.FindFirstValue(ClaimTypes.Email)
            ?? principal.FindFirstValue("preferred_username")
            ?? principal.FindFirstValue("upn");
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("Microsoft sign-in did not return an email address.");
        }

        var fullName = principal.FindFirstValue(ClaimTypes.Name)
            ?? principal.FindFirstValue("name")
            ?? email;
        var oid = principal.FindFirstValue("oid")
            ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? email;

        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = await ProvisionMicrosoftUserAsync(email, fullName, oid, cancellationToken);
        }
        else
        {
            await EnsureMicrosoftLoginAsync(user, oid);
        }

        return await _tokenService.IssueTokenAsync(ToSession(user), cancellationToken);
    }

    private async Task<LotrisIdentityUser> ProvisionMicrosoftUserAsync(
        string email,
        string fullName,
        string oid,
        CancellationToken cancellationToken)
    {
        var tenantId = _entraOptions.DefaultTenantId ?? _authOptions.DefaultTenantId
            ?? throw new InvalidOperationException("Configure Auth:Providers:Entra:DefaultTenantId for Microsoft JIT sign-in.");

        var userId = Guid.NewGuid();
        var user = new LotrisIdentityUser
        {
            Id = userId,
            UserName = email,
            Email = email,
            FullName = fullName,
            TenantId = tenantId,
            RoleId = _entraOptions.DefaultRoleId,
            EmailConfirmed = true,
        };

        var password = $"Ms-{Guid.NewGuid():N}!aA1";
        var createResult = await _userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            throw new InvalidOperationException(
                "Failed to create Microsoft user: " + string.Join("; ", createResult.Errors.Select(e => e.Description)));
        }

        await _userManager.AddLoginAsync(user, new UserLoginInfo("Microsoft", oid, "Microsoft"));

        try
        {
            await _legacyProvisioner.ProvisionAsync(new LegacyUserProvisionRequest
            {
                UserId = userId,
                Email = email,
                FullName = fullName,
                RoleId = _entraOptions.DefaultRoleId,
                TenantId = tenantId,
                CreateTenant = false,
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            await _userManager.DeleteAsync(user);
            _logger.LogError(ex, "Legacy provisioning failed for Microsoft user {Email}", email);
            throw;
        }

        return user;
    }

    private async Task EnsureMicrosoftLoginAsync(LotrisIdentityUser user, string oid)
    {
        var logins = await _userManager.GetLoginsAsync(user);
        if (logins.All(l => l.LoginProvider != "Microsoft"))
        {
            await _userManager.AddLoginAsync(user, new UserLoginInfo("Microsoft", oid, "Microsoft"));
        }
    }

    private static LotrisSession ToSession(LotrisIdentityUser user) => new(
        user.Id,
        user.TenantId,
        (UserRole)user.RoleId,
        user.Email ?? string.Empty,
        user.FullName);
}
