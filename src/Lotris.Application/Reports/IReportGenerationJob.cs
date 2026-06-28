namespace Lotris.Application.Reports;

public interface IReportGenerationJob
{
    Task GenerateAsync(Guid jobId, CancellationToken cancellationToken = default);
}
