namespace Lotris.Application.Kpi;

public interface IKpiRepository
{
    Task<IReadOnlyList<KpiDefinitionEntity>> ListDefinitionsAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task<KpiDefinitionEntity?> GetDefinitionAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default);

    Task CreateDefinitionAsync(KpiDefinitionEntity definition, CancellationToken cancellationToken = default);

    Task UpdateDefinitionAsync(Guid id, IReadOnlyDictionary<string, object?> updates, CancellationToken cancellationToken = default);

    Task ArchiveDefinitionAsync(Guid id, DateTime updatedAt, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<KpiTeamTargetEntity>> GetTeamTargetsAsync(Guid tenantId, Guid kpiDefinitionId, CancellationToken cancellationToken = default);

    Task UpsertTeamTargetAsync(KpiTeamTargetEntity target, CancellationToken cancellationToken = default);

    Task DeleteTeamTargetAsync(Guid kpiDefinitionId, Guid teamId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<KpiAssignmentEntity>> ListAssignmentsAsync(
        Guid tenantId,
        Guid? engineerId,
        string? periodKey,
        CancellationToken cancellationToken = default);

    Task CreateAssignmentAsync(KpiAssignmentEntity assignment, CancellationToken cancellationToken = default);

    Task<KpiAssignmentEntity?> GetAssignmentAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<KpiAgreementEntity>> ListAgreementsAsync(
        Guid tenantId,
        Guid? engineerId,
        string? periodKey,
        CancellationToken cancellationToken = default);

    Task<KpiAgreementEntity?> GetAgreementAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default);

    Task<KpiAgreementEntity?> FindAgreementByEngineerPeriodAsync(
        Guid tenantId,
        Guid engineerId,
        string periodKey,
        CancellationToken cancellationToken = default);

    Task CreateAgreementAsync(KpiAgreementEntity agreement, CancellationToken cancellationToken = default);

    Task UpdateAgreementAsync(Guid id, IReadOnlyDictionary<string, object?> updates, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<KpiAgreementAreaEntity>> GetAgreementAreasAsync(Guid agreementId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<KpiAgreementMetricEntity>> GetAreaMetricsAsync(Guid areaId, CancellationToken cancellationToken = default);

    Task DeleteAgreementAreasAsync(Guid agreementId, CancellationToken cancellationToken = default);

    Task CreateAgreementAreaAsync(KpiAgreementAreaEntity area, CancellationToken cancellationToken = default);

    Task CreateAgreementMetricAsync(KpiAgreementMetricEntity metric, CancellationToken cancellationToken = default);

    Task<KpiAgreementAreaEntity?> GetFirstAgreementAreaAsync(Guid agreementId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<KpiActualEntity>> ListActualsAsync(
        Guid tenantId,
        Guid? engineerId,
        Guid? metricId,
        CancellationToken cancellationToken = default);

    Task CreateActualAsync(KpiActualEntity actual, CancellationToken cancellationToken = default);

    Task<KpiActualEntity?> GetActualAsync(Guid id, CancellationToken cancellationToken = default);

    Task<decimal> SumActualsForMetricAsync(Guid metricId, CancellationToken cancellationToken = default);

    Task UpdateMetricActualScoreAsync(Guid metricId, decimal actualScore, CancellationToken cancellationToken = default);

    Task<KpiResultEntity?> GetResultByAgreementAsync(Guid agreementId, CancellationToken cancellationToken = default);

    Task UpsertResultAsync(KpiResultEntity result, CancellationToken cancellationToken = default);

    Task<KpiAgreementEntity?> FindActiveAgreementForEngineerAsync(
        Guid tenantId,
        Guid engineerId,
        CancellationToken cancellationToken = default);

    Task<KpiAgreementMetricEntity?> FindActiveMetricForDefinitionAsync(
        Guid agreementId,
        Guid kpiDefinitionId,
        CancellationToken cancellationToken = default);
}

public interface IKpiImportPendingStore
{
    void Set(Guid agreementId, IReadOnlyList<KpiPendingImportRow> rows);

    IReadOnlyList<KpiPendingImportRow>? Get(Guid agreementId);

    void Remove(Guid agreementId);
}
