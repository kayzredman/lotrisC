using Lotris.Contracts;
using Lotris.Contracts.Analytics;

namespace Lotris.Application.Analytics;

public interface IAnalyticsStore
{
    Task<DashboardSummary> GetLiveSummaryAsync(LotrisSession session, CancellationToken ct);

    Task<TicketTrendSeries> GetTicketTrendAsync(Guid tenantId, int days, CancellationToken ct);

    Task<IReadOnlyList<EngineerPerfRow>> GetEngineerPerfAsync(Guid tenantId, string weekKey, CancellationToken ct);

    Task UpsertTicketDailyAsync(Guid tenantId, DateOnly date, CancellationToken ct);

    Task UpsertSlaDailyAsync(
        Guid tenantId,
        DateOnly date,
        int totalTickets,
        int breachCount,
        CancellationToken ct);

    Task UpsertEngineerPerfAsync(
        Guid tenantId,
        Guid engineerId,
        string weekKey,
        int ticketsResolved,
        int slaBreaches,
        decimal? avgResolutionHours,
        decimal? kpiScore,
        CancellationToken ct);

    Task<TicketAnalyticsResponse> GetTicketAnalyticsAsync(Guid tenantId, int days, CancellationToken ct);

    Task<IReadOnlyList<DashboardEngineerPerfItem>> GetEngineerPerfDisplayAsync(
        LotrisSession session,
        CancellationToken ct);

    Task<IReadOnlyList<TeamWorkloadItem>> GetTeamWorkloadAsync(LotrisSession session, CancellationToken ct);

    Task<DashboardQueueHealth> GetDashboardQueueHealthAsync(LotrisSession session, CancellationToken ct);

    Task<ReportJobInfo> EnqueueReportAsync(ReportRequest request, CancellationToken ct);

    Task<IReadOnlyList<DailyAggregate>> GetDailyRangeAsync(Guid tenantId, DateRange range, CancellationToken ct);
}
