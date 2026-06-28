using Lotris.Application.Queue;
using Lotris.Contracts.Queue;

namespace Lotris.Application.Queue;

public interface IQueueRepository
{
    Task<IReadOnlyList<QueueTicketEntity>> ListQueueAsync(
        Guid tenantId,
        Guid? teamId,
        int page,
        int limit,
        CancellationToken cancellationToken = default);

    Task<QueueHealthResponse> GetHealthAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task<QueueConfigEntity> GetConfigAsync(Guid tenantId, Guid? teamId = null, CancellationToken cancellationToken = default);

    Task UpsertConfigAsync(QueueConfigUpsert upsert, CancellationToken cancellationToken = default);
}
