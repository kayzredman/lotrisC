namespace Lotris.Application.Analytics;

public class AnalyticsGuardrailsOptions
{
    public const string SectionName = "Analytics";

    public int MinRollupIntervalMinutes { get; set; } = 2;

    public int MaxRollupIntervalMinutes { get; set; } = 60;

    public int MinDashboardCacheTtlSeconds { get; set; } = 10;

    public int MaxDashboardCacheTtlSeconds { get; set; } = 300;

    public int MaxDailyBatchRunsPerDay { get; set; } = 4;

    public int ManualRunCooldownSeconds { get; set; } = 60;
}
