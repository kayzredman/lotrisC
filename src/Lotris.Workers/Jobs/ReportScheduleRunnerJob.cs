using Lotris.Application.Reports;
using Microsoft.Extensions.Logging;

namespace Lotris.Workers.Jobs;

public sealed class ReportScheduleRunnerJob : IReportScheduleRunnerJob
{
    private readonly IReportRepository _reports;
    private readonly IReportJobEnqueuer _enqueuer;
    private readonly ILogger<ReportScheduleRunnerJob> _logger;

    public ReportScheduleRunnerJob(
        IReportRepository reports,
        IReportJobEnqueuer enqueuer,
        ILogger<ReportScheduleRunnerJob> logger)
    {
        _reports = reports;
        _enqueuer = enqueuer;
        _logger = logger;
    }

    public async Task ExecuteDueSchedulesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var due = await _reports.ListDueSchedulesAsync(now, cancellationToken);
        if (due.Count == 0)
        {
            return;
        }

        _logger.LogInformation("Running {Count} due report schedule(s)", due.Count);

        foreach (var schedule in due)
        {
            try
            {
                var (dateFrom, dateTo) = ComputeDateRange(schedule.Frequency, now);
                var jobId = Guid.NewGuid();
                await _reports.CreateJobAsync(new ReportJobEntity
                {
                    Id = jobId,
                    TenantId = schedule.TenantId,
                    ReportType = schedule.ReportType,
                    Format = schedule.Format,
                    Status = "PROCESSING",
                    RequestedBy = schedule.CreatedBy,
                    DateFrom = dateFrom,
                    DateTo = dateTo,
                    TeamId = schedule.TeamId,
                    CreatedAt = now,
                }, cancellationToken);

                _enqueuer.EnqueueGeneration(jobId);
                await _reports.UpdateScheduleRunAsync(
                    schedule.Id,
                    now,
                    ReportService.ComputeNextRunAt(schedule.Frequency),
                    cancellationToken);

                _logger.LogInformation(
                    "Enqueued scheduled report {ScheduleId} as job {JobId} ({ReportType}, {Frequency})",
                    schedule.Id,
                    jobId,
                    schedule.ReportType,
                    schedule.Frequency);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to run scheduled report {ScheduleId}", schedule.Id);
            }
        }
    }

    internal static (string DateFrom, string DateTo) ComputeDateRange(string frequency, DateTime asOfUtc)
    {
        var to = asOfUtc.Date;
        if (frequency == "WEEKLY")
        {
            var from = to.AddDays(-7);
            return (from.ToString("yyyy-MM-dd"), to.ToString("yyyy-MM-dd"));
        }

        if (frequency == "MONTHLY")
        {
            var firstOfMonth = new DateTime(to.Year, to.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var lastMonthEnd = firstOfMonth.AddDays(-1);
            var lastMonthStart = new DateTime(lastMonthEnd.Year, lastMonthEnd.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            return (lastMonthStart.ToString("yyyy-MM-dd"), lastMonthEnd.ToString("yyyy-MM-dd"));
        }

        // QUARTERLY — previous calendar quarter
        var quarter = (to.Month - 1) / 3;
        var prevQuarterStartMonth = quarter == 0 ? 10 : (quarter - 1) * 3 + 1;
        var prevQuarterYear = quarter == 0 ? to.Year - 1 : to.Year;
        var fromDate = new DateTime(prevQuarterYear, prevQuarterStartMonth, 1, 0, 0, 0, DateTimeKind.Utc);
        var toDate = fromDate.AddMonths(3).AddDays(-1);
        return (fromDate.ToString("yyyy-MM-dd"), toDate.ToString("yyyy-MM-dd"));
    }
}
