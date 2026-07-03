namespace Lotris.Application.Analytics;

public static class AnalyticsJobKeys
{
    public const string IncrementalRollup = "incremental-rollup";
    public const string DailyBatch = "daily-batch";
    public const string KpiTrendScan = "kpi-trend-scan";
    public const string SlaPredictorScan = "sla-predictor-scan";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        IncrementalRollup,
        DailyBatch,
        KpiTrendScan,
        SlaPredictorScan,
    };
}
