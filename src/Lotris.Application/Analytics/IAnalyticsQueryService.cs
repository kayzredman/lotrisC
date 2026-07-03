using Lotris.Contracts;
using Lotris.Contracts.Analytics;

namespace Lotris.Application.Analytics;

public interface IAnalyticsQueryService
{
    Task<SlaWarningsResponse> GetSlaWarningsAsync(LotrisSession session, CancellationToken cancellationToken = default);

    Task<KpiTrendsResponse> GetKpiTrendsAsync(LotrisSession session, CancellationToken cancellationToken = default);

    Task<KpiTrendsResponse> GetMyKpiTrendsAsync(LotrisSession session, CancellationToken cancellationToken = default);
}
