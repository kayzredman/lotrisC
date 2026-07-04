using Lotris.Api.Auth;
using Lotris.Application.ProblemManagement;
using Lotris.Contracts.ProblemManagement;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/problems")]
public sealed class ProblemsController : ControllerBase
{
    private readonly RcaService _rca;

    public ProblemsController(RcaService rca) => _rca = rca;

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProblemListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] string? filter, CancellationToken cancellationToken)
        => Ok(await _rca.ListAsync(HttpContext.GetLotrisSession(), filter, cancellationToken));

    [HttpPost]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager, UserRole.TeamLead)]
    [ProducesResponseType(typeof(RcaDetailDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateProblemRequest request, CancellationToken cancellationToken)
    {
        var created = await _rca.CreateAsync(HttpContext.GetLotrisSession(), request, cancellationToken);
        return CreatedAtAction(nameof(RcaController.GetById), "Rca", new { id = created.Id }, created);
    }

    [HttpGet("stats")]
    [ProducesResponseType(typeof(RcaDashboardStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Stats(CancellationToken cancellationToken)
        => Ok(await _rca.GetDashboardStatsAsync(HttpContext.GetLotrisSession(), cancellationToken));
}
