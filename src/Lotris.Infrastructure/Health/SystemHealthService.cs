using System.Diagnostics;
using Dapper;
using Hangfire;
using Hangfire.Storage;
using Lotris.Application.AuditLogs;
using Lotris.Application.Health;
using Lotris.Application.Intelligence;
using Lotris.Contracts;
using Lotris.Contracts.Health;
using Lotris.Infrastructure.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Lotris.Infrastructure.Health;

public sealed class SystemHealthService : ISystemHealthService
{
    private static TimeSpan _prevCpuTime = TimeSpan.Zero;
    private static DateTime _prevCpuSampleAt = DateTime.UtcNow;

    private static readonly HashSet<string> RestartAllowList = new(StringComparer.OrdinalIgnoreCase)
    {
        "lotris-api",
        "nestjs-api",
        "nextjs-web",
        "hangfire-workers",
        "bullmq-workers",
        "mssql-db",
        "redis",
    };

    private readonly ISqlConnectionFactory _connections;
    private readonly IConnectionMultiplexer _redis;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAuditLogRepository _auditLogs;
    private readonly IConfiguration _configuration;
    private readonly IntelligenceOptions _intelligenceOptions;
    private readonly IHostApplicationLifetime _lifetime;
    private readonly ILogger<SystemHealthService> _logger;

    public SystemHealthService(
        ISqlConnectionFactory connections,
        IConnectionMultiplexer redis,
        IHttpClientFactory httpClientFactory,
        IAuditLogRepository auditLogs,
        IConfiguration configuration,
        IOptions<IntelligenceOptions> intelligenceOptions,
        IHostApplicationLifetime lifetime,
        ILogger<SystemHealthService> logger)
    {
        _connections = connections;
        _redis = redis;
        _httpClientFactory = httpClientFactory;
        _auditLogs = auditLogs;
        _configuration = configuration;
        _intelligenceOptions = intelligenceOptions.Value;
        _lifetime = lifetime;
        _logger = logger;
    }

    public async Task<HealthSnapshotDto> GetSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var api = CheckApiSelf();
        var web = await CheckWebAsync(cancellationToken);
        var mssql = await CheckMssqlAsync(cancellationToken);
        var redis = await CheckRedisAsync(cancellationToken);
        var workers = CheckHangfireWorkers();
        var queues = GetQueueDepths();

        var services = new List<ServiceHealthEntryDto> { api, web, mssql, redis, workers };
        if (_intelligenceOptions.IsQdrantEnabled)
        {
            services.Add(await CheckQdrantAsync(cancellationToken));
        }

        return new HealthSnapshotDto(services, queues, DateTime.UtcNow);
    }

    public async Task<IReadOnlyList<IncidentEntryDto>> GetIncidentsAsync(
        int limit,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT TOP (@Limit) id AS Id, action AS Action, entity_type AS EntityType,
                   entity_id AS EntityId, details AS Details, created_at AS CreatedAt
            FROM dbo.Audit_Logs
            WHERE action LIKE 'SERVICE_%'
            ORDER BY created_at DESC
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = (await connection.QueryAsync<IncidentRow>(new CommandDefinition(
            sql,
            new { Limit = Math.Clamp(limit, 1, 100) },
            cancellationToken: cancellationToken))).ToList();

        return rows.Select(r => new IncidentEntryDto(
            r.Id,
            r.Action.Replace("SERVICE_", "", StringComparison.Ordinal).Replace('_', ' '),
            r.EntityId ?? "unknown",
            string.Equals(r.EntityType, "RESOLVED", StringComparison.OrdinalIgnoreCase) ? r.CreatedAt : null,
            r.CreatedAt,
            r.Details)).ToList();
    }

    public async Task<RestartServiceResponse> RequestRestartAsync(
        string serviceName,
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        if (!RestartAllowList.Contains(serviceName))
        {
            return new RestartServiceResponse(false, null, "Unknown service name");
        }

        var db = _redis.GetDatabase();
        var cooldownKey = $"health:restart-cooldown:{serviceName.ToLowerInvariant()}";
        var ttl = await db.KeyTimeToLiveAsync(cooldownKey);
        if (ttl.HasValue && ttl.Value > TimeSpan.Zero)
        {
            return new RestartServiceResponse(false, (int)Math.Ceiling(ttl.Value.TotalSeconds), null);
        }

        await db.StringSetAsync(cooldownKey, "1", TimeSpan.FromSeconds(60));

        try
        {
            await _auditLogs.WriteAsync(new AuditLogWriteModel
            {
                TenantId = session.TenantId,
                UserId = session.UserId,
                Action = "SERVICE_RESTART_REQUESTED",
                EntityType = "Service",
                EntityId = serviceName,
                Details = $"{{\"serviceName\":\"{serviceName}\",\"requestedAt\":\"{DateTime.UtcNow:O}\"}}",
                CreatedAt = DateTime.UtcNow,
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write restart audit log for {ServiceName}", serviceName);
        }

        if (serviceName is "lotris-api" or "nestjs-api")
        {
            _logger.LogWarning("Restart requested for API by {UserId}. Scheduling graceful shutdown.", session.UserId);
            _ = Task.Run(async () =>
            {
                await Task.Delay(1500, CancellationToken.None);
                _lifetime.StopApplication();
            });
        }

        return new RestartServiceResponse(true, null, null);
    }

    private ServiceHealthEntryDto CheckApiSelf()
    {
        using var process = Process.GetCurrentProcess();
        var memUsedMb = (int)Math.Round(process.WorkingSet64 / 1024d / 1024d);
        return new ServiceHealthEntryDto(
            "lotris-api",
            "Lotris API",
            "api · ASP.NET Core",
            "UP",
            SampleCpuPercent(process),
            memUsedMb,
            2048,
            (long)Math.Round((DateTime.UtcNow - process.StartTime.ToUniversalTime()).TotalSeconds),
            0,
            DateTime.UtcNow);
    }

    private async Task<ServiceHealthEntryDto> CheckWebAsync(CancellationToken cancellationToken)
    {
        var webUrl = _configuration["App:WebUrl"]
            ?? _configuration["APP_BASE_URL"]
            ?? "http://localhost:3000";

        var sw = Stopwatch.StartNew();
        try
        {
            var client = _httpClientFactory.CreateClient("health-probes");
            using var response = await client.GetAsync(webUrl, cancellationToken);
            sw.Stop();
            var ms = sw.Elapsed.TotalMilliseconds;
            var status = response.IsSuccessStatusCode
                ? ms > 1000 ? "DEGRADED" : "UP"
                : "DEGRADED";

            return new ServiceHealthEntryDto(
                "nextjs-web",
                "Next.js Web",
                $"web · {webUrl}",
                status,
                0,
                0,
                1024,
                0,
                ms,
                DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Web health probe failed for {WebUrl}", webUrl);
            return DownService("nextjs-web", "Next.js Web", $"web · {webUrl}", 1024);
        }
    }

    private async Task<ServiceHealthEntryDto> CheckMssqlAsync(CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
            await connection.ExecuteScalarAsync<int>(new CommandDefinition(
                "SELECT 1",
                cancellationToken: cancellationToken));
            sw.Stop();
            var ms = sw.Elapsed.TotalMilliseconds;
            return new ServiceHealthEntryDto(
                "mssql-db",
                "MSSQL",
                "operational + analytics DB",
                ms > 200 ? "DEGRADED" : "UP",
                0,
                0,
                8192,
                0,
                ms,
                DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "MSSQL health check failed");
            return DownService("mssql-db", "MSSQL", "operational + analytics DB", 8192);
        }
    }

    private async Task<ServiceHealthEntryDto> CheckRedisAsync(CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var db = _redis.GetDatabase();
            await db.PingAsync();
            sw.Stop();
            var ms = sw.Elapsed.TotalMilliseconds;

            var memUsedMb = 0;
            try
            {
                var endpoints = _redis.GetEndPoints();
                if (endpoints.Length > 0)
                {
                    var info = await _redis.GetServer(endpoints[0]).InfoAsync("memory");
                    var used = info
                        .SelectMany(g => g)
                        .FirstOrDefault(i => i.Key == "used_memory");
                    if (used.Key is not null && long.TryParse(used.Value, out var bytes))
                    {
                        memUsedMb = (int)Math.Round(bytes / 1024d / 1024d);
                    }
                }
            }
            catch
            {
                // non-fatal
            }

            return new ServiceHealthEntryDto(
                "redis",
                "Redis",
                "cache + pub/sub",
                ms > 50 ? "DEGRADED" : "UP",
                0,
                memUsedMb,
                2048,
                0,
                ms,
                DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis health check failed");
            return DownService("redis", "Redis", "cache + pub/sub", 2048);
        }
    }

    private ServiceHealthEntryDto CheckHangfireWorkers()
    {
        try
        {
            var monitoring = JobStorage.Current.GetMonitoringApi();
            var servers = monitoring.Servers();
            var stats = monitoring.GetStatistics();
            var status = servers.Count > 0 ? "UP" : stats.Processing > 0 ? "UP" : "DEGRADED";

            return new ServiceHealthEntryDto(
                "hangfire-workers",
                "Hangfire Workers",
                $"jobs · {servers.Count} server(s)",
                status,
                0,
                0,
                512,
                0,
                0,
                DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Hangfire health check failed");
            return DownService("hangfire-workers", "Hangfire Workers", "jobs · no port", 512);
        }
    }

    private async Task<ServiceHealthEntryDto> CheckQdrantAsync(CancellationToken cancellationToken)
    {
        var baseUrl = _intelligenceOptions.QdrantUrl!.TrimEnd('/');
        var collection = _intelligenceOptions.CollectionName;
        var sw = Stopwatch.StartNew();
        try
        {
            var client = _httpClientFactory.CreateClient("qdrant");
            using var response = await client.GetAsync($"{baseUrl}/healthz", cancellationToken);
            sw.Stop();
            var ms = sw.Elapsed.TotalMilliseconds;
            var status = response.IsSuccessStatusCode
                ? ms > 500 ? "DEGRADED" : "UP"
                : "DEGRADED";

            return new ServiceHealthEntryDto(
                "qdrant",
                "Qdrant",
                $"vector · {collection}",
                status,
                0,
                0,
                4096,
                0,
                ms,
                DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogDebug(ex, "Qdrant health probe failed for {QdrantUrl}", baseUrl);
            return new ServiceHealthEntryDto(
                "qdrant",
                "Qdrant",
                "vector · semantic search fallback active",
                "DEGRADED",
                0,
                0,
                4096,
                0,
                -1,
                DateTime.UtcNow);
        }
    }

    private static IReadOnlyList<QueueDepthEntryDto> GetQueueDepths()
    {
        try
        {
            var monitoring = JobStorage.Current.GetMonitoringApi();
            var stats = monitoring.GetStatistics();
            var rows = new List<QueueDepthEntryDto>();

            foreach (var queue in monitoring.Queues())
            {
                rows.Add(new QueueDepthEntryDto(
                    queue.Name,
                    "Hangfire job queue",
                    (int)Math.Min(queue.Length, int.MaxValue),
                    0,
                    0,
                    0,
                    0));
            }

            rows.Add(new QueueDepthEntryDto(
                "background",
                "Enqueued + processing jobs",
                (int)Math.Min(stats.Enqueued, int.MaxValue),
                (int)Math.Min(stats.Processing, int.MaxValue),
                (int)Math.Min(stats.Failed, int.MaxValue),
                (int)Math.Min(stats.Scheduled, int.MaxValue),
                0));

            rows.Add(new QueueDepthEntryDto(
                "recurring",
                "Analytics ETL · KPI · SLA scans",
                (int)Math.Min(stats.Recurring, int.MaxValue),
                0,
                0,
                0,
                0));

            return rows;
        }
        catch
        {
            return
            [
                new QueueDepthEntryDto("default", "Hangfire jobs", 0, 0, 0, 0, 0),
            ];
        }
    }

    private static ServiceHealthEntryDto DownService(string id, string name, string sub, int memTotalMb) =>
        new(id, name, sub, "DOWN", 0, 0, memTotalMb, 0, -1, DateTime.UtcNow);

    private static double SampleCpuPercent(Process process)
    {
        var now = DateTime.UtcNow;
        var cpuTime = process.TotalProcessorTime;
        var elapsedMs = (now - _prevCpuSampleAt).TotalMilliseconds;
        var cpuDeltaMs = (cpuTime - _prevCpuTime).TotalMilliseconds;
        _prevCpuTime = cpuTime;
        _prevCpuSampleAt = now;

        if (elapsedMs <= 0)
        {
            return 0;
        }

        var pct = cpuDeltaMs / (Environment.ProcessorCount * elapsedMs) * 100d;
        return Math.Clamp(Math.Round(pct), 0, 100);
    }

    private sealed class IncidentRow
    {
        public long Id { get; init; }
        public string Action { get; init; } = "";
        public string? EntityType { get; init; }
        public string? EntityId { get; init; }
        public string? Details { get; init; }
        public DateTime CreatedAt { get; init; }
    }
}
