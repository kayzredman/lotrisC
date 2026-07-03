using Lotris.Infrastructure.Analytics.Entities;
using Lotris.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Lotris.Infrastructure.Data;

public class LotrisDbContext : IdentityDbContext<LotrisIdentityUser, IdentityRole<Guid>, Guid>
{
    public const string AnalyticsSchema = "analytics";

    public LotrisDbContext(DbContextOptions<LotrisDbContext> options)
        : base(options)
    {
    }

    public DbSet<AnalyticsJobConfig> AnalyticsJobConfigs => Set<AnalyticsJobConfig>();

    public DbSet<TicketDaily> TicketDaily => Set<TicketDaily>();

    public DbSet<SlaDaily> SlaDaily => Set<SlaDaily>();

    public DbSet<EngineerPerf> EngineerPerf => Set<EngineerPerf>();

    public DbSet<KpiSummary> KpiSummary => Set<KpiSummary>();

    public DbSet<KpiTrendSnapshot> KpiTrendSnapshots => Set<KpiTrendSnapshot>();

    public DbSet<ReportJob> ReportJobs => Set<ReportJob>();

    public DbSet<ReportSchedule> ReportSchedules => Set<ReportSchedule>();

    public DbSet<ReportConfig> ReportConfigs => Set<ReportConfig>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<AnalyticsJobConfig>(entity =>
        {
            entity.ToTable("AnalyticsJobConfig", AnalyticsSchema);
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TenantId).IsUnique().HasFilter("[TenantId] IS NOT NULL");
            entity.Property(e => e.DailyBatchTimesUtcJson).HasColumnName("daily_batch_times_utc");
        });

        builder.Entity<TicketDaily>(entity =>
        {
            entity.ToTable("TicketDaily", AnalyticsSchema);
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.TenantId, e.Date }).IsUnique();
            entity.Property(e => e.AvgResolutionHours).HasPrecision(10, 2);
        });

        builder.Entity<SlaDaily>(entity =>
        {
            entity.ToTable("SlaDaily", AnalyticsSchema);
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.TenantId, e.Date }).IsUnique();
            entity.Property(e => e.CompliancePct).HasPrecision(6, 2);
        });

        builder.Entity<EngineerPerf>(entity =>
        {
            entity.ToTable("EngineerPerf", AnalyticsSchema);
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.TenantId, e.EngineerId, e.WeekKey }).IsUnique();
            entity.Property(e => e.WeekKey).HasMaxLength(10);
            entity.Property(e => e.AvgResolutionHours).HasPrecision(10, 2);
            entity.Property(e => e.KpiScore).HasPrecision(6, 2);
        });

        builder.Entity<KpiSummary>(entity =>
        {
            entity.ToTable("KpiSummary", AnalyticsSchema);
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.TenantId, e.EngineerId, e.PeriodKey }).IsUnique();
            entity.Property(e => e.PeriodKey).HasMaxLength(20);
            entity.Property(e => e.OverallScore).HasPrecision(6, 2);
        });

        builder.Entity<KpiTrendSnapshot>(entity =>
        {
            entity.ToTable("KpiTrendSnapshots", AnalyticsSchema);
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.TenantId, e.EngineerId, e.KpiDefId, e.PeriodKey });
            entity.HasIndex(e => new { e.TenantId, e.PeriodKey, e.WarningLevel });
            entity.Property(e => e.PeriodKey).HasMaxLength(20);
            entity.Property(e => e.WarningLevel).HasMaxLength(10);
            entity.Property(e => e.ActualToDate).HasPrecision(10, 4);
            entity.Property(e => e.ProjectedEop).HasPrecision(10, 4);
            entity.Property(e => e.Target).HasPrecision(10, 4);
        });

        builder.Entity<ReportJob>(entity =>
        {
            entity.ToTable("ReportJobs", AnalyticsSchema);
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.TenantId, e.CreatedAt });
            entity.Property(e => e.ReportType).HasMaxLength(40);
            entity.Property(e => e.Format).HasMaxLength(10);
            entity.Property(e => e.Status).HasMaxLength(20);
        });

        builder.Entity<ReportSchedule>(entity =>
        {
            entity.ToTable("ReportSchedules", AnalyticsSchema);
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TenantId);
            entity.Property(e => e.ReportType).HasMaxLength(40);
            entity.Property(e => e.Format).HasMaxLength(10);
            entity.Property(e => e.Frequency).HasMaxLength(20);
        });

        builder.Entity<ReportConfig>(entity =>
        {
            entity.ToTable("ReportConfig", AnalyticsSchema);
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TenantId).IsUnique();
            entity.Property(e => e.BrandName).HasMaxLength(120);
            entity.Property(e => e.DefaultTimezone).HasMaxLength(60);
        });
    }
}
