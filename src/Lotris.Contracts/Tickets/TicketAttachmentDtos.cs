namespace Lotris.Contracts.Tickets;

public sealed record CreateAttachmentRequest(
    string StorageKey,
    string OriginalName,
    string MimeType,
    long SizeBytes);

public sealed record CreateAttachmentResponse(Guid Id);

public sealed record TicketAttachmentDto(
    Guid Id,
    Guid TicketId,
    Guid UploadedBy,
    string StorageKey,
    string OriginalName,
    string MimeType,
    long SizeBytes,
    DateTime CreatedAt);
