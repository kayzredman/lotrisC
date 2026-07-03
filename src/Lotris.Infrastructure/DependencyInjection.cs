using Lotris.Application.Admin;
using Lotris.Application.Analytics;
using Lotris.Application.Health;
using Lotris.Application.Intake;
using Lotris.Application.Auth;
using Lotris.Application.AuditLogs;
using Lotris.Application.Kpi;
using Lotris.Application.Onboarding;
using Lotris.Application.Notifications;
using Lotris.Application.Reports;
using Lotris.Application.Queue;
using Lotris.Application.Tasks;
using Lotris.Application.Tickets;
using Lotris.Infrastructure.Admin;
using Lotris.Infrastructure.Analytics;
using Lotris.Infrastructure.AuditLogs;
using Lotris.Infrastructure.Auth;
using Lotris.Infrastructure.Data;
using Lotris.Infrastructure.Health;
using Lotris.Infrastructure.Identity;
using Lotris.Infrastructure.Migrations;
using Lotris.Infrastructure.Kpi;
using Lotris.Infrastructure.Notifications;
using Lotris.Infrastructure.Onboarding;
using Lotris.Infrastructure.Reports;
using Lotris.Infrastructure.Queue;
using Lotris.Infrastructure.Tasks;
using Lotris.Infrastructure.Tickets;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Lotris.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddLotrisInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");

        DapperTypeHandlers.Register();

        services.AddDbContext<LotrisDbContext>(options =>
            options.UseSqlServer(connectionString, sql =>
                sql.MigrationsAssembly(typeof(LotrisDbContext).Assembly.FullName)));

        services
            .AddIdentityCore<LotrisIdentityUser>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.User.RequireUniqueEmail = true;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<LotrisDbContext>();

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));
        services.Configure<AnalyticsGuardrailsOptions>(configuration.GetSection(AnalyticsGuardrailsOptions.SectionName));
        services.Configure<IntakeOptions>(configuration.GetSection(IntakeOptions.SectionName));
        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
        services.Configure<ReportsOptions>(configuration.GetSection(ReportsOptions.SectionName));

        services.AddScoped<IAuthTokenService, JwtTokenService>();
        services.AddScoped<IAnalyticsStore, MssqlAnalyticsStore>();
        services.AddScoped<IAnalyticsEtlService, AnalyticsEtlService>();
        services.AddScoped<IAnalyticsJobConfigRepository, EfAnalyticsJobConfigRepository>();
        services.AddScoped<IAnalyticsJobScheduler, AnalyticsJobScheduler>();
        services.AddScoped<IAnalyticsQueryService, AnalyticsQueryService>();
        services.AddScoped<IMonitorStatsService, MonitorStatsService>();
        services.AddScoped<IWorkloadAnalyser, WorkloadAnalyser>();
        services.AddScoped<IKpiTrendAnalyser, KpiTrendAnalyser>();
        services.AddScoped<ISlaPredictorService, SlaPredictorService>();
        services.AddScoped<IDashboardCacheService, RedisDashboardCacheService>();
        services.AddSingleton<IAnalyticsJobStatusStore, RedisAnalyticsJobStatusStore>();
        services.AddScoped<Infrastructure.Intake.IntakeService>();
        services.AddSingleton<LegacyMssqlMigrator>();

        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddScoped<ITicketRepository, DapperTicketRepository>();
        services.AddScoped<IQueueRepository, DapperQueueRepository>();
        services.AddScoped<ISlaConfigRepository, DapperSlaConfigRepository>();
        services.AddScoped<ITicketHistoryWriter, DapperTicketHistoryWriter>();
        services.AddScoped<ILegacyUserProvisioner, LegacyUserProvisioner>();
        services.AddScoped<IUserAccountCreator, IdentityUserAccountCreator>();
        services.AddScoped<IAutoAssignMutex, RedisAutoAssignMutex>();
        services.AddScoped<ISlaJobScheduler, HangfireSlaJobScheduler>();
        services.AddScoped<ITaskRepository, DapperTaskRepository>();
        services.AddScoped<IAdminRepository, DapperAdminRepository>();
        services.AddScoped<IOnboardingRepository, DapperOnboardingRepository>();
        services.AddScoped<IAuditLogRepository, DapperAuditLogRepository>();
        services.AddScoped<ISystemHealthService, SystemHealthService>();
        services.AddHttpClient("health-probes", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(2);
        });
        services.AddSingleton<INotificationPublisher, RedisNotificationPublisher>();
        services.AddSingleton<INotificationEnqueuer, HangfireNotificationEnqueuer>();
        services.AddScoped<IEmailSender, MailKitEmailSender>();
        services.AddScoped<IKpiRepository, DapperKpiRepository>();
        services.AddSingleton<IKpiImportPendingStore, KpiImportPendingStore>();
        services.AddSingleton<IKpiSpreadsheetParser, ClosedXmlKpiSpreadsheetParser>();
        services.AddScoped<IReportRepository, EfReportRepository>();
        services.AddScoped<IReportGenerator, ReportGenerator>();
        services.AddScoped<IReportJobEnqueuer, HangfireReportJobEnqueuer>();

        if (!services.Any(d => d.ServiceType == typeof(IConnectionMultiplexer)))
        {
            var redisConnection = configuration["Redis:ConnectionString"];
            services.AddSingleton<IConnectionMultiplexer>(_ =>
                ConnectionMultiplexer.Connect(redisConnection ?? "localhost:6379,abortConnect=false"));
        }

        return services;
    }
}
