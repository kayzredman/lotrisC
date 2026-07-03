using Lotris.Application.Analytics;
using Lotris.Contracts.Analytics;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Route("api/v1/monitor")]
public sealed class MonitorController : ControllerBase
{
    private readonly IMonitorStatsService _monitor;

    public MonitorController(IMonitorStatsService monitor)
    {
        _monitor = monitor;
    }

    [HttpGet("stats")]
    [ProducesResponseType(typeof(MonitorStatsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats(CancellationToken cancellationToken)
    {
        return Ok(await _monitor.GetStatsAsync(cancellationToken));
    }
}
