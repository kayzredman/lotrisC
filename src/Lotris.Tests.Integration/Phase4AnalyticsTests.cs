using Lotris.Application.Analytics;
using Xunit;

namespace Lotris.Tests.Integration;

public class AnalyticsJobConfigValidationTests
{
    private static AnalyticsGuardrailsOptions DefaultGuardrails() => new()
    {
        MinRollupIntervalMinutes = 2,
        MaxRollupIntervalMinutes = 60,
        MinDashboardCacheTtlSeconds = 10,
        MaxDashboardCacheTtlSeconds = 300,
        MaxDailyBatchRunsPerDay = 4,
        ManualRunCooldownSeconds = 60,
    };

    private static AnalyticsJobConfigModel ValidConfig() => new(
        Guid.NewGuid(),
        null,
        IncrementalRollupEnabled: true,
        IncrementalRollupIntervalMinutes: 5,
        DailyBatchEnabled: true,
        DailyBatchTimesUtcJson: "[\"08:00\",\"18:00\"]",
        KpiTrendScanEnabled: true,
        KpiTrendIntervalMinutes: 30,
        SlaPredictorEnabled: true,
        SlaPredictorIntervalMinutes: 5,
        DashboardCacheTtlSeconds: 30,
        UpdatedAt: DateTime.UtcNow,
        UpdatedBy: null);

    [Fact]
    public void Validate_AcceptsDefaultConfig()
    {
        var ex = Record.Exception(() => AnalyticsJobConfigValidator.Validate(ValidConfig(), DefaultGuardrails()));
        Assert.Null(ex);
    }

    [Fact]
    public void Validate_RejectsRollupIntervalBelowMinimum()
    {
        var config = ValidConfig() with { IncrementalRollupIntervalMinutes = 1 };
        Assert.Throws<Application.Common.BadRequestException>(() =>
            AnalyticsJobConfigValidator.Validate(config, DefaultGuardrails()));
    }

    [Fact]
    public void Validate_RejectsTooManyDailyBatchTimes()
    {
        var config = ValidConfig() with
        {
            DailyBatchTimesUtcJson = AnalyticsJobConfigJson.SerializeBatchTimes(["01:00", "06:00", "12:00", "18:00", "23:00"]),
        };
        Assert.Throws<Application.Common.BadRequestException>(() =>
            AnalyticsJobConfigValidator.Validate(config, DefaultGuardrails()));
    }

    [Fact]
    public void Validate_RejectsInvalidBatchTimeFormat()
    {
        var config = ValidConfig() with
        {
            DailyBatchTimesUtcJson = AnalyticsJobConfigJson.SerializeBatchTimes(["not-a-time"]),
        };
        Assert.Throws<Application.Common.BadRequestException>(() =>
            AnalyticsJobConfigValidator.Validate(config, DefaultGuardrails()));
    }
}

public class AnalyticsEtlMergeTests
{
    [Theory]
    [InlineData(100, 10, 90.00)]
    [InlineData(0, 0, 100.00)]
    [InlineData(50, 50, 0.00)]
    public void ComputeSlaCompliancePct_ReturnsExpected(int total, int breaches, decimal expected)
    {
        var result = AnalyticsWeekHelper.ComputeSlaCompliancePct(total, breaches);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void CurrentWeekKey_ReturnsYearWeekFormat()
    {
        var key = AnalyticsWeekHelper.CurrentWeekKey(new DateTime(2026, 6, 28, 12, 0, 0, DateTimeKind.Utc));
        Assert.Matches(@"^\d{4}-W\d{2}$", key);
    }
}
