using Lotris.Application.Admin;
using Lotris.Application.Analytics;
using Lotris.Application.AuditLogs;
using Lotris.Application.Kpi;
using Lotris.Application.Onboarding;
using Lotris.Application.Queue;
using Lotris.Application.Reports;
using Lotris.Application.Tasks;
using Lotris.Application.Tickets;
using Microsoft.Extensions.DependencyInjection;

namespace Lotris.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddLotrisApplication(this IServiceCollection services)
    {
        services.AddScoped<TicketService>();
        services.AddScoped<QueueService>();
        services.AddScoped<TaskService>();
        services.AddScoped<AdminService>();
        services.AddScoped<OnboardingService>();
        services.AddScoped<AuditLogService>();
        services.AddScoped<KpiService>();
        services.AddScoped<KpiImportService>();
        services.AddScoped<ReportService>();
        services.AddScoped<AnalyticsJobsService>();
        services.AddScoped<DashboardService>();
        return services;
    }
}
