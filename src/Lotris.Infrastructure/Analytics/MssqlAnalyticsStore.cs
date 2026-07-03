using Dapper;
using Lotris.Application.Analytics;
using Lotris.Contracts;
using Lotris.Contracts.Analytics;
using Lotris.Domain;
using Lotris.Domain.Tickets;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Analytics;

public sealed class MssqlAnalyticsStore : IAnalyticsStore
{
    private static readonly UserRole[] OrgLevelRoles =
    [
        UserRole.SuperAdmin,
        UserRole.Admin,
        UserRole.ItManager,
        UserRole.Executive,
    ];

    private static readonly string[] OrgOpenStatuses =
    [
        TicketStatus.New,
        TicketStatus.TeamAssigned,
        TicketStatus.Assigned,
        TicketStatus.InProgress,
        TicketStatus.Escalated,
    ];

    private static readonly string[] EngineerOpenStatuses =
    [
        TicketStatus.Assigned,
        TicketStatus.InProgress,
        TicketStatus.Escalated,
    ];

    private static readonly string[] ResolvedStatuses =
    [
        TicketStatus.Resolved,
        TicketStatus.Closed,
    ];

    private readonly ISqlConnectionFactory _connections;
    private readonly IDashboardCacheService _cache;

    public MssqlAnalyticsStore(ISqlConnectionFactory connections, IDashboardCacheService cache)
    {
        _connections = connections;
        _cache = cache;
    }

    public async Task<DashboardSummary> GetLiveSummaryAsync(LotrisSession session, CancellationToken ct)
    {
        if (session.Role == UserRole.Engineer)
        {
            return await GetEngineerSummaryAsync(session, ct);
        }

        if (session.Role == UserRole.TeamLead)
        {
            var teamId = await GetUserTeamIdAsync(session.TenantId, session.UserId, ct);
            if (teamId.HasValue)
            {
                var cacheKey = $"dash:{session.TenantId}:team:{teamId}:summary";
                var cached = await _cache.GetAsync<DashboardSummary>(cacheKey, ct);
                if (cached is not null)
                {
                    return cached;
                }

                var teamSummary = await QuerySummaryAsync(
                    session.TenantId,
                    "AND tk.team_id = @TeamId",
                    new { TeamId = SqlGuid.ToSql(teamId.Value) },
                    OrgOpenStatuses,
                    ct);
                await _cache.SetAsync(cacheKey, teamSummary, cancellationToken: ct);
                return teamSummary;
            }
        }

        var orgCacheKey = $"dash:{session.TenantId}:summary";
        var orgCached = await _cache.GetAsync<DashboardSummary>(orgCacheKey, ct);
        if (orgCached is not null)
        {
            return orgCached;
        }

        var orgSummary = await QuerySummaryAsync(session.TenantId, string.Empty, new { }, OrgOpenStatuses, ct);
        await _cache.SetAsync(orgCacheKey, orgSummary, cancellationToken: ct);
        return orgSummary;
    }

    public async Task<TicketTrendSeries> GetTicketTrendAsync(Guid tenantId, int days, CancellationToken ct)
    {
        days = Math.Clamp(days, 1, 90);
        var fromDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-days));

        const string sql = """
            SELECT [Date], TotalCreated, TotalResolved, TotalOpen
            FROM analytics.TicketDaily
            WHERE TenantId = @TenantId AND [Date] >= @FromDate
            ORDER BY [Date]
            """;

        await using var connection = await _connections.OpenConnectionAsync(ct);
        var rows = await connection.QueryAsync<TicketDailyRow>(new CommandDefinition(
            sql,
            new { TenantId = tenantId, FromDate = fromDate },
            cancellationToken: ct));

        var points = rows.Select(r => new TicketTrendPoint(r.Date, r.TotalCreated, r.TotalResolved, r.TotalOpen)).ToList();
        return new TicketTrendSeries(tenantId, days, points);
    }

    public async Task<IReadOnlyList<EngineerPerfRow>> GetEngineerPerfAsync(
        Guid tenantId,
        string weekKey,
        CancellationToken ct)
    {
        const string sql = """
            SELECT EngineerId, WeekKey, TicketsResolved, TasksCompleted, SlaBreaches,
                   AvgResolutionHours, KpiScore
            FROM analytics.EngineerPerf
            WHERE TenantId = @TenantId AND WeekKey = @WeekKey
            ORDER BY KpiScore DESC
            """;

        await using var connection = await _connections.OpenConnectionAsync(ct);
        var rows = await connection.QueryAsync<EngineerPerfRow>(new CommandDefinition(
            sql,
            new { TenantId = tenantId, WeekKey = weekKey },
            cancellationToken: ct));
        return rows.ToList();
    }

    public async Task UpsertTicketDailyAsync(Guid tenantId, DateOnly date, CancellationToken ct)
    {
        await using var connection = await _connections.OpenConnectionAsync(ct);

        var metrics = await ComputeTicketDayMetricsAsync(connection, tenantId, date, ct);
        const string mergeSql = """
            MERGE analytics.TicketDaily AS target
            USING (SELECT @TenantId AS TenantId, @Date AS [Date]) AS source
            ON target.TenantId = source.TenantId AND target.[Date] = source.[Date]
            WHEN MATCHED THEN UPDATE SET
                TotalCreated = @TotalCreated,
                TotalResolved = @TotalResolved,
                TotalEscalated = @TotalEscalated,
                TotalOpen = @TotalOpen,
                SlaBreachCount = @SlaBreachCount,
                AvgResolutionHours = @AvgResolutionHours,
                UpdatedAt = @UpdatedAt
            WHEN NOT MATCHED THEN INSERT (
                Id, TenantId, [Date], TotalCreated, TotalResolved, TotalEscalated,
                TotalOpen, SlaBreachCount, AvgResolutionHours, UpdatedAt
            ) VALUES (
                @Id, @TenantId, @Date, @TotalCreated, @TotalResolved, @TotalEscalated,
                @TotalOpen, @SlaBreachCount, @AvgResolutionHours, @UpdatedAt
            );
            """;

        await connection.ExecuteAsync(new CommandDefinition(mergeSql, new
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Date = date,
            metrics.TotalCreated,
            metrics.TotalResolved,
            metrics.TotalEscalated,
            metrics.TotalOpen,
            metrics.SlaBreachCount,
            metrics.AvgResolutionHours,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken: ct));

        await UpsertSlaDailyAsync(tenantId, date, metrics.TotalCreated, metrics.SlaBreachCount, ct);
    }

    public Task UpsertSlaDailyAsync(
        Guid tenantId,
        DateOnly date,
        int totalTickets,
        int breachCount,
        CancellationToken ct) =>
        UpsertSlaDailyInternalAsync(tenantId, date, totalTickets, breachCount, ct);

    public async Task UpsertEngineerPerfAsync(
        Guid tenantId,
        Guid engineerId,
        string weekKey,
        int ticketsResolved,
        int slaBreaches,
        decimal? avgResolutionHours,
        decimal? kpiScore,
        CancellationToken ct)
    {
        const string mergeSql = """
            MERGE analytics.EngineerPerf AS target
            USING (SELECT @TenantId AS TenantId, @EngineerId AS EngineerId, @WeekKey AS WeekKey) AS source
            ON target.TenantId = source.TenantId
               AND target.EngineerId = source.EngineerId
               AND target.WeekKey = source.WeekKey
            WHEN MATCHED THEN UPDATE SET
                TicketsResolved = @TicketsResolved,
                SlaBreaches = @SlaBreaches,
                AvgResolutionHours = @AvgResolutionHours,
                KpiScore = @KpiScore,
                UpdatedAt = @UpdatedAt
            WHEN NOT MATCHED THEN INSERT (
                Id, TenantId, EngineerId, WeekKey, TicketsResolved, TasksCompleted,
                SlaBreaches, AvgResolutionHours, KpiScore, UpdatedAt
            ) VALUES (
                @Id, @TenantId, @EngineerId, @WeekKey, @TicketsResolved, 0,
                @SlaBreaches, @AvgResolutionHours, @KpiScore, @UpdatedAt
            );
            """;

        await using var connection = await _connections.OpenConnectionAsync(ct);
        await connection.ExecuteAsync(new CommandDefinition(mergeSql, new
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            EngineerId = engineerId,
            WeekKey = weekKey,
            TicketsResolved = ticketsResolved,
            SlaBreaches = slaBreaches,
            AvgResolutionHours = avgResolutionHours,
            KpiScore = kpiScore,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken: ct));
    }

    public async Task<TicketAnalyticsResponse> GetTicketAnalyticsAsync(Guid tenantId, int days, CancellationToken ct)
    {
        days = Math.Clamp(days, 1, 30);
        var fromDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-days));

        const string ticketSql = """
            SELECT [Date], TotalCreated, TotalResolved, TotalEscalated, TotalOpen,
                   SlaBreachCount, AvgResolutionHours
            FROM analytics.TicketDaily
            WHERE TenantId = @TenantId AND [Date] >= @FromDate
            ORDER BY [Date]
            """;

        const string slaSql = """
            SELECT [Date], TotalTickets, PickupBreaches, ResolutionBreaches, CompliancePct
            FROM analytics.SlaDaily
            WHERE TenantId = @TenantId AND [Date] >= @FromDate
            ORDER BY [Date]
            """;

        await using var connection = await _connections.OpenConnectionAsync(ct);
        var param = new { TenantId = tenantId, FromDate = fromDate };

        var ticketRows = await connection.QueryAsync<TicketDailyDto>(new CommandDefinition(
            ticketSql, param, cancellationToken: ct));
        var slaRows = await connection.QueryAsync<SlaDailyDto>(new CommandDefinition(
            slaSql, param, cancellationToken: ct));

        return new TicketAnalyticsResponse(ticketRows.ToList(), slaRows.ToList());
    }

    public async Task<IReadOnlyList<DashboardEngineerPerfItem>> GetEngineerPerfDisplayAsync(
        LotrisSession session,
        CancellationToken ct)
    {
        var weekKey = AnalyticsWeekHelper.CurrentWeekKey(DateTime.UtcNow);
        string? cacheKey = OrgLevelRoles.Contains(session.Role)
            ? $"dash:{session.TenantId}:engineer-perf"
            : session.Role == UserRole.TeamLead
                ? $"dash:{session.TenantId}:team:{session.UserId}:engineer-perf"
                : null;

        if (cacheKey is not null)
        {
            var cached = await _cache.GetAsync<List<DashboardEngineerPerfItem>>(cacheKey, ct);
            if (cached is not null)
            {
                return cached;
            }
        }

        const string sql = """
            SELECT TOP 10 EngineerId, TicketsResolved, KpiScore
            FROM analytics.EngineerPerf
            WHERE TenantId = @TenantId AND WeekKey = @WeekKey AND KpiScore IS NOT NULL
            ORDER BY KpiScore DESC
            """;

        await using var connection = await _connections.OpenConnectionAsync(ct);
        var perfRows = (await connection.QueryAsync<PerfDisplayRow>(new CommandDefinition(
            sql,
            new { TenantId = session.TenantId, WeekKey = weekKey },
            cancellationToken: ct))).ToList();

        if (perfRows.Count == 0)
        {
            if (cacheKey is not null)
            {
                await _cache.SetAsync(cacheKey, new List<DashboardEngineerPerfItem>(), cancellationToken: ct);
            }

            return [];
        }

        if (session.Role == UserRole.Engineer)
        {
            perfRows = perfRows.Where(r => r.EngineerId == session.UserId).ToList();
        }
        else if (session.Role == UserRole.TeamLead)
        {
            var teamId = await GetUserTeamIdAsync(session.TenantId, session.UserId, ct);
            if (teamId.HasValue)
            {
                var memberIds = await GetTeamMemberIdsAsync(connection, session.TenantId, teamId.Value, ct);
                perfRows = perfRows.Where(r => memberIds.Contains(r.EngineerId)).ToList();
            }
        }

        if (perfRows.Count == 0)
        {
            if (cacheKey is not null)
            {
                await _cache.SetAsync(cacheKey, new List<DashboardEngineerPerfItem>(), cancellationToken: ct);
            }

            return [];
        }

        var engineerIds = perfRows.Select(r => r.EngineerId).ToArray();
        const string userSql = """
            SELECT u.id AS Id, u.full_name AS FullName, t.name AS TeamName
            FROM dbo.Users u
            LEFT JOIN dbo.Teams t ON u.team_id = t.id
            WHERE u.id IN @EngineerIds
            """;

        var users = (await connection.QueryAsync<UserInfoRow>(new CommandDefinition(
            userSql,
            new { EngineerIds = engineerIds.Select(SqlGuid.ToSql).ToArray() },
            cancellationToken: ct))).ToDictionary(u => u.Id);

        var result = perfRows.Select(r =>
        {
            users.TryGetValue(r.EngineerId, out var info);
            return new DashboardEngineerPerfItem(
                AbbreviateName(info?.FullName ?? "–"),
                ShortTeamTag(info?.TeamName),
                r.TicketsResolved,
                (int)Math.Round(r.KpiScore ?? 0));
        }).ToList();

        if (cacheKey is not null)
        {
            await _cache.SetAsync(cacheKey, result, cancellationToken: ct);
        }

        return result;
    }

    public async Task<IReadOnlyList<TeamWorkloadItem>> GetTeamWorkloadAsync(LotrisSession session, CancellationToken ct)
    {
        var isOrgLevel = OrgLevelRoles.Contains(session.Role);
        Guid? teamId = isOrgLevel ? null : await GetUserTeamIdAsync(session.TenantId, session.UserId, ct);
        var cacheKey = isOrgLevel
            ? $"dash:{session.TenantId}:team-workload"
            : teamId.HasValue
                ? $"dash:{session.TenantId}:team:{teamId}:team-workload"
                : $"dash:{session.TenantId}:team-workload";

        var cached = await _cache.GetAsync<List<TeamWorkloadItem>>(cacheKey, ct);
        if (cached is not null)
        {
            return cached;
        }

        var teamFilter = !isOrgLevel && teamId.HasValue ? "AND t.id = @TeamId" : string.Empty;
        var sql = $"""
            SELECT t.id AS Id, t.name AS Name, COUNT(tk.id) AS Queued
            FROM dbo.Teams t
            LEFT JOIN dbo.Users u ON u.team_id = t.id AND u.tenant_id = t.tenant_id
            LEFT JOIN dbo.Tickets tk ON tk.assignee_id = u.id
                AND tk.tenant_id = t.tenant_id
                AND tk.status NOT IN ('RESOLVED','CLOSED')
            WHERE t.tenant_id = @TenantId AND t.is_active = 1
            {teamFilter}
            GROUP BY t.id, t.name
            ORDER BY Queued DESC
            """;

        await using var connection = await _connections.OpenConnectionAsync(ct);
        var rows = (await connection.QueryAsync<TeamWorkloadRow>(new CommandDefinition(
            sql,
            new { TenantId = SqlGuid.ToSql(session.TenantId), TeamId = teamId.HasValue ? SqlGuid.ToSql(teamId.Value) : null },
            cancellationToken: ct))).ToList();

        var maxQueued = Math.Max(rows.MaxBy(r => r.Queued)?.Queued ?? 0, 1);
        var result = rows.Select(r => new TeamWorkloadItem(
            r.Id,
            r.Name,
            ShortTeamTag(r.Name),
            r.Queued,
            (int)Math.Round(r.Queued / (double)maxQueued * 100))).ToList();

        await _cache.SetAsync(cacheKey, result, cancellationToken: ct);
        return result;
    }

    public async Task<DashboardQueueHealth> GetDashboardQueueHealthAsync(LotrisSession session, CancellationToken ct)
    {
        var isOrgLevel = OrgLevelRoles.Contains(session.Role);
        Guid? teamId = isOrgLevel ? null : await GetUserTeamIdAsync(session.TenantId, session.UserId, ct);
        var cacheKey = isOrgLevel
            ? $"dash:{session.TenantId}:queue"
            : teamId.HasValue
                ? $"dash:{session.TenantId}:team:{teamId}:queue"
                : $"dash:{session.TenantId}:queue";

        var cached = await _cache.GetAsync<DashboardQueueHealth>(cacheKey, ct);
        if (cached is not null)
        {
            return cached;
        }

        var teamFilter = !isOrgLevel && teamId.HasValue ? "AND team_id = @TeamId" : string.Empty;
        var now = DateTime.UtcNow;
        var atRiskCutoff = now.AddMinutes(30);
        var todayStart = now.Date;

        var sql = $"""
            SELECT
                SUM(CASE WHEN status IN ('NEW','TEAM_ASSIGNED') THEN 1 ELSE 0 END) AS Unassigned,
                SUM(CASE WHEN status IN ('NEW','TEAM_ASSIGNED','ASSIGNED')
                          AND sla_pickup_deadline <= @AtRiskCutoff
                          AND sla_pickup_deadline > @Now
                          AND sla_pickup_breached = 0 THEN 1 ELSE 0 END) AS AtRisk,
                SUM(CASE WHEN status IN ('ASSIGNED','IN_PROGRESS')
                          AND assigned_at >= @TodayStart THEN 1 ELSE 0 END) AS AutoAssignedToday
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId {teamFilter}
            """;

        await using var connection = await _connections.OpenConnectionAsync(ct);
        var row = await connection.QuerySingleAsync<DashboardQueueHealthRow>(new CommandDefinition(
            sql,
            new
            {
                TenantId = SqlGuid.ToSql(session.TenantId),
                TeamId = teamId.HasValue ? SqlGuid.ToSql(teamId.Value) : null,
                AtRiskCutoff = atRiskCutoff,
                Now = now,
                TodayStart = todayStart,
            },
            cancellationToken: ct));

        var result = new DashboardQueueHealth(row.Unassigned, row.AtRisk, row.AutoAssignedToday);
        await _cache.SetAsync(cacheKey, result, cancellationToken: ct);
        return result;
    }

    public Task<ReportJobInfo> EnqueueReportAsync(ReportRequest request, CancellationToken ct) =>
        throw new NotSupportedException("Use ReportService.GenerateReportAsync for report generation.");

    public async Task<IReadOnlyList<DailyAggregate>> GetDailyRangeAsync(
        Guid tenantId,
        DateRange range,
        CancellationToken ct)
    {
        const string sql = """
            SELECT td.[Date], td.TotalCreated, td.TotalResolved, td.TotalOpen, td.SlaBreachCount,
                   sd.CompliancePct
            FROM analytics.TicketDaily td
            LEFT JOIN analytics.SlaDaily sd
                ON sd.TenantId = td.TenantId AND sd.[Date] = td.[Date]
            WHERE td.TenantId = @TenantId
              AND td.[Date] >= @FromDate AND td.[Date] <= @ToDate
            ORDER BY td.[Date]
            """;

        await using var connection = await _connections.OpenConnectionAsync(ct);
        var rows = await connection.QueryAsync<DailyAggregate>(new CommandDefinition(
            sql,
            new { TenantId = tenantId, FromDate = range.From, ToDate = range.To },
            cancellationToken: ct));
        return rows.ToList();
    }

    private async Task<DashboardSummary> GetEngineerSummaryAsync(LotrisSession session, CancellationToken ct)
    {
        const string statusSql = """
            SELECT status, COUNT(1) AS Count
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId AND assignee_id = @UserId
            GROUP BY status
            """;

        await using var connection = await _connections.OpenConnectionAsync(ct);
        var tenantParam = SqlGuid.ToSql(session.TenantId);
        var userParam = SqlGuid.ToSql(session.UserId);
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var statusCounts = (await connection.QueryAsync<StatusCountRow>(new CommandDefinition(
            statusSql,
            new { TenantId = tenantParam, UserId = userParam },
            cancellationToken: ct))).ToDictionary(r => r.Status, r => r.Count);

        int CountOf(string status) => statusCounts.GetValueOrDefault(status);

        var openTickets = CountOf(TicketStatus.Assigned) + CountOf(TicketStatus.InProgress) + CountOf(TicketStatus.Escalated);

        const string resolvedSql = """
            SELECT COUNT(1) FROM dbo.Tickets
            WHERE tenant_id = @TenantId AND assignee_id = @UserId
              AND status IN ('RESOLVED','CLOSED') AND resolved_at >= @MonthStart
            """;

        const string breachedSql = """
            SELECT COUNT(1) FROM dbo.Tickets
            WHERE tenant_id = @TenantId AND assignee_id = @UserId
              AND status IN ('ASSIGNED','IN_PROGRESS','ESCALATED')
              AND sla_resolution_breached = 1
            """;

        const string kpiSql = """
            SELECT TOP 1 overall_score FROM dbo.KPI_Results
            WHERE tenant_id = @TenantId AND engineer_id = @UserId
            ORDER BY computed_at DESC
            """;

        var resolvedMtd = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            resolvedSql,
            new { TenantId = tenantParam, UserId = userParam, MonthStart = monthStart },
            cancellationToken: ct));
        var slaBreached = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            breachedSql,
            new { TenantId = tenantParam, UserId = userParam },
            cancellationToken: ct));
        var kpiScoreRaw = await connection.ExecuteScalarAsync<decimal?>(new CommandDefinition(
            kpiSql,
            new { TenantId = tenantParam, UserId = userParam },
            cancellationToken: ct));

        return new DashboardSummary(
            openTickets,
            resolvedMtd,
            slaBreached,
            (int)Math.Round(kpiScoreRaw ?? 0));
    }

    private async Task<DashboardSummary> QuerySummaryAsync(
        Guid tenantId,
        string extraFilter,
        object extraParams,
        IReadOnlyList<string> openStatuses,
        CancellationToken ct)
    {
        await using var connection = await _connections.OpenConnectionAsync(ct);
        var tenantParam = SqlGuid.ToSql(tenantId);
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var openList = string.Join("','", openStatuses);

        var statusSql = $"""
            SELECT status, COUNT(1) AS Count
            FROM dbo.Tickets tk
            WHERE tenant_id = @TenantId {extraFilter}
            GROUP BY status
            """;

        var parameters = new DynamicParameters(extraParams);
        parameters.Add("TenantId", tenantParam);

        var statusCounts = (await connection.QueryAsync<StatusCountRow>(new CommandDefinition(
            statusSql, parameters, cancellationToken: ct))).ToDictionary(r => r.Status, r => r.Count);
        int CountOf(string status) => statusCounts.GetValueOrDefault(status);
        var openTickets = openStatuses.Sum(CountOf);

        var resolvedSql = $"""
            SELECT COUNT(1) FROM dbo.Tickets tk
            WHERE tenant_id = @TenantId {extraFilter}
              AND status IN ('RESOLVED','CLOSED') AND resolved_at >= @MonthStart
            """;

        var breachedSql = $"""
            SELECT COUNT(1) FROM dbo.Tickets tk
            WHERE tenant_id = @TenantId {extraFilter}
              AND status IN ('{openList}')
              AND sla_resolution_breached = 1
            """;

        var kpiSql = $"""
            SELECT TOP 20 overall_score FROM dbo.KPI_Results
            WHERE tenant_id = @TenantId
            ORDER BY computed_at DESC
            """;

        parameters.Add("MonthStart", monthStart);
        var resolvedMtd = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            resolvedSql, parameters, cancellationToken: ct));
        var slaBreached = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            breachedSql, parameters, cancellationToken: ct));
        var kpiScores = (await connection.QueryAsync<decimal>(new CommandDefinition(
            kpiSql,
            new { TenantId = tenantParam },
            cancellationToken: ct))).ToList();
        var kpiScore = kpiScores.Count > 0 ? (int)Math.Round(kpiScores.Average()) : 0;

        return new DashboardSummary(openTickets, resolvedMtd, slaBreached, kpiScore);
    }

    private static async Task<TicketDayMetrics> ComputeTicketDayMetricsAsync(
        System.Data.Common.DbConnection connection,
        Guid tenantId,
        DateOnly date,
        CancellationToken ct)
    {
        const string statusSql = """
            SELECT status, COUNT(1) AS Count
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId AND CAST(created_at AS DATE) = @Date
            GROUP BY status
            """;

        const string openSql = """
            SELECT COUNT(1) FROM dbo.Tickets
            WHERE tenant_id = @TenantId
              AND status NOT IN ('RESOLVED','CLOSED','CANCELLED')
            """;

        const string breachSql = """
            SELECT COUNT(1) FROM dbo.Tickets
            WHERE tenant_id = @TenantId
              AND CAST(created_at AS DATE) = @Date
              AND sla_resolution_breached = 1
            """;

        const string avgSql = """
            SELECT AVG(CAST(DATEDIFF(HOUR, created_at, resolved_at) AS DECIMAL(10,2)))
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId
              AND CAST(resolved_at AS DATE) = @Date
              AND resolved_at IS NOT NULL
            """;

        var param = new { TenantId = SqlGuid.ToSql(tenantId), Date = date.ToDateTime(TimeOnly.MinValue) };
        var statusRows = await connection.QueryAsync<StatusCountRow>(new CommandDefinition(
            statusSql, param, cancellationToken: ct));

        var totalCreated = 0;
        var totalResolved = 0;
        var totalEscalated = 0;
        foreach (var row in statusRows)
        {
            totalCreated += row.Count;
            if (row.Status is TicketStatus.Resolved or TicketStatus.Closed)
            {
                totalResolved += row.Count;
            }

            if (row.Status == TicketStatus.Escalated)
            {
                totalEscalated += row.Count;
            }
        }

        var totalOpen = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            openSql, new { TenantId = SqlGuid.ToSql(tenantId) }, cancellationToken: ct));
        var slaBreachCount = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            breachSql, param, cancellationToken: ct));
        var avgResolutionHours = await connection.ExecuteScalarAsync<decimal?>(new CommandDefinition(
            avgSql, param, cancellationToken: ct));

        return new TicketDayMetrics(
            totalCreated,
            totalResolved,
            totalEscalated,
            totalOpen,
            slaBreachCount,
            avgResolutionHours);
    }

    private async Task UpsertSlaDailyInternalAsync(
        Guid tenantId,
        DateOnly date,
        int totalTickets,
        int breachCount,
        CancellationToken ct)
    {
        var compliancePct = AnalyticsWeekHelper.ComputeSlaCompliancePct(totalTickets, breachCount);
        const string mergeSql = """
            MERGE analytics.SlaDaily AS target
            USING (SELECT @TenantId AS TenantId, @Date AS [Date]) AS source
            ON target.TenantId = source.TenantId AND target.[Date] = source.[Date]
            WHEN MATCHED THEN UPDATE SET
                TotalTickets = @TotalTickets,
                ResolutionBreaches = @BreachCount,
                CompliancePct = @CompliancePct,
                UpdatedAt = @UpdatedAt
            WHEN NOT MATCHED THEN INSERT (
                Id, TenantId, [Date], TotalTickets, PickupBreaches, ResolutionBreaches,
                CompliancePct, UpdatedAt
            ) VALUES (
                @Id, @TenantId, @Date, @TotalTickets, 0, @BreachCount,
                @CompliancePct, @UpdatedAt
            );
            """;

        await using var connection = await _connections.OpenConnectionAsync(ct);
        await connection.ExecuteAsync(new CommandDefinition(mergeSql, new
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Date = date,
            TotalTickets = totalTickets,
            BreachCount = breachCount,
            CompliancePct = compliancePct,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken: ct));
    }

    private async Task<Guid?> GetUserTeamIdAsync(Guid tenantId, Guid userId, CancellationToken ct)
    {
        const string sql = "SELECT team_id FROM dbo.Users WHERE tenant_id = @TenantId AND id = @UserId";
        await using var connection = await _connections.OpenConnectionAsync(ct);
        var raw = await connection.ExecuteScalarAsync<string?>(new CommandDefinition(
            sql,
            new { TenantId = SqlGuid.ToSql(tenantId), UserId = SqlGuid.ToSql(userId) },
            cancellationToken: ct));
        return string.IsNullOrWhiteSpace(raw) ? null : SqlGuid.FromSql(raw);
    }

    private static async Task<HashSet<Guid>> GetTeamMemberIdsAsync(
        System.Data.Common.DbConnection connection,
        Guid tenantId,
        Guid teamId,
        CancellationToken ct)
    {
        const string sql = """
            SELECT id FROM dbo.Users
            WHERE tenant_id = @TenantId AND team_id = @TeamId
            """;
        var ids = await connection.QueryAsync<string>(new CommandDefinition(
            sql,
            new { TenantId = SqlGuid.ToSql(tenantId), TeamId = SqlGuid.ToSql(teamId) },
            cancellationToken: ct));
        return ids.Select(SqlGuid.FromSql).ToHashSet();
    }

    private static string AbbreviateName(string fullName)
    {
        var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2)
        {
            return fullName;
        }

        return $"{parts[0][0]}. {string.Join(' ', parts.Skip(1))}";
    }

    private static string ShortTeamTag(string? teamName)
    {
        if (string.IsNullOrWhiteSpace(teamName))
        {
            return "–";
        }

        return teamName switch
        {
            "Infrastructure" => "Infra",
            "App Development" => "App Dev",
            "Applications Support" => "App Supp",
            "IT Security" => "IT Sec",
            "Project Management" => "Proj Mgmt",
            "IT Governance" => "IT Gov",
            _ => teamName.Length <= 8 ? teamName : teamName[..8],
        };
    }

    private sealed record TicketDayMetrics(
        int TotalCreated,
        int TotalResolved,
        int TotalEscalated,
        int TotalOpen,
        int SlaBreachCount,
        decimal? AvgResolutionHours);

    private sealed class TicketDailyRow
    {
        public DateOnly Date { get; init; }
        public int TotalCreated { get; init; }
        public int TotalResolved { get; init; }
        public int TotalOpen { get; init; }
    }

    private sealed class StatusCountRow
    {
        public string Status { get; init; } = string.Empty;
        public int Count { get; init; }
    }

    private sealed class PerfDisplayRow
    {
        public Guid EngineerId { get; init; }
        public int TicketsResolved { get; init; }
        public decimal? KpiScore { get; init; }
    }

    private sealed class UserInfoRow
    {
        public Guid Id { get; init; }
        public string? FullName { get; init; }
        public string? TeamName { get; init; }
    }

    private sealed class TeamWorkloadRow
    {
        public Guid Id { get; init; }
        public string Name { get; init; } = string.Empty;
        public int Queued { get; init; }
    }

    private sealed class DashboardQueueHealthRow
    {
        public int Unassigned { get; init; }
        public int AtRisk { get; init; }
        public int AutoAssignedToday { get; init; }
    }
}
