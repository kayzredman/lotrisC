namespace Lotris.Contracts.Tasks;

public sealed record UpdateTaskRequest(
    string? Title = null,
    string? Description = null,
    string? TaskType = null,
    string? Status = null,
    DateTime? DueDate = null,
    int? ProgressOverride = null);
