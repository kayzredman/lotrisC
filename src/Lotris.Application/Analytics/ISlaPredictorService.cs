namespace Lotris.Application.Analytics;

public interface ISlaPredictorService
{
    string ComputeWarningLevel(DateTime assignedAt, DateTime slaDeadline, DateTime now);

    Task ScanAndUpdateAsync(Guid tenantId, CancellationToken cancellationToken = default);
}
