namespace Lotris.Application.Analytics;

public interface IAnalyticsJobStatusStore
{
    Task RecordStartAsync(string jobKey, CancellationToken cancellationToken = default);

    Task RecordSuccessAsync(string jobKey, int durationMs, CancellationToken cancellationToken = default);

    Task RecordFailureAsync(string jobKey, string error, int durationMs, CancellationToken cancellationToken = default);

    Task<AnalyticsJobRunStatus?> GetStatusAsync(string jobKey, CancellationToken cancellationToken = default);

    Task<bool> TryAcquireManualRunCooldownAsync(string jobKey, int cooldownSeconds, CancellationToken cancellationToken = default);
}

public record AnalyticsJobRunStatus(
    DateTime? LastRunAt,
    int? LastDurationMs,
    string? LastError);
