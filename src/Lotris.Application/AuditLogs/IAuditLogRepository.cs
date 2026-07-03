namespace Lotris.Application.AuditLogs;

public interface IAuditLogRepository
{
    Task WriteAsync(AuditLogWriteModel entry, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<AuditLogEntity> Rows, int Total)> ListAsync(
        Guid tenantId,
        int page,
        int limit,
        CancellationToken cancellationToken = default);
}
