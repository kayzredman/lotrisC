namespace Lotris.Application.Tasks;

public sealed class TaskEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid? TeamId { get; init; }
    public string Title { get; init; } = "";
    public string? Description { get; init; }
    public string TaskType { get; init; } = "AD_HOC";
    public string Source { get; init; } = "SELF_LOGGED";
    public string Status { get; init; } = "OPEN";
    public int? ProgressOverride { get; init; }
    public DateTime? DueDate { get; init; }
    public Guid CreatedBy { get; init; }
    public DateTime? CompletedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class TaskChecklistItemEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid TaskId { get; init; }
    public string Label { get; init; } = "";
    public int SortOrder { get; init; }
    public bool IsCompleted { get; init; }
    public DateTime? CompletedAt { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class TaskAssignmentEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid TaskId { get; init; }
    public Guid AssigneeId { get; init; }
    public bool IsCompleted { get; init; }
    public DateTime? CompletedAt { get; init; }
    public DateTime AssignedAt { get; init; }
}

public sealed class TaskListFilters
{
    public Guid TenantId { get; init; }
    public string? Status { get; init; }
    public string? Source { get; init; }
    public Guid? TeamId { get; init; }
    public Guid? UserId { get; set; }
    public bool IsLead { get; init; }
    public Guid? LeadTeamId { get; set; }
    public IReadOnlyList<Guid>? AssignedTaskIds { get; set; }
    public int Page { get; init; }
    public int Limit { get; init; }
}

public sealed class TaskCreateModel
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid? TeamId { get; init; }
    public string Title { get; init; } = "";
    public string? Description { get; init; }
    public string TaskType { get; init; } = "AD_HOC";
    public string Source { get; init; } = "SELF_LOGGED";
    public string Status { get; init; } = "OPEN";
    public int? ProgressOverride { get; init; }
    public DateTime? DueDate { get; init; }
    public Guid CreatedBy { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed record TaskUpdateModel
{
    public string? Title { get; init; }
    public string? Description { get; init; }
    public string? TaskType { get; init; }
    public string? Status { get; init; }
    public int? ProgressOverride { get; init; }
    public DateTime? DueDate { get; init; }
    public DateTime? CompletedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public static class TaskSource
{
    public const string LeadAssigned = "LEAD_ASSIGNED";
    public const string SelfLogged = "SELF_LOGGED";
}

public static class TaskStatus
{
    public const string Open = "OPEN";
    public const string InProgress = "IN_PROGRESS";
    public const string Completed = "COMPLETED";
    public const string Cancelled = "CANCELLED";
}

public static class TaskType
{
    public const string AdHoc = "AD_HOC";
    public static readonly HashSet<string> All =
    [
        "MAINTENANCE", "DR_BCP", "CHANGE_REQUEST", "DOCUMENTATION", "TRAINING", "AD_HOC",
    ];
}
