namespace Lotris.Application.Analytics;

public interface IKpiTrendAnalyser
{
    Task ScanAllEngineersAsync(Guid tenantId, CancellationToken cancellationToken = default);

    string ComputeWarningLevel(decimal projected, decimal target, string direction);
}
