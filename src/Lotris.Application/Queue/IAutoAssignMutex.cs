namespace Lotris.Application.Queue;

public interface IAutoAssignMutex
{
    Task<IAsyncDisposable?> TryAcquireAsync(Guid ticketId, CancellationToken cancellationToken = default);
}
