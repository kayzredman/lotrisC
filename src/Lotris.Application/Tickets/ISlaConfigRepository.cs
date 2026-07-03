using Lotris.Application.Tickets;

namespace Lotris.Application.Tickets;

public interface ISlaConfigRepository
{
    Task<SlaConfig> GetAsync(Guid tenantId, Guid? teamId = null, CancellationToken cancellationToken = default);

    Task UpsertTenantDefaultAsync(
        Guid tenantId,
        int pickupSlaMinutes,
        int resolutionSlaMinutes,
        CancellationToken cancellationToken = default);
}
