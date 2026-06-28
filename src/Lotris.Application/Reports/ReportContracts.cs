namespace Lotris.Application.Reports;

public sealed class ReportsOptions
{
    public const string SectionName = "Reports";

    public string OutputPath { get; set; } = "./data/reports";
}

public interface IReportRepository
{
    Task<ReportJobEntity> CreateJobAsync(ReportJobEntity job, CancellationToken cancellationToken = default);

    Task<ReportJobEntity?> GetJobAsync(Guid tenantId, Guid jobId, CancellationToken cancellationToken = default);

    Task<ReportJobEntity?> GetJobByIdAsync(Guid jobId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ReportJobEntity>> ListJobsAsync(Guid tenantId, int limit, CancellationToken cancellationToken = default);

    Task UpdateJobAsync(Guid jobId, IReadOnlyDictionary<string, object?> updates, CancellationToken cancellationToken = default);

    Task<ReportScheduleEntity> CreateScheduleAsync(ReportScheduleEntity schedule, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ReportScheduleEntity>> ListSchedulesAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task DeleteScheduleAsync(Guid tenantId, Guid scheduleId, CancellationToken cancellationToken = default);
}

public interface IReportJobEnqueuer
{
    void EnqueueGeneration(Guid jobId);
}

public interface IReportGenerator
{
    Task<string> GenerateAsync(
        Guid tenantId,
        string reportType,
        string format,
        string? dateFrom,
        string? dateTo,
        Guid? teamId,
        string outputDirectory,
        CancellationToken cancellationToken = default);
}

public sealed class ReportJobEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public string ReportType { get; init; } = string.Empty;
    public string Format { get; init; } = "PDF";
    public string Status { get; init; } = "QUEUED";
    public string? FilePath { get; init; }
    public Guid RequestedBy { get; init; }
    public string? DateFrom { get; init; }
    public string? DateTo { get; init; }
    public Guid? TeamId { get; init; }
    public string? ErrorMsg { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
}

public sealed class ReportScheduleEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public string ReportType { get; init; } = string.Empty;
    public string Format { get; init; } = "PDF";
    public string Frequency { get; init; } = string.Empty;
    public string Recipients { get; init; } = "[]";
    public Guid? TeamId { get; init; }
    public bool IsActive { get; init; } = true;
    public Guid CreatedBy { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? NextRunAt { get; init; }
    public DateTime? LastRunAt { get; init; }
}
