namespace Lotris.Contracts.Tickets;

public record CreateTicketRequest(
    string Title,
    string Description,
    int Priority = TicketPriorityDefault.High,
    Guid? TeamId = null,
    string Source = "INTERNAL",
    string? RequesterEmail = null,
    string? RequesterName = null,
    Guid? RelatedTicketId = null);

public static class TicketPriorityDefault
{
    public const int High = 2;
}

public static class TicketSource
{
    public static readonly HashSet<string> Allowed = new(StringComparer.Ordinal)
    {
        "INTERNAL", "EMAIL", "SELF_SERVICE", "API",
    };
}
