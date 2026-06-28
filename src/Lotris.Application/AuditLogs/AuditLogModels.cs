namespace Lotris.Application.AuditLogs;

public sealed class AuditLogEntity
{
    public long Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid UserId { get; init; }
    public string Action { get; init; } = "";
    public string? EntityType { get; init; }
    public string? EntityId { get; init; }
    public string? Details { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class AuditLogWriteModel
{
    public Guid TenantId { get; init; }
    public Guid UserId { get; init; }
    public string Action { get; init; } = "";
    public string? EntityType { get; init; }
    public string? EntityId { get; init; }
    public string? Details { get; init; }
    public DateTime CreatedAt { get; init; }
}
