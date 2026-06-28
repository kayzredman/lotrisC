using Hangfire;
using Lotris.Application.Notifications;
using Microsoft.Extensions.Logging;

namespace Lotris.Infrastructure.Notifications;

public sealed class HangfireNotificationEnqueuer : INotificationEnqueuer
{
    private readonly IBackgroundJobClient _jobs;
    private readonly ILogger<HangfireNotificationEnqueuer> _logger;

    public HangfireNotificationEnqueuer(
        IBackgroundJobClient jobs,
        ILogger<HangfireNotificationEnqueuer> logger)
    {
        _jobs = jobs;
        _logger = logger;
    }

    public void EnqueueNotification(NotificationPayload payload)
    {
        try
        {
            _jobs.Enqueue<INotificationJob>(job => job.ProcessAsync(payload, CancellationToken.None));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to enqueue notification {Type}", payload.Type);
        }
    }
}
