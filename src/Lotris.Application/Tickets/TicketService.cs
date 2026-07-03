using Lotris.Application.Admin;
using Lotris.Application.Analytics;
using Lotris.Application.Common;
using Lotris.Application.Notifications;
using Lotris.Application.ProblemManagement;
using Lotris.Application.Tickets;
using Lotris.Contracts;
using Lotris.Contracts.Tickets;
using Lotris.Domain;
using Lotris.Domain.Tickets;

namespace Lotris.Application.Tickets;

public class TicketService
{
    private static readonly UserRole[] LeadRoles =
    [
        UserRole.SuperAdmin,
        UserRole.Admin,
        UserRole.ItManager,
        UserRole.TeamLead,
    ];

    private readonly ITicketRepository _tickets;
    private readonly ISlaConfigRepository _slaConfigs;
    private readonly ITicketHistoryWriter _history;
    private readonly ISlaJobScheduler _slaJobs;
    private readonly INotificationEnqueuer _notifications;
    private readonly IDashboardCacheService _dashboardCache;
    private readonly IAdminRepository _admin;
    private readonly RcaService _rca;

    public TicketService(
        ITicketRepository tickets,
        ISlaConfigRepository slaConfigs,
        ITicketHistoryWriter history,
        ISlaJobScheduler slaJobs,
        INotificationEnqueuer notifications,
        IDashboardCacheService dashboardCache,
        IAdminRepository admin,
        RcaService rca)
    {
        _tickets = tickets;
        _slaConfigs = slaConfigs;
        _history = history;
        _slaJobs = slaJobs;
        _notifications = notifications;
        _dashboardCache = dashboardCache;
        _admin = admin;
        _rca = rca;
    }

    public async Task<TicketDto> CreateAsync(
        LotrisSession session,
        CreateTicketRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!TicketSource.Allowed.Contains(request.Source))
        {
            throw new BadRequestException($"Invalid source: {request.Source}");
        }

        if (!TicketPriority.All.Contains(request.Priority))
        {
            throw new BadRequestException($"Invalid priority: {request.Priority}");
        }

        var now = DateTime.UtcNow;
        var id = Guid.NewGuid();
        var sla = await _slaConfigs.GetAsync(session.TenantId, request.TeamId, cancellationToken);
        var slaPickupDeadline = request.TeamId.HasValue
            ? now.AddMinutes(sla.PickupSlaMinutes)
            : (DateTime?)null;

        await _tickets.CreateAsync(new TicketCreateModel
        {
            Id = id,
            TenantId = session.TenantId,
            Title = request.Title,
            Description = request.Description,
            Priority = request.Priority,
            Status = TicketStatus.New,
            Source = request.Source,
            RequesterEmail = request.RequesterEmail,
            RequesterName = request.RequesterName,
            RelatedTicketId = request.RelatedTicketId,
            TeamId = request.TeamId,
            CreatedBy = session.UserId,
            SlaPickupDeadline = slaPickupDeadline,
            CreatedAt = now,
            UpdatedAt = now,
        }, cancellationToken);

        await _history.WriteAsync(new HistoryEntry
        {
            TenantId = session.TenantId,
            TicketId = id,
            ActorId = session.UserId,
            EventType = HistoryEvent.Created,
            ToValue = TicketStatus.New,
            CreatedAt = now,
        }, cancellationToken);

        if (request.TeamId.HasValue)
        {
            await UpdateStatusAsync(session, id, new UpdateTicketStatusRequest(
                TicketStatus.TeamAssigned,
                TeamId: request.TeamId), cancellationToken);
        }

        var created = ToDto(await GetEntityOrThrowAsync(session, id, cancellationToken));
        _notifications.EnqueueNotification(new NotificationPayload
        {
            Type = "TICKET_CREATED",
            TenantId = session.TenantId,
            TicketId = id,
            TicketTitle = request.Title,
            ActorId = session.UserId,
        });

        await _dashboardCache.InvalidateAsync(session.TenantId, cancellationToken);
        return created;
    }

    public async Task<PagedResult<TicketDto>> ListAsync(
        LotrisSession session,
        TicketListQuery query,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var limit = Math.Min(100, Math.Max(1, query.Limit));
        var filters = new TicketListFilters
        {
            TenantId = session.TenantId,
            Status = query.Status,
            Priority = query.Priority,
            TeamId = query.TeamId,
            AssigneeId = query.AssigneeId,
            Source = query.Source,
            SlaWarning = query.SlaWarning?.ToUpperInvariant(),
            Search = query.Search,
            Page = page,
            Limit = limit,
        };

        if (session.Role == UserRole.Engineer)
        {
            filters.AssigneeIdFilter = session.UserId;
        }
        else if (session.Role == UserRole.TeamLead)
        {
            var teamId = await _tickets.GetUserTeamIdAsync(session.TenantId, session.UserId, cancellationToken);
            var granted = await _tickets.GetGrantedTeamIdsAsync(session.TenantId, session.UserId, cancellationToken);
            var visible = new List<Guid>();
            if (teamId.HasValue)
            {
                visible.Add(teamId.Value);
            }

            visible.AddRange(granted);

            if (visible.Count > 0)
            {
                filters.VisibleTeamIds = visible;
            }
            else
            {
                filters.FallbackToAssigneeOnly = true;
                filters.AssigneeIdFilter = session.UserId;
            }
        }

        var (rows, total) = await _tickets.ListAsync(filters, cancellationToken);
        return new PagedResult<TicketDto>(total, page, limit, rows.Select(ToDto).ToList());
    }

    public async Task<TicketDto> GetByIdAsync(
        LotrisSession session,
        Guid ticketId,
        CancellationToken cancellationToken = default)
    {
        return ToDto(await GetEntityOrThrowAsync(session, ticketId, cancellationToken));
    }

    public async Task<TicketDto> UpdateStatusAsync(
        LotrisSession session,
        Guid ticketId,
        UpdateTicketStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var ticket = await GetEntityOrThrowAsync(session, ticketId, cancellationToken);
        var from = ticket.Status;
        var to = request.Status;

        try
        {
            TicketLifecycle.AssertTransition(from, to);
        }
        catch (InvalidOperationException ex)
        {
            throw new BadRequestException(ex.Message);
        }

        if (to == TicketStatus.Escalated && !LeadRoles.Contains(session.Role))
        {
            throw new ForbiddenException("Only team leads and managers can escalate tickets");
        }

        if (to == TicketStatus.Closed && !LeadRoles.Contains(session.Role))
        {
            throw new ForbiddenException("Only team leads and managers can close tickets");
        }

        var now = DateTime.UtcNow;
        var update = new TicketStatusUpdate
        {
            Status = to,
            UpdatedAt = now,
        };

        if (to == TicketStatus.Assigned && request.AssigneeId.HasValue)
        {
            update.AssigneeId = request.AssigneeId;
            update.AssignedAt = now;
            var sla = await _slaConfigs.GetAsync(session.TenantId, ticket.TeamId, cancellationToken);
            update.SlaResolutionDeadline = now.AddMinutes(sla.ResolutionSlaMinutes);
        }

        if (to == TicketStatus.TeamAssigned && request.TeamId.HasValue)
        {
            update.TeamId = request.TeamId;
        }

        if (to == TicketStatus.Resolved)
        {
            update.ResolvedAt = now;
        }

        if (to == TicketStatus.Closed)
        {
            update.ClosedAt = now;
        }

        await _tickets.UpdateStatusAsync(session.TenantId, ticketId, update, cancellationToken);

        await _history.WriteAsync(new HistoryEntry
        {
            TenantId = session.TenantId,
            TicketId = ticketId,
            ActorId = session.UserId,
            EventType = HistoryEvent.StatusChanged,
            FromValue = from,
            ToValue = to,
            CreatedAt = now,
        }, cancellationToken);

        if (to == TicketStatus.Escalated)
        {
            await _history.WriteAsync(new HistoryEntry
            {
                TenantId = session.TenantId,
                TicketId = ticketId,
                ActorId = session.UserId,
                EventType = HistoryEvent.Escalated,
                CreatedAt = now,
            }, cancellationToken);
        }

        if (to == TicketStatus.TeamAssigned && ticket.SlaPickupDeadline.HasValue)
        {
            await _slaJobs.SchedulePickupSlaAsync(
                ticketId,
                session.TenantId,
                ticket.SlaPickupDeadline.Value,
                cancellationToken);
        }

        if (to == TicketStatus.Assigned && update.SlaResolutionDeadline.HasValue)
        {
            await _slaJobs.ScheduleResolutionSlaAsync(
                ticketId,
                session.TenantId,
                update.SlaResolutionDeadline.Value,
                cancellationToken);
        }

        var updated = ToDto(await GetEntityOrThrowAsync(session, ticketId, cancellationToken));

        if (to == TicketStatus.Assigned)
        {
            _notifications.EnqueueNotification(new NotificationPayload
            {
                Type = "TICKET_ASSIGNED",
                TenantId = session.TenantId,
                TicketId = ticketId,
                TicketTitle = updated.Title,
                ActorId = session.UserId,
                RecipientId = request.AssigneeId,
            });
        }

        if (to == TicketStatus.Resolved)
        {
            _notifications.EnqueueNotification(new NotificationPayload
            {
                Type = "TICKET_RESOLVED",
                TenantId = session.TenantId,
                TicketId = ticketId,
                TicketTitle = updated.Title,
                ActorId = session.UserId,
                RecipientId = updated.CreatedBy,
            });
        }

        if (to == TicketStatus.Escalated)
        {
            _notifications.EnqueueNotification(new NotificationPayload
            {
                Type = "TICKET_ESCALATED",
                TenantId = session.TenantId,
                TicketId = ticketId,
                TicketTitle = updated.Title,
                ActorId = session.UserId,
            });
        }

        if (to == TicketStatus.Closed)
        {
            await _rca.EvaluateOnTicketClosedAsync(
                session.TenantId,
                ticketId,
                ticket.Priority,
                ticket.AssigneeId,
                ticket.Title,
                session.UserId,
                cancellationToken);
        }

        await _dashboardCache.InvalidateAsync(session.TenantId, cancellationToken);
        return updated;
    }

    public async Task<CreateCommentResponse> AddCommentAsync(
        LotrisSession session,
        Guid ticketId,
        CreateCommentRequest request,
        CancellationToken cancellationToken = default)
    {
        await GetEntityOrThrowAsync(session, ticketId, cancellationToken);

        if (request.IsInternal && session.Role == UserRole.Engineer)
        {
            throw new ForbiddenException("Engineers cannot post internal comments");
        }

        var now = DateTime.UtcNow;
        var id = await _tickets.AddCommentAsync(
            session.TenantId,
            ticketId,
            session.UserId,
            request.Body,
            request.IsInternal,
            now,
            cancellationToken);

        await _history.WriteAsync(new HistoryEntry
        {
            TenantId = session.TenantId,
            TicketId = ticketId,
            ActorId = session.UserId,
            EventType = HistoryEvent.CommentAdded,
            CreatedAt = now,
        }, cancellationToken);

        return new CreateCommentResponse(id);
    }

    public async Task<IReadOnlyList<TicketCommentDto>> GetCommentsAsync(
        LotrisSession session,
        Guid ticketId,
        CancellationToken cancellationToken = default)
    {
        await GetEntityOrThrowAsync(session, ticketId, cancellationToken);
        var excludeInternal = session.Role == UserRole.Engineer;
        var rows = await _tickets.GetCommentsAsync(
            session.TenantId,
            ticketId,
            excludeInternal,
            cancellationToken);

        return rows.Select(c => new TicketCommentDto(
            c.Id,
            c.TicketId,
            c.AuthorId,
            c.Body,
            c.IsInternal,
            c.CreatedAt,
            c.UpdatedAt)).ToList();
    }

    public async Task<CreateAttachmentResponse> AddAttachmentAsync(
        LotrisSession session,
        Guid ticketId,
        CreateAttachmentRequest request,
        CancellationToken cancellationToken = default)
    {
        await GetEntityOrThrowAsync(session, ticketId, cancellationToken);
        var now = DateTime.UtcNow;
        var id = await _tickets.AddAttachmentAsync(
            session.TenantId,
            ticketId,
            session.UserId,
            request.StorageKey,
            request.OriginalName,
            request.MimeType,
            request.SizeBytes,
            now,
            cancellationToken);

        await _history.WriteAsync(new HistoryEntry
        {
            TenantId = session.TenantId,
            TicketId = ticketId,
            ActorId = session.UserId,
            EventType = HistoryEvent.AttachmentAdded,
            ToValue = request.OriginalName,
            CreatedAt = now,
        }, cancellationToken);

        return new CreateAttachmentResponse(id);
    }

    public async Task<IReadOnlyList<TicketHistoryDto>> GetHistoryAsync(
        LotrisSession session,
        Guid ticketId,
        CancellationToken cancellationToken = default)
    {
        await GetEntityOrThrowAsync(session, ticketId, cancellationToken);
        var rows = await _tickets.GetHistoryAsync(session.TenantId, ticketId, cancellationToken);
        return rows.Select(h => new TicketHistoryDto(
            h.ActorId,
            h.EventType,
            h.FromValue,
            h.ToValue,
            h.Metadata,
            h.CreatedAt)).ToList();
    }

    private static readonly string[] BatchReassignBlockedStatuses =
    [
        TicketStatus.Escalated,
        TicketStatus.Resolved,
        TicketStatus.Closed,
    ];

    public async Task<BatchReassignResponse> BatchReassignAsync(
        LotrisSession session,
        BatchReassignRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!LeadRoles.Contains(session.Role))
        {
            throw new ForbiddenException("Insufficient role for ticket reassignment");
        }

        if (request.Reassignments.Count is < 1 or > 20)
        {
            throw new BadRequestException("Reassignments must contain between 1 and 20 items");
        }

        var now = DateTime.UtcNow;
        var results = new List<BatchReassignResultItem>();

        foreach (var item in request.Reassignments)
        {
            var ticket = await _tickets.GetByIdAsync(session.TenantId, item.TicketId, cancellationToken);
            if (ticket is null || BatchReassignBlockedStatuses.Contains(ticket.Status, StringComparer.Ordinal))
            {
                results.Add(new BatchReassignResultItem(item.TicketId, false));
                continue;
            }

            var engineer = await _admin.GetUserAsync(session.TenantId, item.ToEngineerId, cancellationToken);
            if (engineer is null || !engineer.IsActive)
            {
                results.Add(new BatchReassignResultItem(item.TicketId, false));
                continue;
            }

            var ok = await _tickets.ReassignAssigneeAsync(
                session.TenantId,
                item.TicketId,
                item.ToEngineerId,
                now,
                cancellationToken);

            results.Add(new BatchReassignResultItem(item.TicketId, ok));
        }

        await _dashboardCache.InvalidateAsync(session.TenantId, cancellationToken);

        return new BatchReassignResponse(
            results,
            results.Count(r => r.Ok));
    }

    private async Task<TicketEntity> GetEntityOrThrowAsync(
        LotrisSession session,
        Guid ticketId,
        CancellationToken cancellationToken)
    {
        var ticket = await _tickets.GetByIdAsync(session.TenantId, ticketId, cancellationToken);
        if (ticket is null)
        {
            throw new NotFoundException($"Ticket {ticketId} not found");
        }

        return ticket;
    }

    private static TicketDto ToDto(TicketEntity ticket) =>
        new(
            ticket.Id,
            ticket.Title,
            ticket.Description,
            ticket.Status,
            ticket.Priority,
            ticket.TenantId,
            ticket.TeamId,
            ticket.TeamName,
            ticket.AssigneeId,
            ticket.Source,
            ticket.RequesterEmail,
            ticket.RequesterName,
            ticket.SlaPickupDeadline,
            ticket.SlaPickupBreached,
            ticket.SlaResolutionDeadline,
            ticket.SlaResolutionBreached,
            ticket.SlaWarningLevel,
            ticket.CreatedBy,
            ticket.AssignedAt,
            ticket.ResolvedAt,
            ticket.ClosedAt,
            ticket.CreatedAt,
            ticket.UpdatedAt);
}
