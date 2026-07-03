using Lotris.Application.Tickets;

namespace Lotris.Application.Tickets;

public interface ITicketRepository
{
    Task CreateAsync(TicketCreateModel ticket, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<TicketEntity> Rows, int Total)> ListAsync(
        TicketListFilters filters,
        CancellationToken cancellationToken = default);

    Task<TicketEntity?> GetByIdAsync(Guid tenantId, Guid ticketId, CancellationToken cancellationToken = default);

    Task UpdateStatusAsync(
        Guid tenantId,
        Guid ticketId,
        TicketStatusUpdate update,
        CancellationToken cancellationToken = default);

    Task ClaimAsync(
        Guid tenantId,
        Guid ticketId,
        Guid assigneeId,
        DateTime assignedAt,
        DateTime resolutionDeadline,
        CancellationToken cancellationToken = default);

    Task<int> CountOpenTicketsForAssigneeAsync(
        Guid tenantId,
        Guid assigneeId,
        CancellationToken cancellationToken = default);

    Task AutoAssignAsync(
        Guid tenantId,
        Guid ticketId,
        Guid assigneeId,
        DateTime assignedAt,
        DateTime resolutionDeadline,
        CancellationToken cancellationToken = default);

    Task MarkPickupSlaBreachedAsync(Guid tenantId, Guid ticketId, CancellationToken cancellationToken = default);

    Task MarkResolutionSlaBreachedAndEscalateAsync(
        Guid tenantId,
        Guid ticketId,
        string previousStatus,
        CancellationToken cancellationToken = default);

    Task<Guid?> GetUserTeamIdAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Guid>> GetGrantedTeamIdsAsync(
        Guid tenantId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Guid>> GetActiveEngineerIdsAsync(
        Guid tenantId,
        Guid teamId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyDictionary<Guid, int>> GetEngineerWorkloadsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);

    Task<Guid> AddCommentAsync(
        Guid tenantId,
        Guid ticketId,
        Guid authorId,
        string body,
        bool isInternal,
        DateTime createdAt,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TicketCommentEntity>> GetCommentsAsync(
        Guid tenantId,
        Guid ticketId,
        bool excludeInternal,
        CancellationToken cancellationToken = default);

    Task<Guid> AddAttachmentAsync(
        Guid tenantId,
        Guid ticketId,
        Guid uploadedBy,
        string storageKey,
        string originalName,
        string mimeType,
        long sizeBytes,
        DateTime createdAt,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TicketHistoryEntity>> GetHistoryAsync(
        Guid tenantId,
        Guid ticketId,
        CancellationToken cancellationToken = default);

    Task UpdateSlaWarningLevelAsync(
        Guid tenantId,
        Guid ticketId,
        string warningLevel,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SlaWarningTicketEntity>> ListSlaWarningsAsync(
        Guid tenantId,
        Guid? engineerId,
        CancellationToken cancellationToken = default);

    Task<bool> ReassignAssigneeAsync(
        Guid tenantId,
        Guid ticketId,
        Guid toEngineerId,
        DateTime now,
        CancellationToken cancellationToken = default);
}
