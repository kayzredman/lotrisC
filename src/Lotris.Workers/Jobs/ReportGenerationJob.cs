using System.Text.Json;
using Lotris.Application.Notifications;
using Lotris.Application.Reports;
using Microsoft.Extensions.Logging;

namespace Lotris.Workers.Jobs;

public sealed class ReportGenerationJob : IReportGenerationJob
{
    private readonly IReportRepository _reports;
    private readonly IReportGenerator _generator;
    private readonly IEmailSender _email;
    private readonly ReportsOptions _options;
    private readonly ILogger<ReportGenerationJob> _logger;

    public ReportGenerationJob(
        IReportRepository reports,
        IReportGenerator generator,
        IEmailSender email,
        Microsoft.Extensions.Options.IOptions<ReportsOptions> options,
        ILogger<ReportGenerationJob> logger)
    {
        _reports = reports;
        _generator = generator;
        _email = email;
        _options = options.Value;
        _logger = logger;
    }

    public async Task GenerateAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        var job = await _reports.GetJobByIdAsync(jobId, cancellationToken);
        if (job is null)
        {
            _logger.LogWarning("Report job {JobId} not found", jobId);
            return;
        }

        try
        {
            var outputDir = Path.Combine(_options.OutputPath, job.TenantId.ToString());
            var result = await _generator.GenerateAsync(
                job.TenantId,
                job.ReportType,
                job.Format,
                job.DateFrom,
                job.DateTo,
                job.TeamId,
                outputDir,
                cancellationToken);

            await _reports.UpdateJobAsync(jobId, new Dictionary<string, object?>
            {
                ["status"] = "DONE",
                ["file_path"] = result.FilePath,
                ["insights_json"] = result.InsightsJson,
                ["completed_at"] = DateTime.UtcNow,
            }, cancellationToken);

            await TryDeliverScheduledReportAsync(new ReportJobEntity
            {
                Id = job.Id,
                TenantId = job.TenantId,
                ReportType = job.ReportType,
                Format = job.Format,
                Status = "DONE",
                FilePath = result.FilePath,
                RequestedBy = job.RequestedBy,
                DateFrom = job.DateFrom,
                DateTo = job.DateTo,
                TeamId = job.TeamId,
                DeliveryRecipients = job.DeliveryRecipients,
                CreatedAt = job.CreatedAt,
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Report generation failed for job {JobId}", jobId);
            await _reports.UpdateJobAsync(jobId, new Dictionary<string, object?>
            {
                ["status"] = "FAILED",
                ["error_msg"] = ex.Message,
                ["completed_at"] = DateTime.UtcNow,
            }, cancellationToken);
        }
    }

    private async Task TryDeliverScheduledReportAsync(ReportJobEntity job, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(job.DeliveryRecipients))
        {
            return;
        }

        List<string> emails;
        try
        {
            emails = JsonSerializer.Deserialize<List<string>>(job.DeliveryRecipients) ?? [];
        }
        catch
        {
            emails = job.DeliveryRecipients.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
        }

        emails = emails.Where(e => e.Contains('@')).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (emails.Count == 0)
        {
            return;
        }

        var ext = job.Format == "EXCEL" ? ".xlsx" : ".pdf";
        var attachName = $"{job.ReportType}_{job.DateFrom}_{job.DateTo}{ext}".Replace(' ', '_');
        var subject = $"Lotris scheduled report: {job.ReportType.Replace('_', ' ')}";
        var body = $"""
            <p>Your scheduled Lotris report is ready.</p>
            <p><strong>{job.ReportType.Replace('_', ' ')}</strong> ({job.Format})<br/>
            Period: {job.DateFrom} to {job.DateTo}</p>
            <p>The report is attached when size allows; otherwise log in to Lotris → Reports to download.</p>
            """;

        foreach (var to in emails)
        {
            try
            {
                var canAttach = !string.IsNullOrWhiteSpace(job.FilePath) &&
                                File.Exists(job.FilePath) &&
                                new FileInfo(job.FilePath).Length <= 9 * 1024 * 1024;

                await _email.SendAsync(new EmailMessage
                {
                    To = to,
                    Subject = subject,
                    HtmlBody = body,
                    TextBody = $"Scheduled report {job.ReportType} ({job.DateFrom} to {job.DateTo}) is ready.",
                    AttachmentPath = canAttach ? job.FilePath : null,
                    AttachmentName = canAttach ? attachName : null,
                }, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to email scheduled report {JobId} to {Email}", job.Id, to);
            }
        }
    }
}
