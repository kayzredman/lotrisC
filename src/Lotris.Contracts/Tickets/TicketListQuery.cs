namespace Lotris.Contracts.Tickets;

public record TicketListQuery(
    string? Status = null,
    int? Priority = null,
    Guid? TeamId = null,
    Guid? AssigneeId = null,
    string? Search = null,
    string? Source = null,
    string? SlaWarning = null,
    int Page = 1,
    int Limit = 25);
