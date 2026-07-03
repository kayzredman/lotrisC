using System.Diagnostics;
using Dapper;
using Lotris.Application.Analytics;
using Lotris.Infrastructure.Data;

namespace Lotris.Workers.Jobs;

public sealed class IncrementalRollupJob : IIncrementalRollupJob
{
    private readonly IAnalyticsEtlService _etl;
    private readonly IAnalyticsJobStatusStore _status;

    public IncrementalRollupJob(IAnalyticsEtlService etl, IAnalyticsJobStatusStore status)
    {
        _etl = etl;
        _status = status;
    }

    public Task ExecuteAllTenantsAsync(CancellationToken cancellationToken = default) =>
        AnalyticsJobExecution.ExecuteTrackedAsync(
            AnalyticsJobKeys.IncrementalRollup,
            _status,
            () => _etl.RunIncrementalRollupAllTenantsAsync(cancellationToken),
            cancellationToken);
}

public sealed class DailyBatchJob : IDailyBatchJob
{
    private readonly IAnalyticsEtlService _etl;
    private readonly IAnalyticsJobStatusStore _status;

    public DailyBatchJob(IAnalyticsEtlService etl, IAnalyticsJobStatusStore status)
    {
        _etl = etl;
        _status = status;
    }

    public Task ExecuteAllTenantsAsync(CancellationToken cancellationToken = default) =>
        AnalyticsJobExecution.ExecuteTrackedAsync(
            AnalyticsJobKeys.DailyBatch,
            _status,
            () => _etl.RunDailyBatchAllTenantsAsync(cancellationToken),
            cancellationToken);
}

public sealed class KpiTrendScanJob : IKpiTrendScanJob
{
    private readonly IKpiTrendAnalyser _analyser;
    private readonly ISqlConnectionFactory _connections;
    private readonly IAnalyticsJobStatusStore _status;

    public KpiTrendScanJob(
        IKpiTrendAnalyser analyser,
        ISqlConnectionFactory connections,
        IAnalyticsJobStatusStore status)
    {
        _analyser = analyser;
        _connections = connections;
        _status = status;
    }

    public Task ExecuteAllTenantsAsync(CancellationToken cancellationToken = default) =>
        AnalyticsJobExecution.ExecuteTrackedAsync(
            AnalyticsJobKeys.KpiTrendScan,
            _status,
            async () =>
            {
                foreach (var tenantId in await GetTenantIdsAsync(cancellationToken))
                {
                    await _analyser.ScanAllEngineersAsync(tenantId, cancellationToken);
                }
            },
            cancellationToken);

    private async Task<IReadOnlyList<Guid>> GetTenantIdsAsync(CancellationToken cancellationToken)
    {
        const string sql = "SELECT DISTINCT tenant_id FROM dbo.Tickets";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<string>(new CommandDefinition(sql, cancellationToken: cancellationToken));
        return rows.Select(Guid.Parse).ToList();
    }
}

public sealed class SlaPredictorScanJob : ISlaPredictorScanJob
{
    private readonly ISlaPredictorService _predictor;
    private readonly ISqlConnectionFactory _connections;
    private readonly IAnalyticsJobStatusStore _status;

    public SlaPredictorScanJob(
        ISlaPredictorService predictor,
        ISqlConnectionFactory connections,
        IAnalyticsJobStatusStore status)
    {
        _predictor = predictor;
        _connections = connections;
        _status = status;
    }

    public Task ExecuteAllTenantsAsync(CancellationToken cancellationToken = default) =>
        AnalyticsJobExecution.ExecuteTrackedAsync(
            AnalyticsJobKeys.SlaPredictorScan,
            _status,
            async () =>
            {
                foreach (var tenantId in await GetTenantIdsAsync(cancellationToken))
                {
                    await _predictor.ScanAndUpdateAsync(tenantId, cancellationToken);
                }
            },
            cancellationToken);

    private async Task<IReadOnlyList<Guid>> GetTenantIdsAsync(CancellationToken cancellationToken)
    {
        const string sql = "SELECT DISTINCT tenant_id FROM dbo.Tickets";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<string>(new CommandDefinition(sql, cancellationToken: cancellationToken));
        return rows.Select(Guid.Parse).ToList();
    }
}

internal static class AnalyticsJobExecution
{
    public static async Task ExecuteTrackedAsync(
        string jobKey,
        IAnalyticsJobStatusStore status,
        Func<Task> action,
        CancellationToken cancellationToken)
    {
        await status.RecordStartAsync(jobKey, cancellationToken);
        var sw = Stopwatch.StartNew();
        try
        {
            await action();
            sw.Stop();
            await status.RecordSuccessAsync(jobKey, (int)sw.ElapsedMilliseconds, cancellationToken);
        }
        catch (Exception ex)
        {
            sw.Stop();
            await status.RecordFailureAsync(jobKey, ex.Message, (int)sw.ElapsedMilliseconds, cancellationToken);
            throw;
        }
    }
}
