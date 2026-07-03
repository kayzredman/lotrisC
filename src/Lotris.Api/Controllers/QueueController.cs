using Lotris.Api.Auth;
using Lotris.Application.Queue;
using Lotris.Contracts.Queue;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/queue")]
public sealed class QueueController : ControllerBase
{
    private readonly QueueService _queue;

    public QueueController(QueueService queue)
    {
        _queue = queue;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] QueueListQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _queue.ListQueueAsync(HttpContext.GetLotrisSession(), query, cancellationToken));
    }

    [HttpPost("claim/{ticketId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Claim(Guid ticketId, CancellationToken cancellationToken)
    {
        return Ok(await _queue.ClaimTicketAsync(HttpContext.GetLotrisSession(), ticketId, cancellationToken));
    }

    [HttpGet("health")]
    [ProducesResponseType(typeof(QueueHealthResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Health(CancellationToken cancellationToken)
    {
        return Ok(await _queue.GetQueueHealthAsync(HttpContext.GetLotrisSession(), cancellationToken));
    }

    [HttpGet("config")]
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin, UserRole.ItManager)]
    [ProducesResponseType(typeof(QueueConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConfig([FromQuery] Guid? teamId, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _queue.GetQueueConfigAsync(session.TenantId, teamId, cancellationToken));
    }

    [HttpPatch("config")]
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin)]
    [ProducesResponseType(typeof(QueueConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateConfig(
        [FromBody] UpdateQueueConfigRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _queue.UpsertQueueConfigAsync(HttpContext.GetLotrisSession(), request, cancellationToken));
    }
}
