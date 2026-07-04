using Lotris.Application.Common;
using Lotris.Contracts;
using Lotris.Contracts.Reports;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace Lotris.Application.Reports;

public sealed class ReportService
{
    private readonly IReportRepository _reports;
    private readonly IReportJobEnqueuer _enqueuer;
    private readonly ReportsOptions _options;

    public ReportService(
        IReportRepository reports,
        IReportJobEnqueuer enqueuer,
        IOptions<ReportsOptions> options)
    {
        _reports = reports;
        _enqueuer = enqueuer;
        _options = options.Value;
    }

    public async Task<GenerateReportResponse> GenerateReportAsync(
        LotrisSession session,
        GenerateReportRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateReportType(request.ReportType);
        ValidateFormat(request.Format);

        var jobId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        await _reports.CreateJobAsync(new ReportJobEntity
        {
            Id = jobId,
            TenantId = session.TenantId,
            ReportType = request.ReportType,
            Format = request.Format,
            Status = "PROCESSING",
            RequestedBy = session.UserId,
            DateFrom = request.DateFrom,
            DateTo = request.DateTo,
            TeamId = request.TeamId,
            CreatedAt = now,
        }, cancellationToken);

        _enqueuer.EnqueueGeneration(jobId);
        return new GenerateReportResponse(jobId);
    }

    public async Task<IReadOnlyList<ReportJobDto>> ListReportsAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        var rows = await _reports.ListJobsAsync(session.TenantId, 50, cancellationToken);
        return rows.Select(MapJob).ToList();
    }

    public async Task<ReportJobDto> GetJobStatusAsync(
        LotrisSession session,
        Guid jobId,
        CancellationToken cancellationToken = default)
    {
        var job = await RequireJobAsync(session.TenantId, jobId, cancellationToken);
        return MapJob(job);
    }

    public async Task<string> GetFilePathAsync(
        LotrisSession session,
        Guid jobId,
        CancellationToken cancellationToken = default)
    {
        var job = await RequireJobAsync(session.TenantId, jobId, cancellationToken);
        if (job.Status != "DONE" || string.IsNullOrWhiteSpace(job.FilePath))
        {
            throw new NotFoundException("Report file not available");
        }

        return job.FilePath;
    }

    public async Task<CreateReportScheduleResponse> CreateScheduleAsync(
        LotrisSession session,
        CreateReportScheduleRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateReportType(request.ReportType);
        ValidateFormat(request.Format);
        ValidateFrequency(request.Frequency);

        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;
        await _reports.CreateScheduleAsync(new ReportScheduleEntity
        {
            Id = id,
            TenantId = session.TenantId,
            ReportType = request.ReportType,
            Format = request.Format,
            Frequency = request.Frequency,
            Recipients = request.Recipients,
            TeamId = request.TeamId,
            IsActive = true,
            CreatedBy = session.UserId,
            CreatedAt = now,
            NextRunAt = ComputeNextRunAt(request.Frequency),
        }, cancellationToken);

        return new CreateReportScheduleResponse(id);
    }

    public async Task<IReadOnlyList<ReportScheduleDto>> ListSchedulesAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        var rows = await _reports.ListSchedulesAsync(session.TenantId, cancellationToken);
        return rows.Select(MapSchedule).ToList();
    }

    public async Task DeleteScheduleAsync(
        LotrisSession session,
        Guid scheduleId,
        CancellationToken cancellationToken = default)
    {
        await _reports.DeleteScheduleAsync(session.TenantId, scheduleId, cancellationToken);
    }

    public async Task<ReportConfigDto> GetConfigAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        var row = await _reports.GetConfigAsync(session.TenantId, cancellationToken);
        return MapConfig(row);
    }

    public async Task UpdateConfigAsync(
        LotrisSession session,
        UpdateReportConfigRequest request,
        CancellationToken cancellationToken = default)
    {
        await _reports.UpsertConfigAsync(session.TenantId, new ReportConfigUpdate
        {
            BrandName = request.BrandName,
            DefaultTimezone = request.DefaultTimezone,
            AttachmentSizeLimitMb = request.AttachmentSizeLimitMb,
            RetentionDays = request.RetentionDays,
            DefaultRecipients = request.DefaultRecipients,
        }, cancellationToken);
    }

    public string GetTenantOutputDirectory(Guid tenantId) =>
        Path.Combine(_options.OutputPath, tenantId.ToString());

    private async Task<ReportJobEntity> RequireJobAsync(
        Guid tenantId,
        Guid jobId,
        CancellationToken cancellationToken)
    {
        var job = await _reports.GetJobAsync(tenantId, jobId, cancellationToken);
        if (job is null)
        {
            throw new NotFoundException("Report job not found");
        }

        return job;
    }

    private static void ValidateReportType(string reportType)
    {
        if (reportType is not ("TICKET_SUMMARY" or "SLA_COMPLIANCE" or "KPI_REPORT" or "ENGINEER_PERF"))
        {
            throw new BadRequestException($"Invalid report type: {reportType}");
        }
    }

    private static void ValidateFormat(string format)
    {
        if (format is not ("PDF" or "EXCEL"))
        {
            throw new BadRequestException($"Invalid format: {format}");
        }
    }

    private static void ValidateFrequency(string frequency)
    {
        if (frequency is not ("WEEKLY" or "MONTHLY" or "QUARTERLY"))
        {
            throw new BadRequestException($"Invalid frequency: {frequency}");
        }
    }

    public static DateTime ComputeNextRunAt(string frequency)
    {
        var now = DateTime.UtcNow;
        const int localHour = 8;

        if (frequency == "WEEKLY")
        {
            var d = now;
            var day = (int)d.DayOfWeek;
            var daysUntilMonday = day == 0 ? 1 : 8 - day;
            d = d.AddDays(daysUntilMonday);
            return new DateTime(d.Year, d.Month, d.Day, localHour, 0, 0, DateTimeKind.Utc);
        }

        if (frequency == "MONTHLY")
        {
            var d = new DateTime(now.Year, now.Month, 1, localHour, 0, 0, DateTimeKind.Utc).AddMonths(1);
            return d;
        }

        var quarterStart = (now.Month - 1) / 3 * 3 + 1;
        var nextQuarterStart = quarterStart + 3;
        if (nextQuarterStart > 12)
        {
            return new DateTime(now.Year + 1, 1, 1, localHour, 0, 0, DateTimeKind.Utc);
        }

        return new DateTime(now.Year, nextQuarterStart, 1, localHour, 0, 0, DateTimeKind.Utc);
    }

    private static ReportJobDto MapJob(ReportJobEntity row) => new(
        row.Id,
        row.TenantId,
        row.ReportType,
        row.Format,
        row.Status,
        row.FilePath,
        row.RequestedBy,
        row.DateFrom,
        row.DateTo,
        row.TeamId,
        row.ErrorMsg,
        row.InsightsJson,
        row.CreatedAt,
        row.CompletedAt);

    private static ReportScheduleDto MapSchedule(ReportScheduleEntity row) => new(
        row.Id,
        row.TenantId,
        row.ReportType,
        row.Format,
        row.Frequency,
        row.Recipients,
        row.TeamId,
        row.IsActive,
        row.CreatedBy,
        row.CreatedAt,
        row.NextRunAt,
        row.LastRunAt);

    private static ReportConfigDto MapConfig(ReportConfigEntity? row)
    {
        const string defaults = "[]";
        var recipientsJson = row?.DefaultRecipients ?? defaults;
        IReadOnlyList<string> recipients;
        try
        {
            recipients = JsonSerializer.Deserialize<List<string>>(recipientsJson) ?? [];
        }
        catch
        {
            recipients = [];
        }

        return new ReportConfigDto(
            row?.BrandName ?? "Lotris",
            row?.DefaultTimezone ?? "UTC",
            row?.AttachmentSizeLimitMb ?? 10,
            row?.RetentionDays ?? 30,
            recipients);
    }
}
