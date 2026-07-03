using System.Net.Http.Json;
using Lotris.Application.AuditLogs;
using Lotris.Application.Tasks;
using Lotris.Contracts.AuditLogs;
using Lotris.Contracts.Tasks;
using Lotris.Domain;
using Xunit;

namespace Lotris.Tests.Integration;

public class TaskLifecycleIntegrationTests : IClassFixture<LotrisWebApplicationFactory>
{
    private readonly LotrisWebApplicationFactory _factory;

    public TaskLifecycleIntegrationTests(LotrisWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateAndListTask_ReturnsCreatedTask()
    {
        var client = _factory.CreateAuthenticatedClient(UserRole.Admin);
        var createResponse = await client.PostAsJsonAsync("/api/v1/tasks", new CreateTaskRequest("Phase 2 task", Description: "Test"));
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<TaskDto>();
        Assert.NotNull(created);
        Assert.Equal("Phase 2 task", created.Title);
        Assert.Equal("OPEN", created.Status);

        var listResponse = await client.GetAsync("/api/v1/tasks");
        listResponse.EnsureSuccessStatusCode();
        var list = await listResponse.Content.ReadFromJsonAsync<TaskListResponse>();
        Assert.NotNull(list);
        Assert.Contains(list.Items, t => t.Id == created.Id);
    }
}

public class AuditLogRequiresAdminTests : IClassFixture<LotrisWebApplicationFactory>
{
    private readonly LotrisWebApplicationFactory _factory;

    public AuditLogRequiresAdminTests(LotrisWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ListAuditLogs_RequiresAdminRole()
    {
        var engineerClient = _factory.CreateAuthenticatedClient(UserRole.Engineer);
        var forbidden = await engineerClient.GetAsync("/api/v1/audit-logs");
        Assert.Equal(System.Net.HttpStatusCode.Forbidden, forbidden.StatusCode);

        var adminClient = _factory.CreateAuthenticatedClient(UserRole.Admin);
        var ok = await adminClient.GetAsync("/api/v1/audit-logs");
        ok.EnsureSuccessStatusCode();
        var body = await ok.Content.ReadFromJsonAsync<AuditLogListResponse>();
        Assert.NotNull(body);
    }
}

internal sealed class InMemoryTaskRepository : ITaskRepository
{
    private readonly Dictionary<Guid, TaskEntity> _tasks = new();
    private readonly Dictionary<Guid, List<TaskChecklistItemEntity>> _checklist = new();
    private readonly Dictionary<Guid, List<TaskAssignmentEntity>> _assignments = new();

    public Task CreateAsync(TaskCreateModel task, CancellationToken cancellationToken = default)
    {
        _tasks[task.Id] = new TaskEntity
        {
            Id = task.Id,
            TenantId = task.TenantId,
            TeamId = task.TeamId,
            Title = task.Title,
            Description = task.Description,
            TaskType = task.TaskType,
            Source = task.Source,
            Status = task.Status,
            ProgressOverride = task.ProgressOverride,
            DueDate = task.DueDate,
            CreatedBy = task.CreatedBy,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt,
        };
        return Task.CompletedTask;
    }

    public Task CreateAssignmentsAsync(IReadOnlyList<TaskAssignmentEntity> assignments, CancellationToken cancellationToken = default)
    {
        foreach (var group in assignments.GroupBy(a => a.TaskId))
        {
            if (!_assignments.ContainsKey(group.Key))
            {
                _assignments[group.Key] = [];
            }

            _assignments[group.Key].AddRange(group);
        }

        return Task.CompletedTask;
    }

    public Task<(IReadOnlyList<TaskEntity> Rows, int Total)> ListAsync(TaskListFilters filters, CancellationToken cancellationToken = default)
    {
        var rows = _tasks.Values.Where(t => t.TenantId == filters.TenantId).ToList();
        if (!filters.IsLead)
        {
            var assigned = filters.AssignedTaskIds ?? [];
            rows = rows.Where(t => t.CreatedBy == filters.UserId || assigned.Contains(t.Id)).ToList();
        }

        return Task.FromResult<(IReadOnlyList<TaskEntity>, int)>((rows, rows.Count));
    }

    public Task<TaskEntity?> GetByIdAsync(Guid tenantId, Guid taskId, CancellationToken cancellationToken = default)
    {
        _tasks.TryGetValue(taskId, out var task);
        return Task.FromResult(task?.TenantId == tenantId ? task : null);
    }

    public Task UpdateAsync(Guid tenantId, Guid taskId, TaskUpdateModel update, CancellationToken cancellationToken = default)
    {
        if (!_tasks.TryGetValue(taskId, out var task) || task.TenantId != tenantId)
        {
            return Task.CompletedTask;
        }

        _tasks[taskId] = new TaskEntity
        {
            Id = task.Id,
            TenantId = task.TenantId,
            TeamId = task.TeamId,
            Title = update.Title ?? task.Title,
            Description = update.Description ?? task.Description,
            TaskType = update.TaskType ?? task.TaskType,
            Source = task.Source,
            Status = update.Status ?? task.Status,
            ProgressOverride = update.ProgressOverride ?? task.ProgressOverride,
            DueDate = update.DueDate ?? task.DueDate,
            CreatedBy = task.CreatedBy,
            CompletedAt = update.CompletedAt ?? task.CompletedAt,
            CreatedAt = task.CreatedAt,
            UpdatedAt = update.UpdatedAt,
        };
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<TaskChecklistItemEntity>> GetChecklistItemsAsync(Guid taskId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<TaskChecklistItemEntity>>(_checklist.GetValueOrDefault(taskId) ?? []);

    public Task<int> GetMaxChecklistSortOrderAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        var items = _checklist.GetValueOrDefault(taskId) ?? [];
        return Task.FromResult(items.Count == 0 ? -1 : items.Max(i => i.SortOrder));
    }

    public Task CreateChecklistItemAsync(TaskChecklistItemEntity item, CancellationToken cancellationToken = default)
    {
        if (!_checklist.ContainsKey(item.TaskId))
        {
            _checklist[item.TaskId] = [];
        }

        _checklist[item.TaskId].Add(item);
        return Task.CompletedTask;
    }

    public Task<TaskChecklistItemEntity?> GetChecklistItemAsync(Guid taskId, Guid itemId, CancellationToken cancellationToken = default)
    {
        var item = (_checklist.GetValueOrDefault(taskId) ?? []).FirstOrDefault(i => i.Id == itemId);
        return Task.FromResult(item);
    }

    public Task ToggleChecklistItemAsync(Guid itemId, bool isCompleted, DateTime? completedAt, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task DeleteChecklistItemAsync(Guid taskId, Guid itemId, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task<IReadOnlyList<TaskAssignmentEntity>> GetAssignmentsAsync(Guid taskId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<TaskAssignmentEntity>>(_assignments.GetValueOrDefault(taskId) ?? []);

    public Task<IReadOnlyList<Guid>> GetExistingAssigneeIdsAsync(Guid taskId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Guid>>(_assignments.GetValueOrDefault(taskId)?.Select(a => a.AssigneeId).ToList() ?? []);

    public Task MarkAssignmentCompleteAsync(Guid taskId, Guid assigneeId, DateTime completedAt, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task<(int Total, int Done)> CountAssignmentsAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        var items = _assignments.GetValueOrDefault(taskId) ?? [];
        return Task.FromResult((items.Count, items.Count(i => i.IsCompleted)));
    }

    public Task<IReadOnlyList<Guid>> GetAssignedTaskIdsAsync(Guid tenantId, Guid assigneeId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Guid>>([]);

    public Task<bool> IsAssigneeAsync(Guid taskId, Guid userId, CancellationToken cancellationToken = default) =>
        Task.FromResult(false);

    public Task PromoteToLeadAssignedAsync(Guid tenantId, Guid taskId, DateTime updatedAt, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task<Guid?> GetUserTeamIdAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default) =>
        Task.FromResult<Guid?>(null);
}

internal sealed class InMemoryAuditLogRepository : IAuditLogRepository
{
    public Task WriteAsync(AuditLogWriteModel entry, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task<(IReadOnlyList<AuditLogEntity> Rows, int Total)> ListAsync(
        Guid tenantId,
        int page,
        int limit,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<(IReadOnlyList<AuditLogEntity>, int)>(([], 0));
}
