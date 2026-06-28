using Dapper;
using Lotris.Application.Tickets;
using Lotris.Domain.Tickets;
using Lotris.Infrastructure.Data;
using Microsoft.Data.SqlClient;

namespace Lotris.Infrastructure.Tickets;

public sealed class DapperTicketRepository : ITicketRepository
{
    private readonly ISqlConnectionFactory _connections;

    public DapperTicketRepository(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task CreateAsync(TicketCreateModel ticket, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.Tickets (
                id, tenant_id, title, description, priority, status, team_id, created_by,
                source, requester_email, requester_name, related_ticket_id,
                sla_pickup_deadline, created_at, updated_at
            ) VALUES (
                @Id, @TenantId, @Title, @Description, @Priority, @Status, @TeamId, @CreatedBy,
                @Source, @RequesterEmail, @RequesterName, @RelatedTicketId,
                @SlaPickupDeadline, @CreatedAt, @UpdatedAt
            )
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(ticket.Id),
            TenantId = SqlGuid.ToSql(ticket.TenantId),
            ticket.Title,
            ticket.Description,
            ticket.Priority,
            ticket.Status,
            TeamId = ticket.TeamId.HasValue ? SqlGuid.ToSql(ticket.TeamId.Value) : null,
            CreatedBy = SqlGuid.ToSql(ticket.CreatedBy),
            ticket.Source,
            ticket.RequesterEmail,
            ticket.RequesterName,
            RelatedTicketId = ticket.RelatedTicketId.HasValue ? SqlGuid.ToSql(ticket.RelatedTicketId.Value) : null,
            ticket.SlaPickupDeadline,
            ticket.CreatedAt,
            ticket.UpdatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<(IReadOnlyList<TicketEntity> Rows, int Total)> ListAsync(
        TicketListFilters filters,
        CancellationToken cancellationToken = default)
    {
        var whereParts = new List<string> { "tk.tenant_id = @TenantId" };
        var parameters = new DynamicParameters();
        parameters.Add("TenantId", SqlGuid.ToSql(filters.TenantId));
        parameters.Add("Offset", (filters.Page - 1) * filters.Limit);
        parameters.Add("Limit", filters.Limit);

        if (filters.AssigneeIdFilter.HasValue)
        {
            whereParts.Add("tk.assignee_id = @AssigneeIdFilter");
            parameters.Add("AssigneeIdFilter", SqlGuid.ToSql(filters.AssigneeIdFilter.Value));
        }
        else if (filters.VisibleTeamIds is { Count: > 0 })
        {
            var teamParams = filters.VisibleTeamIds.Select((id, i) =>
            {
                var name = $"Team{i}";
                parameters.Add(name, SqlGuid.ToSql(id));
                return $"@{name}";
            });
            whereParts.Add($"tk.team_id IN ({string.Join(", ", teamParams)})");
        }
        else if (filters.FallbackToAssigneeOnly && filters.AssigneeIdFilter.HasValue)
        {
            whereParts.Add("tk.assignee_id = @AssigneeIdFilter");
            parameters.Add("AssigneeIdFilter", SqlGuid.ToSql(filters.AssigneeIdFilter.Value));
        }

        if (!string.IsNullOrWhiteSpace(filters.Status))
        {
            whereParts.Add("tk.status = @Status");
            parameters.Add("Status", filters.Status);
        }

        if (filters.Priority.HasValue)
        {
            whereParts.Add("tk.priority = @Priority");
            parameters.Add("Priority", filters.Priority.Value);
        }

        if (filters.TeamId.HasValue)
        {
            whereParts.Add("tk.team_id = @TeamId");
            parameters.Add("TeamId", SqlGuid.ToSql(filters.TeamId.Value));
        }

        if (filters.AssigneeId.HasValue)
        {
            whereParts.Add("tk.assignee_id = @AssigneeId");
            parameters.Add("AssigneeId", SqlGuid.ToSql(filters.AssigneeId.Value));
        }

        if (!string.IsNullOrWhiteSpace(filters.Source))
        {
            whereParts.Add("tk.source = @Source");
            parameters.Add("Source", filters.Source);
        }

        if (!string.IsNullOrWhiteSpace(filters.SlaWarning))
        {
            whereParts.Add("tk.sla_warning_level = @SlaWarning");
            parameters.Add("SlaWarning", filters.SlaWarning);
        }

        if (!string.IsNullOrWhiteSpace(filters.Search))
        {
            whereParts.Add("(tk.title LIKE @Search OR tk.id LIKE @Search)");
            parameters.Add("Search", $"%{filters.Search.Trim()}%");
        }

        var where = string.Join(" AND ", whereParts);
        var sql = $"""
            SELECT
                tk.id, tk.title, tk.description, tk.status, tk.priority,
                tk.tenant_id AS TenantId, tk.team_id AS TeamId, tk.assignee_id AS AssigneeId,
                tk.source, tk.requester_email AS RequesterEmail, tk.requester_name AS RequesterName,
                tk.sla_pickup_deadline AS SlaPickupDeadline, tk.sla_pickup_breached AS SlaPickupBreached,
                tk.sla_resolution_deadline AS SlaResolutionDeadline, tk.sla_resolution_breached AS SlaResolutionBreached,
                tk.sla_warning_level AS SlaWarningLevel, tk.created_by AS CreatedBy,
                tk.assigned_at AS AssignedAt, tk.resolved_at AS ResolvedAt, tk.closed_at AS ClosedAt,
                tk.created_at AS CreatedAt, tk.updated_at AS UpdatedAt,
                t.name AS TeamName,
                COUNT(*) OVER() AS Total
            FROM dbo.Tickets tk
            LEFT JOIN dbo.Teams t ON t.id = tk.team_id AND t.tenant_id = tk.tenant_id
            WHERE {where}
            ORDER BY tk.priority ASC, tk.sla_resolution_deadline ASC
            OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = (await connection.QueryAsync<TicketRow>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken))).ToList();
        var total = rows.Count > 0 ? rows[0].Total : 0;
        return (rows.Select(MapRow).ToList(), total);
    }

    public async Task<TicketEntity?> GetByIdAsync(Guid tenantId, Guid ticketId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                tk.id, tk.title, tk.description, tk.status, tk.priority,
                tk.tenant_id AS TenantId, tk.team_id AS TeamId, tk.assignee_id AS AssigneeId,
                tk.source, tk.requester_email AS RequesterEmail, tk.requester_name AS RequesterName,
                tk.sla_pickup_deadline AS SlaPickupDeadline, tk.sla_pickup_breached AS SlaPickupBreached,
                tk.sla_resolution_deadline AS SlaResolutionDeadline, tk.sla_resolution_breached AS SlaResolutionBreached,
                tk.sla_warning_level AS SlaWarningLevel, tk.created_by AS CreatedBy,
                tk.assigned_at AS AssignedAt, tk.resolved_at AS ResolvedAt, tk.closed_at AS ClosedAt,
                tk.created_at AS CreatedAt, tk.updated_at AS UpdatedAt,
                t.name AS TeamName
            FROM dbo.Tickets tk
            LEFT JOIN dbo.Teams t ON t.id = tk.team_id AND t.tenant_id = tk.tenant_id
            WHERE tk.id = @TicketId AND tk.tenant_id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<TicketRow>(new CommandDefinition(sql, new
        {
            TicketId = SqlGuid.ToSql(ticketId),
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));

        return row is null ? null : MapRow(row);
    }

    public async Task UpdateStatusAsync(
        Guid tenantId,
        Guid ticketId,
        TicketStatusUpdate update,
        CancellationToken cancellationToken = default)
    {
        var sets = new List<string>
        {
            "status = @Status",
            "updated_at = @UpdatedAt",
        };

        if (update.AssigneeId.HasValue)
        {
            sets.Add("assignee_id = @AssigneeId");
        }

        if (update.TeamId.HasValue)
        {
            sets.Add("team_id = @TeamId");
        }

        if (update.AssignedAt.HasValue)
        {
            sets.Add("assigned_at = @AssignedAt");
        }

        if (update.ResolvedAt.HasValue)
        {
            sets.Add("resolved_at = @ResolvedAt");
        }

        if (update.ClosedAt.HasValue)
        {
            sets.Add("closed_at = @ClosedAt");
        }

        if (update.SlaResolutionDeadline.HasValue)
        {
            sets.Add("sla_resolution_deadline = @SlaResolutionDeadline");
        }

        var sql = $"""
            UPDATE dbo.Tickets
            SET {string.Join(", ", sets)}
            WHERE id = @TicketId AND tenant_id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TicketId = SqlGuid.ToSql(ticketId),
            TenantId = SqlGuid.ToSql(tenantId),
            update.Status,
            update.UpdatedAt,
            AssigneeId = update.AssigneeId.HasValue ? SqlGuid.ToSql(update.AssigneeId.Value) : null,
            TeamId = update.TeamId.HasValue ? SqlGuid.ToSql(update.TeamId.Value) : null,
            update.AssignedAt,
            update.ResolvedAt,
            update.ClosedAt,
            update.SlaResolutionDeadline,
        }, cancellationToken: cancellationToken));
    }

    public async Task ClaimAsync(
        Guid tenantId,
        Guid ticketId,
        Guid assigneeId,
        DateTime assignedAt,
        DateTime resolutionDeadline,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.Tickets
            SET status = @Status,
                assignee_id = @AssigneeId,
                assigned_at = @AssignedAt,
                sla_resolution_deadline = @ResolutionDeadline,
                updated_at = @UpdatedAt
            WHERE id = @TicketId AND tenant_id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Status = TicketStatus.Assigned,
            AssigneeId = SqlGuid.ToSql(assigneeId),
            AssignedAt = assignedAt,
            ResolutionDeadline = resolutionDeadline,
            UpdatedAt = assignedAt,
            TicketId = SqlGuid.ToSql(ticketId),
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));
    }

    public async Task<int> CountOpenTicketsForAssigneeAsync(
        Guid tenantId,
        Guid assigneeId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT COUNT(1)
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId
              AND assignee_id = @AssigneeId
              AND status IN ('ASSIGNED', 'IN_PROGRESS', 'ESCALATED')
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<int>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            AssigneeId = SqlGuid.ToSql(assigneeId),
        }, cancellationToken: cancellationToken));
    }

    public async Task AutoAssignAsync(
        Guid tenantId,
        Guid ticketId,
        Guid assigneeId,
        DateTime assignedAt,
        DateTime resolutionDeadline,
        CancellationToken cancellationToken = default) =>
        await ClaimAsync(tenantId, ticketId, assigneeId, assignedAt, resolutionDeadline, cancellationToken);

    public async Task MarkPickupSlaBreachedAsync(Guid tenantId, Guid ticketId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.Tickets
            SET sla_pickup_breached = 1, updated_at = SYSUTCDATETIME()
            WHERE id = @TicketId AND tenant_id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TicketId = SqlGuid.ToSql(ticketId),
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));
    }

    public async Task MarkResolutionSlaBreachedAndEscalateAsync(
        Guid tenantId,
        Guid ticketId,
        string previousStatus,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.Tickets
            SET sla_resolution_breached = 1,
                status = @Escalated,
                updated_at = SYSUTCDATETIME()
            WHERE id = @TicketId AND tenant_id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Escalated = TicketStatus.Escalated,
            TicketId = SqlGuid.ToSql(ticketId),
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));
    }

    public async Task<Guid?> GetUserTeamIdAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT team_id
            FROM dbo.Users
            WHERE id = @UserId AND tenant_id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var teamId = await connection.ExecuteScalarAsync<string?>(new CommandDefinition(sql, new
        {
            UserId = SqlGuid.ToSql(userId),
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));

        return string.IsNullOrWhiteSpace(teamId) ? null : SqlGuid.FromSql(teamId);
    }

    public async Task<IReadOnlyList<Guid>> GetGrantedTeamIdsAsync(
        Guid tenantId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT target_team_id
            FROM dbo.TeamAccessGrants
            WHERE tenant_id = @TenantId AND grantee_user_id = @UserId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<string>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            UserId = SqlGuid.ToSql(userId),
        }, cancellationToken: cancellationToken));

        return rows.Select(SqlGuid.FromSql).ToList();
    }

    public async Task<IReadOnlyList<Guid>> GetActiveEngineerIdsAsync(
        Guid tenantId,
        Guid teamId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id
            FROM dbo.Users
            WHERE tenant_id = @TenantId
              AND team_id = @TeamId
              AND is_active = 1
              AND is_unavailable = 0
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<string>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            TeamId = SqlGuid.ToSql(teamId),
        }, cancellationToken: cancellationToken));

        return rows.Select(SqlGuid.FromSql).ToList();
    }

    public async Task<IReadOnlyDictionary<Guid, int>> GetEngineerWorkloadsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT assignee_id, COUNT(1) AS OpenCount
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId
              AND status IN ('ASSIGNED', 'IN_PROGRESS', 'ESCALATED')
              AND assignee_id IS NOT NULL
            GROUP BY assignee_id
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<(string AssigneeId, int OpenCount)>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));

        return rows.ToDictionary(r => SqlGuid.FromSql(r.AssigneeId), r => r.OpenCount);
    }

    public async Task<Guid> AddCommentAsync(
        Guid tenantId,
        Guid ticketId,
        Guid authorId,
        string body,
        bool isInternal,
        DateTime createdAt,
        CancellationToken cancellationToken = default)
    {
        var id = Guid.NewGuid();
        const string sql = """
            INSERT INTO dbo.Ticket_Comments (
                id, tenant_id, ticket_id, author_id, body, is_internal, created_at, updated_at
            ) VALUES (
                @Id, @TenantId, @TicketId, @AuthorId, @Body, @IsInternal, @CreatedAt, @UpdatedAt
            )
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(id),
            TenantId = SqlGuid.ToSql(tenantId),
            TicketId = SqlGuid.ToSql(ticketId),
            AuthorId = SqlGuid.ToSql(authorId),
            Body = body,
            IsInternal = isInternal,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
        }, cancellationToken: cancellationToken));

        return id;
    }

    public async Task<IReadOnlyList<TicketCommentEntity>> GetCommentsAsync(
        Guid tenantId,
        Guid ticketId,
        bool excludeInternal,
        CancellationToken cancellationToken = default)
    {
        var sql = """
            SELECT id, ticket_id AS TicketId, author_id AS AuthorId, body,
                   is_internal AS IsInternal, created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM dbo.Ticket_Comments
            WHERE tenant_id = @TenantId AND ticket_id = @TicketId
            """;

        if (excludeInternal)
        {
            sql += " AND is_internal = 0";
        }

        sql += " ORDER BY created_at ASC";

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CommentRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            TicketId = SqlGuid.ToSql(ticketId),
        }, cancellationToken: cancellationToken));

        return rows.Select(r => new TicketCommentEntity
        {
            Id = SqlGuid.FromSql(r.Id),
            TicketId = SqlGuid.FromSql(r.TicketId),
            AuthorId = SqlGuid.FromSql(r.AuthorId),
            Body = r.Body,
            IsInternal = r.IsInternal,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
        }).ToList();
    }

    public async Task<Guid> AddAttachmentAsync(
        Guid tenantId,
        Guid ticketId,
        Guid uploadedBy,
        string storageKey,
        string originalName,
        string mimeType,
        long sizeBytes,
        DateTime createdAt,
        CancellationToken cancellationToken = default)
    {
        var id = Guid.NewGuid();
        const string sql = """
            INSERT INTO dbo.Attachment_Refs (
                id, tenant_id, ticket_id, uploaded_by, storage_key,
                original_name, mime_type, size_bytes, created_at
            ) VALUES (
                @Id, @TenantId, @TicketId, @UploadedBy, @StorageKey,
                @OriginalName, @MimeType, @SizeBytes, @CreatedAt
            )
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(id),
            TenantId = SqlGuid.ToSql(tenantId),
            TicketId = SqlGuid.ToSql(ticketId),
            UploadedBy = SqlGuid.ToSql(uploadedBy),
            StorageKey = storageKey,
            OriginalName = originalName,
            MimeType = mimeType,
            SizeBytes = sizeBytes,
            CreatedAt = createdAt,
        }, cancellationToken: cancellationToken));

        return id;
    }

    public async Task<IReadOnlyList<TicketHistoryEntity>> GetHistoryAsync(
        Guid tenantId,
        Guid ticketId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT actor_id AS ActorId, event_type AS EventType, from_value AS FromValue,
                   to_value AS ToValue, metadata, created_at AS CreatedAt
            FROM dbo.Ticket_History
            WHERE tenant_id = @TenantId AND ticket_id = @TicketId
            ORDER BY created_at ASC
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<HistoryRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            TicketId = SqlGuid.ToSql(ticketId),
        }, cancellationToken: cancellationToken));

        return rows.Select(r => new TicketHistoryEntity
        {
            ActorId = string.IsNullOrWhiteSpace(r.ActorId) ? null : SqlGuid.FromSql(r.ActorId),
            EventType = r.EventType,
            FromValue = r.FromValue,
            ToValue = r.ToValue,
            Metadata = r.Metadata,
            CreatedAt = r.CreatedAt,
        }).ToList();
    }

    public async Task UpdateSlaWarningLevelAsync(
        Guid tenantId,
        Guid ticketId,
        string warningLevel,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.Tickets
            SET sla_warning_level = @WarningLevel, updated_at = @UpdatedAt
            WHERE tenant_id = @TenantId AND id = @TicketId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            TicketId = SqlGuid.ToSql(ticketId),
            WarningLevel = warningLevel,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<SlaWarningTicketEntity>> ListSlaWarningsAsync(
        Guid tenantId,
        Guid? engineerId,
        CancellationToken cancellationToken = default)
    {
        var sql = """
            SELECT id, title, assignee_id AS AssigneeId, sla_warning_level AS SlaWarningLevel,
                   sla_resolution_deadline AS SlaResolutionDeadline
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId
              AND sla_warning_level IN ('AMBER','RED')
              AND status = 'IN_PROGRESS'
            """;

        var parameters = new DynamicParameters();
        parameters.Add("TenantId", SqlGuid.ToSql(tenantId));
        if (engineerId.HasValue)
        {
            sql += " AND assignee_id = @EngineerId";
            parameters.Add("EngineerId", SqlGuid.ToSql(engineerId.Value));
        }

        sql += " ORDER BY sla_resolution_deadline ASC";

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<SlaWarningRow>(new CommandDefinition(
            sql, parameters, cancellationToken: cancellationToken));

        var now = DateTime.UtcNow;
        return rows.Select(r => new SlaWarningTicketEntity
        {
            Id = SqlGuid.FromSql(r.Id),
            Title = r.Title,
            AssigneeId = string.IsNullOrWhiteSpace(r.AssigneeId) ? null : SqlGuid.FromSql(r.AssigneeId),
            SlaWarningLevel = r.SlaWarningLevel ?? "NONE",
            SlaResolutionDeadline = r.SlaResolutionDeadline,
            MinutesRemaining = r.SlaResolutionDeadline.HasValue
                ? Math.Max(0, (int)Math.Round((r.SlaResolutionDeadline.Value - now).TotalMinutes))
                : null,
        }).ToList();
    }

    private sealed class SlaWarningRow
    {
        public string Id { get; init; } = "";
        public string Title { get; init; } = "";
        public string? AssigneeId { get; init; }
        public string? SlaWarningLevel { get; init; }
        public DateTime? SlaResolutionDeadline { get; init; }
    }

    private sealed class CommentRow
    {
        public string Id { get; init; } = "";
        public string TicketId { get; init; } = "";
        public string AuthorId { get; init; } = "";
        public string Body { get; init; } = "";
        public bool IsInternal { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
    }

    private sealed class HistoryRow
    {
        public string? ActorId { get; init; }
        public string EventType { get; init; } = "";
        public string? FromValue { get; init; }
        public string? ToValue { get; init; }
        public string? Metadata { get; init; }
        public DateTime CreatedAt { get; init; }
    }

    private sealed class TicketRow
    {
        public string Id { get; init; } = "";
        public string Title { get; init; } = "";
        public string Description { get; init; } = "";
        public string Status { get; init; } = "";
        public int Priority { get; init; }
        public string TenantId { get; init; } = "";
        public string? TeamId { get; init; }
        public string? AssigneeId { get; init; }
        public string Source { get; init; } = "INTERNAL";
        public string? RequesterEmail { get; init; }
        public string? RequesterName { get; init; }
        public DateTime? SlaPickupDeadline { get; init; }
        public bool SlaPickupBreached { get; init; }
        public DateTime? SlaResolutionDeadline { get; init; }
        public bool SlaResolutionBreached { get; init; }
        public string? SlaWarningLevel { get; init; }
        public string CreatedBy { get; init; } = "";
        public DateTime? AssignedAt { get; init; }
        public DateTime? ResolvedAt { get; init; }
        public DateTime? ClosedAt { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
        public string? TeamName { get; init; }
        public int Total { get; init; }
    }

    private static TicketEntity MapRow(TicketRow row) =>
        new()
        {
            Id = SqlGuid.FromSql(row.Id),
            TenantId = SqlGuid.FromSql(row.TenantId),
            Title = row.Title,
            Description = row.Description,
            Status = row.Status,
            Priority = row.Priority,
            TeamId = string.IsNullOrWhiteSpace(row.TeamId) ? null : SqlGuid.FromSql(row.TeamId),
            TeamName = row.TeamName,
            AssigneeId = string.IsNullOrWhiteSpace(row.AssigneeId) ? null : SqlGuid.FromSql(row.AssigneeId),
            Source = row.Source,
            RequesterEmail = row.RequesterEmail,
            RequesterName = row.RequesterName,
            SlaPickupDeadline = row.SlaPickupDeadline,
            SlaPickupBreached = row.SlaPickupBreached,
            SlaResolutionDeadline = row.SlaResolutionDeadline,
            SlaResolutionBreached = row.SlaResolutionBreached,
            SlaWarningLevel = row.SlaWarningLevel ?? "NONE",
            CreatedBy = SqlGuid.FromSql(row.CreatedBy),
            AssignedAt = row.AssignedAt,
            ResolvedAt = row.ResolvedAt,
            ClosedAt = row.ClosedAt,
            CreatedAt = row.CreatedAt,
            UpdatedAt = row.UpdatedAt,
        };
}
