namespace Lotris.Application.Onboarding;

public interface IOnboardingRepository
{
    Task<(DateTime? CompletedAt, int TeamCount)> GetStatusAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task UpdateTenantOrgAsync(Guid tenantId, string name, string slug, CancellationToken cancellationToken = default);

    Task CompleteAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task DeleteDraftKpiDefinitionsAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task InsertKpiDefinitionAsync(
        Guid tenantId,
        string name,
        string description,
        string metricType,
        string direction,
        string scope,
        string defaultTarget,
        string weight,
        CancellationToken cancellationToken = default);
}
