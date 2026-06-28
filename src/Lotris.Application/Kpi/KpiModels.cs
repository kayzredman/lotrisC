namespace Lotris.Application.Kpi;

public sealed class KpiDefinitionEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string MetricType { get; init; } = string.Empty;
    public string Direction { get; init; } = string.Empty;
    public string Scope { get; init; } = string.Empty;
    public decimal DefaultTarget { get; init; }
    public decimal Weight { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class KpiTeamTargetEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid KpiDefinitionId { get; init; }
    public Guid TeamId { get; init; }
    public decimal TargetValue { get; init; }
}

public sealed class KpiAssignmentEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid EngineerId { get; init; }
    public Guid KpiDefinitionId { get; init; }
    public string PeriodKey { get; init; } = string.Empty;
    public string MeasurementPeriod { get; init; } = string.Empty;
    public decimal? TargetOverride { get; init; }
    public Guid AssignedBy { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class KpiAgreementEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid EngineerId { get; init; }
    public Guid LeadId { get; init; }
    public string PeriodKey { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public DateTime? SubmittedAt { get; init; }
    public DateTime? AcceptedAt { get; init; }
    public DateTime? ClosedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class KpiAgreementAreaEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid AgreementId { get; init; }
    public string Name { get; init; } = string.Empty;
    public decimal Weight { get; init; }
    public int SortOrder { get; init; }
}

public sealed class KpiAgreementMetricEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid AreaId { get; init; }
    public Guid? KpiDefinitionId { get; init; }
    public string Description { get; init; } = string.Empty;
    public string MeasurementPeriod { get; init; } = string.Empty;
    public decimal Weight { get; init; }
    public decimal TargetScore { get; init; }
    public decimal? ActualScore { get; init; }
    public int SortOrder { get; init; }
}

public sealed class KpiActualEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid EngineerId { get; init; }
    public Guid MetricId { get; init; }
    public Guid? KpiDefinitionId { get; init; }
    public decimal Value { get; init; }
    public string Source { get; init; } = string.Empty;
    public Guid? SourceRefId { get; init; }
    public string? Note { get; init; }
    public DateTime RecordedAt { get; init; }
}

public sealed class KpiResultEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid EngineerId { get; init; }
    public Guid AgreementId { get; init; }
    public string PeriodKey { get; init; } = string.Empty;
    public string? AreaScoresJson { get; init; }
    public decimal OverallScore { get; init; }
    public DateTime ComputedAt { get; init; }
}

public sealed class KpiPendingImportRow
{
    public string Description { get; init; } = string.Empty;
    public decimal Weight { get; init; }
    public decimal TargetScore { get; init; }
    public string MeasurementPeriod { get; init; } = "MONTHLY";
    public Guid? KpiDefinitionId { get; init; }
}

public sealed class UpsertAreaModel
{
    public required string Name { get; init; }
    public decimal Weight { get; init; }
    public int SortOrder { get; init; }
    public required IReadOnlyList<UpsertMetricModel> Metrics { get; init; }
}

public sealed class UpsertMetricModel
{
    public Guid? KpiDefinitionId { get; init; }
    public required string Description { get; init; }
    public required string MeasurementPeriod { get; init; }
    public decimal Weight { get; init; }
    public decimal TargetScore { get; init; }
    public int SortOrder { get; init; }
}
