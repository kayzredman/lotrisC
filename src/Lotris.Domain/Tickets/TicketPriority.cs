namespace Lotris.Domain.Tickets;

public static class TicketPriority
{
    public const int Critical = 1;
    public const int High = 2;
    public const int Medium = 3;
    public const int Low = 4;

    public static readonly IReadOnlySet<int> All = new HashSet<int> { Critical, High, Medium, Low };
}
