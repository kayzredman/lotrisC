namespace Lotris.Application.ProblemManagement;

public interface IRcaRepository
{
    Task EnsureTriggerRulesAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<RcaTriggerRulesEntity> GetTriggerRulesAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task UpdateTriggerRulesAsync(Guid tenantId, RcaTriggerRulesEntity rules, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RcaListRow>> ListAsync(Guid tenantId, string? filter, CancellationToken cancellationToken = default);
    Task<RcaEntity?> GetRcaByIdAsync(Guid tenantId, Guid rcaId, CancellationToken cancellationToken = default);
    Task<ProblemEntity?> GetProblemByIdAsync(Guid tenantId, Guid problemId, CancellationToken cancellationToken = default);
    Task<RcaEntity?> GetRcaByTicketIdAsync(Guid tenantId, Guid ticketId, CancellationToken cancellationToken = default);

    Task<RcaCreateBundle> CreateProblemAndRcaAsync(
        Guid tenantId,
        string title,
        Guid processOwnerId,
        Guid technicalOwnerId,
        Guid? primaryTicketId,
        DateTime reviewDueAt,
        CancellationToken cancellationToken = default);

    Task UpdateRcaAsync(Guid tenantId, Guid rcaId, UpdateRcaPatch patch, CancellationToken cancellationToken = default);
    Task UpdateRcaStatusAsync(Guid tenantId, Guid rcaId, string status, DateTime updatedAt, DateTime? publishedAt, CancellationToken cancellationToken = default);
    Task AssignDelegateAsync(Guid tenantId, Guid rcaId, Guid? delegateId, DateTime updatedAt, CancellationToken cancellationToken = default);
    Task LinkTicketAsync(Guid tenantId, Guid problemId, Guid rcaId, Guid ticketId, string linkType, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RcaTicketLinkDto>> GetTicketLinksAsync(Guid tenantId, Guid rcaId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RcaActionDto>> GetActionsAsync(Guid tenantId, Guid rcaId, CancellationToken cancellationToken = default);
    Task<Guid> AddActionAsync(Guid tenantId, Guid rcaId, RcaActionCreateModel model, CancellationToken cancellationToken = default);
    Task<int> CountOverdueCapaAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<int> CountOverdueCapaForRcaAsync(Guid tenantId, Guid rcaId, CancellationToken cancellationToken = default);
    Task<int> CountOpenRcasAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task<Guid> PublishKnownErrorAsync(Guid tenantId, Guid rcaId, KnownErrorCreateModel model, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<KnownErrorRow>> ListKnownErrorsAsync(Guid tenantId, CancellationToken cancellationToken = default);
}

public sealed class UpdateRcaPatch
{
    public string? IncidentSummary { get; init; }
    public string? BusinessImpact { get; init; }
    public string? DetectionMethod { get; init; }
    public string? ImmediateCause { get; init; }
    public string? RootCauseStatement { get; init; }
    public string? ContributingFactors { get; init; }
    public string? ResolutionSummary { get; init; }
    public string? LessonsLearned { get; init; }
    public Guid? CategoryId { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class RcaActionCreateModel
{
    public string ActionType { get; init; } = "";
    public string Description { get; init; } = "";
    public Guid OwnerId { get; init; }
    public DateTime? DueAt { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class KnownErrorCreateModel
{
    public string Title { get; init; } = "";
    public string ErrorDescription { get; init; } = "";
    public string? Workaround { get; init; }
    public string? PermanentFix { get; init; }
    public DateTime PublishedAt { get; init; }
}

// Internal row types used by repository (mapped to contracts in service)
public sealed class RcaTicketLinkDto
{
    public Guid TicketId { get; init; }
    public string? TicketRef { get; init; }
    public string LinkType { get; init; } = "";
    public string? TicketTitle { get; init; }
    public int? TicketPriority { get; init; }
}

public sealed class RcaActionDto
{
    public Guid Id { get; init; }
    public string ActionType { get; init; } = "";
    public string Description { get; init; } = "";
    public Guid OwnerId { get; init; }
    public string? OwnerName { get; init; }
    public DateTime? DueAt { get; init; }
    public string Status { get; init; } = "";
    public DateTime? VerifiedAt { get; init; }
}

public sealed class KnownErrorRow
{
    public Guid Id { get; init; }
    public string Title { get; init; } = "";
    public string ErrorDescription { get; init; } = "";
    public string? Workaround { get; init; }
    public string? PermanentFix { get; init; }
    public Guid RcaId { get; init; }
    public string? RcaRef { get; init; }
    public DateTime PublishedAt { get; init; }
}
