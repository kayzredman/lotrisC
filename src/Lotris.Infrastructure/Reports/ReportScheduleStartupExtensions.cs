using Hangfire;
using Lotris.Application.ProblemManagement;
using Lotris.Application.Reports;

namespace Lotris.Infrastructure.Reports;

public static class ReportScheduleStartupExtensions
{
    public const string RecurringJobKey = "report-schedules";

    public static void RegisterReportScheduleJob()
    {
        RecurringJob.AddOrUpdate<IReportScheduleRunnerJob>(
            RecurringJobKey,
            job => job.ExecuteDueSchedulesAsync(CancellationToken.None),
            "*/15 * * * *");
    }

    public const string RecurringDigestJobKey = "recurring-incident-digest";

    public static void RegisterRecurringIncidentDigestJob()
    {
        RecurringJob.AddOrUpdate<IRecurringIncidentDigestJob>(
            RecurringDigestJobKey,
            job => job.RunWeeklyAsync(CancellationToken.None),
            "0 8 * * 1");
    }
}
