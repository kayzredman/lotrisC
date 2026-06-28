using System.Text.Json;
using Lotris.Application.Analytics;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Lotris.Infrastructure.Analytics;

public sealed class RedisDashboardCacheService : IDashboardCacheService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private readonly IConnectionMultiplexer _redis;
    private readonly IAnalyticsJobConfigRepository _config;
    private readonly ILogger<RedisDashboardCacheService> _logger;

    public RedisDashboardCacheService(
        IConnectionMultiplexer redis,
        IAnalyticsJobConfigRepository config,
        ILogger<RedisDashboardCacheService> logger)
    {
        _redis = redis;
        _config = config;
        _logger = logger;
    }

    public async Task InvalidateAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        try
        {
            var db = _redis.GetDatabase();
            var server = _redis.GetServer(_redis.GetEndPoints().First());
            var pattern = $"dash:{tenantId}:*";
            await foreach (var key in server.KeysAsync(pattern: pattern))
            {
                await db.KeyDeleteAsync(key);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis dashboard cache invalidate failed for tenant {TenantId}", tenantId);
        }
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            var raw = await _redis.GetDatabase().StringGetAsync(key);
            if (raw.IsNullOrEmpty)
            {
                return default;
            }

            return JsonSerializer.Deserialize<T>(raw.ToString(), JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis dashboard cache get failed for key {Key}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(
        string key,
        T value,
        int? ttlSeconds = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var ttl = ttlSeconds ?? await GetCacheTtlSecondsAsync(cancellationToken);
            var json = JsonSerializer.Serialize(value, JsonOptions);
            await _redis.GetDatabase().StringSetAsync(key, json, TimeSpan.FromSeconds(ttl));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis dashboard cache set failed for key {Key}", key);
        }
    }

    public async Task<int> GetCacheTtlSecondsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var config = await _config.GetPlatformConfigAsync(cancellationToken);
            return config?.DashboardCacheTtlSeconds ?? 30;
        }
        catch
        {
            return 30;
        }
    }
}
