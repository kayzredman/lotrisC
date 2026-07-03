using Lotris.Api.Auth;
using Lotris.Application.Intelligence;
using Lotris.Application.ProblemManagement;
using Lotris.Contracts.Intelligence;
using Lotris.Contracts.ProblemManagement;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/rca")]
public sealed class RcaController : ControllerBase
{
    private readonly RcaService _rca;
    private readonly IntelligenceService _intelligence;

    public RcaController(RcaService rca, IntelligenceService intelligence)
    {
        _rca = rca;
        _intelligence = intelligence;
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(RcaDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
        => Ok(await _rca.GetByIdAsync(HttpContext.GetLotrisSession(), id, cancellationToken));

    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(RcaDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRcaRequest request, CancellationToken cancellationToken)
        => Ok(await _rca.UpdateAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken));

    [HttpPost("{id:guid}/submit")]
    [ProducesResponseType(typeof(RcaDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Submit(Guid id, CancellationToken cancellationToken)
        => Ok(await _rca.SubmitForReviewAsync(HttpContext.GetLotrisSession(), id, cancellationToken));

    [HttpPost("{id:guid}/publish")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager, UserRole.TeamLead)]
    [ProducesResponseType(typeof(RcaDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Publish(Guid id, CancellationToken cancellationToken)
        => Ok(await _rca.PublishAsync(HttpContext.GetLotrisSession(), id, cancellationToken));

    [HttpPost("{id:guid}/delegate")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager, UserRole.TeamLead)]
    [ProducesResponseType(typeof(RcaDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AssignDelegate(Guid id, [FromBody] AssignRcaDelegateRequest request, CancellationToken cancellationToken)
        => Ok(await _rca.AssignDelegateAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken));

    [HttpPost("{id:guid}/link-ticket")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager, UserRole.TeamLead)]
    [ProducesResponseType(typeof(RcaDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> LinkTicket(Guid id, [FromBody] LinkTicketRequest request, CancellationToken cancellationToken)
        => Ok(await _rca.LinkTicketAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken));

    [HttpPost("{id:guid}/actions")]
    [ProducesResponseType(typeof(Lotris.Contracts.ProblemManagement.RcaActionDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> AddAction(Guid id, [FromBody] RcaActionCreateRequest request, CancellationToken cancellationToken)
    {
        var action = await _rca.AddActionAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id }, action);
    }

    [HttpPost("{id:guid}/suggest")]
    [ProducesResponseType(typeof(RcaSuggestResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Suggest(Guid id, CancellationToken cancellationToken)
        => Ok(await _intelligence.SuggestRcaAsync(HttpContext.GetLotrisSession(), id, cancellationToken));
}

[ApiController]
[Authorize]
[Route("api/v1/knowledge")]
public sealed class KnowledgeController : ControllerBase
{
    private readonly RcaService _rca;

    public KnowledgeController(RcaService rca) => _rca = rca;

    [HttpGet("known-errors")]
    [ProducesResponseType(typeof(IReadOnlyList<KnownErrorDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListKnownErrors(CancellationToken cancellationToken)
        => Ok(await _rca.ListKnownErrorsAsync(HttpContext.GetLotrisSession(), cancellationToken));
}

[ApiController]
[Authorize]
[Route("api/v1/admin/rca-settings")]
public sealed class RcaSettingsController : ControllerBase
{
    private readonly RcaService _rca;

    public RcaSettingsController(RcaService rca) => _rca = rca;

    [HttpGet]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(RcaTriggerRulesDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
        => Ok(await _rca.GetTriggerRulesAsync(HttpContext.GetLotrisSession(), cancellationToken));

    [HttpPut]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(RcaTriggerRulesDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update([FromBody] UpdateRcaTriggerRulesRequest request, CancellationToken cancellationToken)
        => Ok(await _rca.UpdateTriggerRulesAsync(HttpContext.GetLotrisSession(), request, cancellationToken));
}
