namespace Lotris.Contracts.Tickets;

public sealed record CreateCommentRequest(string Body, bool IsInternal = false);

public sealed record CreateCommentResponse(Guid Id);

public sealed record TicketCommentDto(
    Guid Id,
    Guid TicketId,
    Guid AuthorId,
    string Body,
    bool IsInternal,
    DateTime CreatedAt,
    DateTime UpdatedAt);
