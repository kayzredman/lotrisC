using Lotris.Api.Auth;
using Lotris.Application.Auth;
using Lotris.Contracts.Auth;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ILegacyUserProvisioner _users;

    public UsersController(ILegacyUserProvisioner users)
    {
        _users = users;
    }

    /// <summary>Current authenticated user profile (replaces tRPC users.me).</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(CurrentUserDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        var profile = await _users.GetUserProfileAsync(session.UserId, session.TenantId, cancellationToken);
        if (profile is null)
        {
            return NotFound(new { message = "User profile not found." });
        }

        return Ok(new CurrentUserDto(
            profile.Id,
            profile.TenantId,
            profile.Email,
            profile.FullName,
            profile.RoleId,
            ((UserRole)profile.RoleId).ToRoleName(),
            profile.TeamId));
    }
}
