namespace Lotris.Application.Analytics;

public interface IDashboardCacheService
{
    Task InvalidateAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);

    Task SetAsync<T>(string key, T value, int? ttlSeconds = null, CancellationToken cancellationToken = default);

    Task<int> GetCacheTtlSecondsAsync(CancellationToken cancellationToken = default);
}
