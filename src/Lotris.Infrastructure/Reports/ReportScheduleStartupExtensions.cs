using Hangfire;
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
}
