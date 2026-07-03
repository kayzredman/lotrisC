using System.Text.Json;
using Lotris.Application.Analytics;
using Lotris.Infrastructure.Analytics.Entities;
using Lotris.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Lotris.Infrastructure.Analytics;

public sealed class EfAnalyticsJobConfigRepository : IAnalyticsJobConfigRepository
{
    private readonly LotrisDbContext _db;
    private readonly ILogger<EfAnalyticsJobConfigRepository> _logger;

    public EfAnalyticsJobConfigRepository(LotrisDbContext db, ILogger<EfAnalyticsJobConfigRepository> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<AnalyticsJobConfigModel?> GetPlatformConfigAsync(CancellationToken cancellationToken = default)
    {
        var entity = await _db.AnalyticsJobConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.TenantId == null, cancellationToken);
        return entity is null ? null : ToModel(entity);
    }

    public async Task<AnalyticsJobConfigModel?> GetTenantConfigAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.AnalyticsJobConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.TenantId == tenantId, cancellationToken);
        return entity is null ? null : ToModel(entity);
    }

    public async Task<AnalyticsJobConfigModel> GetEffectiveConfigAsync(
        Guid? tenantId,
        CancellationToken cancellationToken = default)
    {
        var platform = await GetPlatformConfigAsync(cancellationToken);
        if (platform is null)
        {
            throw new InvalidOperationException("Platform analytics job config is missing.");
        }

        if (!tenantId.HasValue)
        {
            return platform;
        }

        var tenant = await GetTenantConfigAsync(tenantId.Value, cancellationToken);
        return tenant ?? platform;
    }

    public async Task SaveAsync(AnalyticsJobConfigModel config, CancellationToken cancellationToken = default)
    {
        var entity = await _db.AnalyticsJobConfigs
            .FirstOrDefaultAsync(c => c.Id == config.Id, cancellationToken);

        if (entity is null)
        {
            entity = new AnalyticsJobConfig { Id = config.Id };
            _db.AnalyticsJobConfigs.Add(entity);
        }

        entity.TenantId = config.TenantId;
        entity.IncrementalRollupEnabled = config.IncrementalRollupEnabled;
        entity.IncrementalRollupIntervalMinutes = config.IncrementalRollupIntervalMinutes;
        entity.DailyBatchEnabled = config.DailyBatchEnabled;
        entity.DailyBatchTimesUtcJson = config.DailyBatchTimesUtcJson;
        entity.KpiTrendScanEnabled = config.KpiTrendScanEnabled;
        entity.KpiTrendIntervalMinutes = config.KpiTrendIntervalMinutes;
        entity.SlaPredictorEnabled = config.SlaPredictorEnabled;
        entity.SlaPredictorIntervalMinutes = config.SlaPredictorIntervalMinutes;
        entity.DashboardCacheTtlSeconds = config.DashboardCacheTtlSeconds;
        entity.UpdatedAt = config.UpdatedAt;
        entity.UpdatedBy = config.UpdatedBy;

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task EnsurePlatformDefaultAsync(CancellationToken cancellationToken = default)
    {
        var exists = await _db.AnalyticsJobConfigs.AnyAsync(c => c.TenantId == null, cancellationToken);
        if (exists)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var defaultConfig = new AnalyticsJobConfig
        {
            Id = Guid.NewGuid(),
            TenantId = null,
            IncrementalRollupEnabled = true,
            IncrementalRollupIntervalMinutes = 5,
            DailyBatchEnabled = true,
            DailyBatchTimesUtcJson = "[\"08:00\",\"18:00\"]",
            KpiTrendScanEnabled = true,
            KpiTrendIntervalMinutes = 30,
            SlaPredictorEnabled = true,
            SlaPredictorIntervalMinutes = 5,
            DashboardCacheTtlSeconds = 30,
            UpdatedAt = now,
        };

        _db.AnalyticsJobConfigs.Add(defaultConfig);
        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Seeded default platform AnalyticsJobConfig {ConfigId}", defaultConfig.Id);
    }

    public static AnalyticsJobConfigModel ToModel(AnalyticsJobConfig entity) =>
        new(
            entity.Id,
            entity.TenantId,
            entity.IncrementalRollupEnabled,
            entity.IncrementalRollupIntervalMinutes,
            entity.DailyBatchEnabled,
            entity.DailyBatchTimesUtcJson,
            entity.KpiTrendScanEnabled,
            entity.KpiTrendIntervalMinutes,
            entity.SlaPredictorEnabled,
            entity.SlaPredictorIntervalMinutes,
            entity.DashboardCacheTtlSeconds,
            entity.UpdatedAt,
            entity.UpdatedBy);

    public static IReadOnlyList<string> ParseBatchTimes(string json) =>
        AnalyticsJobConfigJson.ParseBatchTimes(json);
}
