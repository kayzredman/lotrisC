namespace Lotris.Application.Tickets;

public interface ISlaJobScheduler
{
    Task SchedulePickupSlaAsync(Guid ticketId, Guid tenantId, DateTime deadline, CancellationToken cancellationToken = default);

    Task ScheduleResolutionSlaAsync(Guid ticketId, Guid tenantId, DateTime deadline, CancellationToken cancellationToken = default);

    Task ScheduleAutoAssignAsync(Guid ticketId, Guid tenantId, CancellationToken cancellationToken = default);
}
