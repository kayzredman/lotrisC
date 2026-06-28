using Dapper;
using Lotris.Application.Tasks;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Tasks;

public sealed class DapperTaskRepository : ITaskRepository
{
    private readonly ISqlConnectionFactory _connections;

    public DapperTaskRepository(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task CreateAsync(TaskCreateModel task, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.Tasks (
                id, tenant_id, team_id, title, description, task_type, source, status,
                progress_override, due_date, created_by, created_at, updated_at
            ) VALUES (
                @Id, @TenantId, @TeamId, @Title, @Description, @TaskType, @Source, @Status,
                @ProgressOverride, @DueDate, @CreatedBy, @CreatedAt, @UpdatedAt
            )
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, MapCreate(task), cancellationToken: cancellationToken));
    }

    public async Task CreateAssignmentsAsync(
        IReadOnlyList<TaskAssignmentEntity> assignments,
        CancellationToken cancellationToken = default)
    {
        if (assignments.Count == 0)
        {
            return;
        }

        const string sql = """
            INSERT INTO dbo.Task_Assignments (
                id, tenant_id, task_id, assignee_id, is_completed, assigned_at
            ) VALUES (
                @Id, @TenantId, @TaskId, @AssigneeId, 0, @AssignedAt
            )
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        foreach (var assignment in assignments)
        {
            await connection.ExecuteAsync(new CommandDefinition(sql, new
            {
                Id = SqlGuid.ToSql(assignment.Id),
                TenantId = SqlGuid.ToSql(assignment.TenantId),
                TaskId = SqlGuid.ToSql(assignment.TaskId),
                AssigneeId = SqlGuid.ToSql(assignment.AssigneeId),
                assignment.AssignedAt,
            }, cancellationToken: cancellationToken));
        }
    }

    public async Task<(IReadOnlyList<TaskEntity> Rows, int Total)> ListAsync(
        TaskListFilters filters,
        CancellationToken cancellationToken = default)
    {
        var where = new List<string> { "t.tenant_id = @TenantId" };
        var parameters = new DynamicParameters();
        parameters.Add("TenantId", SqlGuid.ToSql(filters.TenantId));

        if (!string.IsNullOrWhiteSpace(filters.Status))
        {
            where.Add("t.status = @Status");
            parameters.Add("Status", filters.Status);
        }

        if (!string.IsNullOrWhiteSpace(filters.Source))
        {
            where.Add("t.source = @Source");
            parameters.Add("Source", filters.Source);
        }

        if (filters.TeamId.HasValue)
        {
            where.Add("t.team_id = @TeamId");
            parameters.Add("TeamId", SqlGuid.ToSql(filters.TeamId.Value));
        }
        else if (filters.LeadTeamId.HasValue)
        {
            where.Add("t.team_id = @LeadTeamId");
            parameters.Add("LeadTeamId", SqlGuid.ToSql(filters.LeadTeamId.Value));
        }

        if (!filters.IsLead)
        {
            var assignedIds = filters.AssignedTaskIds ?? [];
            if (assignedIds.Count == 0)
            {
                where.Add("t.created_by = @UserId");
            }
            else
            {
                where.Add("(t.created_by = @UserId OR t.id IN @AssignedTaskIds)");
                parameters.Add("AssignedTaskIds", assignedIds.Select(SqlGuid.ToSql).ToArray());
            }

            parameters.Add("UserId", SqlGuid.ToSql(filters.UserId!.Value));
        }

        var whereClause = string.Join(" AND ", where);
        var offset = (filters.Page - 1) * filters.Limit;
        parameters.Add("Offset", offset);
        parameters.Add("Limit", filters.Limit);

        var sql = $"""
            SELECT t.id, t.tenant_id AS TenantId, t.team_id AS TeamId, t.title, t.description,
                   t.task_type AS TaskType, t.source, t.status, t.progress_override AS ProgressOverride,
                   t.due_date AS DueDate, t.created_by AS CreatedBy, t.completed_at AS CompletedAt,
                   t.created_at AS CreatedAt, t.updated_at AS UpdatedAt,
                   COUNT(1) OVER() AS Total
            FROM dbo.Tasks t
            WHERE {whereClause}
            ORDER BY t.due_date ASC, t.created_at DESC
            OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = (await connection.QueryAsync<TaskRow>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken))).ToList();
        var total = rows.FirstOrDefault()?.Total ?? 0;
        return (rows.Select(MapTask).ToList(), total);
    }

    public async Task<TaskEntity?> GetByIdAsync(Guid tenantId, Guid taskId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id, tenant_id AS TenantId, team_id AS TeamId, title, description,
                   task_type AS TaskType, source, status, progress_override AS ProgressOverride,
                   due_date AS DueDate, created_by AS CreatedBy, completed_at AS CompletedAt,
                   created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM dbo.Tasks
            WHERE id = @Id AND tenant_id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<TaskRow>(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(taskId),
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));

        return row is null ? null : MapTask(row);
    }

    public async Task UpdateAsync(
        Guid tenantId,
        Guid taskId,
        TaskUpdateModel update,
        CancellationToken cancellationToken = default)
    {
        var sets = new List<string> { "updated_at = @UpdatedAt" };
        var parameters = new DynamicParameters();
        parameters.Add("UpdatedAt", update.UpdatedAt);
        parameters.Add("Id", SqlGuid.ToSql(taskId));
        parameters.Add("TenantId", SqlGuid.ToSql(tenantId));

        if (update.Title is not null) { sets.Add("title = @Title"); parameters.Add("Title", update.Title); }
        if (update.Description is not null) { sets.Add("description = @Description"); parameters.Add("Description", update.Description); }
        if (update.TaskType is not null) { sets.Add("task_type = @TaskType"); parameters.Add("TaskType", update.TaskType); }
        if (update.Status is not null) { sets.Add("status = @Status"); parameters.Add("Status", update.Status); }
        if (update.ProgressOverride.HasValue) { sets.Add("progress_override = @ProgressOverride"); parameters.Add("ProgressOverride", update.ProgressOverride); }
        if (update.DueDate.HasValue) { sets.Add("due_date = @DueDate"); parameters.Add("DueDate", update.DueDate); }
        if (update.CompletedAt.HasValue) { sets.Add("completed_at = @CompletedAt"); parameters.Add("CompletedAt", update.CompletedAt); }

        var sql = $"UPDATE dbo.Tasks SET {string.Join(", ", sets)} WHERE id = @Id AND tenant_id = @TenantId";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<TaskChecklistItemEntity>> GetChecklistItemsAsync(
        Guid taskId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id, tenant_id AS TenantId, task_id AS TaskId, label, sort_order AS SortOrder,
                   is_completed AS IsCompleted, completed_at AS CompletedAt, created_at AS CreatedAt
            FROM dbo.Task_Checklist_Items
            WHERE task_id = @TaskId
            ORDER BY sort_order ASC
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ChecklistRow>(new CommandDefinition(sql, new
        {
            TaskId = SqlGuid.ToSql(taskId),
        }, cancellationToken: cancellationToken));

        return rows.Select(r => new TaskChecklistItemEntity
        {
            Id = SqlGuid.FromSql(r.Id),
            TenantId = SqlGuid.FromSql(r.TenantId),
            TaskId = SqlGuid.FromSql(r.TaskId),
            Label = r.Label,
            SortOrder = r.SortOrder,
            IsCompleted = r.IsCompleted,
            CompletedAt = r.CompletedAt,
            CreatedAt = r.CreatedAt,
        }).ToList();
    }

    public async Task<int> GetMaxChecklistSortOrderAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT COALESCE(MAX(sort_order), -1) FROM dbo.Task_Checklist_Items WHERE task_id = @TaskId";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<int>(new CommandDefinition(sql, new
        {
            TaskId = SqlGuid.ToSql(taskId),
        }, cancellationToken: cancellationToken));
    }

    public async Task CreateChecklistItemAsync(TaskChecklistItemEntity item, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.Task_Checklist_Items (
                id, tenant_id, task_id, label, sort_order, is_completed, created_at
            ) VALUES (
                @Id, @TenantId, @TaskId, @Label, @SortOrder, 0, @CreatedAt
            )
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(item.Id),
            TenantId = SqlGuid.ToSql(item.TenantId),
            TaskId = SqlGuid.ToSql(item.TaskId),
            item.Label,
            item.SortOrder,
            item.CreatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<TaskChecklistItemEntity?> GetChecklistItemAsync(
        Guid taskId,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id, tenant_id AS TenantId, task_id AS TaskId, label, sort_order AS SortOrder,
                   is_completed AS IsCompleted, completed_at AS CompletedAt, created_at AS CreatedAt
            FROM dbo.Task_Checklist_Items
            WHERE id = @Id AND task_id = @TaskId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<ChecklistRow>(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(itemId),
            TaskId = SqlGuid.ToSql(taskId),
        }, cancellationToken: cancellationToken));

        if (row is null) return null;
        return new TaskChecklistItemEntity
        {
            Id = SqlGuid.FromSql(row.Id),
            TenantId = SqlGuid.FromSql(row.TenantId),
            TaskId = SqlGuid.FromSql(row.TaskId),
            Label = row.Label,
            SortOrder = row.SortOrder,
            IsCompleted = row.IsCompleted,
            CompletedAt = row.CompletedAt,
            CreatedAt = row.CreatedAt,
        };
    }

    public async Task ToggleChecklistItemAsync(
        Guid itemId,
        bool isCompleted,
        DateTime? completedAt,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.Task_Checklist_Items
            SET is_completed = @IsCompleted, completed_at = @CompletedAt
            WHERE id = @Id
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(itemId),
            IsCompleted = isCompleted,
            CompletedAt = completedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task DeleteChecklistItemAsync(Guid taskId, Guid itemId, CancellationToken cancellationToken = default)
    {
        const string sql = "DELETE FROM dbo.Task_Checklist_Items WHERE id = @Id AND task_id = @TaskId";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(itemId),
            TaskId = SqlGuid.ToSql(taskId),
        }, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<TaskAssignmentEntity>> GetAssignmentsAsync(
        Guid taskId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id, tenant_id AS TenantId, task_id AS TaskId, assignee_id AS AssigneeId,
                   is_completed AS IsCompleted, completed_at AS CompletedAt, assigned_at AS AssignedAt
            FROM dbo.Task_Assignments
            WHERE task_id = @TaskId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<AssignmentRow>(new CommandDefinition(sql, new
        {
            TaskId = SqlGuid.ToSql(taskId),
        }, cancellationToken: cancellationToken));

        return rows.Select(r => new TaskAssignmentEntity
        {
            Id = SqlGuid.FromSql(r.Id),
            TenantId = SqlGuid.FromSql(r.TenantId),
            TaskId = SqlGuid.FromSql(r.TaskId),
            AssigneeId = SqlGuid.FromSql(r.AssigneeId),
            IsCompleted = r.IsCompleted,
            CompletedAt = r.CompletedAt,
            AssignedAt = r.AssignedAt,
        }).ToList();
    }

    public async Task<IReadOnlyList<Guid>> GetExistingAssigneeIdsAsync(
        Guid taskId,
        CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT assignee_id FROM dbo.Task_Assignments WHERE task_id = @TaskId";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<string>(new CommandDefinition(sql, new
        {
            TaskId = SqlGuid.ToSql(taskId),
        }, cancellationToken: cancellationToken));

        return rows.Select(SqlGuid.FromSql).ToList();
    }

    public async Task MarkAssignmentCompleteAsync(
        Guid taskId,
        Guid assigneeId,
        DateTime completedAt,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.Task_Assignments
            SET is_completed = 1, completed_at = @CompletedAt
            WHERE task_id = @TaskId AND assignee_id = @AssigneeId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TaskId = SqlGuid.ToSql(taskId),
            AssigneeId = SqlGuid.ToSql(assigneeId),
            CompletedAt = completedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<(int Total, int Done)> CountAssignmentsAsync(
        Guid taskId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                COUNT(1) AS Total,
                SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) AS Done
            FROM dbo.Task_Assignments
            WHERE task_id = @TaskId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleAsync<(int Total, int Done)>(new CommandDefinition(sql, new
        {
            TaskId = SqlGuid.ToSql(taskId),
        }, cancellationToken: cancellationToken));

        return (row.Total, row.Done);
    }

    public async Task<IReadOnlyList<Guid>> GetAssignedTaskIdsAsync(
        Guid tenantId,
        Guid assigneeId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT task_id FROM dbo.Task_Assignments
            WHERE tenant_id = @TenantId AND assignee_id = @AssigneeId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<string>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            AssigneeId = SqlGuid.ToSql(assigneeId),
        }, cancellationToken: cancellationToken));

        return rows.Select(SqlGuid.FromSql).ToList();
    }

    public async Task<bool> IsAssigneeAsync(Guid taskId, Guid userId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT COUNT(1) FROM dbo.Task_Assignments
            WHERE task_id = @TaskId AND assignee_id = @AssigneeId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var count = await connection.ExecuteScalarAsync<int>(new CommandDefinition(sql, new
        {
            TaskId = SqlGuid.ToSql(taskId),
            AssigneeId = SqlGuid.ToSql(userId),
        }, cancellationToken: cancellationToken));

        return count > 0;
    }

    public async Task PromoteToLeadAssignedAsync(
        Guid tenantId,
        Guid taskId,
        DateTime updatedAt,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.Tasks
            SET source = 'LEAD_ASSIGNED', updated_at = @UpdatedAt
            WHERE id = @Id AND tenant_id = @TenantId AND source = 'SELF_LOGGED'
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(taskId),
            TenantId = SqlGuid.ToSql(tenantId),
            UpdatedAt = updatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<Guid?> GetUserTeamIdAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT team_id FROM dbo.Users WHERE tenant_id = @TenantId AND id = @UserId";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var teamId = await connection.ExecuteScalarAsync<string?>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            UserId = SqlGuid.ToSql(userId),
        }, cancellationToken: cancellationToken));

        return string.IsNullOrWhiteSpace(teamId) ? null : SqlGuid.FromSql(teamId);
    }

    private static object MapCreate(TaskCreateModel task) => new
    {
        Id = SqlGuid.ToSql(task.Id),
        TenantId = SqlGuid.ToSql(task.TenantId),
        TeamId = task.TeamId.HasValue ? SqlGuid.ToSql(task.TeamId.Value) : null,
        task.Title,
        task.Description,
        task.TaskType,
        task.Source,
        task.Status,
        task.ProgressOverride,
        task.DueDate,
        CreatedBy = SqlGuid.ToSql(task.CreatedBy),
        task.CreatedAt,
        task.UpdatedAt,
    };

    private static TaskEntity MapTask(TaskRow row) => new()
    {
        Id = SqlGuid.FromSql(row.Id),
        TenantId = SqlGuid.FromSql(row.TenantId),
        TeamId = string.IsNullOrWhiteSpace(row.TeamId) ? null : SqlGuid.FromSql(row.TeamId),
        Title = row.Title,
        Description = row.Description,
        TaskType = row.TaskType,
        Source = row.Source,
        Status = row.Status,
        ProgressOverride = row.ProgressOverride,
        DueDate = row.DueDate,
        CreatedBy = SqlGuid.FromSql(row.CreatedBy),
        CompletedAt = row.CompletedAt,
        CreatedAt = row.CreatedAt,
        UpdatedAt = row.UpdatedAt,
    };

    private sealed class TaskRow
    {
        public string Id { get; init; } = "";
        public string TenantId { get; init; } = "";
        public string? TeamId { get; init; }
        public string Title { get; init; } = "";
        public string? Description { get; init; }
        public string TaskType { get; init; } = "";
        public string Source { get; init; } = "";
        public string Status { get; init; } = "";
        public int? ProgressOverride { get; init; }
        public DateTime? DueDate { get; init; }
        public string CreatedBy { get; init; } = "";
        public DateTime? CompletedAt { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
        public int Total { get; init; }
    }

    private sealed class ChecklistRow
    {
        public string Id { get; init; } = "";
        public string TenantId { get; init; } = "";
        public string TaskId { get; init; } = "";
        public string Label { get; init; } = "";
        public int SortOrder { get; init; }
        public bool IsCompleted { get; init; }
        public DateTime? CompletedAt { get; init; }
        public DateTime CreatedAt { get; init; }
    }

    private sealed class AssignmentRow
    {
        public string Id { get; init; } = "";
        public string TenantId { get; init; } = "";
        public string TaskId { get; init; } = "";
        public string AssigneeId { get; init; } = "";
        public bool IsCompleted { get; init; }
        public DateTime? CompletedAt { get; init; }
        public DateTime AssignedAt { get; init; }
    }
}
