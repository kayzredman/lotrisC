using System.Text.Json;
using Lotris.Application.Analytics;
using StackExchange.Redis;

namespace Lotris.Infrastructure.Analytics;

public sealed class RedisAnalyticsJobStatusStore : IAnalyticsJobStatusStore
{
    private readonly IConnectionMultiplexer _redis;

    public RedisAnalyticsJobStatusStore(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task RecordStartAsync(string jobKey, CancellationToken cancellationToken = default)
    {
        var db = _redis.GetDatabase();
        await db.StringSetAsync(LastRunKey(jobKey), DateTime.UtcNow.ToString("O"));
    }

    public async Task RecordSuccessAsync(string jobKey, int durationMs, CancellationToken cancellationToken = default)
    {
        var db = _redis.GetDatabase();
        var now = DateTime.UtcNow.ToString("O");
        await db.StringSetAsync(LastRunKey(jobKey), now);
        await db.StringSetAsync(DurationKey(jobKey), durationMs.ToString());
        await db.KeyDeleteAsync(ErrorKey(jobKey));
    }

    public async Task RecordFailureAsync(
        string jobKey,
        string error,
        int durationMs,
        CancellationToken cancellationToken = default)
    {
        var db = _redis.GetDatabase();
        await db.StringSetAsync(LastRunKey(jobKey), DateTime.UtcNow.ToString("O"));
        await db.StringSetAsync(DurationKey(jobKey), durationMs.ToString());
        await db.StringSetAsync(ErrorKey(jobKey), error);
    }

    public async Task<AnalyticsJobRunStatus?> GetStatusAsync(string jobKey, CancellationToken cancellationToken = default)
    {
        var db = _redis.GetDatabase();
        var lastRun = await db.StringGetAsync(LastRunKey(jobKey));
        if (lastRun.IsNullOrEmpty)
        {
            return null;
        }

        DateTime? lastRunAt = DateTime.TryParse(lastRun.ToString(), out var parsed) ? parsed : null;
        var durationRaw = await db.StringGetAsync(DurationKey(jobKey));
        int? durationMs = int.TryParse(durationRaw.ToString(), out var ms) ? ms : null;
        var errorRaw = await db.StringGetAsync(ErrorKey(jobKey));
        var error = errorRaw.IsNullOrEmpty ? null : errorRaw.ToString();
        return new AnalyticsJobRunStatus(lastRunAt, durationMs, error);
    }

    public async Task<bool> TryAcquireManualRunCooldownAsync(
        string jobKey,
        int cooldownSeconds,
        CancellationToken cancellationToken = default)
    {
        var db = _redis.GetDatabase();
        return await db.StringSetAsync(
            CooldownKey(jobKey),
            "1",
            TimeSpan.FromSeconds(cooldownSeconds),
            When.NotExists);
    }

    private static string LastRunKey(string jobKey) => $"analytics:job:{jobKey}:last-run";

    private static string DurationKey(string jobKey) => $"analytics:job:{jobKey}:last-duration-ms";

    private static string ErrorKey(string jobKey) => $"analytics:job:{jobKey}:last-error";

    private static string CooldownKey(string jobKey) => $"analytics:job:{jobKey}:run-now:cooldown";
}
