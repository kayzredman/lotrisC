using Lotris.Application.Tickets;
using Lotris.Domain.Tickets;

namespace Lotris.Workers.Jobs;

public sealed class ResolutionSlaCheckJob : IResolutionSlaCheckJob
{
    private readonly ITicketRepository _tickets;
    private readonly ITicketHistoryWriter _history;

    public ResolutionSlaCheckJob(ITicketRepository tickets, ITicketHistoryWriter history)
    {
        _tickets = tickets;
        _history = history;
    }

    public async Task ExecuteAsync(Guid ticketId, Guid tenantId, CancellationToken cancellationToken = default)
    {
        var ticket = await _tickets.GetByIdAsync(tenantId, ticketId, cancellationToken);
        if (ticket is null)
        {
            return;
        }

        if (ticket.Status is TicketStatus.Resolved or TicketStatus.Closed)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var previousStatus = ticket.Status;

        await _tickets.MarkResolutionSlaBreachedAndEscalateAsync(
            tenantId,
            ticketId,
            previousStatus,
            cancellationToken);

        await _history.WriteAsync(new HistoryEntry
        {
            TenantId = tenantId,
            TicketId = ticketId,
            EventType = HistoryEvent.ResolutionSlaBreached,
            ToValue = $"Breached at {now:O}",
            CreatedAt = now,
        }, cancellationToken);

        await _history.WriteAsync(new HistoryEntry
        {
            TenantId = tenantId,
            TicketId = ticketId,
            EventType = HistoryEvent.StatusChanged,
            FromValue = previousStatus,
            ToValue = TicketStatus.Escalated,
            CreatedAt = now,
        }, cancellationToken);
    }
}
