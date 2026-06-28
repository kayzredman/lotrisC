using Lotris.Contracts.Health;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Lotris.Api.Controllers;

[ApiController]
[Route("health")]
public class HealthController : ControllerBase
{
    private readonly HealthCheckService _healthCheckService;

    public HealthController(HealthCheckService healthCheckService)
    {
        _healthCheckService = healthCheckService;
    }

    /// <summary>Public liveness probe — API process is up.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(LivenessResponse), StatusCodes.Status200OK)]
    public IActionResult GetLiveness()
    {
        return Ok(new LivenessResponse("Healthy", DateTime.UtcNow));
    }

    /// <summary>Readiness probe — checks MSSQL, Redis, and other dependencies.</summary>
    [HttpGet("ready")]
    [ProducesResponseType(typeof(ReadinessResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ReadinessResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetReadiness(CancellationToken cancellationToken)
    {
        var report = await _healthCheckService.CheckHealthAsync(
            registration => registration.Tags.Contains("ready"),
            cancellationToken);

        var dependencies = report.Entries.ToDictionary(
            entry => entry.Key,
            entry => new DependencyHealth(
                entry.Value.Status.ToString(),
                entry.Value.Description,
                entry.Value.Duration.TotalMilliseconds));

        var overall = report.Status == HealthStatus.Healthy ? "Healthy" : "Unhealthy";
        var response = new ReadinessResponse(overall, dependencies, DateTime.UtcNow);

        return report.Status == HealthStatus.Healthy
            ? Ok(response)
            : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
    }
}
