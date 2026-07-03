namespace Lotris.Application.Analytics;

public interface IIncrementalRollupJob
{
    Task ExecuteAllTenantsAsync(CancellationToken cancellationToken = default);
}

public interface IDailyBatchJob
{
    Task ExecuteAllTenantsAsync(CancellationToken cancellationToken = default);
}

public interface IKpiTrendScanJob
{
    Task ExecuteAllTenantsAsync(CancellationToken cancellationToken = default);
}

public interface ISlaPredictorScanJob
{
    Task ExecuteAllTenantsAsync(CancellationToken cancellationToken = default);
}
