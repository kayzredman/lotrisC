using Lotris.Api.Auth;
using Lotris.Application.Tickets;
using Lotris.Contracts.Tickets;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/tickets")]
public sealed class TicketsController : ControllerBase
{
    private readonly TicketService _tickets;

    public TicketsController(TicketService tickets)
    {
        _tickets = tickets;
    }

    [HttpPost]
    [ProducesResponseType(typeof(TicketDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateTicketRequest request, CancellationToken cancellationToken)
    {
        var created = await _tickets.CreateAsync(HttpContext.GetLotrisSession(), request, cancellationToken);
        return CreatedAtAction(nameof(GetOne), new { id = created.Id }, created);
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<TicketDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] TicketListQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _tickets.ListAsync(HttpContext.GetLotrisSession(), query, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(TicketDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOne(Guid id, CancellationToken cancellationToken)
    {
        return Ok(await _tickets.GetByIdAsync(HttpContext.GetLotrisSession(), id, cancellationToken));
    }

    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(TicketDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateTicketStatusRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _tickets.UpdateStatusAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken));
    }

    [HttpPost("{id:guid}/comments")]
    [ProducesResponseType(typeof(CreateCommentResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> AddComment(
        Guid id,
        [FromBody] CreateCommentRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _tickets.AddCommentAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken);
        return CreatedAtAction(nameof(GetComments), new { id }, result);
    }

    [HttpGet("{id:guid}/comments")]
    [ProducesResponseType(typeof(IReadOnlyList<TicketCommentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetComments(Guid id, CancellationToken cancellationToken)
    {
        return Ok(await _tickets.GetCommentsAsync(HttpContext.GetLotrisSession(), id, cancellationToken));
    }

    [HttpPost("{id:guid}/attachments")]
    [ProducesResponseType(typeof(CreateAttachmentResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> AddAttachment(
        Guid id,
        [FromBody] CreateAttachmentRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _tickets.AddAttachmentAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken);
        return CreatedAtAction(nameof(GetOne), new { id }, result);
    }

    [HttpGet("{id:guid}/history")]
    [ProducesResponseType(typeof(IReadOnlyList<TicketHistoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHistory(Guid id, CancellationToken cancellationToken)
    {
        return Ok(await _tickets.GetHistoryAsync(HttpContext.GetLotrisSession(), id, cancellationToken));
    }

    [HttpPost("batch-reassign")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager, UserRole.TeamLead)]
    [ProducesResponseType(typeof(BatchReassignResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> BatchReassign(
        [FromBody] BatchReassignRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _tickets.BatchReassignAsync(HttpContext.GetLotrisSession(), request, cancellationToken));
    }
}
