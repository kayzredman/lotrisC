using Lotris.Api.Auth;
using Lotris.Application.Onboarding;
using Lotris.Contracts.Onboarding;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin)]
[Route("api/v1/onboarding")]
public sealed class OnboardingController : ControllerBase
{
    private readonly OnboardingService _onboarding;

    public OnboardingController(OnboardingService onboarding)
    {
        _onboarding = onboarding;
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _onboarding.GetStatusAsync(session.TenantId, cancellationToken));
    }

    [HttpPost("org")]
    public async Task<IActionResult> SaveOrg(
        [FromBody] SaveOnboardingOrgRequest request,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _onboarding.SaveOrgAsync(session.TenantId, request, cancellationToken);
        return Ok(new OnboardingActionResponse(true));
    }

    [HttpPost("sla")]
    public async Task<IActionResult> SaveSla(
        [FromBody] SaveOnboardingSlaRequest request,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        await _onboarding.SaveSlaAsync(session.TenantId, request, cancellationToken);
        return Ok(new OnboardingActionResponse(true));
    }

    [HttpPost("kpi-template")]
    public async Task<IActionResult> SetKpiTemplate(
        [FromBody] SetOnboardingKpiTemplateRequest request,
        CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _onboarding.SetKpiTemplateAsync(session.TenantId, request, cancellationToken));
    }

    [HttpPost("complete")]
    public async Task<IActionResult> Complete(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        return Ok(await _onboarding.CompleteAsync(session.TenantId, cancellationToken));
    }
}
