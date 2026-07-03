using Lotris.Api.Auth;
using Lotris.Application.Intelligence;
using Lotris.Contracts.Intelligence;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/admin/intelligence")]
public sealed class AdminIntelligenceController : ControllerBase
{
    private readonly IntelligenceService _intelligence;

    public AdminIntelligenceController(IntelligenceService intelligence) => _intelligence = intelligence;

    [HttpGet]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(IntelligenceConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
        => Ok(await _intelligence.GetConfigAsync(HttpContext.GetLotrisSession(), cancellationToken));

    [HttpPut]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(IntelligenceConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update([FromBody] UpdateIntelligenceConfigRequest request, CancellationToken cancellationToken)
        => Ok(await _intelligence.UpdateConfigAsync(HttpContext.GetLotrisSession(), request, cancellationToken));

    [HttpPost("connect-entra")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(IntelligenceConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ConnectEntra([FromBody] ConnectEntraRequest request, CancellationToken cancellationToken)
        => Ok(await _intelligence.ConnectEntraAsync(HttpContext.GetLotrisSession(), request, cancellationToken));
}

[ApiController]
[Authorize]
[Route("api/v1/intelligence")]
public sealed class IntelligenceController : ControllerBase
{
    private readonly IntelligenceService _intelligence;

    public IntelligenceController(IntelligenceService intelligence) => _intelligence = intelligence;

    [HttpPost("knowledge/query")]
    [ProducesResponseType(typeof(KnowledgeQueryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> QueryKnowledge([FromBody] KnowledgeQueryRequest request, CancellationToken cancellationToken)
        => Ok(await _intelligence.QueryAsync(HttpContext.GetLotrisSession(), request, cancellationToken));

    [HttpGet("knowledge/search")]
    [ProducesResponseType(typeof(IReadOnlyList<KnowledgeSearchResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchKnowledge([FromQuery] string q, [FromQuery] int? topK, CancellationToken cancellationToken)
        => Ok(await _intelligence.SearchAsync(HttpContext.GetLotrisSession().TenantId, q, topK ?? 8, cancellationToken));
}
