namespace Lotris.Application.Tickets;

public sealed class TicketEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public string Title { get; init; } = "";
    public string Description { get; init; } = "";
    public int Priority { get; init; }
    public string Status { get; init; } = "";
    public Guid? TeamId { get; init; }
    public string? TeamName { get; init; }
    public Guid? AssigneeId { get; init; }
    public Guid CreatedBy { get; init; }
    public string Source { get; init; } = "INTERNAL";
    public string? RequesterEmail { get; init; }
    public string? RequesterName { get; init; }
    public Guid? RelatedTicketId { get; init; }
    public DateTime? SlaPickupDeadline { get; init; }
    public DateTime? SlaResolutionDeadline { get; init; }
    public bool SlaPickupBreached { get; init; }
    public bool SlaResolutionBreached { get; init; }
    public string SlaWarningLevel { get; init; } = "NONE";
    public DateTime? AssignedAt { get; init; }
    public DateTime? ResolvedAt { get; init; }
    public DateTime? ClosedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class TicketListFilters
{
    public Guid TenantId { get; set; }
    public Guid? AssigneeIdFilter { get; set; }
    public IReadOnlyList<Guid>? VisibleTeamIds { get; set; }
    public bool FallbackToAssigneeOnly { get; set; }
    public string? Status { get; set; }
    public int? Priority { get; set; }
    public Guid? TeamId { get; set; }
    public Guid? AssigneeId { get; set; }
    public string? Source { get; set; }
    public string? SlaWarning { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; }
    public int Limit { get; set; }
}

public sealed class TicketStatusUpdate
{
    public string Status { get; set; } = "";
    public Guid? TeamId { get; set; }
    public Guid? AssigneeId { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? AssignedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime? SlaResolutionDeadline { get; set; }
}

public sealed class TicketCreateModel
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public string Title { get; init; } = "";
    public string Description { get; init; } = "";
    public int Priority { get; init; }
    public string Status { get; init; } = "";
    public string Source { get; init; } = "INTERNAL";
    public string? RequesterEmail { get; init; }
    public string? RequesterName { get; init; }
    public Guid? RelatedTicketId { get; init; }
    public Guid? TeamId { get; init; }
    public Guid CreatedBy { get; init; }
    public DateTime? SlaPickupDeadline { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class HistoryEntry
{
    public Guid TenantId { get; init; }
    public Guid TicketId { get; init; }
    public Guid? ActorId { get; init; }
    public string EventType { get; init; } = "";
    public string? FromValue { get; init; }
    public string? ToValue { get; init; }
    public string? Metadata { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class TicketCommentEntity
{
    public Guid Id { get; init; }
    public Guid TicketId { get; init; }
    public Guid AuthorId { get; init; }
    public string Body { get; init; } = "";
    public bool IsInternal { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class TicketHistoryEntity
{
    public Guid? ActorId { get; init; }
    public string EventType { get; init; } = "";
    public string? FromValue { get; init; }
    public string? ToValue { get; init; }
    public string? Metadata { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class SlaConfig
{
    public int PickupSlaMinutes { get; init; } = 30;
    public int ResolutionSlaMinutes { get; init; } = 240;
}

public sealed class SlaWarningTicketEntity
{
    public Guid Id { get; init; }
    public string Title { get; init; } = "";
    public Guid? AssigneeId { get; init; }
    public string? AssigneeName { get; init; }
    public string SlaWarningLevel { get; init; } = "NONE";
    public DateTime? SlaResolutionDeadline { get; init; }
    public int? MinutesRemaining { get; init; }
}
