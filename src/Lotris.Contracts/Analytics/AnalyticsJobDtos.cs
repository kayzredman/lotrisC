namespace Lotris.Contracts.Analytics;

public record AnalyticsJobConfigDto(
    Guid Id,
    Guid? TenantId,
    bool IncrementalRollupEnabled,
    int IncrementalRollupIntervalMinutes,
    bool DailyBatchEnabled,
    IReadOnlyList<string> DailyBatchTimesUtc,
    bool KpiTrendScanEnabled,
    int KpiTrendIntervalMinutes,
    bool SlaPredictorEnabled,
    int SlaPredictorIntervalMinutes,
    int DashboardCacheTtlSeconds,
    DateTime UpdatedAt,
    Guid? UpdatedBy);

public record PatchAnalyticsJobConfigRequest(
    bool? IncrementalRollupEnabled = null,
    int? IncrementalRollupIntervalMinutes = null,
    bool? DailyBatchEnabled = null,
    IReadOnlyList<string>? DailyBatchTimesUtc = null,
    bool? KpiTrendScanEnabled = null,
    int? KpiTrendIntervalMinutes = null,
    bool? SlaPredictorEnabled = null,
    int? SlaPredictorIntervalMinutes = null,
    int? DashboardCacheTtlSeconds = null);

public record AnalyticsJobStatusItem(
    string JobKey,
    bool Enabled,
    DateTime? LastRunAt,
    int? LastDurationMs,
    DateTime? NextRunAt,
    string? LastError);

public record AnalyticsJobStatusResponse(IReadOnlyList<AnalyticsJobStatusItem> Jobs);

public record RunAnalyticsJobResponse(string JobKey, string Message);
