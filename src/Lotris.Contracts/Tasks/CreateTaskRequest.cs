namespace Lotris.Contracts.Tasks;

public sealed record CreateTaskRequest(
    string Title,
    string? Description = null,
    string? TaskType = null,
    Guid? TeamId = null,
    IReadOnlyList<Guid>? AssigneeIds = null,
    DateTime? DueDate = null,
    int? ProgressOverride = null);
