using Lotris.Application.Analytics;
using Lotris.Application.Tickets;
using Lotris.Contracts;
using Lotris.Contracts.Analytics;
using Lotris.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Lotris.Infrastructure.Analytics;

public sealed class AnalyticsQueryService : IAnalyticsQueryService
{
    private readonly ITicketRepository _tickets;
    private readonly LotrisDbContext _db;

    public AnalyticsQueryService(
        ITicketRepository tickets,
        LotrisDbContext db)
    {
        _tickets = tickets;
        _db = db;
    }

    public async Task<SlaWarningsResponse> GetSlaWarningsAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        Guid? engineerFilter = session.Role == Domain.UserRole.Engineer ? session.UserId : null;
        var rows = await _tickets.ListSlaWarningsAsync(session.TenantId, engineerFilter, cancellationToken);
        var tickets = rows.Select(r => new SlaWarningTicket(
            r.Id,
            r.Title,
            r.AssigneeId?.ToString(),
            r.SlaWarningLevel,
            r.SlaResolutionDeadline,
            r.MinutesRemaining)).ToList();
        return new SlaWarningsResponse(tickets);
    }

    public async Task<KpiTrendsResponse> GetKpiTrendsAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        var rows = await QueryKpiTrendSnapshotsAsync(session.TenantId, engineerId: null, cancellationToken);
        return new KpiTrendsResponse(rows);
    }

    public async Task<KpiTrendsResponse> GetMyKpiTrendsAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        var rows = await QueryKpiTrendSnapshotsAsync(session.TenantId, session.UserId, cancellationToken);
        return new KpiTrendsResponse(rows);
    }

    private async Task<IReadOnlyList<KpiTrendItem>> QueryKpiTrendSnapshotsAsync(
        Guid tenantId,
        Guid? engineerId,
        CancellationToken cancellationToken)
    {
        var query = _db.KpiTrendSnapshots
            .AsNoTracking()
            .Where(s => s.TenantId == tenantId);

        if (engineerId.HasValue)
        {
            query = query.Where(s => s.EngineerId == engineerId.Value);
        }

        var rows = await query
            .OrderByDescending(s => s.SnapshotAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        return rows.Select(s => new KpiTrendItem(
            s.EngineerId,
            s.KpiDefId,
            s.PeriodKey,
            s.ActualToDate,
            s.ProjectedEop,
            s.Target,
            s.WarningLevel,
            s.SnapshotAt)).ToList();
    }
}
