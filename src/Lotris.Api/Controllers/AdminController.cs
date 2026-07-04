using Lotris.Api.Auth;
using Lotris.Application.Admin;
using Lotris.Contracts.Admin;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/admin")]
public sealed class AdminController : ControllerBase
{
    private readonly AdminService _admin;

    public AdminController(AdminService admin)
    {
        _admin = admin;
    }

    [HttpGet("users")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager, UserRole.TeamLead)]
    public async Task<IActionResult> ListUsers(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _admin.ListUsersAsync(session.TenantId, session.UserId, session.Role, cancellationToken));
    }

    [HttpPost("users")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager, UserRole.TeamLead)]
    [ProducesResponseType(typeof(CreateUserResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        var created = await _admin.CreateUserAsync(session.TenantId, session.UserId, session.Role, request, cancellationToken);
        return CreatedAtAction(nameof(ListUsers), created);
    }

    [HttpPatch("users/{id:guid}")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager, UserRole.TeamLead)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateUser(
        Guid id,
        [FromBody] UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.UpdateUserAsync(session.TenantId, session.UserId, session.Role, id, request, cancellationToken);
        return NoContent();
    }

    [HttpDelete("users/{id:guid}")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager, UserRole.TeamLead)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeactivateUser(Guid id, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.DeactivateUserAsync(session.TenantId, session.UserId, session.Role, id, cancellationToken);
        return NoContent();
    }

    [HttpPatch("users/{id:guid}/role")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> AssignRole(
        Guid id,
        [FromBody] AssignRoleRequest request,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.AssignRoleAsync(session.TenantId, session.UserId, session.Role, id, request.RoleId, cancellationToken);
        return NoContent();
    }

    [HttpGet("teams")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager, UserRole.TeamLead)]
    public async Task<IActionResult> ListTeams(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _admin.ListTeamsAsync(session.TenantId, cancellationToken));
    }

    [HttpPost("teams")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(CreateTeamResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequest request, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        var created = await _admin.CreateTeamAsync(session.TenantId, session.UserId, session.Role, request, cancellationToken);
        return CreatedAtAction(nameof(ListTeams), created);
    }

    [HttpPatch("teams/{id:guid}")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager, UserRole.TeamLead)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateTeam(
        Guid id,
        [FromBody] UpdateTeamRequest request,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.UpdateTeamAsync(session.TenantId, session.UserId, session.Role, id, request, cancellationToken);
        return NoContent();
    }

    [HttpGet("team-access")]
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin, UserRole.ItManager)]
    public async Task<IActionResult> ListTeamAccess(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _admin.ListTeamAccessGrantsAsync(session.TenantId, cancellationToken));
    }

    [HttpPost("team-access")]
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin, UserRole.ItManager)]
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
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin, UserRole.ItManager)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RevokeTeamAccess(Guid id, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.RevokeTeamAccessAsync(session.TenantId, session.UserId, id, cancellationToken);
        return NoContent();
    }

    [HttpGet("category-routing")]
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin, UserRole.ItManager)]
    public async Task<IActionResult> ListCategoryRouting(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _admin.ListCategoryRoutingAsync(session.TenantId, cancellationToken));
    }

    [HttpPut("category-routing")]
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin, UserRole.ItManager)]
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
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin, UserRole.ItManager)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteCategoryRouting(Guid id, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _admin.DeleteCategoryRoutingAsync(session.TenantId, session.UserId, id, cancellationToken);
        return NoContent();
    }
}
