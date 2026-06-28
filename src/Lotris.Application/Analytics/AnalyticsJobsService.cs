using Lotris.Application.Analytics;
using Lotris.Application.AuditLogs;
using Lotris.Application.Common;
using Lotris.Contracts;
using Lotris.Contracts.Analytics;
using Microsoft.Extensions.Options;

namespace Lotris.Application.Analytics;

public sealed class AnalyticsJobsService
{
    private readonly IAnalyticsJobConfigRepository _config;
    private readonly IAnalyticsJobScheduler _scheduler;
    private readonly IAnalyticsJobStatusStore _status;
    private readonly IAuditLogRepository _auditLogs;
    private readonly AnalyticsGuardrailsOptions _guardrails;

    public AnalyticsJobsService(
        IAnalyticsJobConfigRepository config,
        IAnalyticsJobScheduler scheduler,
        IAnalyticsJobStatusStore status,
        IAuditLogRepository auditLogs,
        IOptions<AnalyticsGuardrailsOptions> guardrails)
    {
        _config = config;
        _scheduler = scheduler;
        _status = status;
        _auditLogs = auditLogs;
        _guardrails = guardrails.Value;
    }

    public async Task<AnalyticsJobConfigDto> GetConfigAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        var model = await _config.GetEffectiveConfigAsync(session.TenantId, cancellationToken);
        return AnalyticsJobConfigValidator.ToDto(model);
    }

    public async Task<AnalyticsJobConfigDto> UpdateConfigAsync(
        LotrisSession session,
        PatchAnalyticsJobConfigRequest request,
        CancellationToken cancellationToken = default)
    {
        var current = await _config.GetEffectiveConfigAsync(session.TenantId, cancellationToken);
        var batchTimes = request.DailyBatchTimesUtc is not null
            ? request.DailyBatchTimesUtc
            : AnalyticsJobConfigJson.ParseBatchTimes(current.DailyBatchTimesUtcJson);

        var updated = current with
        {
            IncrementalRollupEnabled = request.IncrementalRollupEnabled ?? current.IncrementalRollupEnabled,
            IncrementalRollupIntervalMinutes = request.IncrementalRollupIntervalMinutes ?? current.IncrementalRollupIntervalMinutes,
            DailyBatchEnabled = request.DailyBatchEnabled ?? current.DailyBatchEnabled,
            DailyBatchTimesUtcJson = AnalyticsJobConfigJson.SerializeBatchTimes(batchTimes),
            KpiTrendScanEnabled = request.KpiTrendScanEnabled ?? current.KpiTrendScanEnabled,
            KpiTrendIntervalMinutes = request.KpiTrendIntervalMinutes ?? current.KpiTrendIntervalMinutes,
            SlaPredictorEnabled = request.SlaPredictorEnabled ?? current.SlaPredictorEnabled,
            SlaPredictorIntervalMinutes = request.SlaPredictorIntervalMinutes ?? current.SlaPredictorIntervalMinutes,
            DashboardCacheTtlSeconds = request.DashboardCacheTtlSeconds ?? current.DashboardCacheTtlSeconds,
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = session.UserId,
        };

        AnalyticsJobConfigValidator.Validate(updated, _guardrails);
        await _config.SaveAsync(updated, cancellationToken);
        await _scheduler.ApplyConfigAsync(updated, cancellationToken);

        await _auditLogs.WriteAsync(new AuditLogWriteModel
        {
            TenantId = session.TenantId,
            UserId = session.UserId,
            Action = "ANALYTICS_JOB_CONFIG_UPDATED",
            EntityType = "AnalyticsJobConfig",
            EntityId = updated.Id.ToString(),
            Details = System.Text.Json.JsonSerializer.Serialize(request),
            CreatedAt = DateTime.UtcNow,
        }, cancellationToken);

        return AnalyticsJobConfigValidator.ToDto(updated);
    }

    public async Task<RunAnalyticsJobResponse> RunNowAsync(
        LotrisSession session,
        string jobKey,
        CancellationToken cancellationToken = default)
    {
        if (!AnalyticsJobKeys.All.Contains(jobKey))
        {
            throw new BadRequestException($"Unknown analytics job key: {jobKey}");
        }

        await _scheduler.RunNowAsync(jobKey, session.UserId, cancellationToken);

        await _auditLogs.WriteAsync(new AuditLogWriteModel
        {
            TenantId = session.TenantId,
            UserId = session.UserId,
            Action = "ANALYTICS_JOB_RUN_NOW",
            EntityType = "AnalyticsJob",
            EntityId = jobKey,
            Details = null,
            CreatedAt = DateTime.UtcNow,
        }, cancellationToken);

        return new RunAnalyticsJobResponse(jobKey, "Job enqueued.");
    }

    public async Task<AnalyticsJobStatusResponse> GetStatusAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        var config = await _config.GetEffectiveConfigAsync(session.TenantId, cancellationToken);
        var jobs = new List<AnalyticsJobStatusItem>();

        foreach (var key in AnalyticsJobKeys.All)
        {
            var status = await _status.GetStatusAsync(key, cancellationToken);
            var enabled = key switch
            {
                AnalyticsJobKeys.IncrementalRollup => config.IncrementalRollupEnabled,
                AnalyticsJobKeys.DailyBatch => config.DailyBatchEnabled,
                AnalyticsJobKeys.KpiTrendScan => config.KpiTrendScanEnabled,
                AnalyticsJobKeys.SlaPredictorScan => config.SlaPredictorEnabled,
                _ => false,
            };

            DateTime? nextRun = status?.LastRunAt.HasValue == true
                ? EstimateNextRun(key, config, status!.LastRunAt!.Value)
                : null;

            jobs.Add(new AnalyticsJobStatusItem(
                key,
                enabled,
                status?.LastRunAt,
                status?.LastDurationMs,
                nextRun,
                status?.LastError));
        }

        return new AnalyticsJobStatusResponse(jobs);
    }

    private static DateTime? EstimateNextRun(string jobKey, AnalyticsJobConfigModel config, DateTime lastRun)
    {
        var intervalMinutes = jobKey switch
        {
            AnalyticsJobKeys.IncrementalRollup => config.IncrementalRollupIntervalMinutes,
            AnalyticsJobKeys.KpiTrendScan => config.KpiTrendIntervalMinutes,
            AnalyticsJobKeys.SlaPredictorScan => config.SlaPredictorIntervalMinutes,
            _ => (int?)null,
        };

        if (intervalMinutes.HasValue)
        {
            return lastRun.AddMinutes(intervalMinutes.Value);
        }

        return null;
    }
}
