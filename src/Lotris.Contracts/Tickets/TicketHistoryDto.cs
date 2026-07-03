namespace Lotris.Contracts.Tickets;

public sealed record TicketHistoryDto(
    Guid? ActorId,
    string EventType,
    string? FromValue,
    string? ToValue,
    string? Metadata,
    DateTime CreatedAt);
