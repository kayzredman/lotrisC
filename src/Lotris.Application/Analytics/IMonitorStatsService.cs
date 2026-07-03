using Lotris.Contracts;
using Lotris.Contracts.Analytics;

namespace Lotris.Application.Analytics;

public interface IMonitorStatsService
{
    Task<MonitorStatsResponse> GetStatsAsync(CancellationToken cancellationToken = default);
}

public interface IWorkloadAnalyser
{
    Task<TeamWorkloadResultDto> AnalyseTeamAsync(
        Guid tenantId,
        Guid teamId,
        CancellationToken cancellationToken = default);
}
