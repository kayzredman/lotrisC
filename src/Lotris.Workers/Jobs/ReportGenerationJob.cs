using Lotris.Application.Reports;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Lotris.Workers.Jobs;

public sealed class ReportGenerationJob : IReportGenerationJob
{
    private readonly IReportRepository _reports;
    private readonly IReportGenerator _generator;
    private readonly ReportsOptions _options;
    private readonly ILogger<ReportGenerationJob> _logger;

    public ReportGenerationJob(
        IReportRepository reports,
        IReportGenerator generator,
        IOptions<ReportsOptions> options,
        ILogger<ReportGenerationJob> logger)
    {
        _reports = reports;
        _generator = generator;
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
}
