namespace Lotris.Contracts.ProblemManagement;

public record ProblemListItemDto(
    Guid Id,
    string ProblemRef,
    string Title,
    string Status,
    int Priority,
    int RecurrenceCount,
    string? RcaStatus,
    Guid? RcaId,
    string? RcaRef,
    int LinkedTicketCount,
    Guid ProcessOwnerId,
    Guid TechnicalOwnerId,
    string? ProcessOwnerName,
    string? TechnicalOwnerName,
    DateTime? ReviewDueAt,
    DateTime CreatedAt);

public record RcaDetailDto(
    Guid Id,
    string RcaRef,
    Guid ProblemId,
    string ProblemRef,
    string ProblemTitle,
    string Status,
    string? IncidentSummary,
    string? BusinessImpact,
    string? DetectionMethod,
    string? ImmediateCause,
    string? RootCauseStatement,
    string? ContributingFactors,
    string? ResolutionSummary,
    string? LessonsLearned,
    Guid? CategoryId,
    string? CategoryName,
    Guid ProcessOwnerId,
    Guid TechnicalOwnerId,
    Guid? DelegateId,
    string? ProcessOwnerName,
    string? TechnicalOwnerName,
    string? DelegateName,
    DateTime? ReviewDueAt,
    DateTime? PublishedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<RcaTicketLinkDto> LinkedTickets,
    IReadOnlyList<RcaActionDto> Actions,
    IReadOnlyList<RcaApprovalDto> Approvals);

public record RcaApprovalDto(
    string ApproverRole,
    Guid ApproverId,
    string? ApproverName,
    string Decision,
    string? Comments,
    DateTime? DecidedAt);

public record ApproveRcaRequest(string? Comments);

public record RcaTicketLinkDto(
    Guid TicketId,
    string? TicketRef,
    string LinkType,
    string? TicketTitle,
    int? TicketPriority);

public record RcaActionDto(
    Guid Id,
    string ActionType,
    string Description,
    Guid OwnerId,
    string? OwnerName,
    DateTime? DueAt,
    string Status,
    DateTime? VerifiedAt);

public record UpdateRcaRequest(
    string? IncidentSummary,
    string? BusinessImpact,
    string? DetectionMethod,
    string? ImmediateCause,
    string? RootCauseStatement,
    string? ContributingFactors,
    string? ResolutionSummary,
    string? LessonsLearned,
    Guid? CategoryId);

public record CreateProblemRequest(
    string Title,
    Guid? TicketId,
    Guid? TechnicalOwnerId,
    Guid? ProcessOwnerId);

public record AssignRcaDelegateRequest(Guid DelegateId);

public record LinkTicketRequest(Guid TicketId, string LinkType = "RELATED");

public record RcaActionCreateRequest(
    string ActionType,
    string Description,
    Guid OwnerId,
    DateTime? DueAt);

public record RcaTriggerRulesDto(
    bool AutoP1,
    bool AutoP2,
    bool AutoP2SlaBreach,
    bool AutoSecurity,
    int RecurrenceThreshold,
    int RecurrenceWindowDays,
    int RcaCompletionDays);

public record UpdateRcaTriggerRulesRequest(
    bool AutoP1,
    bool AutoP2,
    bool AutoP2SlaBreach,
    bool AutoSecurity,
    int RecurrenceThreshold,
    int RecurrenceWindowDays,
    int RcaCompletionDays);

public record KnownErrorDto(
    Guid Id,
    string Title,
    string ErrorDescription,
    string? Workaround,
    string? PermanentFix,
    Guid RcaId,
    string? RcaRef,
    DateTime PublishedAt);

public record TicketRcaSummaryDto(
    bool RcaRequired,
    Guid? ProblemId,
    string? ProblemRef,
    Guid? RcaId,
    string? RcaRef,
    string? RcaStatus,
    int OverdueCapaCount,
    bool CanEdit,
    bool CanCreateOrLink);

public record RcaDashboardStatsDto(int OpenRcas, int OverdueCapa, int AwaitingReview);
