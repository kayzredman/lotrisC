namespace Lotris.Contracts.Tasks;

public sealed record TaskChecklistItemDto(
    Guid Id,
    string Label,
    int SortOrder,
    bool IsCompleted,
    DateTime? CompletedAt,
    DateTime CreatedAt);

public sealed record TaskAssignmentDto(
    Guid Id,
    Guid AssigneeId,
    bool IsCompleted,
    DateTime? CompletedAt,
    DateTime AssignedAt);

public sealed record TaskDto(
    Guid Id,
    Guid TenantId,
    Guid? TeamId,
    string Title,
    string? Description,
    string TaskType,
    string Source,
    string Status,
    int? ProgressOverride,
    int Progress,
    DateTime? DueDate,
    Guid CreatedBy,
    DateTime? CompletedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<TaskChecklistItemDto> ChecklistItems,
    IReadOnlyList<TaskAssignmentDto> Assignments);

public sealed record TaskListResponse(
    IReadOnlyList<TaskDto> Items,
    int Total,
    int Page,
    int Limit);
