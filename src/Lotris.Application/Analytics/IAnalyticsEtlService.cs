using Lotris.Contracts.Analytics;

namespace Lotris.Application.Analytics;

public interface IAnalyticsEtlService
{
    Task SyncTicketDayAsync(Guid tenantId, DateOnly date, CancellationToken cancellationToken = default);

    Task SyncSlaDayAsync(
        Guid tenantId,
        DateOnly date,
        int totalTickets,
        int breachCount,
        CancellationToken cancellationToken = default);

    Task SyncEngineerPerfWeekAsync(
        Guid tenantId,
        Guid engineerId,
        CancellationToken cancellationToken = default);

    Task RunIncrementalRollupAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task RunDailyBatchAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task RunIncrementalRollupAllTenantsAsync(CancellationToken cancellationToken = default);

    Task RunDailyBatchAllTenantsAsync(CancellationToken cancellationToken = default);
}
