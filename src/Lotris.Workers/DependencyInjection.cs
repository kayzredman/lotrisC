using Hangfire;
using Lotris.Application.Notifications;
using Lotris.Application.Tickets;
using Lotris.Application.Analytics;
using Lotris.Application.Reports;
using Lotris.Workers.Jobs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Lotris.Workers;

public static class DependencyInjection
{
    public static IServiceCollection AddLotrisWorkers(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required for Hangfire.");

        services.AddHangfire(config => config
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseSqlServerStorage(connectionString, new Hangfire.SqlServer.SqlServerStorageOptions
            {
                SchemaName = "hangfire",
                PrepareSchemaIfNecessary = true,
            }));

        services.AddHangfireServer(options =>
        {
            options.WorkerCount = 1;
        });

        services.AddScoped<IPickupSlaCheckJob, PickupSlaCheckJob>();
        services.AddScoped<IResolutionSlaCheckJob, ResolutionSlaCheckJob>();
        services.AddScoped<IAutoAssignJob, AutoAssignJob>();
        services.AddScoped<INotificationJob, NotificationJob>();
        services.AddScoped<IReportGenerationJob, ReportGenerationJob>();
        services.AddScoped<IIncrementalRollupJob, IncrementalRollupJob>();
        services.AddScoped<IDailyBatchJob, DailyBatchJob>();
        services.AddScoped<IKpiTrendScanJob, KpiTrendScanJob>();
        services.AddScoped<ISlaPredictorScanJob, SlaPredictorScanJob>();

        var redisConnection = configuration["Redis:ConnectionString"];
        if (!string.IsNullOrWhiteSpace(redisConnection))
        {
            services.AddSingleton<IConnectionMultiplexer>(_ =>
                ConnectionMultiplexer.Connect(redisConnection));
        }
        else
        {
            services.AddSingleton<IConnectionMultiplexer>(_ =>
                ConnectionMultiplexer.Connect("localhost:6379,abortConnect=false"));
        }

        return services;
    }
}
