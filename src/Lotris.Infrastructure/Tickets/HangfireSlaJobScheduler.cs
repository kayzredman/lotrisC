using Hangfire;
using Lotris.Application.Tickets;
using StackExchange.Redis;

namespace Lotris.Infrastructure.Tickets;

public sealed class HangfireSlaJobScheduler : ISlaJobScheduler
{
    private readonly IBackgroundJobClient _jobs;
    private readonly IConnectionMultiplexer _redis;

    public HangfireSlaJobScheduler(IBackgroundJobClient jobs, IConnectionMultiplexer redis)
    {
        _jobs = jobs;
        _redis = redis;
    }

    public Task SchedulePickupSlaAsync(
        Guid ticketId,
        Guid tenantId,
        DateTime deadline,
        CancellationToken cancellationToken = default)
    {
        ScheduleJob<IPickupSlaCheckJob>(
            $"pickup-sla-{ticketId}",
            deadline,
            job => job.ExecuteAsync(ticketId, tenantId, CancellationToken.None));
        return Task.CompletedTask;
    }

    public Task ScheduleResolutionSlaAsync(
        Guid ticketId,
        Guid tenantId,
        DateTime deadline,
        CancellationToken cancellationToken = default)
    {
        ScheduleJob<IResolutionSlaCheckJob>(
            $"resolution-sla-{ticketId}",
            deadline,
            job => job.ExecuteAsync(ticketId, tenantId, CancellationToken.None));
        return Task.CompletedTask;
    }

    public Task ScheduleAutoAssignAsync(
        Guid ticketId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var logicalId = $"auto-assign-{ticketId}";
        CancelTrackedJob(logicalId);
        var hangfireId = _jobs.Enqueue<IAutoAssignJob>(job =>
            job.ExecuteAsync(ticketId, tenantId, CancellationToken.None));
        TrackJob(logicalId, hangfireId);
        return Task.CompletedTask;
    }

    private void ScheduleJob<TJob>(
        string logicalJobId,
        DateTime deadline,
        System.Linq.Expressions.Expression<Func<TJob, Task>> methodCall)
    {
        CancelTrackedJob(logicalJobId);
        var delay = deadline - DateTime.UtcNow;
        if (delay < TimeSpan.Zero)
        {
            delay = TimeSpan.Zero;
        }

        var hangfireId = _jobs.Schedule(methodCall, delay);
        TrackJob(logicalJobId, hangfireId);
    }

    private void CancelTrackedJob(string logicalJobId)
    {
        var db = _redis.GetDatabase();
        var key = $"hangfire:logical-job:{logicalJobId}";
        var existing = db.StringGet(key);
        if (existing.HasValue)
        {
            BackgroundJob.Delete(existing.ToString());
            db.KeyDelete(key);
        }
    }

    private void TrackJob(string logicalJobId, string hangfireJobId)
    {
        var db = _redis.GetDatabase();
        db.StringSet($"hangfire:logical-job:{logicalJobId}", hangfireJobId, TimeSpan.FromDays(30));
    }
}
