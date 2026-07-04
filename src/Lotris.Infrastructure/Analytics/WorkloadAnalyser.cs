using Dapper;
using Lotris.Application.Admin;
using Lotris.Application.Analytics;
using Lotris.Application.Queue;
using Lotris.Contracts.Analytics;
using Lotris.Domain.Tickets;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Analytics;

public sealed class WorkloadAnalyser : IWorkloadAnalyser
{
    private static readonly string[] OpenStatuses =
    [
        TicketStatus.New,
        TicketStatus.TeamAssigned,
        TicketStatus.Unassigned,
        TicketStatus.Assigned,
        TicketStatus.InProgress,
    ];

    private static readonly string[] SuggestionSourceStatuses =
    [
        TicketStatus.New,
        TicketStatus.TeamAssigned,
        TicketStatus.Unassigned,
        TicketStatus.Assigned,
    ];

    private const int MaxSuggestionsPerTeam = 5;

    private readonly ISqlConnectionFactory _connections;
    private readonly IAdminRepository _admin;
    private readonly IQueueRepository _queue;

    public WorkloadAnalyser(
        ISqlConnectionFactory connections,
        IAdminRepository admin,
        IQueueRepository queue)
    {
        _connections = connections;
        _admin = admin;
        _queue = queue;
    }

    public async Task<TeamWorkloadResultDto> AnalyseTeamAsync(
        Guid tenantId,
        Guid teamId,
        CancellationToken cancellationToken = default)
    {
        var queueCfg = await _queue.GetConfigAsync(tenantId, teamId, cancellationToken);
        var maxCapacity = queueCfg.MaxCapacityPerEngineer;

        var engineers = (await _admin.ListUsersAsync(tenantId, teamId: null, cancellationToken))
            .Where(u => u.TeamId == teamId && u.IsActive)
            .ToList();

        if (engineers.Count == 0)
        {
            return new TeamWorkloadResultDto(teamId, [], []);
        }

        var engineerIds = engineers.Select(e => e.Id).ToList();
        var countMap = await GetOpenTicketCountsAsync(tenantId, teamId, engineerIds, cancellationToken);

        var engineerLoads = engineers.Select(eng =>
        {
            var openCount = countMap.GetValueOrDefault(eng.Id, 0);
            var loadPct = maxCapacity > 0 ? (int)Math.Round(openCount / (double)maxCapacity * 100) : 0;
            return new EngineerLoadDto(
                eng.Id,
                eng.FullName,
                openCount,
                maxCapacity,
                loadPct,
                eng.IsUnavailable);
        }).ToList();

        var overloaded = engineerLoads.Where(e => !e.IsUnavailable && e.LoadPct >= 100).ToList();
        var available = engineerLoads
            .Where(e => !e.IsUnavailable && e.LoadPct < 70)
            .OrderBy(e => e.LoadPct)
            .Select(e => new MutableLoad(e))
            .ToList();

        var suggestions = new List<WorkloadSuggestionDto>();

        if (overloaded.Count > 0 && available.Count > 0)
        {
            foreach (var overEng in overloaded)
            {
                if (suggestions.Count >= MaxSuggestionsPerTeam)
                {
                    break;
                }

                var candidateTickets = await GetCandidateTicketsAsync(
                    tenantId,
                    overEng.EngineerId,
                    cancellationToken);

                foreach (var ticket in candidateTickets)
                {
                    if (suggestions.Count >= MaxSuggestionsPerTeam)
                    {
                        break;
                    }

                    var target = available[0];
                    suggestions.Add(new WorkloadSuggestionDto(
                        ticket.Id,
                        ticket.Title,
                        overEng.EngineerId,
                        overEng.FullName,
                        target.EngineerId,
                        target.FullName));

                    target.LoadPct += maxCapacity > 0 ? (int)Math.Round(1 / (double)maxCapacity * 100) : 0;
                }
            }
        }

        return new TeamWorkloadResultDto(teamId, engineerLoads, suggestions);
    }

    private async Task<Dictionary<Guid, int>> GetOpenTicketCountsAsync(
        Guid tenantId,
        Guid teamId,
        IReadOnlyList<Guid> engineerIds,
        CancellationToken cancellationToken)
    {
        if (engineerIds.Count == 0)
        {
            return [];
        }

        const string sql = """
            SELECT assignee_id AS AssigneeId, COUNT(1) AS OpenCount
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId
              AND team_id = @TeamId
              AND status IN @OpenStatuses
              AND assignee_id IN @EngineerIds
            GROUP BY assignee_id
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CountRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            TeamId = SqlGuid.ToSql(teamId),
            OpenStatuses,
            EngineerIds = engineerIds.Select(SqlGuid.ToSql).ToArray(),
        }, cancellationToken: cancellationToken));

        return rows.ToDictionary(
            r => SqlGuid.FromSql(r.AssigneeId),
            r => r.OpenCount);
    }

    private async Task<IReadOnlyList<CandidateTicket>> GetCandidateTicketsAsync(
        Guid tenantId,
        Guid assigneeId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT TOP 3 id AS Id, title AS Title
            FROM dbo.Tickets
            WHERE tenant_id = @TenantId
              AND assignee_id = @AssigneeId
              AND status IN @SourceStatuses
            ORDER BY priority ASC, assigned_at ASC
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CandidateRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            AssigneeId = SqlGuid.ToSql(assigneeId),
            SourceStatuses = SuggestionSourceStatuses,
        }, cancellationToken: cancellationToken));

        return rows.Select(r => new CandidateTicket(SqlGuid.FromSql(r.Id), r.Title)).ToList();
    }

    private sealed class CountRow
    {
        public string AssigneeId { get; init; } = "";
        public int OpenCount { get; init; }
    }

    private sealed class CandidateRow
    {
        public string Id { get; init; } = "";
        public string Title { get; init; } = "";
    }

    private sealed record CandidateTicket(Guid Id, string Title);

    private sealed class MutableLoad
    {
        public MutableLoad(EngineerLoadDto source)
        {
            EngineerId = source.EngineerId;
            FullName = source.FullName;
            LoadPct = source.LoadPct;
        }

        public Guid EngineerId { get; }
        public string FullName { get; }
        public int LoadPct { get; set; }
    }
}
