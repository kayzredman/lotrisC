namespace Lotris.Contracts.Kpi;

public record CreateKpiDefinitionRequest(
    string Name,
    string? Description,
    string MetricType,
    string Direction,
    string Scope,
    decimal DefaultTarget,
    decimal Weight);

public record UpdateKpiDefinitionRequest(
    string? Name,
    string? Description,
    string? MetricType,
    string? Direction,
    string? Scope,
    decimal? DefaultTarget,
    decimal? Weight,
    string? Status);

public record SetTeamTargetRequest(Guid TeamId, decimal TargetValue);

public record CreateKpiAssignmentRequest(
    Guid EngineerId,
    Guid KpiDefinitionId,
    string PeriodKey,
    string MeasurementPeriod,
    decimal? TargetOverride);

public record CreateKpiAgreementRequest(Guid EngineerId, string PeriodKey);

public record KpiMetricRowRequest(
    Guid? KpiDefinitionId,
    string Description,
    string MeasurementPeriod,
    decimal Weight,
    decimal TargetScore,
    int? SortOrder);

public record KpiAreaRequest(
    string Name,
    decimal Weight,
    int? SortOrder,
    IReadOnlyList<KpiMetricRowRequest> Metrics);

public record UpsertAgreementAreasRequest(IReadOnlyList<KpiAreaRequest> Areas);

public record ImportColumnMappingRequest(
    string DescriptionColumn,
    string WeightColumn,
    string TargetScoreColumn,
    string? MeasurementPeriodColumn,
    string? KpiDefinitionIdColumn);

public record CreateActualRequest(
    Guid MetricId,
    Guid? KpiDefinitionId,
    decimal Value,
    string? Note,
    DateTime? RecordedAt);

public record KpiDefinitionDto(
    Guid Id,
    Guid TenantId,
    string Name,
    string? Description,
    string MetricType,
    string Direction,
    string Scope,
    decimal DefaultTarget,
    decimal Weight,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record KpiTeamTargetDto(
    Guid Id,
    Guid TenantId,
    Guid KpiDefinitionId,
    Guid TeamId,
    decimal TargetValue);

public record KpiAssignmentDto(
    Guid Id,
    Guid TenantId,
    Guid EngineerId,
    Guid KpiDefinitionId,
    string PeriodKey,
    string MeasurementPeriod,
    decimal? TargetOverride,
    Guid AssignedBy,
    DateTime CreatedAt);

public record KpiAgreementDto(
    Guid Id,
    Guid TenantId,
    Guid EngineerId,
    Guid LeadId,
    string PeriodKey,
    string Status,
    DateTime? SubmittedAt,
    DateTime? AcceptedAt,
    DateTime? ClosedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record KpiAgreementMetricDto(
    Guid Id,
    Guid TenantId,
    Guid AreaId,
    Guid? KpiDefinitionId,
    string Description,
    string MeasurementPeriod,
    decimal Weight,
    decimal TargetScore,
    decimal? ActualScore,
    int SortOrder);

public record KpiAgreementAreaDto(
    Guid Id,
    Guid TenantId,
    Guid AgreementId,
    string Name,
    decimal Weight,
    int SortOrder,
    IReadOnlyList<KpiAgreementMetricDto> Metrics);

public record KpiAgreementDetailDto(
    Guid Id,
    Guid TenantId,
    Guid EngineerId,
    Guid LeadId,
    string PeriodKey,
    string Status,
    DateTime? SubmittedAt,
    DateTime? AcceptedAt,
    DateTime? ClosedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<KpiAgreementAreaDto> Areas);

public record KpiActualDto(
    Guid Id,
    Guid TenantId,
    Guid EngineerId,
    Guid MetricId,
    Guid? KpiDefinitionId,
    decimal Value,
    string Source,
    Guid? SourceRefId,
    string? Note,
    DateTime RecordedAt);

public record KpiAreaScoreDto(Guid AreaId, string AreaName, decimal Score, decimal Weight);

public record KpiResultDto(
    Guid Id,
    Guid TenantId,
    Guid EngineerId,
    Guid AgreementId,
    string PeriodKey,
    string? AreaScoresJson,
    decimal OverallScore,
    DateTime ComputedAt);

public record KpiUploadPreviewResponse(
    IReadOnlyList<string> Headers,
    IReadOnlyList<Dictionary<string, string>> SampleRows,
    int TotalRows);

public record KpiImportResultResponse(int Imported);
