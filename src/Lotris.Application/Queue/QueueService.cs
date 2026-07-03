using Lotris.Application.Common;
using Lotris.Application.Notifications;
using Lotris.Application.Tickets;
using Lotris.Contracts;
using Lotris.Contracts.Queue;
using Lotris.Domain.Tickets;

namespace Lotris.Application.Queue;

public class QueueService
{
    private readonly IQueueRepository _queue;
    private readonly ITicketRepository _tickets;
    private readonly ITicketHistoryWriter _history;
    private readonly ISlaJobScheduler _slaJobs;
    private readonly INotificationEnqueuer _notifications;

    public QueueService(
        IQueueRepository queue,
        ITicketRepository tickets,
        ITicketHistoryWriter history,
        ISlaJobScheduler slaJobs,
        INotificationEnqueuer notifications)
    {
        _queue = queue;
        _tickets = tickets;
        _history = history;
        _slaJobs = slaJobs;
        _notifications = notifications;
    }

    public async Task<IReadOnlyList<QueueTicketEntity>> ListQueueAsync(
        LotrisSession session,
        QueueListQuery query,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var limit = Math.Min(100, Math.Max(1, query.Limit));
        var teamId = query.TeamId;

        if (!teamId.HasValue)
        {
            teamId = await _tickets.GetUserTeamIdAsync(session.TenantId, session.UserId, cancellationToken);
        }

        return await _queue.ListQueueAsync(session.TenantId, teamId, page, limit, cancellationToken);
    }

    public async Task<QueueTicketEntity> ClaimTicketAsync(
        LotrisSession session,
        Guid ticketId,
        CancellationToken cancellationToken = default)
    {
        var ticket = await _tickets.GetByIdAsync(session.TenantId, ticketId, cancellationToken);
        if (ticket is null)
        {
            throw new NotFoundException($"Ticket {ticketId} not found");
        }

        if (ticket.Status is not (TicketStatus.Unassigned or TicketStatus.TeamAssigned))
        {
            throw new BadRequestException(
                $"Cannot claim a ticket with status {ticket.Status}. Only UNASSIGNED or TEAM_ASSIGNED tickets can be claimed.");
        }

        var queueCfg = await _queue.GetConfigAsync(session.TenantId, ticket.TeamId, cancellationToken);
        var openCount = await _tickets.CountOpenTicketsForAssigneeAsync(
            session.TenantId,
            session.UserId,
            cancellationToken);

        if (openCount >= queueCfg.MaxCapacityPerEngineer)
        {
            throw new ForbiddenException(
                $"You have reached maximum workload ({openCount}/{queueCfg.MaxCapacityPerEngineer} open tickets). Resolve existing tickets before claiming more.");
        }

        var now = DateTime.UtcNow;
        var resolutionDeadline = now.AddMinutes(queueCfg.ResolutionSlaMinutes);

        await _tickets.ClaimAsync(
            session.TenantId,
            ticketId,
            session.UserId,
            now,
            resolutionDeadline,
            cancellationToken);

        await _history.WriteAsync(new HistoryEntry
        {
            TenantId = session.TenantId,
            TicketId = ticketId,
            ActorId = session.UserId,
            EventType = HistoryEvent.StatusChanged,
            FromValue = ticket.Status,
            ToValue = TicketStatus.Assigned,
            CreatedAt = now,
        }, cancellationToken);

        await _slaJobs.ScheduleResolutionSlaAsync(
            ticketId,
            session.TenantId,
            resolutionDeadline,
            cancellationToken);

        _notifications.EnqueueNotification(new NotificationPayload
        {
            Type = "TICKET_ASSIGNED",
            TenantId = session.TenantId,
            TicketId = ticketId,
            TicketTitle = ticket.Title,
            ActorId = session.UserId,
            RecipientId = session.UserId,
        });

        var updated = await _tickets.GetByIdAsync(session.TenantId, ticketId, cancellationToken);
        return MapQueueTicket(updated!);
    }

    public Task<QueueHealthResponse> GetQueueHealthAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default) =>
        _queue.GetHealthAsync(session.TenantId, cancellationToken);

    public async Task<QueueConfigDto> GetQueueConfigAsync(
        Guid tenantId,
        Guid? teamId = null,
        CancellationToken cancellationToken = default)
    {
        var config = await _queue.GetConfigAsync(tenantId, teamId, cancellationToken);
        return ToDto(config);
    }

    public async Task<QueueConfigDto> UpsertQueueConfigAsync(
        LotrisSession session,
        UpdateQueueConfigRequest request,
        CancellationToken cancellationToken = default)
    {
        await _queue.UpsertConfigAsync(new QueueConfigUpsert
        {
            TenantId = session.TenantId,
            TeamId = request.TeamId,
            MaxCapacityPerEngineer = request.MaxCapacityPerEngineer,
            PickupSlaMinutes = request.PickupSlaMinutes,
            ResolutionSlaMinutes = request.ResolutionSlaMinutes,
            AutoAssignEnabled = request.AutoAssignEnabled,
        }, cancellationToken);

        return ToDto(await _queue.GetConfigAsync(session.TenantId, request.TeamId, cancellationToken));
    }

    private static QueueConfigDto ToDto(QueueConfigEntity config) =>
        new(
            config.MaxCapacityPerEngineer,
            config.PickupSlaMinutes,
            config.ResolutionSlaMinutes,
            config.AutoAssignEnabled);

    private static QueueTicketEntity MapQueueTicket(TicketEntity ticket) =>
        new()
        {
            Id = ticket.Id,
            TenantId = ticket.TenantId,
            Title = ticket.Title,
            Description = ticket.Description,
            Priority = ticket.Priority,
            Status = ticket.Status,
            TeamId = ticket.TeamId,
            TeamName = ticket.TeamName,
            AssigneeId = ticket.AssigneeId,
            CreatedBy = ticket.CreatedBy,
            SlaPickupDeadline = ticket.SlaPickupDeadline,
            SlaResolutionDeadline = ticket.SlaResolutionDeadline,
            SlaPickupBreached = ticket.SlaPickupBreached,
            SlaResolutionBreached = ticket.SlaResolutionBreached,
            AssignedAt = ticket.AssignedAt,
            ResolvedAt = ticket.ResolvedAt,
            ClosedAt = ticket.ClosedAt,
            CreatedAt = ticket.CreatedAt,
            UpdatedAt = ticket.UpdatedAt,
        };
}
