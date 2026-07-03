using Lotris.Api.Auth;
using Lotris.Application.Auth;
using Lotris.Contracts;
using Lotris.Contracts.Auth;
using Lotris.Domain;
using Lotris.Infrastructure.Auth;
using Lotris.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Lotris.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<LotrisIdentityUser> _userManager;
    private readonly IAuthTokenService _tokenService;
    private readonly ILegacyUserProvisioner _legacyProvisioner;
    private readonly AuthOptions _authOptions;
    private readonly EntraAuthOptions _entraOptions;
    private readonly IConfiguration _configuration;
    private readonly MicrosoftAuthService? _microsoftAuth;

    public AuthController(
        UserManager<LotrisIdentityUser> userManager,
        IAuthTokenService tokenService,
        ILegacyUserProvisioner legacyProvisioner,
        IOptions<AuthOptions> authOptions,
        IOptions<EntraAuthOptions> entraOptions,
        IConfiguration configuration,
        MicrosoftAuthService? microsoftAuth = null)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _legacyProvisioner = legacyProvisioner;
        _authOptions = authOptions.Value;
        _entraOptions = entraOptions.Value;
        _configuration = configuration;
        _microsoftAuth = microsoftAuth;
    }

    [HttpGet("providers")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Providers()
        => Ok(new
        {
            identity = _authOptions.IdentityEnabled,
            microsoft = _entraOptions.Enabled &&
                        !string.IsNullOrWhiteSpace(_entraOptions.ClientId) &&
                        !string.IsNullOrWhiteSpace(_entraOptions.TenantId),
        });

    [HttpGet("microsoft/login")]
    [AllowAnonymous]
    public IActionResult MicrosoftLogin([FromQuery] string? returnUrl)
    {
        if (!_entraOptions.Enabled)
        {
            return BadRequest(new { message = "Microsoft sign-in is not enabled." });
        }

        var props = new AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(MicrosoftComplete)) ?? "/api/v1/auth/microsoft/complete",
            Items = { ["returnUrl"] = returnUrl ?? "/dashboard" },
        };

        return Challenge(props, EntraAuthenticationExtensions.MicrosoftScheme);
    }

    [HttpGet("microsoft/complete")]
    [AllowAnonymous]
    public async Task<IActionResult> MicrosoftComplete(CancellationToken cancellationToken)
    {
        if (_microsoftAuth is null)
        {
            return BadRequest(new { message = "Microsoft sign-in is not configured." });
        }

        var authenticate = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        if (!authenticate.Succeeded || authenticate.Principal is null)
        {
            return Unauthorized(new { message = "Microsoft authentication failed." });
        }

        var auth = await _microsoftAuth.SignInAsync(authenticate.Principal, cancellationToken);
        var returnUrl = authenticate.Properties?.Items.TryGetValue("returnUrl", out var ru) == true && !string.IsNullOrWhiteSpace(ru)
            ? ru
            : "/dashboard";

        var webUrl = (_configuration["App:WebUrl"] ?? _configuration["Cors:AllowedOrigins"] ?? "http://localhost:3000")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)[0];

        var redirect = new UriBuilder(webUrl)
        {
            Path = "/auth/callback",
            Query = $"access_token={Uri.EscapeDataString(auth.AccessToken)}&expires_at={Uri.EscapeDataString(auth.ExpiresAt.ToString("O"))}&returnUrl={Uri.EscapeDataString(returnUrl)}",
        };

        return Redirect(redirect.Uri.ToString());
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var validPassword = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!validPassword)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var session = ToSession(user);
        return Ok(_tokenService.IssueToken(session));
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        if (!_authOptions.IdentityEnabled)
        {
            return BadRequest(new { message = "Identity registration is disabled." });
        }

        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            return BadRequest(new { message = "A user with this email already exists." });
        }

        var createTenant = !string.IsNullOrWhiteSpace(request.TenantName);
        Guid tenantId;

        if (createTenant)
        {
            tenantId = Guid.NewGuid();
        }
        else
        {
            tenantId = request.TenantId is { } tid && tid != Guid.Empty
                ? tid
                : _authOptions.DefaultTenantId ?? Guid.Empty;
        }

        if (tenantId == Guid.Empty)
        {
            return BadRequest(new { message = "TenantId is required (or provide TenantName / configure Auth:DefaultTenantId)." });
        }

        var userId = Guid.NewGuid();
        var user = new LotrisIdentityUser
        {
            Id = userId,
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            TenantId = tenantId,
            RoleId = (int)request.Role,
            EmailConfirmed = true,
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(new
            {
                message = "Registration failed.",
                errors = createResult.Errors.Select(e => e.Description),
            });
        }

        try
        {
            await _legacyProvisioner.ProvisionAsync(new LegacyUserProvisionRequest
            {
                UserId = userId,
                Email = request.Email,
                FullName = request.FullName,
                RoleId = (int)request.Role,
                TenantId = tenantId,
                TenantName = request.TenantName,
                TenantSlug = request.TenantSlug,
                CreateTenant = createTenant,
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            await _userManager.DeleteAsync(user);
            return BadRequest(new { message = "Legacy user provisioning failed.", detail = ex.Message });
        }

        var session = ToSession(user);
        return CreatedAtAction(nameof(Login), _tokenService.IssueToken(session));
    }

    private static LotrisSession ToSession(LotrisIdentityUser user) =>
        new(
            user.Id,
            user.TenantId,
            (UserRole)user.RoleId,
            user.Email ?? string.Empty,
            user.FullName);
}
