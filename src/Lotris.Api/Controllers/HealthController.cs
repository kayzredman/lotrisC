using System.Text.Json;
using System.Text.Json.Serialization;
using Lotris.Api.Auth;
using Lotris.Application.Health;
using Lotris.Contracts.Health;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Lotris.Api.Controllers;

[ApiController]
[Route("health")]
public class HealthController : ControllerBase
{
    private static readonly JsonSerializerOptions SseJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HealthCheckService _healthCheckService;
    private readonly ISystemHealthService _systemHealth;

    public HealthController(
        HealthCheckService healthCheckService,
        ISystemHealthService systemHealth)
    {
        _healthCheckService = healthCheckService;
        _systemHealth = systemHealth;
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

    /// <summary>Full system health snapshot — services, queues, metrics (ADMIN).</summary>
    [Authorize]
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin)]
    [HttpGet("snapshot")]
    [ProducesResponseType(typeof(HealthSnapshotDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSnapshot(CancellationToken cancellationToken) =>
        Ok(await _systemHealth.GetSnapshotAsync(cancellationToken));

    /// <summary>Live SSE health stream — emits a snapshot every second (ADMIN).</summary>
    [Authorize]
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin)]
    [HttpGet("sse")]
    public async Task StreamSnapshot(CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-cache, no-transform";
        Response.Headers.Connection = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";
        Response.ContentType = "text/event-stream";

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                var snapshot = await _systemHealth.GetSnapshotAsync(cancellationToken);
                await Response.WriteAsync(
                    $"data: {JsonSerializer.Serialize(snapshot, SseJson)}\n\n",
                    cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken);
        }
    }

    /// <summary>Recent service incidents from audit log (ADMIN).</summary>
    [Authorize]
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin)]
    [HttpGet("incidents")]
    [ProducesResponseType(typeof(IReadOnlyList<IncidentEntryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetIncidents([FromQuery] int limit = 20, CancellationToken cancellationToken = default) =>
        Ok(await _systemHealth.GetIncidentsAsync(limit, cancellationToken));

    /// <summary>Request a service restart — 60s cooldown, audit logged (ADMIN).</summary>
    [Authorize]
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin)]
    [HttpPost("restart/{serviceName}")]
    [ProducesResponseType(typeof(RestartServiceResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> RestartService(string serviceName, CancellationToken cancellationToken) =>
        Ok(await _systemHealth.RequestRestartAsync(serviceName, HttpContext.GetLotrisSession(), cancellationToken));
}
