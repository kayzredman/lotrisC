using Dapper;
using Lotris.Application.Analytics;
using Lotris.Application.Kpi;
using Lotris.Application.Notifications;
using Lotris.Infrastructure.Analytics.Entities;
using Lotris.Infrastructure.Data;
using Microsoft.Extensions.Logging;

namespace Lotris.Infrastructure.Analytics;

public sealed class KpiTrendAnalyser : IKpiTrendAnalyser
{
    private readonly IKpiRepository _kpi;
    private readonly ISqlConnectionFactory _connections;
    private readonly LotrisDbContext _db;
    private readonly INotificationEnqueuer _notifications;
    private readonly ILogger<KpiTrendAnalyser> _logger;

    public KpiTrendAnalyser(
        IKpiRepository kpi,
        ISqlConnectionFactory connections,
        LotrisDbContext db,
        INotificationEnqueuer notifications,
        ILogger<KpiTrendAnalyser> logger)
    {
        _kpi = kpi;
        _connections = connections;
        _db = db;
        _notifications = notifications;
        _logger = logger;
    }

    public string ComputeWarningLevel(decimal projected, decimal target, string direction)
    {
        if (target == 0)
        {
            return "NONE";
        }

        if (direction.Equals("HIGHER_BETTER", StringComparison.OrdinalIgnoreCase))
        {
            var ratio = projected / target;
            if (ratio < 0.85m)
            {
                return "RED";
            }

            if (ratio < 0.99m)
            {
                return "AMBER";
            }
        }
        else
        {
            var ratio = target / projected;
            if (ratio < 0.85m)
            {
                return "RED";
            }

            if (ratio < 0.99m)
            {
                return "AMBER";
            }
        }

        return "NONE";
    }

    public async Task ScanAllEngineersAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var activePeriods = GetActivePeriodKeys(now);
        var assignments = await _kpi.ListAssignmentsAsync(tenantId, null, null, cancellationToken);
        var active = assignments.Where(a => activePeriods.Contains(a.PeriodKey)).ToList();
        if (active.Count == 0)
        {
            return;
        }

        foreach (var assignment in active)
        {
            try
            {
                var trend = await ComputeTrendAsync(
                    tenantId,
                    assignment.EngineerId,
                    assignment.KpiDefinitionId,
                    assignment.PeriodKey,
                    cancellationToken);
                if (trend is null)
                {
                    continue;
                }

                _db.KpiTrendSnapshots.Add(new KpiTrendSnapshot
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    EngineerId = assignment.EngineerId,
                    KpiDefId = assignment.KpiDefinitionId,
                    PeriodKey = assignment.PeriodKey,
                    SnapshotAt = now,
                    ActualToDate = trend.ActualToDate,
                    ProjectedEop = trend.ProjectedEop,
                    Target = trend.Target,
                    WarningLevel = trend.WarningLevel,
                });

                if (trend.WarningLevel is "AMBER" or "RED")
                {
                    var definition = await _kpi.GetDefinitionAsync(tenantId, assignment.KpiDefinitionId, cancellationToken);
                    _notifications.EnqueueNotification(new NotificationPayload
                    {
                        Type = "KPI_WARNING",
                        TenantId = tenantId,
                        EngineerId = assignment.EngineerId,
                        KpiName = definition?.Name,
                        ProjectedScore = (double)trend.ProjectedEop,
                        Target = (double)trend.Target,
                        WarningLevel = trend.WarningLevel,
                        PeriodKey = assignment.PeriodKey,
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "KPI trend scan failed for engineer {EngineerId} kpi {KpiDefId}",
                    assignment.EngineerId,
                    assignment.KpiDefinitionId);
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<TrendResult?> ComputeTrendAsync(
        Guid tenantId,
        Guid engineerId,
        Guid kpiDefId,
        string periodKey,
        CancellationToken cancellationToken)
    {
        var actuals = await _kpi.ListActualsAsync(tenantId, engineerId, null, cancellationToken);
        var filtered = actuals
            .Where(a => a.KpiDefinitionId == kpiDefId)
            .OrderBy(a => a.RecordedAt)
            .ToList();
        if (filtered.Count == 0)
        {
            return null;
        }

        var definition = await _kpi.GetDefinitionAsync(tenantId, kpiDefId, cancellationToken);
        if (definition is null)
        {
            return null;
        }

        var assignments = await _kpi.ListAssignmentsAsync(tenantId, engineerId, periodKey, cancellationToken);
        var assignment = assignments.FirstOrDefault(a => a.KpiDefinitionId == kpiDefId);
        var target = assignment?.TargetOverride ?? definition.DefaultTarget;
        var direction = definition.Direction ?? "HIGHER_BETTER";

        var t0 = filtered[0].RecordedAt;
        var points = filtered.Select(a => new Point(
            (a.RecordedAt - t0).TotalDays,
            a.Value)).ToList();

        var regression = LinearRegression(points);
        var actualToDate = points[^1].Y;
        var periodEnd = PeriodEndDate(periodKey);
        var daysToEnd = (periodEnd - DateTime.UtcNow).TotalDays;
        var daysElapsed = (DateTime.UtcNow - t0).TotalDays;
        var projectedEop = regression.Intercept + regression.Slope * (decimal)(daysElapsed + Math.Max(0, daysToEnd));
        var warningLevel = ComputeWarningLevel(projectedEop, target, direction);

        return new TrendResult(actualToDate, projectedEop, target, warningLevel);
    }

    private static IReadOnlyList<string> GetActivePeriodKeys(DateTime now)
    {
        var month = $"{now.Year}-{now.Month:D2}";
        var quarter = (int)Math.Ceiling(now.Month / 3.0);
        return [$"{now.Year}-Q{quarter}", month];
    }

    private static DateTime PeriodEndDate(string periodKey)
    {
        var qMatch = System.Text.RegularExpressions.Regex.Match(periodKey, @"^(\d{4})-Q([1-4])$");
        if (qMatch.Success)
        {
            var year = int.Parse(qMatch.Groups[1].Value);
            var q = int.Parse(qMatch.Groups[2].Value);
            var month = q * 3;
            return new DateTime(year, month, DateTime.DaysInMonth(year, month), 23, 59, 59, DateTimeKind.Utc);
        }

        var mMatch = System.Text.RegularExpressions.Regex.Match(periodKey, @"^(\d{4})-(\d{2})$");
        if (mMatch.Success)
        {
            var year = int.Parse(mMatch.Groups[1].Value);
            var month = int.Parse(mMatch.Groups[2].Value);
            return new DateTime(year, month, DateTime.DaysInMonth(year, month), 23, 59, 59, DateTimeKind.Utc);
        }

        return DateTime.UtcNow.AddDays(30);
    }

    private static (decimal Slope, decimal Intercept) LinearRegression(IReadOnlyList<Point> points)
    {
        var n = points.Count;
        if (n < 2)
        {
            return (0, n == 1 ? points[0].Y : 0);
        }

        var sumX = points.Sum(p => (decimal)p.X);
        var sumY = points.Sum(p => p.Y);
        var sumXy = points.Sum(p => (decimal)p.X * p.Y);
        var sumX2 = points.Sum(p => (decimal)p.X * (decimal)p.X);
        var denom = n * sumX2 - sumX * sumX;
        if (denom == 0)
        {
            return (0, sumY / n);
        }

        var slope = (n * sumXy - sumX * sumY) / denom;
        var intercept = (sumY - slope * sumX) / n;
        return (slope, intercept);
    }

    private sealed record Point(double X, decimal Y);

    private sealed record TrendResult(decimal ActualToDate, decimal ProjectedEop, decimal Target, string WarningLevel);
}
