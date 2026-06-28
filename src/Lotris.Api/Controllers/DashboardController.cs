using Lotris.Api.Auth;
using Lotris.Application.Analytics;
using Lotris.Contracts.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/dashboard")]
public sealed class DashboardController : ControllerBase
{
    private readonly DashboardService _dashboard;

    public DashboardController(DashboardService dashboard)
    {
        _dashboard = dashboard;
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(DashboardSummary), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _dashboard.GetSummaryAsync(session, cancellationToken));
    }

    [HttpGet("ticket-analytics")]
    [ProducesResponseType(typeof(TicketAnalyticsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTicketAnalytics(
        [FromQuery] int days = 7,
        CancellationToken cancellationToken = default)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _dashboard.GetTicketAnalyticsAsync(session, days, cancellationToken));
    }

    [HttpGet("engineer-perf")]
    [ProducesResponseType(typeof(IReadOnlyList<DashboardEngineerPerfItem>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEngineerPerf(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _dashboard.GetEngineerPerfAsync(session, cancellationToken));
    }

    [HttpGet("queue-health")]
    [ProducesResponseType(typeof(DashboardQueueHealth), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQueueHealth(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _dashboard.GetQueueHealthAsync(session, cancellationToken));
    }

    [HttpGet("team-workload")]
    [ProducesResponseType(typeof(IReadOnlyList<TeamWorkloadItem>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTeamWorkload(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _dashboard.GetTeamWorkloadAsync(session, cancellationToken));
    }
}
