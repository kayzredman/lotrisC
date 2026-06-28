namespace Lotris.Application.Tasks;

public interface ITaskRepository
{
    Task CreateAsync(TaskCreateModel task, CancellationToken cancellationToken = default);

    Task CreateAssignmentsAsync(
        IReadOnlyList<TaskAssignmentEntity> assignments,
        CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<TaskEntity> Rows, int Total)> ListAsync(
        TaskListFilters filters,
        CancellationToken cancellationToken = default);

    Task<TaskEntity?> GetByIdAsync(Guid tenantId, Guid taskId, CancellationToken cancellationToken = default);

    Task UpdateAsync(
        Guid tenantId,
        Guid taskId,
        TaskUpdateModel update,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TaskChecklistItemEntity>> GetChecklistItemsAsync(
        Guid taskId,
        CancellationToken cancellationToken = default);

    Task<int> GetMaxChecklistSortOrderAsync(Guid taskId, CancellationToken cancellationToken = default);

    Task CreateChecklistItemAsync(TaskChecklistItemEntity item, CancellationToken cancellationToken = default);

    Task<TaskChecklistItemEntity?> GetChecklistItemAsync(
        Guid taskId,
        Guid itemId,
        CancellationToken cancellationToken = default);

    Task ToggleChecklistItemAsync(
        Guid itemId,
        bool isCompleted,
        DateTime? completedAt,
        CancellationToken cancellationToken = default);

    Task DeleteChecklistItemAsync(Guid taskId, Guid itemId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TaskAssignmentEntity>> GetAssignmentsAsync(
        Guid taskId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Guid>> GetExistingAssigneeIdsAsync(
        Guid taskId,
        CancellationToken cancellationToken = default);

    Task MarkAssignmentCompleteAsync(
        Guid taskId,
        Guid assigneeId,
        DateTime completedAt,
        CancellationToken cancellationToken = default);

    Task<(int Total, int Done)> CountAssignmentsAsync(
        Guid taskId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Guid>> GetAssignedTaskIdsAsync(
        Guid tenantId,
        Guid assigneeId,
        CancellationToken cancellationToken = default);

    Task<bool> IsAssigneeAsync(Guid taskId, Guid userId, CancellationToken cancellationToken = default);

    Task PromoteToLeadAssignedAsync(Guid tenantId, Guid taskId, DateTime updatedAt, CancellationToken cancellationToken = default);

    Task<Guid?> GetUserTeamIdAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default);
}
