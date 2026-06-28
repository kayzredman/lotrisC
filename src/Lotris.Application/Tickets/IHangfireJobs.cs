namespace Lotris.Application.Tickets;

public interface IPickupSlaCheckJob
{
    Task ExecuteAsync(Guid ticketId, Guid tenantId, CancellationToken cancellationToken = default);
}

public interface IResolutionSlaCheckJob
{
    Task ExecuteAsync(Guid ticketId, Guid tenantId, CancellationToken cancellationToken = default);
}

public interface IAutoAssignJob
{
    Task ExecuteAsync(Guid ticketId, Guid tenantId, CancellationToken cancellationToken = default);
}
