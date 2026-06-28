namespace Lotris.Domain.Tickets;

public static class TicketLifecycle
{
    private static readonly IReadOnlyDictionary<string, string[]> Transitions =
        new Dictionary<string, string[]>(StringComparer.Ordinal)
        {
            [TicketStatus.New] = [TicketStatus.TeamAssigned],
            [TicketStatus.TeamAssigned] = [TicketStatus.Unassigned],
            [TicketStatus.Unassigned] = [TicketStatus.Assigned],
            [TicketStatus.Assigned] = [TicketStatus.InProgress],
            [TicketStatus.InProgress] = [TicketStatus.Escalated, TicketStatus.Resolved],
            [TicketStatus.Escalated] = [TicketStatus.InProgress, TicketStatus.Resolved],
            [TicketStatus.Resolved] = [TicketStatus.Closed],
            [TicketStatus.Closed] = [],
        };

    public static bool IsTransitionAllowed(string from, string to) =>
        Transitions.TryGetValue(from, out var allowed) && allowed.Contains(to, StringComparer.Ordinal);

    public static void AssertTransition(string from, string to)
    {
        if (IsTransitionAllowed(from, to))
        {
            return;
        }

        var allowedList = Transitions.TryGetValue(from, out var allowed)
            ? string.Join(", ", allowed)
            : "none";

        throw new InvalidOperationException(
            $"Invalid status transition: {from} → {to}. Allowed from {from}: [{allowedList}]");
    }
}
