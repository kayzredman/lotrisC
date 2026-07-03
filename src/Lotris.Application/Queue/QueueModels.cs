namespace Lotris.Application.Queue;

public sealed class QueueConfigEntity
{
    public int MaxCapacityPerEngineer { get; init; } = 10;
    public int PickupSlaMinutes { get; init; } = 30;
    public int ResolutionSlaMinutes { get; init; } = 240;
    public bool AutoAssignEnabled { get; init; } = true;
}

public sealed class QueueTicketEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public string Title { get; init; } = "";
    public string? Description { get; init; }
    public int Priority { get; init; }
    public string Status { get; init; } = "";
    public Guid? TeamId { get; init; }
    public string? TeamName { get; init; }
    public Guid? AssigneeId { get; init; }
    public Guid CreatedBy { get; init; }
    public DateTime? SlaPickupDeadline { get; init; }
    public DateTime? SlaResolutionDeadline { get; init; }
    public bool SlaPickupBreached { get; init; }
    public bool SlaResolutionBreached { get; init; }
    public DateTime? AssignedAt { get; init; }
    public DateTime? ResolvedAt { get; init; }
    public DateTime? ClosedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class QueueConfigUpsert
{
    public Guid TenantId { get; init; }
    public Guid? TeamId { get; init; }
    public int? MaxCapacityPerEngineer { get; init; }
    public int? PickupSlaMinutes { get; init; }
    public int? ResolutionSlaMinutes { get; init; }
    public bool? AutoAssignEnabled { get; init; }
}
