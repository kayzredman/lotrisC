namespace Lotris.Domain.Tickets;

public static class TicketStatus
{
    public const string New = "NEW";
    public const string TeamAssigned = "TEAM_ASSIGNED";
    public const string Unassigned = "UNASSIGNED";
    public const string Assigned = "ASSIGNED";
    public const string InProgress = "IN_PROGRESS";
    public const string Escalated = "ESCALATED";
    public const string Resolved = "RESOLVED";
    public const string Closed = "CLOSED";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        New, TeamAssigned, Unassigned, Assigned, InProgress, Escalated, Resolved, Closed,
    };
}
