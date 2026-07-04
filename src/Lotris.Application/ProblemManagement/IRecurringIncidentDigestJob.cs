namespace Lotris.Application.ProblemManagement;

public interface IRecurringIncidentDigestJob
{
    Task RunWeeklyAsync(CancellationToken cancellationToken = default);
}
