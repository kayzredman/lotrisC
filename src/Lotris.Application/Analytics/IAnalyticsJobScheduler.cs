namespace Lotris.Application.Analytics;

public interface IAnalyticsJobScheduler
{
    Task ApplyConfigAsync(AnalyticsJobConfigModel config, CancellationToken ct);

    Task RunNowAsync(string jobKey, Guid requestedByUserId, CancellationToken ct);
}

/// <summary>
/// Runtime analytics job configuration (mirrors analytics.AnalyticsJobConfig entity).
/// </summary>
public record AnalyticsJobConfigModel(
    Guid Id,
    Guid? TenantId,
    bool IncrementalRollupEnabled,
    int IncrementalRollupIntervalMinutes,
    bool DailyBatchEnabled,
    string DailyBatchTimesUtcJson,
    bool KpiTrendScanEnabled,
    int KpiTrendIntervalMinutes,
    bool SlaPredictorEnabled,
    int SlaPredictorIntervalMinutes,
    int DashboardCacheTtlSeconds,
    DateTime UpdatedAt,
    Guid? UpdatedBy);
