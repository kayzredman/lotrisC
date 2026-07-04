namespace Lotris.Application.ProblemManagement;

public sealed class ProblemEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public string ProblemRef { get; init; } = "";
    public string Title { get; init; } = "";
    public string Status { get; init; } = "";
    public int Priority { get; init; }
    public int RecurrenceCount { get; init; }
    public Guid? CategoryId { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class RcaEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public string RcaRef { get; init; } = "";
    public Guid ProblemId { get; init; }
    public string Status { get; init; } = "";
    public string? IncidentSummary { get; init; }
    public string? BusinessImpact { get; init; }
    public string? DetectionMethod { get; init; }
    public string? ImmediateCause { get; init; }
    public string? RootCauseStatement { get; init; }
    public string? ContributingFactors { get; init; }
    public string? ResolutionSummary { get; init; }
    public string? LessonsLearned { get; init; }
    public Guid? CategoryId { get; init; }
    public Guid ProcessOwnerId { get; init; }
    public Guid TechnicalOwnerId { get; init; }
    public Guid? DelegateId { get; init; }
    public DateTime? ReviewDueAt { get; init; }
    public DateTime? PublishedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class RcaListRow
{
    public ProblemEntity Problem { get; init; } = null!;
    public RcaEntity? Rca { get; init; }
    public int LinkedTicketCount { get; init; }
    public string? ProcessOwnerName { get; init; }
    public string? TechnicalOwnerName { get; init; }
}

public sealed class RcaTriggerRulesEntity
{
    public Guid TenantId { get; init; }
    public bool AutoP1 { get; init; } = true;
    public bool AutoP2 { get; init; }
    public bool AutoP2SlaBreach { get; init; }
    public bool AutoSecurity { get; init; }
    public int RecurrenceThreshold { get; init; } = 3;
    public int RecurrenceWindowDays { get; init; } = 90;
    public int RcaCompletionDays { get; init; } = 5;
}

public sealed class RcaCreateBundle
{
    public Guid ProblemId { get; init; }
    public string ProblemRef { get; init; } = "";
    public Guid RcaId { get; init; }
    public string RcaRef { get; init; } = "";
}
