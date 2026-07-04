using Lotris.Application.Admin;
using Lotris.Application.Common;
using Lotris.Application.Intelligence;
using Lotris.Application.Notifications;
using Lotris.Application.ProblemManagement;
using Lotris.Application.Tickets;
using Lotris.Contracts;
using Lotris.Contracts.ProblemManagement;
using Lotris.Domain;
using Lotris.Domain.ProblemManagement;
using Lotris.Domain.Tickets;
using ContractsRcaActionDto = Lotris.Contracts.ProblemManagement.RcaActionDto;
using ContractsRcaTicketLinkDto = Lotris.Contracts.ProblemManagement.RcaTicketLinkDto;

namespace Lotris.Application.ProblemManagement;

public sealed class RcaService
{
    private static readonly UserRole[] LeadRoles =
    [
        UserRole.SuperAdmin,
        UserRole.Admin,
        UserRole.ItManager,
        UserRole.TeamLead,
    ];

    private readonly IRcaRepository _rca;
    private readonly ITicketRepository _tickets;
    private readonly IAdminRepository _admin;
    private readonly INotificationEnqueuer _notifications;
    private readonly KnowledgeIngestionService _knowledge;

    public RcaService(
        IRcaRepository rca,
        ITicketRepository tickets,
        IAdminRepository admin,
        INotificationEnqueuer notifications,
        KnowledgeIngestionService knowledge)
    {
        _rca = rca;
        _tickets = tickets;
        _admin = admin;
        _notifications = notifications;
        _knowledge = knowledge;
    }

    public async Task<IReadOnlyList<ProblemListItemDto>> ListAsync(
        LotrisSession session,
        string? filter,
        CancellationToken cancellationToken = default)
    {
        var rows = await _rca.ListAsync(session.TenantId, filter, cancellationToken);
        return rows.Select(row => new ProblemListItemDto(
            row.Problem.Id,
            row.Problem.ProblemRef,
            row.Problem.Title,
            row.Problem.Status,
            row.Problem.Priority,
            row.Problem.RecurrenceCount,
            row.Rca?.Status,
            row.Rca?.Id,
            row.Rca?.RcaRef,
            row.LinkedTicketCount,
            row.Rca?.ProcessOwnerId ?? Guid.Empty,
            row.Rca?.TechnicalOwnerId ?? Guid.Empty,
            row.ProcessOwnerName,
            row.TechnicalOwnerName,
            row.Rca?.ReviewDueAt,
            row.Problem.CreatedAt)).ToList();
    }

    public async Task<RcaDetailDto> GetByIdAsync(
        LotrisSession session,
        Guid rcaId,
        CancellationToken cancellationToken = default)
    {
        var rca = await GetRcaOrThrowAsync(session, rcaId, cancellationToken);
        var problem = await _rca.GetProblemByIdAsync(session.TenantId, rca.ProblemId, cancellationToken)
            ?? throw new NotFoundException("Problem not found");

        var links = await _rca.GetTicketLinksAsync(session.TenantId, rcaId, cancellationToken);
        var actions = await _rca.GetActionsAsync(session.TenantId, rcaId, cancellationToken);
        var users = await _admin.ListUsersAsync(session.TenantId, teamId: null, cancellationToken);
        var userMap = users.ToDictionary(u => u.Id, u => u.FullName);

        return MapDetail(rca, problem, links, actions, userMap);
    }

    public async Task<RcaDetailDto> CreateAsync(
        LotrisSession session,
        CreateProblemRequest request,
        CancellationToken cancellationToken = default)
    {
        AssertLead(session);

        var rules = await _rca.GetTriggerRulesAsync(session.TenantId, cancellationToken);
        var reviewDue = DateTime.UtcNow.AddDays(rules.RcaCompletionDays);
        var processOwner = request.ProcessOwnerId ?? session.UserId;
        var technicalOwner = request.TechnicalOwnerId ?? session.UserId;

        var bundle = await _rca.CreateProblemAndRcaAsync(
            session.TenantId,
            request.Title,
            processOwner,
            technicalOwner,
            request.TicketId,
            reviewDue,
            cancellationToken);

        _notifications.EnqueueNotification(new NotificationPayload
        {
            Type = "RCA_CREATED",
            TenantId = session.TenantId,
            RecipientId = technicalOwner,
        });

        return await GetByIdAsync(session, bundle.RcaId, cancellationToken);
    }

    public async Task<RcaDetailDto> UpdateAsync(
        LotrisSession session,
        Guid rcaId,
        UpdateRcaRequest request,
        CancellationToken cancellationToken = default)
    {
        var rca = await GetRcaOrThrowAsync(session, rcaId, cancellationToken);
        AssertCanEdit(session, rca);

        await _rca.UpdateRcaAsync(session.TenantId, rcaId, new UpdateRcaPatch
        {
            IncidentSummary = request.IncidentSummary,
            BusinessImpact = request.BusinessImpact,
            DetectionMethod = request.DetectionMethod,
            ImmediateCause = request.ImmediateCause,
            RootCauseStatement = request.RootCauseStatement,
            ContributingFactors = request.ContributingFactors,
            ResolutionSummary = request.ResolutionSummary,
            LessonsLearned = request.LessonsLearned,
            CategoryId = request.CategoryId,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken);

        return await GetByIdAsync(session, rcaId, cancellationToken);
    }

    public async Task<RcaDetailDto> SubmitForReviewAsync(
        LotrisSession session,
        Guid rcaId,
        CancellationToken cancellationToken = default)
    {
        var rca = await GetRcaOrThrowAsync(session, rcaId, cancellationToken);
        AssertCanEdit(session, rca);

        if (string.IsNullOrWhiteSpace(rca.RootCauseStatement))
        {
            throw new BadRequestException("Root cause statement is required before submit");
        }

        RcaLifecycle.AssertTransition(rca.Status, RcaStatus.InReview);
        await _rca.UpdateRcaStatusAsync(session.TenantId, rcaId, RcaStatus.InReview, DateTime.UtcNow, null, cancellationToken);

        _notifications.EnqueueNotification(new NotificationPayload
        {
            Type = "RCA_REVIEW_REQUESTED",
            TenantId = session.TenantId,
            RecipientId = rca.ProcessOwnerId,
        });

        return await GetByIdAsync(session, rcaId, cancellationToken);
    }

    public async Task<RcaDetailDto> PublishAsync(
        LotrisSession session,
        Guid rcaId,
        CancellationToken cancellationToken = default)
    {
        AssertLead(session);
        var rca = await GetRcaOrThrowAsync(session, rcaId, cancellationToken);

        if (rca.Status is not RcaStatus.Approved and not RcaStatus.InReview)
        {
            RcaLifecycle.AssertTransition(rca.Status, RcaStatus.Published);
        }

        var now = DateTime.UtcNow;
        await _rca.UpdateRcaStatusAsync(session.TenantId, rcaId, RcaStatus.Published, now, now, cancellationToken);

        var problem = await _rca.GetProblemByIdAsync(session.TenantId, rca.ProblemId, cancellationToken)!;
        await _rca.PublishKnownErrorAsync(session.TenantId, rcaId, new KnownErrorCreateModel
        {
            Title = problem!.Title,
            ErrorDescription = rca.RootCauseStatement ?? rca.ImmediateCause ?? problem.Title,
            Workaround = rca.ResolutionSummary,
            PermanentFix = rca.LessonsLearned,
            PublishedAt = now,
        }, cancellationToken);

        _notifications.EnqueueNotification(new NotificationPayload
        {
            Type = "RCA_PUBLISHED",
            TenantId = session.TenantId,
            TicketTitle = $"RCA {rca.RcaRef} published to knowledge base",
        });

        await _knowledge.IngestPublishedRcaAsync(
            session.TenantId,
            rcaId,
            problem!.Title,
            rca.IncidentSummary,
            rca.RootCauseStatement ?? rca.ImmediateCause,
            rca.ResolutionSummary,
            rca.LessonsLearned,
            rca.LessonsLearned,
            cancellationToken);

        return await GetByIdAsync(session, rcaId, cancellationToken);
    }

    public async Task<RcaDetailDto> AssignDelegateAsync(
        LotrisSession session,
        Guid rcaId,
        AssignRcaDelegateRequest request,
        CancellationToken cancellationToken = default)
    {
        AssertLead(session);
        await GetRcaOrThrowAsync(session, rcaId, cancellationToken);
        await _rca.AssignDelegateAsync(session.TenantId, rcaId, request.DelegateId, DateTime.UtcNow, cancellationToken);
        return await GetByIdAsync(session, rcaId, cancellationToken);
    }

    public async Task<RcaDetailDto> LinkTicketAsync(
        LotrisSession session,
        Guid rcaId,
        LinkTicketRequest request,
        CancellationToken cancellationToken = default)
    {
        AssertLead(session);
        var rca = await GetRcaOrThrowAsync(session, rcaId, cancellationToken);
        var ticket = await _tickets.GetByIdAsync(session.TenantId, request.TicketId, cancellationToken)
            ?? throw new NotFoundException("Ticket not found");
        _ = ticket;

        await _rca.LinkTicketAsync(session.TenantId, rca.ProblemId, rcaId, request.TicketId, request.LinkType, cancellationToken);
        return await GetByIdAsync(session, rcaId, cancellationToken);
    }

    public async Task<ContractsRcaActionDto> AddActionAsync(
        LotrisSession session,
        Guid rcaId,
        RcaActionCreateRequest request,
        CancellationToken cancellationToken = default)
    {
        var rca = await GetRcaOrThrowAsync(session, rcaId, cancellationToken);
        AssertCanEdit(session, rca);

        if (request.ActionType is not ("CORRECTIVE" or "PREVENTIVE"))
        {
            throw new BadRequestException("Action type must be CORRECTIVE or PREVENTIVE");
        }

        var id = await _rca.AddActionAsync(session.TenantId, rcaId, new RcaActionCreateModel
        {
            ActionType = request.ActionType,
            Description = request.Description,
            OwnerId = request.OwnerId,
            DueAt = request.DueAt,
            CreatedAt = DateTime.UtcNow,
        }, cancellationToken);

        var actions = await _rca.GetActionsAsync(session.TenantId, rcaId, cancellationToken);
        var action = actions.First(a => a.Id == id);
        return MapAction(action);
    }

    public async Task<TicketRcaSummaryDto> GetTicketSummaryAsync(
        LotrisSession session,
        Guid ticketId,
        CancellationToken cancellationToken = default)
    {
        var ticket = await _tickets.GetByIdAsync(session.TenantId, ticketId, cancellationToken)
            ?? throw new NotFoundException("Ticket not found");

        var rules = await _rca.GetTriggerRulesAsync(session.TenantId, cancellationToken);
        var rcaRequired = ticket.Priority == TicketPriority.Critical && rules.AutoP1
            && ticket.Status == TicketStatus.Closed;

        var rca = await _rca.GetRcaByTicketIdAsync(session.TenantId, ticketId, cancellationToken);
        ProblemEntity? problem = null;
        if (rca is not null)
        {
            problem = await _rca.GetProblemByIdAsync(session.TenantId, rca.ProblemId, cancellationToken);
        }

        var overdue = rca is null ? 0 : await _rca.CountOverdueCapaForRcaAsync(session.TenantId, rca.Id, cancellationToken);
        var isLead = LeadRoles.Contains(session.Role);
        var canEdit = rca is not null && (isLead || rca.DelegateId == session.UserId);

        return new TicketRcaSummaryDto(
            RcaRequired: rcaRequired && rca is null,
            ProblemId: problem?.Id,
            ProblemRef: problem?.ProblemRef,
            RcaId: rca?.Id,
            RcaRef: rca?.RcaRef,
            RcaStatus: rca?.Status,
            OverdueCapaCount: overdue,
            CanEdit: canEdit,
            CanCreateOrLink: isLead);
    }

    public async Task<RcaDashboardStatsDto> GetDashboardStatsAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        var open = await _rca.CountOpenRcasAsync(session.TenantId, cancellationToken);
        var overdue = await _rca.CountOverdueCapaAsync(session.TenantId, cancellationToken);
        var rows = await _rca.ListAsync(session.TenantId, "awaiting_review", cancellationToken);
        return new RcaDashboardStatsDto(open, overdue, rows.Count);
    }

    public async Task<IReadOnlyList<KnownErrorDto>> ListKnownErrorsAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        var rows = await _rca.ListKnownErrorsAsync(session.TenantId, cancellationToken);
        return rows.Select(r => new KnownErrorDto(
            r.Id, r.Title, r.ErrorDescription, r.Workaround, r.PermanentFix, r.RcaId, r.RcaRef, r.PublishedAt)).ToList();
    }

    public async Task<RcaTriggerRulesDto> GetTriggerRulesAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        AssertLead(session);
        var rules = await _rca.GetTriggerRulesAsync(session.TenantId, cancellationToken);
        return MapRules(rules);
    }

    public async Task<RcaTriggerRulesDto> UpdateTriggerRulesAsync(
        LotrisSession session,
        UpdateRcaTriggerRulesRequest request,
        CancellationToken cancellationToken = default)
    {
        AssertLead(session);
        await _rca.UpdateTriggerRulesAsync(session.TenantId, new RcaTriggerRulesEntity
        {
            TenantId = session.TenantId,
            AutoP1 = request.AutoP1,
            AutoP2 = request.AutoP2,
            AutoP2SlaBreach = request.AutoP2SlaBreach,
            AutoSecurity = request.AutoSecurity,
            RecurrenceThreshold = request.RecurrenceThreshold,
            RecurrenceWindowDays = request.RecurrenceWindowDays,
            RcaCompletionDays = request.RcaCompletionDays,
        }, cancellationToken);
        return await GetTriggerRulesAsync(session, cancellationToken);
    }

    public async Task EvaluateOnTicketClosedAsync(
        Guid tenantId,
        Guid ticketId,
        int priority,
        Guid? assigneeId,
        string title,
        Guid closedByUserId,
        CancellationToken cancellationToken = default)
    {
        var existing = await _rca.GetRcaByTicketIdAsync(tenantId, ticketId, cancellationToken);
        if (existing is not null)
        {
            return;
        }

        var rules = await _rca.GetTriggerRulesAsync(tenantId, cancellationToken);
        if (!rules.AutoP1 || priority != TicketPriority.Critical)
        {
            return;
        }

        var users = await _admin.ListUsersAsync(tenantId, teamId: null, cancellationToken);
        var processOwner = users.FirstOrDefault(u => u.RoleId == (int)UserRole.ItManager)?.Id
            ?? users.FirstOrDefault(u => u.RoleId == (int)UserRole.TeamLead)?.Id
            ?? closedByUserId;
        var technicalOwner = assigneeId ?? processOwner;

        var reviewDue = DateTime.UtcNow.AddDays(rules.RcaCompletionDays);
        var bundle = await _rca.CreateProblemAndRcaAsync(
            tenantId,
            title,
            processOwner,
            technicalOwner,
            ticketId,
            reviewDue,
            cancellationToken);

        _notifications.EnqueueNotification(new NotificationPayload
        {
            Type = "RCA_CREATED",
            TenantId = tenantId,
            TicketId = ticketId,
            TicketTitle = title,
            RecipientId = technicalOwner,
        });
    }

    private async Task<RcaEntity> GetRcaOrThrowAsync(LotrisSession session, Guid rcaId, CancellationToken cancellationToken)
    {
        return await _rca.GetRcaByIdAsync(session.TenantId, rcaId, cancellationToken)
            ?? throw new NotFoundException("RCA not found");
    }

    private static void AssertLead(LotrisSession session)
    {
        if (!LeadRoles.Contains(session.Role))
        {
            throw new ForbiddenException("Only team leads and managers can perform this action");
        }
    }

    private static void AssertCanEdit(LotrisSession session, RcaEntity rca)
    {
        if (LeadRoles.Contains(session.Role))
        {
            return;
        }

        if (rca.DelegateId == session.UserId)
        {
            return;
        }

        throw new ForbiddenException("You do not have permission to edit this RCA");
    }

    private static RcaTriggerRulesDto MapRules(RcaTriggerRulesEntity rules) => new(
        rules.AutoP1,
        rules.AutoP2,
        rules.AutoP2SlaBreach,
        rules.AutoSecurity,
        rules.RecurrenceThreshold,
        rules.RecurrenceWindowDays,
        rules.RcaCompletionDays);

    private static RcaDetailDto MapDetail(
        RcaEntity rca,
        ProblemEntity problem,
        IReadOnlyList<RcaTicketLinkDto> links,
        IReadOnlyList<RcaActionDto> actions,
        IReadOnlyDictionary<Guid, string> userMap) => new(
        rca.Id,
        rca.RcaRef,
        problem.Id,
        problem.ProblemRef,
        problem.Title,
        rca.Status,
        rca.IncidentSummary,
        rca.BusinessImpact,
        rca.DetectionMethod,
        rca.ImmediateCause,
        rca.RootCauseStatement,
        rca.ContributingFactors,
        rca.ResolutionSummary,
        rca.LessonsLearned,
        rca.CategoryId,
        null,
        rca.ProcessOwnerId,
        rca.TechnicalOwnerId,
        rca.DelegateId,
        userMap.GetValueOrDefault(rca.ProcessOwnerId),
        userMap.GetValueOrDefault(rca.TechnicalOwnerId),
        rca.DelegateId.HasValue ? userMap.GetValueOrDefault(rca.DelegateId.Value) : null,
        rca.ReviewDueAt,
        rca.PublishedAt,
        rca.CreatedAt,
        rca.UpdatedAt,
        links.Select(l => new ContractsRcaTicketLinkDto(
            l.TicketId, l.TicketRef, l.LinkType, l.TicketTitle, l.TicketPriority)).ToList(),
        actions.Select(MapAction).ToList());

    private static ContractsRcaActionDto MapAction(RcaActionDto action) => new(
        action.Id,
        action.ActionType,
        action.Description,
        action.OwnerId,
        action.OwnerName,
        action.DueAt,
        action.Status,
        action.VerifiedAt);
}
