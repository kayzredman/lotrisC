using Lotris.Api.Auth;
using Lotris.Application.AuditLogs;
using Lotris.Contracts.AuditLogs;
using Lotris.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[AuthorizeRoles(UserRole.Admin, UserRole.SuperAdmin, UserRole.ItManager)]
[Route("api/v1/audit-logs")]
public sealed class AuditLogsController : ControllerBase
{
    private readonly AuditLogService _auditLogs;

    public AuditLogsController(AuditLogService auditLogs)
    {
        _auditLogs = auditLogs;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AuditLogListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] AuditLogListQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _auditLogs.ListAsync(HttpContext.GetLotrisSession(), query, cancellationToken));
    }
}
