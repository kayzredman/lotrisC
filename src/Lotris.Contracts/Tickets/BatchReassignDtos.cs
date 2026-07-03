namespace Lotris.Contracts.Tickets;

public record BatchReassignItem(Guid TicketId, Guid ToEngineerId);

public record BatchReassignRequest(IReadOnlyList<BatchReassignItem> Reassignments);

public record BatchReassignResultItem(Guid TicketId, bool Ok);

public record BatchReassignResponse(
    IReadOnlyList<BatchReassignResultItem> Results,
    int Reassigned);
