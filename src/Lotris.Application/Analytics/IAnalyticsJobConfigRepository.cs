namespace Lotris.Application.Analytics;

public interface IAnalyticsJobConfigRepository
{
    Task<AnalyticsJobConfigModel?> GetPlatformConfigAsync(CancellationToken cancellationToken = default);

    Task<AnalyticsJobConfigModel?> GetTenantConfigAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task<AnalyticsJobConfigModel> GetEffectiveConfigAsync(Guid? tenantId, CancellationToken cancellationToken = default);

    Task SaveAsync(AnalyticsJobConfigModel config, CancellationToken cancellationToken = default);

    Task EnsurePlatformDefaultAsync(CancellationToken cancellationToken = default);
}
