namespace Lotris.Infrastructure.Analytics.Entities;

public class AnalyticsJobConfig
{
    public Guid Id { get; set; }

    public Guid? TenantId { get; set; }

    public bool IncrementalRollupEnabled { get; set; } = true;

    public int IncrementalRollupIntervalMinutes { get; set; } = 5;

    public bool DailyBatchEnabled { get; set; } = true;

    public string DailyBatchTimesUtcJson { get; set; } = "[\"08:00\",\"18:00\"]";

    public bool KpiTrendScanEnabled { get; set; } = true;

    public int KpiTrendIntervalMinutes { get; set; } = 30;

    public bool SlaPredictorEnabled { get; set; } = true;

    public int SlaPredictorIntervalMinutes { get; set; } = 5;

    public int DashboardCacheTtlSeconds { get; set; } = 30;

    public DateTime UpdatedAt { get; set; }

    public Guid? UpdatedBy { get; set; }
}
