namespace Lotris.Contracts.Analytics;

public record TicketAnalyticsResponse(
    IReadOnlyList<TicketDailyDto> TicketTrend,
    IReadOnlyList<SlaDailyDto> SlaTrend);

public record TicketDailyDto(
    DateOnly Date,
    int TotalCreated,
    int TotalResolved,
    int TotalEscalated,
    int TotalOpen,
    int SlaBreachCount,
    decimal? AvgResolutionHours);

public record SlaDailyDto(
    DateOnly Date,
    int TotalTickets,
    int PickupBreaches,
    int ResolutionBreaches,
    decimal? CompliancePct);

public record DashboardEngineerPerfItem(
    string Name,
    string Team,
    int Tickets,
    int Score);

public record TeamWorkloadItem(
    Guid Id,
    string Name,
    string Tag,
    int Queued,
    int Pct);

public record DashboardQueueHealth(
    int Unassigned,
    int AtRisk,
    int AutoAssignedToday);

public record SlaWarningTicket(
    Guid Id,
    string Title,
    string? AssigneeId,
    string SlaWarningLevel,
    DateTime? SlaResolutionDeadline,
    int? MinutesRemaining);

public record SlaWarningsResponse(IReadOnlyList<SlaWarningTicket> Tickets);

public record KpiTrendItem(
    Guid EngineerId,
    Guid KpiDefId,
    string PeriodKey,
    decimal? ActualToDate,
    decimal? ProjectedEop,
    decimal? Target,
    string WarningLevel,
    DateTime SnapshotAt);

public record KpiTrendsResponse(IReadOnlyList<KpiTrendItem> Trends);
