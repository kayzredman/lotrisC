using Lotris.Application.Common;
using Lotris.Contracts;
using Lotris.Contracts.Tasks;
using Lotris.Domain;

namespace Lotris.Application.Tasks;

public class TaskService
{
    private static readonly UserRole[] LeadRoles =
    [
        UserRole.SuperAdmin,
        UserRole.Admin,
        UserRole.ItManager,
        UserRole.TeamLead,
    ];

    private readonly ITaskRepository _tasks;

    public TaskService(ITaskRepository tasks)
    {
        _tasks = tasks;
    }

    public async Task<TaskDto> CreateAsync(
        LotrisSession session,
        CreateTaskRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new BadRequestException("Title is required.");
        }

        var taskType = request.TaskType ?? TaskType.AdHoc;
        if (!TaskType.All.Contains(taskType))
        {
            throw new BadRequestException($"Invalid task type: {taskType}");
        }

        var isLead = IsLeadRole(session.Role);
        var hasAssignees = request.AssigneeIds is { Count: > 0 };
        var source = isLead && hasAssignees ? TaskSource.LeadAssigned : TaskSource.SelfLogged;

        if (source == TaskSource.SelfLogged && hasAssignees)
        {
            throw new BadRequestException("Non-leads cannot assign tasks to others");
        }

        var now = DateTime.UtcNow;
        var id = Guid.NewGuid();

        await _tasks.CreateAsync(new TaskCreateModel
        {
            Id = id,
            TenantId = session.TenantId,
            TeamId = request.TeamId,
            Title = request.Title.Trim(),
            Description = request.Description,
            TaskType = taskType,
            Source = source,
            Status = TaskStatus.Open,
            ProgressOverride = request.ProgressOverride,
            DueDate = request.DueDate,
            CreatedBy = session.UserId,
            CreatedAt = now,
            UpdatedAt = now,
        }, cancellationToken);

        if (source == TaskSource.LeadAssigned && request.AssigneeIds is { Count: > 0 })
        {
            var assignments = request.AssigneeIds.Select(assigneeId => new TaskAssignmentEntity
            {
                Id = Guid.NewGuid(),
                TenantId = session.TenantId,
                TaskId = id,
                AssigneeId = assigneeId,
                IsCompleted = false,
                AssignedAt = now,
            }).ToList();

            await _tasks.CreateAssignmentsAsync(assignments, cancellationToken);
        }

        return await GetByIdAsync(session, id, cancellationToken);
    }

    public async Task<TaskListResponse> ListAsync(
        LotrisSession session,
        TaskListQuery query,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var limit = Math.Min(100, Math.Max(1, query.Limit));
        var isLead = IsLeadRole(session.Role);

        var filters = new TaskListFilters
        {
            TenantId = session.TenantId,
            Status = query.Status,
            Source = query.Source,
            TeamId = query.TeamId,
            UserId = session.UserId,
            IsLead = isLead,
            Page = page,
            Limit = limit,
        };

        if (session.Role == UserRole.TeamLead && !query.TeamId.HasValue)
        {
            filters.LeadTeamId = await GetUserTeamIdAsync(session, cancellationToken);
        }

        if (!isLead)
        {
            filters.AssignedTaskIds = await _tasks.GetAssignedTaskIdsAsync(
                session.TenantId,
                session.UserId,
                cancellationToken);
        }

        var (rows, total) = await _tasks.ListAsync(filters, cancellationToken);
        var items = new List<TaskDto>();
        foreach (var row in rows)
        {
            items.Add(await EnrichAsync(row, cancellationToken));
        }

        return new TaskListResponse(items, total, page, limit);
    }

    public async Task<TaskDto> GetByIdAsync(
        LotrisSession session,
        Guid taskId,
        CancellationToken cancellationToken = default)
    {
        var task = await GetEntityOrThrowAsync(session, taskId, cancellationToken);
        await AssertVisibilityAsync(session, task, cancellationToken);
        return await EnrichAsync(task, cancellationToken);
    }

    public async Task<TaskDto> UpdateAsync(
        LotrisSession session,
        Guid taskId,
        UpdateTaskRequest request,
        CancellationToken cancellationToken = default)
    {
        await GetByIdAsync(session, taskId, cancellationToken);
        var now = DateTime.UtcNow;
        var update = new TaskUpdateModel { UpdatedAt = now };

        if (request.Title is not null) update = update with { Title = request.Title };
        if (request.Description is not null) update = update with { Description = request.Description };
        if (request.TaskType is not null)
        {
            if (!TaskType.All.Contains(request.TaskType))
            {
                throw new BadRequestException($"Invalid task type: {request.TaskType}");
            }

            update = update with { TaskType = request.TaskType };
        }

        if (request.DueDate.HasValue) update = update with { DueDate = request.DueDate };
        if (request.ProgressOverride.HasValue) update = update with { ProgressOverride = request.ProgressOverride };

        if (request.Status is not null)
        {
            update = update with { Status = request.Status };
            if (request.Status == TaskStatus.Completed)
            {
                update = update with { CompletedAt = now, ProgressOverride = 100 };
            }
        }

        await _tasks.UpdateAsync(session.TenantId, taskId, update, cancellationToken);
        return await GetByIdAsync(session, taskId, cancellationToken);
    }

    public async Task<IReadOnlyList<TaskChecklistItemDto>> AddChecklistItemAsync(
        LotrisSession session,
        Guid taskId,
        CreateChecklistItemRequest request,
        CancellationToken cancellationToken = default)
    {
        await GetByIdAsync(session, taskId, cancellationToken);
        var now = DateTime.UtcNow;
        var maxOrder = await _tasks.GetMaxChecklistSortOrderAsync(taskId, cancellationToken);
        var sortOrder = request.SortOrder ?? (maxOrder + 1);

        await _tasks.CreateChecklistItemAsync(new TaskChecklistItemEntity
        {
            Id = Guid.NewGuid(),
            TenantId = session.TenantId,
            TaskId = taskId,
            Label = request.Label,
            SortOrder = sortOrder,
            IsCompleted = false,
            CreatedAt = now,
        }, cancellationToken);

        var items = await _tasks.GetChecklistItemsAsync(taskId, cancellationToken);
        return items.Select(ToChecklistDto).ToList();
    }

    public async Task<TaskDto> ToggleChecklistItemAsync(
        LotrisSession session,
        Guid taskId,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        await GetByIdAsync(session, taskId, cancellationToken);
        var item = await _tasks.GetChecklistItemAsync(taskId, itemId, cancellationToken);
        if (item is null)
        {
            throw new NotFoundException($"Checklist item {itemId} not found");
        }

        var now = DateTime.UtcNow;
        var nowCompleted = !item.IsCompleted;
        await _tasks.ToggleChecklistItemAsync(
            itemId,
            nowCompleted,
            nowCompleted ? now : null,
            cancellationToken);

        await RecomputeProgressAsync(session.TenantId, taskId, cancellationToken);
        return await GetByIdAsync(session, taskId, cancellationToken);
    }

    public async Task<object> DeleteChecklistItemAsync(
        LotrisSession session,
        Guid taskId,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        await GetByIdAsync(session, taskId, cancellationToken);
        await _tasks.DeleteChecklistItemAsync(taskId, itemId, cancellationToken);
        await RecomputeProgressAsync(session.TenantId, taskId, cancellationToken);
        return new { success = true };
    }

    public async Task<TaskDto> AddAssigneesAsync(
        LotrisSession session,
        Guid taskId,
        AddAssigneesRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsLeadRole(session.Role))
        {
            throw new ForbiddenException("Only leads can assign tasks");
        }

        await GetByIdAsync(session, taskId, cancellationToken);
        var now = DateTime.UtcNow;
        var existing = await _tasks.GetExistingAssigneeIdsAsync(taskId, cancellationToken);
        var existingSet = existing.ToHashSet();
        var newIds = request.AssigneeIds.Where(id => !existingSet.Contains(id)).ToList();

        if (newIds.Count > 0)
        {
            var assignments = newIds.Select(assigneeId => new TaskAssignmentEntity
            {
                Id = Guid.NewGuid(),
                TenantId = session.TenantId,
                TaskId = taskId,
                AssigneeId = assigneeId,
                IsCompleted = false,
                AssignedAt = now,
            }).ToList();

            await _tasks.CreateAssignmentsAsync(assignments, cancellationToken);
            await _tasks.PromoteToLeadAssignedAsync(session.TenantId, taskId, now, cancellationToken);
        }

        return await GetByIdAsync(session, taskId, cancellationToken);
    }

    public async Task<TaskDto> MarkAssignmentCompleteAsync(
        LotrisSession session,
        Guid taskId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        await _tasks.MarkAssignmentCompleteAsync(taskId, session.UserId, now, cancellationToken);

        var (total, done) = await _tasks.CountAssignmentsAsync(taskId, cancellationToken);
        if (total > 0 && total == done)
        {
            await _tasks.UpdateAsync(session.TenantId, taskId, new TaskUpdateModel
            {
                Status = TaskStatus.Completed,
                CompletedAt = now,
                ProgressOverride = 100,
                UpdatedAt = now,
            }, cancellationToken);
        }

        return await GetByIdAsync(session, taskId, cancellationToken);
    }

    private async Task<TaskEntity> GetEntityOrThrowAsync(
        LotrisSession session,
        Guid taskId,
        CancellationToken cancellationToken)
    {
        var task = await _tasks.GetByIdAsync(session.TenantId, taskId, cancellationToken);
        if (task is null)
        {
            throw new NotFoundException($"Task {taskId} not found");
        }

        return task;
    }

    private async Task AssertVisibilityAsync(
        LotrisSession session,
        TaskEntity task,
        CancellationToken cancellationToken)
    {
        if (IsLeadRole(session.Role) || task.CreatedBy == session.UserId)
        {
            return;
        }

        if (await _tasks.IsAssigneeAsync(task.Id, session.UserId, cancellationToken))
        {
            return;
        }

        throw new ForbiddenException("Access denied");
    }

    private async Task RecomputeProgressAsync(
        Guid tenantId,
        Guid taskId,
        CancellationToken cancellationToken)
    {
        var items = await _tasks.GetChecklistItemsAsync(taskId, cancellationToken);
        if (items.Count == 0)
        {
            return;
        }

        var completed = items.Count(i => i.IsCompleted);
        var progress = (int)Math.Round(completed / (double)items.Count * 100);
        var now = DateTime.UtcNow;
        var update = new TaskUpdateModel
        {
            ProgressOverride = progress,
            UpdatedAt = now,
        };

        if (progress == 100)
        {
            update = update with { Status = TaskStatus.Completed, CompletedAt = now };
        }

        await _tasks.UpdateAsync(tenantId, taskId, update, cancellationToken);
    }

    private async Task<TaskDto> EnrichAsync(TaskEntity task, CancellationToken cancellationToken)
    {
        var checklistItems = await _tasks.GetChecklistItemsAsync(task.Id, cancellationToken);
        var assignments = await _tasks.GetAssignmentsAsync(task.Id, cancellationToken);

        var progress = checklistItems.Count > 0
            ? (int)Math.Round(checklistItems.Count(i => i.IsCompleted) / (double)checklistItems.Count * 100)
            : task.ProgressOverride ?? 0;

        return new TaskDto(
            task.Id,
            task.TenantId,
            task.TeamId,
            task.Title,
            task.Description,
            task.TaskType,
            task.Source,
            task.Status,
            task.ProgressOverride,
            progress,
            task.DueDate,
            task.CreatedBy,
            task.CompletedAt,
            task.CreatedAt,
            task.UpdatedAt,
            checklistItems.Select(ToChecklistDto).ToList(),
            assignments.Select(a => new TaskAssignmentDto(
                a.Id, a.AssigneeId, a.IsCompleted, a.CompletedAt, a.AssignedAt)).ToList());
    }

    private static TaskChecklistItemDto ToChecklistDto(TaskChecklistItemEntity item) =>
        new(item.Id, item.Label, item.SortOrder, item.IsCompleted, item.CompletedAt, item.CreatedAt);

    private static bool IsLeadRole(UserRole role) => LeadRoles.Contains(role);

    private Task<Guid?> GetUserTeamIdAsync(LotrisSession session, CancellationToken cancellationToken) =>
        _tasks.GetUserTeamIdAsync(session.TenantId, session.UserId, cancellationToken);
}
