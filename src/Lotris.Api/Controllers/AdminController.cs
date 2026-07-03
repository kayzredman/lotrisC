using Lotris.Api.Auth;
using Lotris.Application.Admin;
using Lotris.Contracts.Admin;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin)]
[Route("api/v1/admin")]
public sealed class AdminController : ControllerBase
{
    private readonly AdminService _admin;

    public AdminController(AdminService admin)
    {
        _admin = admin;
    }

    [HttpGet("users")]
    public async Task<IActionResult> ListUsers(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _admin.ListUsersAsync(session.TenantId, cancellationToken));
    }

    [HttpPost("users")]
    [ProducesResponseType(typeof(CreateUserResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        var created = await _admin.CreateUserAsync(session.TenantId, session.UserId, request, cancellationToken);
        return CreatedAtAction(nameof(ListUsers), created);
    }

    [HttpPatch("users/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateUser(
        Guid id,
        [FromBody] UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.UpdateUserAsync(session.TenantId, session.UserId, id, request, cancellationToken);
        return NoContent();
    }

    [HttpDelete("users/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeactivateUser(Guid id, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.DeactivateUserAsync(session.TenantId, session.UserId, id, cancellationToken);
        return NoContent();
    }

    [HttpPatch("users/{id:guid}/role")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> AssignRole(
        Guid id,
        [FromBody] AssignRoleRequest request,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.AssignRoleAsync(session.TenantId, session.UserId, id, request.RoleId, cancellationToken);
        return NoContent();
    }

    [HttpGet("teams")]
    public async Task<IActionResult> ListTeams(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _admin.ListTeamsAsync(session.TenantId, cancellationToken));
    }

    [HttpPost("teams")]
    [ProducesResponseType(typeof(CreateTeamResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequest request, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        var created = await _admin.CreateTeamAsync(session.TenantId, session.UserId, request, cancellationToken);
        return CreatedAtAction(nameof(ListTeams), created);
    }

    [HttpPatch("teams/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateTeam(
        Guid id,
        [FromBody] UpdateTeamRequest request,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.UpdateTeamAsync(session.TenantId, session.UserId, id, request, cancellationToken);
        return NoContent();
    }

    [HttpGet("team-access")]
    public async Task<IActionResult> ListTeamAccess(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _admin.ListTeamAccessGrantsAsync(session.TenantId, cancellationToken));
    }

    [HttpPost("team-access")]
    [ProducesResponseType(typeof(GrantTeamAccessResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> GrantTeamAccess(
        [FromBody] GrantTeamAccessRequest request,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        var result = await _admin.GrantTeamAccessAsync(session.TenantId, session.UserId, request, cancellationToken);
        return CreatedAtAction(nameof(ListTeamAccess), result);
    }

    [HttpDelete("team-access/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RevokeTeamAccess(Guid id, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.RevokeTeamAccessAsync(session.TenantId, session.UserId, id, cancellationToken);
        return NoContent();
    }

    [HttpGet("category-routing")]
    public async Task<IActionResult> ListCategoryRouting(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _admin.ListCategoryRoutingAsync(session.TenantId, cancellationToken));
    }

    [HttpPut("category-routing")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpsertCategoryRouting(
        [FromBody] UpsertCategoryRoutingRequest request,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.UpsertCategoryRoutingAsync(session.TenantId, session.UserId, request, cancellationToken);
        return NoContent();
    }

    [HttpDelete("category-routing/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteCategoryRouting(Guid id, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.DeleteCategoryRoutingAsync(session.TenantId, session.UserId, id, cancellationToken);
        return NoContent();
    }
}
