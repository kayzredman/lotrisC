using Lotris.Api.Auth;
using Lotris.Application.Kpi;
using Lotris.Contracts.Kpi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/kpi")]
public sealed class KpiController : ControllerBase
{
    private readonly KpiService _kpi;
    private readonly KpiImportService _import;

    public KpiController(KpiService kpi, KpiImportService import)
    {
        _kpi = kpi;
        _import = import;
    }

    [HttpGet("definitions")]
    public async Task<IActionResult> ListDefinitions(CancellationToken cancellationToken) =>
        Ok(await _kpi.ListDefinitionsAsync(HttpContext.GetLotrisSession(), cancellationToken));

    [HttpGet("definitions/{id:guid}")]
    public async Task<IActionResult> GetDefinition(Guid id, CancellationToken cancellationToken) =>
        Ok(await _kpi.GetDefinitionAsync(HttpContext.GetLotrisSession(), id, cancellationToken));

    [HttpPost("definitions")]
    public async Task<IActionResult> CreateDefinition(
        [FromBody] CreateKpiDefinitionRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _kpi.CreateDefinitionAsync(HttpContext.GetLotrisSession(), request, cancellationToken));

    [HttpPatch("definitions/{id:guid}")]
    public async Task<IActionResult> UpdateDefinition(
        Guid id,
        [FromBody] UpdateKpiDefinitionRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _kpi.UpdateDefinitionAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken));

    [HttpDelete("definitions/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ArchiveDefinition(Guid id, CancellationToken cancellationToken)
    {
        await _kpi.ArchiveDefinitionAsync(HttpContext.GetLotrisSession(), id, cancellationToken);
        return NoContent();
    }

    [HttpGet("definitions/{id:guid}/team-targets")]
    public async Task<IActionResult> GetTeamTargets(Guid id, CancellationToken cancellationToken) =>
        Ok(await _kpi.GetTeamTargetsAsync(HttpContext.GetLotrisSession(), id, cancellationToken));

    [HttpPatch("definitions/{id:guid}/team-targets")]
    public async Task<IActionResult> SetTeamTarget(
        Guid id,
        [FromBody] SetTeamTargetRequest request,
        CancellationToken cancellationToken)
    {
        await _kpi.SetTeamTargetAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken);
        return Ok(new { success = true });
    }

    [HttpGet("assignments")]
    public async Task<IActionResult> ListAssignments(
        [FromQuery] Guid? engineerId,
        [FromQuery] string? periodKey,
        CancellationToken cancellationToken) =>
        Ok(await _kpi.ListAssignmentsAsync(HttpContext.GetLotrisSession(), engineerId, periodKey, cancellationToken));

    [HttpPost("assignments")]
    public async Task<IActionResult> CreateAssignment(
        [FromBody] CreateKpiAssignmentRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _kpi.CreateAssignmentAsync(HttpContext.GetLotrisSession(), request, cancellationToken));

    [HttpGet("agreements")]
    public async Task<IActionResult> ListAgreements(
        [FromQuery] Guid? engineerId,
        [FromQuery] string? periodKey,
        CancellationToken cancellationToken) =>
        Ok(await _kpi.ListAgreementsAsync(HttpContext.GetLotrisSession(), engineerId, periodKey, cancellationToken));

    [HttpPost("agreements")]
    public async Task<IActionResult> CreateAgreement(
        [FromBody] CreateKpiAgreementRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _kpi.CreateAgreementAsync(HttpContext.GetLotrisSession(), request, cancellationToken));

    [HttpGet("agreements/{id:guid}")]
    public async Task<IActionResult> GetAgreement(Guid id, CancellationToken cancellationToken) =>
        Ok(await _kpi.GetAgreementWithAreasAsync(HttpContext.GetLotrisSession(), id, cancellationToken));

    [HttpPatch("agreements/{id:guid}/areas")]
    public async Task<IActionResult> UpsertAreas(
        Guid id,
        [FromBody] UpsertAgreementAreasRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _kpi.UpsertAgreementAreasAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken));

    [HttpPost("agreements/{id:guid}/submit")]
    public async Task<IActionResult> SubmitAgreement(Guid id, CancellationToken cancellationToken) =>
        Ok(await _kpi.SubmitAgreementAsync(HttpContext.GetLotrisSession(), id, cancellationToken));

    [HttpPost("agreements/{id:guid}/accept")]
    public async Task<IActionResult> AcceptAgreement(Guid id, CancellationToken cancellationToken) =>
        Ok(await _kpi.AcceptAgreementAsync(HttpContext.GetLotrisSession(), id, cancellationToken));

    [HttpPost("agreements/{id:guid}/upload")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadAgreementFile(
        Guid id,
        IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded" });
        }

        await using var stream = file.OpenReadStream();
        return Ok(await _import.ParseUploadAsync(
            HttpContext.GetLotrisSession(),
            id,
            stream,
            file.FileName,
            cancellationToken));
    }

    [HttpPost("agreements/{id:guid}/import")]
    public async Task<IActionResult> ImportAgreementRows(
        Guid id,
        [FromBody] ImportColumnMappingRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _import.ImportWithMappingAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken));

    [HttpPost("agreements/{id:guid}/score")]
    public async Task<IActionResult> ComputeScore(Guid id, CancellationToken cancellationToken) =>
        Ok(await _kpi.ComputeScoreAsync(HttpContext.GetLotrisSession(), id, cancellationToken));

    [HttpGet("agreements/{id:guid}/result")]
    public async Task<IActionResult> GetResult(Guid id, CancellationToken cancellationToken) =>
        Ok(await _kpi.GetResultAsync(HttpContext.GetLotrisSession(), id, cancellationToken));

    [HttpGet("actuals")]
    public async Task<IActionResult> ListActuals(
        [FromQuery] Guid? engineerId,
        [FromQuery] Guid? metricId,
        CancellationToken cancellationToken) =>
        Ok(await _kpi.ListActualsAsync(HttpContext.GetLotrisSession(), engineerId, metricId, cancellationToken));

    [HttpPost("actuals")]
    public async Task<IActionResult> CreateActual(
        [FromBody] CreateActualRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _kpi.CreateActualAsync(HttpContext.GetLotrisSession(), request, cancellationToken));
}
