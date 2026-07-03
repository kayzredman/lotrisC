using Dapper;
using Lotris.Application.Analytics;
using Lotris.Contracts.Analytics;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Analytics;

public sealed class MonitorStatsService : IMonitorStatsService
{
    private readonly ISqlConnectionFactory _connections;

    public MonitorStatsService(ISqlConnectionFactory connections)
    {
        _connections = connections;
    }

    public async Task<MonitorStatsResponse> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);

        const string statsSql = """
            SELECT
              SUM(CASE WHEN status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS TotalOpen,
              SUM(CASE WHEN status NOT IN ('RESOLVED','CLOSED') AND sla_resolution_deadline < GETUTCDATE() THEN 1 ELSE 0 END) AS SlaBreach,
              SUM(CASE WHEN status IN ('RESOLVED','CLOSED') AND updated_at >= DATEADD(HOUR,-24,GETUTCDATE()) THEN 1 ELSE 0 END) AS Resolved24h,
              COUNT(*) AS TotalActive
            FROM dbo.Tickets
            WHERE status NOT IN ('CLOSED')
            """;

        const string teamsSql = """
            SELECT
              t.name AS TeamName,
              SUM(CASE WHEN tk.status IN ('NEW','TEAM_ASSIGNED','UNASSIGNED','ASSIGNED') THEN 1 ELSE 0 END) AS OpenCount,
              SUM(CASE WHEN tk.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS InProgress,
              SUM(CASE WHEN tk.status = 'ESCALATED' THEN 1 ELSE 0 END) AS Escalated
            FROM dbo.Teams t
            LEFT JOIN dbo.Tickets tk ON tk.team_id = t.id AND tk.status NOT IN ('RESOLVED','CLOSED')
            WHERE t.is_active = 1
            GROUP BY t.id, t.name
            ORDER BY OpenCount DESC
            """;

        const string topTicketsSql = """
            SELECT TOP 20
              tk.id AS Id, tk.title AS Title, tk.status AS Status, tk.priority AS Priority,
              tm.name AS TeamName,
              tk.created_at AS CreatedAt
            FROM dbo.Tickets tk
            LEFT JOIN dbo.Teams tm ON tm.id = tk.team_id
            WHERE tk.status NOT IN ('RESOLVED','CLOSED')
            ORDER BY tk.priority ASC, tk.created_at ASC
            """;

        var stats = await connection.QuerySingleOrDefaultAsync<StatsRow>(
            new CommandDefinition(statsSql, cancellationToken: cancellationToken));

        var teams = (await connection.QueryAsync<TeamRow>(
            new CommandDefinition(teamsSql, cancellationToken: cancellationToken))).ToList();

        var topTickets = (await connection.QueryAsync<TopTicketRow>(
            new CommandDefinition(topTicketsSql, cancellationToken: cancellationToken))).ToList();

        return new MonitorStatsResponse(
            stats?.TotalOpen ?? 0,
            stats?.SlaBreach ?? 0,
            stats?.Resolved24h ?? 0,
            stats?.TotalActive ?? 0,
            teams.Select(t => new MonitorTeamStats(t.TeamName, t.OpenCount, t.InProgress, t.Escalated)).ToList(),
            topTickets.Select(t => new MonitorTopTicket(
                SqlGuid.FromSql(t.Id),
                t.Title,
                t.Status,
                t.Priority,
                t.TeamName ?? "—",
                t.CreatedAt)).ToList());
    }

    private sealed class StatsRow
    {
        public int TotalOpen { get; init; }
        public int SlaBreach { get; init; }
        public int Resolved24h { get; init; }
        public int TotalActive { get; init; }
    }

    private sealed class TeamRow
    {
        public string TeamName { get; init; } = "";
        public int OpenCount { get; init; }
        public int InProgress { get; init; }
        public int Escalated { get; init; }
    }

    private sealed class TopTicketRow
    {
        public string Id { get; init; } = "";
        public string Title { get; init; } = "";
        public string Status { get; init; } = "";
        public int Priority { get; init; }
        public string? TeamName { get; init; }
        public DateTime CreatedAt { get; init; }
    }
}
