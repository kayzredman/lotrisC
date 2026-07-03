namespace Lotris.Infrastructure.Analytics.Entities;

public class KpiTrendSnapshot
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public Guid EngineerId { get; set; }

    public Guid KpiDefId { get; set; }

    public string PeriodKey { get; set; } = string.Empty;

    public DateTime SnapshotAt { get; set; }

    public decimal? ActualToDate { get; set; }

    public decimal? ProjectedEop { get; set; }

    public decimal? Target { get; set; }

    public string WarningLevel { get; set; } = "NONE";
}
