namespace Lotris.Contracts.Tickets;

public record UpdateTicketStatusRequest(
    string Status,
    Guid? TeamId = null,
    Guid? AssigneeId = null);
