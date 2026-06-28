using Lotris.Application.Queue;
using Lotris.Application.Tickets;
using Lotris.Domain.Tickets;

namespace Lotris.Workers.Jobs;

public sealed class PickupSlaCheckJob : IPickupSlaCheckJob
{
    private readonly ITicketRepository _tickets;
    private readonly ITicketHistoryWriter _history;
    private readonly ISlaJobScheduler _slaJobs;

    public PickupSlaCheckJob(
        ITicketRepository tickets,
        ITicketHistoryWriter history,
        ISlaJobScheduler slaJobs)
    {
        _tickets = tickets;
        _history = history;
        _slaJobs = slaJobs;
    }

    public async Task ExecuteAsync(Guid ticketId, Guid tenantId, CancellationToken cancellationToken = default)
    {
        var ticket = await _tickets.GetByIdAsync(tenantId, ticketId, cancellationToken);
        if (ticket is null)
        {
            return;
        }

        if (ticket.Status is not (TicketStatus.Unassigned or TicketStatus.TeamAssigned))
        {
            return;
        }

        var now = DateTime.UtcNow;
        await _tickets.MarkPickupSlaBreachedAsync(tenantId, ticketId, cancellationToken);

        await _history.WriteAsync(new HistoryEntry
        {
            TenantId = tenantId,
            TicketId = ticketId,
            EventType = HistoryEvent.PickupSlaBreached,
            ToValue = $"Breached at {now:O}",
            CreatedAt = now,
        }, cancellationToken);

        await _slaJobs.ScheduleAutoAssignAsync(ticketId, tenantId, cancellationToken);
    }
}
