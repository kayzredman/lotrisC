using Lotris.Api.Auth;
using Lotris.Application.Analytics;
using Lotris.Contracts.Analytics;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin)]
[Route("api/v1/admin/analytics-jobs")]
public sealed class AnalyticsJobsController : ControllerBase
{
    private readonly AnalyticsJobsService _jobs;

    public AnalyticsJobsController(AnalyticsJobsService jobs)
    {
        _jobs = jobs;
    }

    [HttpGet("config")]
    [ProducesResponseType(typeof(AnalyticsJobConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConfig(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _jobs.GetConfigAsync(session, cancellationToken));
    }

    [HttpPatch("config")]
    [ProducesResponseType(typeof(AnalyticsJobConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> PatchConfig(
        [FromBody] PatchAnalyticsJobConfigRequest request,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _jobs.UpdateConfigAsync(session, request, cancellationToken));
    }

    [HttpPost("{jobKey}/run-now")]
    [ProducesResponseType(typeof(RunAnalyticsJobResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> RunNow(string jobKey, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _jobs.RunNowAsync(session, jobKey, cancellationToken));
    }

    [HttpGet("status")]
    [ProducesResponseType(typeof(AnalyticsJobStatusResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _jobs.GetStatusAsync(session, cancellationToken));
    }
}
