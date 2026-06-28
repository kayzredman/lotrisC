using Hangfire;
using Lotris.Application.Analytics;
using Lotris.Application.Common;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Lotris.Infrastructure.Analytics;

public sealed class AnalyticsJobScheduler : IAnalyticsJobScheduler
{
    private readonly IBackgroundJobClient _jobs;
    private readonly IAnalyticsJobStatusStore _status;
    private readonly AnalyticsGuardrailsOptions _guardrails;
    private readonly ILogger<AnalyticsJobScheduler> _logger;

    public AnalyticsJobScheduler(
        IBackgroundJobClient jobs,
        IAnalyticsJobStatusStore status,
        IOptions<AnalyticsGuardrailsOptions> guardrails,
        ILogger<AnalyticsJobScheduler> logger)
    {
        _jobs = jobs;
        _status = status;
        _guardrails = guardrails.Value;
        _logger = logger;
    }

    public Task ApplyConfigAsync(AnalyticsJobConfigModel config, CancellationToken ct)
    {
        RegisterOrRemove<IIncrementalRollupJob>(
            AnalyticsJobKeys.IncrementalRollup,
            config.IncrementalRollupEnabled,
            BuildMinuteCron(config.IncrementalRollupIntervalMinutes),
            job => job.ExecuteAllTenantsAsync(CancellationToken.None));

        RegisterOrRemove<IKpiTrendScanJob>(
            AnalyticsJobKeys.KpiTrendScan,
            config.KpiTrendScanEnabled,
            BuildMinuteCron(config.KpiTrendIntervalMinutes),
            job => job.ExecuteAllTenantsAsync(CancellationToken.None));

        RegisterOrRemove<ISlaPredictorScanJob>(
            AnalyticsJobKeys.SlaPredictorScan,
            config.SlaPredictorEnabled,
            BuildMinuteCron(config.SlaPredictorIntervalMinutes),
            job => job.ExecuteAllTenantsAsync(CancellationToken.None));

        if (config.DailyBatchEnabled)
        {
            var times = AnalyticsJobConfigJson.ParseBatchTimes(config.DailyBatchTimesUtcJson);
            RecurringJob.AddOrUpdate<IDailyBatchJob>(
                AnalyticsJobKeys.DailyBatch,
                job => job.ExecuteAllTenantsAsync(CancellationToken.None),
                BuildDailyBatchCron(times));
        }
        else
        {
            RecurringJob.RemoveIfExists(AnalyticsJobKeys.DailyBatch);
        }

        _logger.LogInformation("Applied analytics job config for tenant {TenantId}", config.TenantId);
        return Task.CompletedTask;
    }

    public async Task RunNowAsync(string jobKey, Guid requestedByUserId, CancellationToken ct)
    {
        var acquired = await _status.TryAcquireManualRunCooldownAsync(
            jobKey,
            _guardrails.ManualRunCooldownSeconds,
            ct);
        if (!acquired)
        {
            throw new TooManyRequestsException(
                $"Manual run cooldown active for {jobKey}.");
        }

        switch (jobKey)
        {
            case AnalyticsJobKeys.IncrementalRollup:
                _jobs.Enqueue<IIncrementalRollupJob>(job => job.ExecuteAllTenantsAsync(CancellationToken.None));
                break;
            case AnalyticsJobKeys.DailyBatch:
                _jobs.Enqueue<IDailyBatchJob>(job => job.ExecuteAllTenantsAsync(CancellationToken.None));
                break;
            case AnalyticsJobKeys.KpiTrendScan:
                _jobs.Enqueue<IKpiTrendScanJob>(job => job.ExecuteAllTenantsAsync(CancellationToken.None));
                break;
            case AnalyticsJobKeys.SlaPredictorScan:
                _jobs.Enqueue<ISlaPredictorScanJob>(job => job.ExecuteAllTenantsAsync(CancellationToken.None));
                break;
            default:
                throw new BadRequestException($"Unknown job key: {jobKey}");
        }

        _logger.LogInformation("Manual run enqueued for {JobKey} by {UserId}", jobKey, requestedByUserId);
    }

    private static void RegisterOrRemove<TJob>(
        string jobKey,
        bool enabled,
        string cron,
        System.Linq.Expressions.Expression<Func<TJob, Task>> methodCall)
    {
        if (enabled)
        {
            RecurringJob.AddOrUpdate(jobKey, methodCall, cron);
        }
        else
        {
            RecurringJob.RemoveIfExists(jobKey);
        }
    }

    private static string BuildMinuteCron(int intervalMinutes)
    {
        intervalMinutes = Math.Clamp(intervalMinutes, 1, 59);
        return intervalMinutes == 1 ? "* * * * *" : $"*/{intervalMinutes} * * * *";
    }

    private static string BuildDailyBatchCron(IReadOnlyList<string> timesUtc)
    {
        var hours = timesUtc
            .Select(t => TimeOnly.TryParse(t, out var parsed) ? parsed.Hour : (int?)null)
            .Where(h => h.HasValue)
            .Select(h => h!.Value)
            .Distinct()
            .OrderBy(h => h)
            .ToList();

        if (hours.Count == 0)
        {
            hours = [8, 18];
        }

        return hours.Count == 1
            ? $"0 {hours[0]} * * *"
            : $"0 {string.Join(",", hours)} * * *";
    }
}
