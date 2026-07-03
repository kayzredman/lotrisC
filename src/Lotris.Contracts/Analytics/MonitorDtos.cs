namespace Lotris.Contracts.Analytics;

public record MonitorTeamStats(
    string TeamName,
    int Open,
    int InProgress,
    int Escalated);

public record MonitorTopTicket(
    Guid Id,
    string Title,
    string Status,
    int Priority,
    string TeamName,
    DateTime CreatedAt);

public record MonitorStatsResponse(
    int TotalOpen,
    int SlaBreach,
    int Resolved24h,
    int TotalActive,
    IReadOnlyList<MonitorTeamStats> Teams,
    IReadOnlyList<MonitorTopTicket> TopTickets);
