using Lotris.Application.Analytics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Lotris.Infrastructure.Analytics;

public static class AnalyticsStartupExtensions
{
    public static async Task InitializeAnalyticsJobsAsync(this IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var configRepo = scope.ServiceProvider.GetRequiredService<IAnalyticsJobConfigRepository>();
        var scheduler = scope.ServiceProvider.GetRequiredService<IAnalyticsJobScheduler>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("AnalyticsStartup");

        await configRepo.EnsurePlatformDefaultAsync(cancellationToken);
        var config = await configRepo.GetPlatformConfigAsync(cancellationToken);
        if (config is not null)
        {
            await scheduler.ApplyConfigAsync(config, cancellationToken);
            logger.LogInformation("Analytics Hangfire jobs registered from platform config");
        }
    }
}
