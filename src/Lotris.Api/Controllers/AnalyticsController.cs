using Lotris.Api.Auth;
using Lotris.Application.Analytics;
using Lotris.Contracts.Analytics;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/analytics")]
public sealed class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsQueryService _analytics;
    private readonly IWorkloadAnalyser _workload;

    public AnalyticsController(IAnalyticsQueryService analytics, IWorkloadAnalyser workload)
    {
        _analytics = analytics;
        _workload = workload;
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

    [HttpGet("team-workload")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager, UserRole.TeamLead)]
    [ProducesResponseType(typeof(TeamWorkloadResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTeamWorkload(
        [FromQuery] Guid teamId,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _workload.AnalyseTeamAsync(session.TenantId, teamId, cancellationToken));
    }
}
