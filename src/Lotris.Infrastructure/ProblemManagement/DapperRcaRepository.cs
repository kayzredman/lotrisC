using Dapper;
using Lotris.Application.ProblemManagement;
using Lotris.Domain.ProblemManagement;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.ProblemManagement;

public sealed class DapperRcaRepository : IRcaRepository
{
    private readonly ISqlConnectionFactory _connections;

    public DapperRcaRepository(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task EnsureTriggerRulesAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            IF NOT EXISTS (SELECT 1 FROM dbo.RCA_Trigger_Rules WHERE tenant_id = @TenantId)
            INSERT INTO dbo.RCA_Trigger_Rules (tenant_id, auto_p1, auto_p2, auto_p2_sla_breach, auto_security,
                recurrence_threshold, recurrence_window_days, rca_completion_days, updated_at)
            VALUES (@TenantId, 1, 0, 0, 0, 3, 90, 5, @Now)
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            Now = DateTime.UtcNow,
        }, cancellationToken: cancellationToken));
    }

    public async Task<RcaTriggerRulesEntity> GetTriggerRulesAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        await EnsureTriggerRulesAsync(tenantId, cancellationToken);
        const string sql = """
            SELECT tenant_id AS TenantId, auto_p1 AS AutoP1, auto_p2 AS AutoP2,
                   auto_p2_sla_breach AS AutoP2SlaBreach, auto_security AS AutoSecurity,
                   recurrence_threshold AS RecurrenceThreshold, recurrence_window_days AS RecurrenceWindowDays,
                   rca_completion_days AS RcaCompletionDays
            FROM dbo.RCA_Trigger_Rules WHERE tenant_id = @TenantId
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleAsync<RcaTriggerRulesEntity>(
            new CommandDefinition(sql, new { TenantId = SqlGuid.ToSql(tenantId) }, cancellationToken: cancellationToken));
    }

    public async Task UpdateTriggerRulesAsync(Guid tenantId, RcaTriggerRulesEntity rules, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.RCA_Trigger_Rules SET
                auto_p1 = @AutoP1, auto_p2 = @AutoP2, auto_p2_sla_breach = @AutoP2SlaBreach,
                auto_security = @AutoSecurity, recurrence_threshold = @RecurrenceThreshold,
                recurrence_window_days = @RecurrenceWindowDays, rca_completion_days = @RcaCompletionDays,
                updated_at = @UpdatedAt
            WHERE tenant_id = @TenantId
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            rules.AutoP1,
            rules.AutoP2,
            rules.AutoP2SlaBreach,
            rules.AutoSecurity,
            rules.RecurrenceThreshold,
            rules.RecurrenceWindowDays,
            rules.RcaCompletionDays,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<RcaListRow>> ListAsync(Guid tenantId, string? filter, CancellationToken cancellationToken = default)
    {
        var extra = filter switch
        {
            "overdue_capa" => """
                AND EXISTS (
                    SELECT 1 FROM dbo.RCA_Actions a
                    INNER JOIN dbo.RCA_Records r2 ON r2.id = a.rca_id
                    WHERE r2.problem_id = p.id AND a.status NOT IN ('COMPLETED','VERIFIED','CANCELLED')
                      AND a.due_at < SYSUTCDATETIME()
                )
                """,
            "awaiting_review" => " AND r.status = 'IN_REVIEW'",
            "published" => " AND r.status = 'PUBLISHED'",
            _ => "",
        };

        var sql = $"""
            SELECT p.id AS Id, p.tenant_id AS TenantId, p.problem_ref AS ProblemRef, p.title AS Title,
                   p.status AS Status, p.priority AS Priority, p.recurrence_count AS RecurrenceCount,
                   p.category_id AS CategoryId, p.created_at AS CreatedAt, p.updated_at AS UpdatedAt,
                   r.id AS RcaId, r.rca_ref AS RcaRef, r.status AS RcaStatus, r.review_due_at AS ReviewDueAt,
                   r.process_owner_id AS ProcessOwnerId, r.technical_owner_id AS TechnicalOwnerId,
                   (SELECT COUNT(*) FROM dbo.RCA_Ticket_Links l WHERE l.problem_id = p.id) AS LinkedTicketCount,
                   po.full_name AS ProcessOwnerName, te.full_name AS TechnicalOwnerName
            FROM dbo.Problem_Records p
            LEFT JOIN dbo.RCA_Records r ON r.problem_id = p.id
            LEFT JOIN dbo.Users po ON po.id = r.process_owner_id
            LEFT JOIN dbo.Users te ON te.id = r.technical_owner_id
            WHERE p.tenant_id = @TenantId {extra}
            ORDER BY p.created_at DESC
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ListRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));

        return rows.Select(row => new RcaListRow
        {
            Problem = new ProblemEntity
            {
                Id = SqlGuid.FromSql(row.Id)!,
                TenantId = SqlGuid.FromSql(row.TenantId)!,
                ProblemRef = row.ProblemRef,
                Title = row.Title,
                Status = row.Status,
                Priority = row.Priority,
                RecurrenceCount = row.RecurrenceCount,
                CategoryId = SqlGuid.FromSqlNullable(row.CategoryId),
                CreatedAt = row.CreatedAt,
                UpdatedAt = row.UpdatedAt,
            },
            Rca = row.RcaId is null ? null : new RcaEntity
            {
                Id = SqlGuid.FromSql(row.RcaId)!,
                TenantId = SqlGuid.FromSql(row.TenantId)!,
                RcaRef = row.RcaRef ?? "",
                ProblemId = SqlGuid.FromSql(row.Id)!,
                Status = row.RcaStatus ?? RcaStatus.Draft,
                ProcessOwnerId = row.ProcessOwnerId is null ? Guid.Empty : SqlGuid.FromSql(row.ProcessOwnerId),
                TechnicalOwnerId = row.TechnicalOwnerId is null ? Guid.Empty : SqlGuid.FromSql(row.TechnicalOwnerId),
                ReviewDueAt = row.ReviewDueAt,
                CreatedAt = row.CreatedAt,
                UpdatedAt = row.UpdatedAt,
            },
            LinkedTicketCount = row.LinkedTicketCount,
            ProcessOwnerName = row.ProcessOwnerName,
            TechnicalOwnerName = row.TechnicalOwnerName,
        }).ToList();
    }

    public async Task<RcaEntity?> GetRcaByIdAsync(Guid tenantId, Guid rcaId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, rca_ref AS RcaRef, problem_id AS ProblemId, status AS Status,
                   incident_summary AS IncidentSummary, business_impact AS BusinessImpact,
                   detection_method AS DetectionMethod, immediate_cause AS ImmediateCause,
                   root_cause_statement AS RootCauseStatement, contributing_factors AS ContributingFactors,
                   resolution_summary AS ResolutionSummary, lessons_learned AS LessonsLearned,
                   category_id AS CategoryId, process_owner_id AS ProcessOwnerId,
                   technical_owner_id AS TechnicalOwnerId, delegate_id AS DelegateId,
                   review_due_at AS ReviewDueAt, published_at AS PublishedAt,
                   created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM dbo.RCA_Records WHERE tenant_id = @TenantId AND id = @Id
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<RcaRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            Id = SqlGuid.ToSql(rcaId),
        }, cancellationToken: cancellationToken));
        return row is null ? null : MapRca(row);
    }

    public async Task<ProblemEntity?> GetProblemByIdAsync(Guid tenantId, Guid problemId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, problem_ref AS ProblemRef, title AS Title, status AS Status,
                   priority AS Priority, recurrence_count AS RecurrenceCount, category_id AS CategoryId,
                   created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM dbo.Problem_Records WHERE tenant_id = @TenantId AND id = @Id
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<ProblemRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            Id = SqlGuid.ToSql(problemId),
        }, cancellationToken: cancellationToken));
        return row is null ? null : MapProblem(row);
    }

    public async Task<RcaEntity?> GetRcaByTicketIdAsync(Guid tenantId, Guid ticketId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT r.id AS Id, r.tenant_id AS TenantId, r.rca_ref AS RcaRef, r.problem_id AS ProblemId, r.status AS Status,
                   r.incident_summary AS IncidentSummary, r.business_impact AS BusinessImpact,
                   r.detection_method AS DetectionMethod, r.immediate_cause AS ImmediateCause,
                   r.root_cause_statement AS RootCauseStatement, r.contributing_factors AS ContributingFactors,
                   r.resolution_summary AS ResolutionSummary, r.lessons_learned AS LessonsLearned,
                   r.category_id AS CategoryId, r.process_owner_id AS ProcessOwnerId,
                   r.technical_owner_id AS TechnicalOwnerId, r.delegate_id AS DelegateId,
                   r.review_due_at AS ReviewDueAt, r.published_at AS PublishedAt,
                   r.created_at AS CreatedAt, r.updated_at AS UpdatedAt
            FROM dbo.RCA_Records r
            INNER JOIN dbo.RCA_Ticket_Links l ON l.rca_id = r.id
            WHERE r.tenant_id = @TenantId AND l.ticket_id = @TicketId
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<RcaRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            TicketId = SqlGuid.ToSql(ticketId),
        }, cancellationToken: cancellationToken));
        return row is null ? null : MapRca(row);
    }

    public async Task<RcaCreateBundle> CreateProblemAndRcaAsync(
        Guid tenantId,
        string title,
        Guid processOwnerId,
        Guid technicalOwnerId,
        Guid? primaryTicketId,
        DateTime reviewDueAt,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var problemId = Guid.NewGuid();
        var rcaId = Guid.NewGuid();
        var year = now.Year;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await using var tx = await connection.BeginTransactionAsync(cancellationToken);

        var problemCount = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM dbo.Problem_Records WHERE tenant_id = @TenantId AND YEAR(created_at) = @Year",
            new { TenantId = SqlGuid.ToSql(tenantId), Year = year },
            transaction: tx, cancellationToken: cancellationToken));
        var problemRef = $"PRB-{year}-{(problemCount + 1):D4}";

        var rcaCount = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM dbo.RCA_Records WHERE tenant_id = @TenantId AND YEAR(created_at) = @Year",
            new { TenantId = SqlGuid.ToSql(tenantId), Year = year },
            transaction: tx, cancellationToken: cancellationToken));
        var rcaRef = $"RCA-{year}-{(rcaCount + 1):D4}";

        await connection.ExecuteAsync(new CommandDefinition("""
            INSERT INTO dbo.Problem_Records (id, tenant_id, problem_ref, title, status, priority, recurrence_count, created_at, updated_at)
            VALUES (@Id, @TenantId, @ProblemRef, @Title, @Status, 1, 1, @Now, @Now)
            """, new
        {
            Id = SqlGuid.ToSql(problemId),
            TenantId = SqlGuid.ToSql(tenantId),
            ProblemRef = problemRef,
            Title = title,
            Status = ProblemStatus.UnderInvestigation,
            Now = now,
        }, transaction: tx, cancellationToken: cancellationToken));

        await connection.ExecuteAsync(new CommandDefinition("""
            INSERT INTO dbo.RCA_Records (id, tenant_id, rca_ref, problem_id, status, process_owner_id, technical_owner_id,
                review_due_at, created_at, updated_at)
            VALUES (@Id, @TenantId, @RcaRef, @ProblemId, @Status, @ProcessOwnerId, @TechnicalOwnerId,
                @ReviewDueAt, @Now, @Now)
            """, new
        {
            Id = SqlGuid.ToSql(rcaId),
            TenantId = SqlGuid.ToSql(tenantId),
            RcaRef = rcaRef,
            ProblemId = SqlGuid.ToSql(problemId),
            Status = RcaStatus.Draft,
            ProcessOwnerId = SqlGuid.ToSql(processOwnerId),
            TechnicalOwnerId = SqlGuid.ToSql(technicalOwnerId),
            ReviewDueAt = reviewDueAt,
            Now = now,
        }, transaction: tx, cancellationToken: cancellationToken));

        if (primaryTicketId.HasValue)
        {
            await connection.ExecuteAsync(new CommandDefinition("""
                INSERT INTO dbo.RCA_Ticket_Links (id, tenant_id, problem_id, rca_id, ticket_id, link_type, created_at)
                VALUES (@Id, @TenantId, @ProblemId, @RcaId, @TicketId, 'PRIMARY', @Now)
                """, new
            {
                Id = SqlGuid.ToSql(Guid.NewGuid()),
                TenantId = SqlGuid.ToSql(tenantId),
                ProblemId = SqlGuid.ToSql(problemId),
                RcaId = SqlGuid.ToSql(rcaId),
                TicketId = SqlGuid.ToSql(primaryTicketId.Value),
                Now = now,
            }, transaction: tx, cancellationToken: cancellationToken));
        }

        await tx.CommitAsync(cancellationToken);

        return new RcaCreateBundle
        {
            ProblemId = problemId,
            ProblemRef = problemRef,
            RcaId = rcaId,
            RcaRef = rcaRef,
        };
    }

    public async Task UpdateRcaAsync(Guid tenantId, Guid rcaId, UpdateRcaPatch patch, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.RCA_Records SET
                incident_summary = COALESCE(@IncidentSummary, incident_summary),
                business_impact = COALESCE(@BusinessImpact, business_impact),
                detection_method = COALESCE(@DetectionMethod, detection_method),
                immediate_cause = COALESCE(@ImmediateCause, immediate_cause),
                root_cause_statement = COALESCE(@RootCauseStatement, root_cause_statement),
                contributing_factors = COALESCE(@ContributingFactors, contributing_factors),
                resolution_summary = COALESCE(@ResolutionSummary, resolution_summary),
                lessons_learned = COALESCE(@LessonsLearned, lessons_learned),
                category_id = COALESCE(@CategoryId, category_id),
                updated_at = @UpdatedAt
            WHERE tenant_id = @TenantId AND id = @Id
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            Id = SqlGuid.ToSql(rcaId),
            patch.IncidentSummary,
            patch.BusinessImpact,
            patch.DetectionMethod,
            patch.ImmediateCause,
            patch.RootCauseStatement,
            patch.ContributingFactors,
            patch.ResolutionSummary,
            patch.LessonsLearned,
            CategoryId = patch.CategoryId.HasValue ? SqlGuid.ToSql(patch.CategoryId.Value) : null,
            patch.UpdatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task UpdateRcaStatusAsync(Guid tenantId, Guid rcaId, string status, DateTime updatedAt, DateTime? publishedAt, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.RCA_Records SET status = @Status, updated_at = @UpdatedAt, published_at = COALESCE(@PublishedAt, published_at)
            WHERE tenant_id = @TenantId AND id = @Id
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            Id = SqlGuid.ToSql(rcaId),
            Status = status,
            UpdatedAt = updatedAt,
            PublishedAt = publishedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task AssignDelegateAsync(Guid tenantId, Guid rcaId, Guid? delegateId, DateTime updatedAt, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.RCA_Records SET delegate_id = @DelegateId, updated_at = @UpdatedAt
            WHERE tenant_id = @TenantId AND id = @Id
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            Id = SqlGuid.ToSql(rcaId),
            DelegateId = delegateId.HasValue ? SqlGuid.ToSql(delegateId.Value) : null,
            UpdatedAt = updatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task LinkTicketAsync(Guid tenantId, Guid problemId, Guid rcaId, Guid ticketId, string linkType, CancellationToken cancellationToken = default)
    {
        const string sql = """
            IF NOT EXISTS (SELECT 1 FROM dbo.RCA_Ticket_Links WHERE ticket_id = @TicketId AND rca_id = @RcaId)
            INSERT INTO dbo.RCA_Ticket_Links (id, tenant_id, problem_id, rca_id, ticket_id, link_type, created_at)
            VALUES (@Id, @TenantId, @ProblemId, @RcaId, @TicketId, @LinkType, @Now)
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(Guid.NewGuid()),
            TenantId = SqlGuid.ToSql(tenantId),
            ProblemId = SqlGuid.ToSql(problemId),
            RcaId = SqlGuid.ToSql(rcaId),
            TicketId = SqlGuid.ToSql(ticketId),
            LinkType = linkType,
            Now = DateTime.UtcNow,
        }, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<RcaTicketLinkDto>> GetTicketLinksAsync(Guid tenantId, Guid rcaId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT l.ticket_id AS TicketId, l.link_type AS LinkType, t.title AS TicketTitle, t.priority AS TicketPriority
            FROM dbo.RCA_Ticket_Links l
            INNER JOIN dbo.Tickets t ON t.id = l.ticket_id
            WHERE l.tenant_id = @TenantId AND l.rca_id = @RcaId
            ORDER BY l.created_at
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<TicketLinkRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            RcaId = SqlGuid.ToSql(rcaId),
        }, cancellationToken: cancellationToken));
        return rows.Select(r => new RcaTicketLinkDto
        {
            TicketId = SqlGuid.FromSql(r.TicketId)!,
            LinkType = r.LinkType,
            TicketTitle = r.TicketTitle,
            TicketPriority = r.TicketPriority,
        }).ToList();
    }

    public async Task<IReadOnlyList<RcaActionDto>> GetActionsAsync(Guid tenantId, Guid rcaId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT a.id AS Id, a.action_type AS ActionType, a.description AS Description,
                   a.owner_id AS OwnerId, u.full_name AS OwnerName, a.due_at AS DueAt,
                   a.status AS Status, a.verified_at AS VerifiedAt
            FROM dbo.RCA_Actions a
            LEFT JOIN dbo.Users u ON u.id = a.owner_id
            WHERE a.tenant_id = @TenantId AND a.rca_id = @RcaId
            ORDER BY a.created_at
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<RcaActionDto>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            RcaId = SqlGuid.ToSql(rcaId),
        }, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<Guid> AddActionAsync(Guid tenantId, Guid rcaId, RcaActionCreateModel model, CancellationToken cancellationToken = default)
    {
        var id = Guid.NewGuid();
        const string sql = """
            INSERT INTO dbo.RCA_Actions (id, tenant_id, rca_id, action_type, description, owner_id, due_at, status, created_at, updated_at)
            VALUES (@Id, @TenantId, @RcaId, @ActionType, @Description, @OwnerId, @DueAt, 'OPEN', @CreatedAt, @CreatedAt)
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(id),
            TenantId = SqlGuid.ToSql(tenantId),
            RcaId = SqlGuid.ToSql(rcaId),
            model.ActionType,
            model.Description,
            OwnerId = SqlGuid.ToSql(model.OwnerId),
            model.DueAt,
            model.CreatedAt,
        }, cancellationToken: cancellationToken));
        return id;
    }

    public async Task<int> CountOverdueCapaAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT COUNT(*) FROM dbo.RCA_Actions
            WHERE tenant_id = @TenantId AND status NOT IN ('COMPLETED','VERIFIED','CANCELLED')
              AND due_at IS NOT NULL AND due_at < SYSUTCDATETIME()
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<int>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));
    }

    public async Task<int> CountOverdueCapaForRcaAsync(Guid tenantId, Guid rcaId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT COUNT(*) FROM dbo.RCA_Actions
            WHERE tenant_id = @TenantId AND rca_id = @RcaId
              AND status NOT IN ('COMPLETED','VERIFIED','CANCELLED')
              AND due_at IS NOT NULL AND due_at < SYSUTCDATETIME()
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<int>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            RcaId = SqlGuid.ToSql(rcaId),
        }, cancellationToken: cancellationToken));
    }

    public async Task<int> CountOpenRcasAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT COUNT(*) FROM dbo.RCA_Records
            WHERE tenant_id = @TenantId AND status IN ('DRAFT','IN_REVIEW','APPROVED')
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<int>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));
    }

    public async Task<Guid> PublishKnownErrorAsync(Guid tenantId, Guid rcaId, KnownErrorCreateModel model, CancellationToken cancellationToken = default)
    {
        var id = Guid.NewGuid();
        const string sql = """
            INSERT INTO dbo.Known_Errors (id, tenant_id, rca_id, title, error_description, workaround, permanent_fix, status, published_at)
            VALUES (@Id, @TenantId, @RcaId, @Title, @ErrorDescription, @Workaround, @PermanentFix, 'ACTIVE', @PublishedAt)
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(id),
            TenantId = SqlGuid.ToSql(tenantId),
            RcaId = SqlGuid.ToSql(rcaId),
            model.Title,
            model.ErrorDescription,
            model.Workaround,
            model.PermanentFix,
            model.PublishedAt,
        }, cancellationToken: cancellationToken));
        return id;
    }

    public async Task<IReadOnlyList<KnownErrorRow>> ListKnownErrorsAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT k.id AS Id, k.title AS Title, k.error_description AS ErrorDescription,
                   k.workaround AS Workaround, k.permanent_fix AS PermanentFix,
                   k.rca_id AS RcaId, r.rca_ref AS RcaRef, k.published_at AS PublishedAt
            FROM dbo.Known_Errors k
            INNER JOIN dbo.RCA_Records r ON r.id = k.rca_id
            WHERE k.tenant_id = @TenantId AND k.status = 'ACTIVE'
            ORDER BY k.published_at DESC
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<KnownErrorRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
        }, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    private static ProblemEntity MapProblem(ProblemRow row) => new()
    {
        Id = SqlGuid.FromSql(row.Id)!,
        TenantId = SqlGuid.FromSql(row.TenantId)!,
        ProblemRef = row.ProblemRef,
        Title = row.Title,
        Status = row.Status,
        Priority = row.Priority,
        RecurrenceCount = row.RecurrenceCount,
        CategoryId = SqlGuid.FromSqlNullable(row.CategoryId),
        CreatedAt = row.CreatedAt,
        UpdatedAt = row.UpdatedAt,
    };

    private static RcaEntity MapRca(RcaRow row) => new()
    {
        Id = SqlGuid.FromSql(row.Id)!,
        TenantId = SqlGuid.FromSql(row.TenantId)!,
        RcaRef = row.RcaRef,
        ProblemId = SqlGuid.FromSql(row.ProblemId)!,
        Status = row.Status,
        IncidentSummary = row.IncidentSummary,
        BusinessImpact = row.BusinessImpact,
        DetectionMethod = row.DetectionMethod,
        ImmediateCause = row.ImmediateCause,
        RootCauseStatement = row.RootCauseStatement,
        ContributingFactors = row.ContributingFactors,
        ResolutionSummary = row.ResolutionSummary,
        LessonsLearned = row.LessonsLearned,
        CategoryId = SqlGuid.FromSqlNullable(row.CategoryId),
        ProcessOwnerId = SqlGuid.FromSql(row.ProcessOwnerId)!,
        TechnicalOwnerId = SqlGuid.FromSql(row.TechnicalOwnerId)!,
        DelegateId = SqlGuid.FromSqlNullable(row.DelegateId),
        ReviewDueAt = row.ReviewDueAt,
        PublishedAt = row.PublishedAt,
        CreatedAt = row.CreatedAt,
        UpdatedAt = row.UpdatedAt,
    };

    private sealed class TicketLinkRow
    {
        public string TicketId { get; init; } = "";
        public string LinkType { get; init; } = "";
        public string? TicketTitle { get; init; }
        public int? TicketPriority { get; init; }
    }

    private sealed class ListRow
    {
        public string Id { get; init; } = "";
        public string TenantId { get; init; } = "";
        public string ProblemRef { get; init; } = "";
        public string Title { get; init; } = "";
        public string Status { get; init; } = "";
        public int Priority { get; init; }
        public int RecurrenceCount { get; init; }
        public string? CategoryId { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
        public string? RcaId { get; init; }
        public string? RcaRef { get; init; }
        public string? RcaStatus { get; init; }
        public DateTime? ReviewDueAt { get; init; }
        public string? ProcessOwnerId { get; init; }
        public string? TechnicalOwnerId { get; init; }
        public int LinkedTicketCount { get; init; }
        public string? ProcessOwnerName { get; init; }
        public string? TechnicalOwnerName { get; init; }
    }

    private sealed class ProblemRow
    {
        public string Id { get; init; } = "";
        public string TenantId { get; init; } = "";
        public string ProblemRef { get; init; } = "";
        public string Title { get; init; } = "";
        public string Status { get; init; } = "";
        public int Priority { get; init; }
        public int RecurrenceCount { get; init; }
        public string? CategoryId { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
    }

    private sealed class RcaRow
    {
        public string Id { get; init; } = "";
        public string TenantId { get; init; } = "";
        public string RcaRef { get; init; } = "";
        public string ProblemId { get; init; } = "";
        public string Status { get; init; } = "";
        public string? IncidentSummary { get; init; }
        public string? BusinessImpact { get; init; }
        public string? DetectionMethod { get; init; }
        public string? ImmediateCause { get; init; }
        public string? RootCauseStatement { get; init; }
        public string? ContributingFactors { get; init; }
        public string? ResolutionSummary { get; init; }
        public string? LessonsLearned { get; init; }
        public string? CategoryId { get; init; }
        public string ProcessOwnerId { get; init; } = "";
        public string TechnicalOwnerId { get; init; } = "";
        public string? DelegateId { get; init; }
        public DateTime? ReviewDueAt { get; init; }
        public DateTime? PublishedAt { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
    }
}
