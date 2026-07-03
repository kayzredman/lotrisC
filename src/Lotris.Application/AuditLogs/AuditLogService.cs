using Lotris.Contracts;
using Lotris.Contracts.AuditLogs;

namespace Lotris.Application.AuditLogs;

public class AuditLogService
{
    private readonly IAuditLogRepository _auditLogs;

    public AuditLogService(IAuditLogRepository auditLogs)
    {
        _auditLogs = auditLogs;
    }

    public async Task<AuditLogListResponse> ListAsync(
        LotrisSession session,
        AuditLogListQuery query,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var limit = Math.Min(200, Math.Max(1, query.Limit));
        var (rows, total) = await _auditLogs.ListAsync(session.TenantId, page, limit, cancellationToken);

        var items = rows.Select(r => new AuditLogDto(
            r.Id,
            r.UserId,
            r.Action,
            r.EntityType,
            r.EntityId,
            r.Details,
            r.CreatedAt)).ToList();

        return new AuditLogListResponse(items, total, page, limit);
    }
}
