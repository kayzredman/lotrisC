namespace Lotris.Contracts.Analytics;

public record DashboardSummary(
    int OpenTickets,
    int ResolvedMtd,
    int SlaBreached,
    int KpiScore);

public record TicketTrendPoint(DateOnly Date, int Created, int Resolved, int Open);

public record TicketTrendSeries(
    Guid TenantId,
    int Days,
    IReadOnlyList<TicketTrendPoint> Points);

public record EngineerPerfRow(
    Guid EngineerId,
    string WeekKey,
    int TicketsResolved,
    int TasksCompleted,
    int SlaBreaches,
    decimal? AvgResolutionHours,
    decimal? KpiScore);

public record DailyAggregate(
    DateOnly Date,
    int TotalCreated,
    int TotalResolved,
    int TotalOpen,
    int SlaBreachCount,
    decimal? CompliancePct);

public record DateRange(DateOnly From, DateOnly To);

public record ReportRequest(
    Guid TenantId,
    Guid RequestedBy,
    string ReportType,
    string Format,
    DateOnly? DateFrom,
    DateOnly? DateTo,
    Guid? TeamId);

public record ReportJobInfo(
    Guid Id,
    Guid TenantId,
    string ReportType,
    string Format,
    string Status,
    string? FilePath,
    Guid RequestedBy,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    string? ErrorMsg);
