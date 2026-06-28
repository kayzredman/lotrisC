using System.Text.Json;
using Lotris.Application.Queue;
using Lotris.Application.Tickets;
using Lotris.Domain.Tickets;

namespace Lotris.Workers.Jobs;

public sealed class AutoAssignJob : IAutoAssignJob
{
    private readonly ITicketRepository _tickets;
    private readonly IQueueRepository _queue;
    private readonly ITicketHistoryWriter _history;
    private readonly ISlaJobScheduler _slaJobs;
    private readonly IAutoAssignMutex _mutex;

    public AutoAssignJob(
        ITicketRepository tickets,
        IQueueRepository queue,
        ITicketHistoryWriter history,
        ISlaJobScheduler slaJobs,
        IAutoAssignMutex mutex)
    {
        _tickets = tickets;
        _queue = queue;
        _history = history;
        _slaJobs = slaJobs;
        _mutex = mutex;
    }

    public async Task ExecuteAsync(Guid ticketId, Guid tenantId, CancellationToken cancellationToken = default)
    {
        await using var handle = await _mutex.TryAcquireAsync(ticketId, cancellationToken);
        if (handle is null)
        {
            return;
        }

        var ticket = await _tickets.GetByIdAsync(tenantId, ticketId, cancellationToken);
        if (ticket is null)
        {
            return;
        }

        if (ticket.Status is not (TicketStatus.Unassigned or TicketStatus.TeamAssigned))
        {
            return;
        }

        if (!ticket.TeamId.HasValue)
        {
            return;
        }

        var queueCfg = await _queue.GetConfigAsync(tenantId, ticket.TeamId, cancellationToken);
        if (!queueCfg.AutoAssignEnabled)
        {
            return;
        }

        var engineers = await _tickets.GetActiveEngineerIdsAsync(tenantId, ticket.TeamId.Value, cancellationToken);
        if (engineers.Count == 0)
        {
            return;
        }

        var workloads = await _tickets.GetEngineerWorkloadsAsync(tenantId, cancellationToken);
        Guid? selectedEngineerId = null;
        var minLoad = int.MaxValue;

        foreach (var engineerId in engineers)
        {
            var load = workloads.GetValueOrDefault(engineerId, 0);
            if (load < minLoad && load < queueCfg.MaxCapacityPerEngineer)
            {
                minLoad = load;
                selectedEngineerId = engineerId;
            }
        }

        if (!selectedEngineerId.HasValue)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var resolutionDeadline = now.AddMinutes(queueCfg.ResolutionSlaMinutes);

        await _tickets.AutoAssignAsync(
            tenantId,
            ticketId,
            selectedEngineerId.Value,
            now,
            resolutionDeadline,
            cancellationToken);

        await _history.WriteAsync(new HistoryEntry
        {
            TenantId = tenantId,
            TicketId = ticketId,
            EventType = HistoryEvent.AutoAssigned,
            FromValue = ticket.Status,
            ToValue = TicketStatus.Assigned,
            Metadata = JsonSerializer.Serialize(new
            {
                assignedTo = selectedEngineerId.Value,
                reason = "PICKUP_SLA_BREACH",
            }),
            CreatedAt = now,
        }, cancellationToken);

        await _slaJobs.ScheduleResolutionSlaAsync(ticketId, tenantId, resolutionDeadline, cancellationToken);
    }
}
