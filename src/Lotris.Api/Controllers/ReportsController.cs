using Lotris.Api.Auth;
using Lotris.Application.Reports;
using Lotris.Contracts.Reports;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/reports")]
public sealed class ReportsController : ControllerBase
{
    private readonly ReportService _reports;

    public ReportsController(ReportService reports)
    {
        _reports = reports;
    }

    [HttpPost("generate")]
    [ProducesResponseType(typeof(GenerateReportResponse), StatusCodes.Status202Accepted)]
    public async Task<IActionResult> Generate(
        [FromBody] GenerateReportRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _reports.GenerateReportAsync(HttpContext.GetLotrisSession(), request, cancellationToken);
        return Accepted(result);
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken) =>
        Ok(await _reports.ListReportsAsync(HttpContext.GetLotrisSession(), cancellationToken));

    [HttpGet("schedules")]
    public async Task<IActionResult> ListSchedules(CancellationToken cancellationToken) =>
        Ok(await _reports.ListSchedulesAsync(HttpContext.GetLotrisSession(), cancellationToken));

    [HttpPost("schedules")]
    [ProducesResponseType(typeof(CreateReportScheduleResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateSchedule(
        [FromBody] CreateReportScheduleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _reports.CreateScheduleAsync(HttpContext.GetLotrisSession(), request, cancellationToken);
        return CreatedAtAction(nameof(ListSchedules), result);
    }

    [HttpDelete("schedules/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteSchedule(Guid id, CancellationToken cancellationToken)
    {
        await _reports.DeleteScheduleAsync(HttpContext.GetLotrisSession(), id, cancellationToken);
        return NoContent();
    }

    [HttpGet("config")]
    public async Task<IActionResult> GetConfig(CancellationToken cancellationToken) =>
        Ok(await _reports.GetConfigAsync(HttpContext.GetLotrisSession(), cancellationToken));

    [HttpPatch("config")]
    [AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateConfig(
        [FromBody] UpdateReportConfigRequest request,
        CancellationToken cancellationToken)
    {
        await _reports.UpdateConfigAsync(HttpContext.GetLotrisSession(), request, cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:guid}/status")]
    public async Task<IActionResult> Status(Guid id, CancellationToken cancellationToken) =>
        Ok(await _reports.GetJobStatusAsync(HttpContext.GetLotrisSession(), id, cancellationToken));

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id, CancellationToken cancellationToken)
    {
        var filePath = await _reports.GetFilePathAsync(HttpContext.GetLotrisSession(), id, cancellationToken);
        if (!Path.IsPathRooted(filePath))
        {
            filePath = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), filePath));
        }

        var ext = Path.GetExtension(filePath);
        var contentType = ext.Equals(".pdf", StringComparison.OrdinalIgnoreCase)
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        var filename = $"lotris-report-{id}{ext}";
        return PhysicalFile(filePath, contentType, filename);
    }
}
