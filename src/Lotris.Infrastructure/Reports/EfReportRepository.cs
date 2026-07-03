using Lotris.Application.Reports;
using Lotris.Infrastructure.Analytics.Entities;
using Lotris.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Lotris.Infrastructure.Reports;

public sealed class EfReportRepository : IReportRepository
{
    private readonly LotrisDbContext _db;

    public EfReportRepository(LotrisDbContext db)
    {
        _db = db;
    }

    public async Task<ReportJobEntity> CreateJobAsync(ReportJobEntity job, CancellationToken cancellationToken = default)
    {
        var entity = new ReportJob
        {
            Id = job.Id,
            TenantId = job.TenantId,
            ReportType = job.ReportType,
            Format = job.Format,
            Status = job.Status,
            FilePath = job.FilePath,
            RequestedBy = job.RequestedBy,
            DateFrom = job.DateFrom,
            DateTo = job.DateTo,
            TeamId = job.TeamId,
            ErrorMsg = job.ErrorMsg,
            CreatedAt = job.CreatedAt,
            CompletedAt = job.CompletedAt,
        };

        _db.ReportJobs.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return MapJob(entity);
    }

    public async Task<ReportJobEntity?> GetJobAsync(
        Guid tenantId,
        Guid jobId,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.ReportJobs
            .AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == jobId && j.TenantId == tenantId, cancellationToken);
        return entity is null ? null : MapJob(entity);
    }

    public async Task<ReportJobEntity?> GetJobByIdAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.ReportJobs.AsNoTracking().FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);
        return entity is null ? null : MapJob(entity);
    }

    public async Task<IReadOnlyList<ReportJobEntity>> ListJobsAsync(
        Guid tenantId,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var rows = await _db.ReportJobs
            .AsNoTracking()
            .Where(j => j.TenantId == tenantId)
            .OrderByDescending(j => j.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
        return rows.Select(MapJob).ToList();
    }

    public async Task UpdateJobAsync(
        Guid jobId,
        IReadOnlyDictionary<string, object?> updates,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.ReportJobs.FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken)
            ?? throw new InvalidOperationException($"Report job {jobId} not found");

        foreach (var (key, value) in updates)
        {
            switch (key)
            {
                case "status":
                    entity.Status = (string?)value ?? entity.Status;
                    break;
                case "file_path":
                    entity.FilePath = (string?)value;
                    break;
                case "error_msg":
                    entity.ErrorMsg = (string?)value;
                    break;
                case "completed_at":
                    entity.CompletedAt = (DateTime?)value;
                    break;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<ReportScheduleEntity> CreateScheduleAsync(
        ReportScheduleEntity schedule,
        CancellationToken cancellationToken = default)
    {
        var entity = new ReportSchedule
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
            NextRunAt = schedule.NextRunAt,
            LastRunAt = schedule.LastRunAt,
        };

        _db.ReportSchedules.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return MapSchedule(entity);
    }

    public async Task<IReadOnlyList<ReportScheduleEntity>> ListSchedulesAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _db.ReportSchedules
            .AsNoTracking()
            .Where(s => s.TenantId == tenantId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(cancellationToken);
        return rows.Select(MapSchedule).ToList();
    }

    public async Task DeleteScheduleAsync(
        Guid tenantId,
        Guid scheduleId,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.ReportSchedules
            .FirstOrDefaultAsync(s => s.Id == scheduleId && s.TenantId == tenantId, cancellationToken);
        if (entity is null)
        {
            return;
        }

        _db.ReportSchedules.Remove(entity);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<ReportConfigEntity?> GetConfigAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.ReportConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.TenantId == tenantId, cancellationToken);

        return entity is null
            ? null
            : new ReportConfigEntity
            {
                BrandName = entity.BrandName ?? "Lotris",
                DefaultTimezone = entity.DefaultTimezone ?? "UTC",
                AttachmentSizeLimitMb = entity.AttachmentSizeLimitMb ?? 10,
                RetentionDays = entity.RetentionDays ?? 30,
                DefaultRecipients = entity.DefaultRecipients ?? "[]",
            };
    }

    public async Task UpsertConfigAsync(
        Guid tenantId,
        ReportConfigUpdate update,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.ReportConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId, cancellationToken);
        var recipientsJson = update.DefaultRecipients is null
            ? null
            : System.Text.Json.JsonSerializer.Serialize(update.DefaultRecipients);

        if (entity is null)
        {
            _db.ReportConfigs.Add(new ReportConfig
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                BrandName = update.BrandName ?? "Lotris",
                DefaultTimezone = update.DefaultTimezone ?? "UTC",
                AttachmentSizeLimitMb = update.AttachmentSizeLimitMb ?? 10,
                RetentionDays = update.RetentionDays ?? 30,
                DefaultRecipients = recipientsJson ?? "[]",
                UpdatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            if (update.BrandName is not null) entity.BrandName = update.BrandName;
            if (update.DefaultTimezone is not null) entity.DefaultTimezone = update.DefaultTimezone;
            if (update.AttachmentSizeLimitMb.HasValue) entity.AttachmentSizeLimitMb = update.AttachmentSizeLimitMb;
            if (update.RetentionDays.HasValue) entity.RetentionDays = update.RetentionDays;
            if (recipientsJson is not null) entity.DefaultRecipients = recipientsJson;
            entity.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static ReportJobEntity MapJob(ReportJob entity) => new()
    {
        Id = entity.Id,
        TenantId = entity.TenantId,
        ReportType = entity.ReportType,
        Format = entity.Format,
        Status = entity.Status,
        FilePath = entity.FilePath,
        RequestedBy = entity.RequestedBy,
        DateFrom = entity.DateFrom,
        DateTo = entity.DateTo,
        TeamId = entity.TeamId,
        ErrorMsg = entity.ErrorMsg,
        CreatedAt = entity.CreatedAt,
        CompletedAt = entity.CompletedAt,
    };

    private static ReportScheduleEntity MapSchedule(ReportSchedule entity) => new()
    {
        Id = entity.Id,
        TenantId = entity.TenantId,
        ReportType = entity.ReportType,
        Format = entity.Format,
        Frequency = entity.Frequency,
        Recipients = entity.Recipients,
        TeamId = entity.TeamId,
        IsActive = entity.IsActive,
        CreatedBy = entity.CreatedBy,
        CreatedAt = entity.CreatedAt,
        NextRunAt = entity.NextRunAt,
        LastRunAt = entity.LastRunAt,
    };
}
