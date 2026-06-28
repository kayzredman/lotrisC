using Lotris.Contracts;
using Lotris.Contracts.Health;

namespace Lotris.Application.Health;

public interface ISystemHealthService
{
    Task<HealthSnapshotDto> GetSnapshotAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<IncidentEntryDto>> GetIncidentsAsync(
        int limit,
        CancellationToken cancellationToken = default);

    Task<RestartServiceResponse> RequestRestartAsync(
        string serviceName,
        LotrisSession session,
        CancellationToken cancellationToken = default);
}
