using System.Net.Http.Json;
using Lotris.Application.Reports;
using Lotris.Contracts.Reports;
using Lotris.Domain;
using Xunit;

namespace Lotris.Tests.Integration;

public class ReportGenerateIntegrationTests : IClassFixture<LotrisWebApplicationFactory>
{
    private readonly LotrisWebApplicationFactory _factory;

    public ReportGenerateIntegrationTests(LotrisWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GenerateReport_ReturnsJobId()
    {
        var client = _factory.CreateAuthenticatedClient(UserRole.Admin);
        var response = await client.PostAsJsonAsync("/api/v1/reports/generate", new GenerateReportRequest(
            ReportType: "TICKET_SUMMARY",
            Format: "PDF",
            DateFrom: "2026-01-01",
            DateTo: "2026-06-01",
            TeamId: null));

        Assert.Equal(System.Net.HttpStatusCode.Accepted, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<GenerateReportResponse>();
        Assert.NotNull(body);
        Assert.NotEqual(Guid.Empty, body.JobId);
    }
}

internal sealed class InMemoryReportRepository : IReportRepository
{
    private readonly Dictionary<Guid, ReportJobEntity> _jobs = new();
    private readonly Dictionary<Guid, ReportScheduleEntity> _schedules = new();

    public Task<ReportJobEntity> CreateJobAsync(ReportJobEntity job, CancellationToken cancellationToken = default)
    {
        _jobs[job.Id] = job;
        return Task.FromResult(job);
    }

    public Task<ReportJobEntity?> GetJobAsync(Guid tenantId, Guid jobId, CancellationToken cancellationToken = default)
    {
        _jobs.TryGetValue(jobId, out var job);
        return Task.FromResult(job?.TenantId == tenantId ? job : null);
    }

    public Task<ReportJobEntity?> GetJobByIdAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        _jobs.TryGetValue(jobId, out var job);
        return Task.FromResult(job);
    }

    public Task<IReadOnlyList<ReportJobEntity>> ListJobsAsync(
        Guid tenantId,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var rows = _jobs.Values.Where(j => j.TenantId == tenantId).Take(limit).ToList();
        return Task.FromResult<IReadOnlyList<ReportJobEntity>>(rows);
    }

    public Task UpdateJobAsync(
        Guid jobId,
        IReadOnlyDictionary<string, object?> updates,
        CancellationToken cancellationToken = default)
    {
        if (!_jobs.TryGetValue(jobId, out var job))
        {
            return Task.CompletedTask;
        }

        _jobs[jobId] = new ReportJobEntity
        {
            Id = job.Id,
            TenantId = job.TenantId,
            ReportType = job.ReportType,
            Format = job.Format,
            Status = updates.TryGetValue("status", out var status) ? (string?)status ?? job.Status : job.Status,
            FilePath = updates.TryGetValue("file_path", out var path) ? (string?)path : job.FilePath,
            RequestedBy = job.RequestedBy,
            DateFrom = job.DateFrom,
            DateTo = job.DateTo,
            TeamId = job.TeamId,
            ErrorMsg = updates.TryGetValue("error_msg", out var err) ? (string?)err : job.ErrorMsg,
            CreatedAt = job.CreatedAt,
            CompletedAt = updates.TryGetValue("completed_at", out var completed) ? (DateTime?)completed : job.CompletedAt,
        };
        return Task.CompletedTask;
    }

    public Task<ReportScheduleEntity> CreateScheduleAsync(
        ReportScheduleEntity schedule,
        CancellationToken cancellationToken = default)
    {
        _schedules[schedule.Id] = schedule;
        return Task.FromResult(schedule);
    }

    public Task<IReadOnlyList<ReportScheduleEntity>> ListSchedulesAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ReportScheduleEntity>>(_schedules.Values.Where(s => s.TenantId == tenantId).ToList());

    public Task DeleteScheduleAsync(Guid tenantId, Guid scheduleId, CancellationToken cancellationToken = default)
    {
        if (_schedules.TryGetValue(scheduleId, out var schedule) && schedule.TenantId == tenantId)
        {
            _schedules.Remove(scheduleId);
        }

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<ReportScheduleEntity>> ListDueSchedulesAsync(
        DateTime asOfUtc,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ReportScheduleEntity>>(_schedules.Values
            .Where(s => s.IsActive && s.NextRunAt.HasValue && s.NextRunAt <= asOfUtc)
            .ToList());

    public Task UpdateScheduleRunAsync(
        Guid scheduleId,
        DateTime lastRunAt,
        DateTime nextRunAt,
        CancellationToken cancellationToken = default)
    {
        if (_schedules.TryGetValue(scheduleId, out var schedule))
        {
            _schedules[scheduleId] = new ReportScheduleEntity
            {
                Id = schedule.Id,
                TenantId = schedule.TenantId,
                ReportType = schedule.ReportType,
                Format = schedule.Format,
                Frequency = schedule.Frequency,
                Recipients = schedule.Recipients,
                TeamId = schedule.TeamId,
                IsActive = schedule.IsActive,
                CreatedBy = schedule.CreatedBy,
                CreatedAt = schedule.CreatedAt,
                LastRunAt = lastRunAt,
                NextRunAt = nextRunAt,
            };
        }

        return Task.CompletedTask;
    }

    public Task<ReportConfigEntity?> GetConfigAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
        Task.FromResult<ReportConfigEntity?>(null);

    public Task UpsertConfigAsync(Guid tenantId, ReportConfigUpdate update, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}

internal sealed class NoOpReportJobEnqueuer : IReportJobEnqueuer
{
    public void EnqueueGeneration(Guid jobId)
    {
    }
}
