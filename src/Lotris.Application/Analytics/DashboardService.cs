using Lotris.Application.Analytics;
using Lotris.Contracts;
using Lotris.Contracts.Analytics;

namespace Lotris.Application.Analytics;

public sealed class DashboardService
{
    private readonly IAnalyticsStore _analytics;

    public DashboardService(IAnalyticsStore analytics)
    {
        _analytics = analytics;
    }

    public Task<DashboardSummary> GetSummaryAsync(LotrisSession session, CancellationToken cancellationToken = default) =>
        _analytics.GetLiveSummaryAsync(session, cancellationToken);

    public Task<TicketAnalyticsResponse> GetTicketAnalyticsAsync(
        LotrisSession session,
        int days = 7,
        CancellationToken cancellationToken = default) =>
        _analytics.GetTicketAnalyticsAsync(session.TenantId, days, cancellationToken);

    public Task<IReadOnlyList<DashboardEngineerPerfItem>> GetEngineerPerfAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default) =>
        _analytics.GetEngineerPerfDisplayAsync(session, cancellationToken);

    public Task<IReadOnlyList<TeamWorkloadItem>> GetTeamWorkloadAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default) =>
        _analytics.GetTeamWorkloadAsync(session, cancellationToken);

    public Task<DashboardQueueHealth> GetQueueHealthAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default) =>
        _analytics.GetDashboardQueueHealthAsync(session, cancellationToken);
}
