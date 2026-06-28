using Lotris.Api.Auth;
using Lotris.Application.Analytics;
using Lotris.Contracts.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/analytics")]
public sealed class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsQueryService _analytics;

    public AnalyticsController(IAnalyticsQueryService analytics)
    {
        _analytics = analytics;
    }

    [HttpGet("sla-warnings")]
    [ProducesResponseType(typeof(SlaWarningsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSlaWarnings(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _analytics.GetSlaWarningsAsync(session, cancellationToken));
    }

    [HttpGet("kpi-trends")]
    [ProducesResponseType(typeof(KpiTrendsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetKpiTrends(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _analytics.GetKpiTrendsAsync(session, cancellationToken));
    }

    [HttpGet("my-kpi-trends")]
    [ProducesResponseType(typeof(KpiTrendsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyKpiTrends(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _analytics.GetMyKpiTrendsAsync(session, cancellationToken));
    }
}
