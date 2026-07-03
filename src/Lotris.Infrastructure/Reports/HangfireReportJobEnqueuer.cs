using Hangfire;
using Lotris.Application.Reports;

namespace Lotris.Infrastructure.Reports;

public sealed class HangfireReportJobEnqueuer : IReportJobEnqueuer
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireReportJobEnqueuer(IBackgroundJobClient jobs)
    {
        _jobs = jobs;
    }

    public void EnqueueGeneration(Guid jobId) =>
        _jobs.Enqueue<IReportGenerationJob>(job => job.GenerateAsync(jobId, CancellationToken.None));
}
