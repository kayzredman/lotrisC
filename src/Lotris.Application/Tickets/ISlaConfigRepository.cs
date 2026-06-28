using Lotris.Application.Tickets;

namespace Lotris.Application.Tickets;

public interface ISlaConfigRepository
{
    Task<SlaConfig> GetAsync(Guid tenantId, Guid? teamId = null, CancellationToken cancellationToken = default);
}
