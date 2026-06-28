namespace Lotris.Contracts.AuditLogs;

public sealed class AuditLogListQuery
{
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 50;
}

public sealed record AuditLogDto(
    long Id,
    Guid UserId,
    string Action,
    string? EntityType,
    string? EntityId,
    string? Details,
    DateTime CreatedAt);

public sealed record AuditLogListResponse(
    IReadOnlyList<AuditLogDto> Items,
    int Total,
    int Page,
    int Limit);
