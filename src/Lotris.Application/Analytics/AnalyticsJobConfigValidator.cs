using System.Text.Json;
using Lotris.Application.Common;
using Lotris.Contracts.Analytics;
using Microsoft.Extensions.Options;

namespace Lotris.Application.Analytics;

public static class AnalyticsJobConfigValidator
{
    public static void Validate(
        AnalyticsJobConfigModel config,
        AnalyticsGuardrailsOptions guardrails)
    {
        if (config.IncrementalRollupIntervalMinutes < guardrails.MinRollupIntervalMinutes
            || config.IncrementalRollupIntervalMinutes > guardrails.MaxRollupIntervalMinutes)
        {
            throw new BadRequestException(
                $"Incremental rollup interval must be between {guardrails.MinRollupIntervalMinutes} and {guardrails.MaxRollupIntervalMinutes} minutes.");
        }

        if (config.KpiTrendIntervalMinutes < guardrails.MinRollupIntervalMinutes
            || config.KpiTrendIntervalMinutes > guardrails.MaxRollupIntervalMinutes)
        {
            throw new BadRequestException(
                $"KPI trend interval must be between {guardrails.MinRollupIntervalMinutes} and {guardrails.MaxRollupIntervalMinutes} minutes.");
        }

        if (config.SlaPredictorIntervalMinutes < guardrails.MinRollupIntervalMinutes
            || config.SlaPredictorIntervalMinutes > guardrails.MaxRollupIntervalMinutes)
        {
            throw new BadRequestException(
                $"SLA predictor interval must be between {guardrails.MinRollupIntervalMinutes} and {guardrails.MaxRollupIntervalMinutes} minutes.");
        }

        if (config.DashboardCacheTtlSeconds < guardrails.MinDashboardCacheTtlSeconds
            || config.DashboardCacheTtlSeconds > guardrails.MaxDashboardCacheTtlSeconds)
        {
            throw new BadRequestException(
                $"Dashboard cache TTL must be between {guardrails.MinDashboardCacheTtlSeconds} and {guardrails.MaxDashboardCacheTtlSeconds} seconds.");
        }

        var batchTimes = AnalyticsJobConfigJson.ParseBatchTimes(config.DailyBatchTimesUtcJson);
        if (batchTimes.Count == 0)
        {
            throw new BadRequestException("At least one daily batch time is required.");
        }

        if (batchTimes.Count > guardrails.MaxDailyBatchRunsPerDay)
        {
            throw new BadRequestException(
                $"Daily batch may run at most {guardrails.MaxDailyBatchRunsPerDay} times per day.");
        }

        foreach (var time in batchTimes)
        {
            if (!TimeOnly.TryParse(time, out _))
            {
                throw new BadRequestException($"Invalid daily batch time: {time}. Use HH:mm format.");
            }
        }
    }

    public static AnalyticsJobConfigDto ToDto(AnalyticsJobConfigModel model) =>
        new(
            model.Id,
            model.TenantId,
            model.IncrementalRollupEnabled,
            model.IncrementalRollupIntervalMinutes,
            model.DailyBatchEnabled,
            AnalyticsJobConfigJson.ParseBatchTimes(model.DailyBatchTimesUtcJson),
            model.KpiTrendScanEnabled,
            model.KpiTrendIntervalMinutes,
            model.SlaPredictorEnabled,
            model.SlaPredictorIntervalMinutes,
            model.DashboardCacheTtlSeconds,
            model.UpdatedAt,
            model.UpdatedBy);
}
