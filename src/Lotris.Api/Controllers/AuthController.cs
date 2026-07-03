using Lotris.Application.Auth;
using Lotris.Contracts;
using Lotris.Contracts.Auth;
using Lotris.Domain;
using Lotris.Infrastructure.Auth;
using Lotris.Infrastructure.Identity;
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

    public AuthController(
        UserManager<LotrisIdentityUser> userManager,
        IAuthTokenService tokenService,
        ILegacyUserProvisioner legacyProvisioner,
        IOptions<AuthOptions> authOptions)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _legacyProvisioner = legacyProvisioner;
        _authOptions = authOptions.Value;
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
